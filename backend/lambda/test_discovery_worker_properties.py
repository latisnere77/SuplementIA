"""
Property-Based Tests for Discovery Worker

Feature: system-completion-audit
Tests discovery worker processing properties
"""

import pytest
import json
import time
from hypothesis import given, settings, strategies as st
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Import the discovery worker functions
discovery_worker_path = os.path.join(os.path.dirname(__file__), 'discovery-worker-lancedb')
if discovery_worker_path not in sys.path:
    sys.path.insert(0, discovery_worker_path)

# Import after adding to path
import importlib.util
spec = importlib.util.spec_from_file_location("discovery_worker", os.path.join(discovery_worker_path, "lambda_function.py"))
discovery_worker = importlib.util.module_from_spec(spec)
sys.modules['discovery_worker'] = discovery_worker  # Add to sys.modules for patch to work
spec.loader.exec_module(discovery_worker)

validate_pubmed = discovery_worker.validate_pubmed
generate_embedding = discovery_worker.generate_embedding
insert_supplement = discovery_worker.insert_supplement
invalidate_cache = discovery_worker.invalidate_cache


# Property 10: PubMed Validation
# **Validates: Requirements 7.3**
@settings(max_examples=20, deadline=30000)  # Reduced examples due to API calls
@given(query=st.text(min_size=3, max_size=50, alphabet=st.characters(whitelist_categories=('L', 'N'))))
@patch('discovery_worker.requests.get')
def test_property_10_pubmed_validation(mock_get, query):
    """
    Property 10: PubMed Validation
    
    For any discovery job processed by discovery-worker, the system SHALL query PubMed API.
    
    **Validates: Requirements 7.3**
    """
    # Skip queries with only whitespace
    if not query.strip():
        return
    
    # Mock PubMed API response
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        'esearchresult': {
            'count': '10'  # Simulate 10 studies found
        }
    }
    mock_response.raise_for_status = Mock()
    mock_get.return_value = mock_response
    
    # Call validate_pubmed
    study_count, is_valid = validate_pubmed(query)
    
    # Verify PubMed API was called
    assert mock_get.called, "PubMed API should be called"
    
    # Verify the API was called with correct parameters
    call_args = mock_get.call_args
    assert call_args is not None
    
    # Check that the URL is correct
    assert 'eutils.ncbi.nlm.nih.gov' in call_args[0][0]
    
    # Check that query parameters include the search term
    params = call_args[1].get('params', {})
    assert 'term' in params
    assert query in params['term'] or query.lower() in params['term'].lower()
    
    # Verify return values
    assert isinstance(study_count, int), "Study count should be an integer"
    assert isinstance(is_valid, bool), "Validation result should be boolean"
    assert study_count == 10, "Should return correct study count"


def test_pubmed_validation_with_real_supplement():
    """Test PubMed validation with a known supplement (integration test)"""
    # This is a real API call, so we limit it to one known supplement
    query = "Vitamin D"
    
    with patch('discovery_worker.time.sleep'):  # Skip rate limiting in tests
        study_count, is_valid = validate_pubmed(query)
    
    # Vitamin D should have many studies
    assert study_count > 0, "Vitamin D should have studies in PubMed"
    assert is_valid, "Vitamin D should be valid"


def test_pubmed_validation_with_invalid_supplement():
    """Test PubMed validation with an invalid/unknown supplement"""
    query = "XYZ123InvalidSupplement999"
    
    with patch('discovery_worker.time.sleep'):  # Skip rate limiting in tests
        study_count, is_valid = validate_pubmed(query)
    
    # Should have very few or no studies
    assert study_count < 3, "Invalid supplement should have few studies"


@patch('discovery_worker.requests.get')
def test_pubmed_validation_handles_api_errors(mock_get):
    """Test that PubMed validation handles API errors gracefully"""
    # Simulate API error
    mock_get.side_effect = Exception("API Error")
    
    query = "Test Supplement"
    study_count, is_valid = validate_pubmed(query)
    
    # Should return 0 studies and invalid on error
    assert study_count == 0
    assert is_valid == False


# Property 11: Validated Supplement Insertion
# **Validates: Requirements 7.4**
@settings(max_examples=10, deadline=10000)
@given(
    name=st.text(min_size=3, max_size=50, alphabet=st.characters(whitelist_categories=('L', 'N'))),
    study_count=st.integers(min_value=3, max_value=100)
)
@patch('discovery_worker.initialize_lazy')
def test_property_11_validated_supplement_insertion(mock_init, name, study_count):
    """
    Property 11: Validated Supplement Insertion
    
    For any supplement that passes validation, the system SHALL insert it into LanceDB.
    
    **Validates: Requirements 7.4**
    """
    # Skip names with only whitespace
    if not name.strip():
        return
    
    # Mock LanceDB
    mock_db = MagicMock()
    mock_table = MagicMock()
    mock_db.open_table.return_value = mock_table
    mock_db.create_table.return_value = mock_table
    
    # Mock model (not used in insert_supplement but needed for initialize_lazy)
    mock_model = MagicMock()
    
    mock_init.return_value = (mock_db, mock_model)
    
    # Generate a valid embedding
    embedding = [0.1] * 384
    
    # Call insert_supplement
    supplement_id = insert_supplement(
        name=name,
        normalized_name=name.lower(),
        embedding=embedding,
        study_count=study_count
    )
    
    # Verify supplement was inserted
    assert supplement_id is not None, "Should return supplement ID"
    assert isinstance(supplement_id, str), "Supplement ID should be a string"
    assert len(supplement_id) > 0, "Supplement ID should not be empty"
    
    # Verify table.add was called (either on existing table or new table)
    assert mock_table.add.called or mock_db.create_table.called, "Should insert into LanceDB"
    
    # If add was called, verify the data structure
    if mock_table.add.called:
        call_args = mock_table.add.call_args[0][0]
        assert len(call_args) == 1, "Should insert one supplement"
        supplement_data = call_args[0]
        
        assert supplement_data['id'] == supplement_id
        assert supplement_data['name'] == name
        assert supplement_data['scientific_name'] == name.lower()
        assert len(supplement_data['embedding']) == 384
        assert supplement_data['metadata']['studyCount'] == study_count


def test_validated_supplement_insertion_creates_table_if_not_exists():
    """Test that insert_supplement creates the table if it doesn't exist"""
    with patch('discovery_worker.initialize_lazy') as mock_init:
        mock_db = MagicMock()
        mock_table = MagicMock()
        
        # Simulate table not existing
        mock_db.open_table.side_effect = Exception("Table not found")
        mock_db.create_table.return_value = mock_table
        
        mock_model = MagicMock()
        mock_init.return_value = (mock_db, mock_model)
        
        embedding = [0.1] * 384
        
        supplement_id = insert_supplement(
            name="Test Supplement",
            normalized_name="test supplement",
            embedding=embedding,
            study_count=10
        )
        
        # Verify table was created
        assert mock_db.create_table.called, "Should create table if it doesn't exist"
        assert supplement_id is not None


# Property 12: Cache Invalidation on Insert
# **Validates: Requirements 7.5**
@settings(max_examples=50, deadline=5000)
@given(supplement_name=st.text(min_size=3, max_size=50))
@patch('discovery_worker.cache_table')
def test_property_12_cache_invalidation_on_insert(mock_cache_table, supplement_name):
    """
    Property 12: Cache Invalidation on Insert
    
    For any supplement inserted into LanceDB, the system SHALL invalidate related cache entries.
    
    **Validates: Requirements 7.5**
    """
    # Skip names with only whitespace
    if not supplement_name.strip():
        return
    
    # Call invalidate_cache
    invalidate_cache(supplement_name)
    
    # Verify cache delete was called
    assert mock_cache_table.delete_item.called, "Should call delete_item on cache table"
    
    # Verify the correct key was used
    call_args = mock_cache_table.delete_item.call_args
    assert 'Key' in call_args[1]
    
    key = call_args[1]['Key']
    assert 'PK' in key
    assert 'SK' in key
    assert key['SK'] == 'QUERY'
    
    # Verify the PK contains a hash of the supplement name
    assert 'SUPPLEMENT#' in key['PK']


@patch('discovery_worker.cache_table')
def test_cache_invalidation_handles_errors_gracefully(mock_cache_table):
    """Test that cache invalidation doesn't fail the whole process on error"""
    # Simulate cache deletion error
    mock_cache_table.delete_item.side_effect = Exception("Cache error")
    
    # Should not raise exception
    try:
        invalidate_cache("Test Supplement")
        # If we get here, the error was handled gracefully
        assert True
    except Exception:
        pytest.fail("Cache invalidation should handle errors gracefully")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
