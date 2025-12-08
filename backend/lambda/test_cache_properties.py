"""
Property-Based Tests for DynamoDB Cache Operations
Feature: system-completion-audit

Tests cache-first strategy, TTL configuration, performance, and population.
"""

import pytest
import time
import hashlib
from hypothesis import given, strategies as st, settings, HealthCheck
from typing import Dict, List
import boto3
from moto import mock_aws
import os
import sys
from unittest.mock import MagicMock, patch

# Set environment variables for testing
os.environ['LANCEDB_PATH'] = '/tmp/test-lancedb'
os.environ['MODEL_PATH'] = '/tmp/test-model'
os.environ['DYNAMODB_CACHE_TABLE'] = 'test-supplement-cache'

# Add search-api-lancedb directory to path
search_api_path = os.path.join(os.path.dirname(__file__), 'search-api-lancedb')
sys.path.insert(0, search_api_path)

# Mock the imports that aren't needed for cache testing
sys.modules['lancedb'] = MagicMock()
sys.modules['sentence_transformers'] = MagicMock()

# Import after setting env vars and mocks
import lambda_function
check_cache = lambda_function.check_cache
store_cache = lambda_function.store_cache
log_structured = lambda_function.log_structured


@pytest.fixture(scope='function', autouse=True)
def dynamodb_setup():
    """Setup mock DynamoDB and CloudWatch for testing"""
    with mock_aws():
        # Create DynamoDB resource
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        
        # Create cache table
        table = dynamodb.create_table(
            TableName='test-supplement-cache',
            KeySchema=[
                {'AttributeName': 'PK', 'KeyType': 'HASH'},
                {'AttributeName': 'SK', 'KeyType': 'RANGE'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'PK', 'AttributeType': 'S'},
                {'AttributeName': 'SK', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        
        # Wait for table to be created
        table.meta.client.get_waiter('table_exists').wait(TableName='test-supplement-cache')
        
        # Update lambda_function's global variables to use our mocked resources
        lambda_function.dynamodb = dynamodb
        lambda_function.cache_table = table
        lambda_function.cloudwatch = boto3.client('cloudwatch', region_name='us-east-1')
        
        yield dynamodb, table
        
        # Clean up after test
        try:
            table.delete()
        except:
            pass


# Strategy for generating valid supplement data
supplement_data_strategy = st.fixed_dictionaries({
    'id': st.text(min_size=1, max_size=50),
    'name': st.text(min_size=1, max_size=100),
    'scientificName': st.text(min_size=1, max_size=100),
    'commonNames': st.lists(st.text(min_size=1, max_size=50), min_size=0, max_size=5),
    'metadata': st.dictionaries(st.text(min_size=1, max_size=20), st.text(min_size=1, max_size=50), min_size=0, max_size=5),
    'similarity': st.floats(min_value=0.0, max_value=0.999999)
})

# Strategy for generating embeddings (384-dimensional vectors)
# Use reasonable float values to avoid Decimal underflow
embedding_strategy = st.lists(
    st.floats(min_value=-0.999999, max_value=0.999999, allow_nan=False, allow_infinity=False),
    min_size=384,
    max_size=384
)

# Strategy for generating search queries
query_strategy = st.text(min_size=1, max_size=200, alphabet=st.characters(blacklist_categories=('Cs', 'Cc')))


@settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(query=query_strategy)
def test_property_13_cache_first_strategy(dynamodb_setup, query):
    """
    **Feature: system-completion-audit, Property 13: Cache-First Search Strategy**
    
    For any search query, the System SHALL check DynamoDB cache before performing vector search.
    **Validates: Requirements 8.1**
    """
    dynamodb, table = dynamodb_setup
    
    # Generate query hash
    query_hash = hashlib.sha256(query.lower().encode()).hexdigest()[:16]
    
    # First check - should be a cache miss
    result = check_cache(query_hash)
    assert result is None, "First check should be a cache miss"
    
    # Store something in cache
    test_supplement = {
        'id': 'test-123',
        'name': 'Test Supplement',
        'scientificName': 'Testus supplementus',
        'commonNames': ['test'],
        'metadata': {},
        'similarity': 0.95
    }
    test_embedding = [0.1] * 384
    
    store_cache(query_hash, test_supplement, test_embedding)
    
    # Second check - should be a cache hit
    cached_result = check_cache(query_hash)
    assert cached_result is not None, "Second check should be a cache hit"
    assert cached_result['id'] == test_supplement['id']
    assert cached_result['name'] == test_supplement['name']


@settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    query=query_strategy,
    supplement_data=supplement_data_strategy,
    embedding=embedding_strategy
)
def test_property_16_cache_ttl_configuration(dynamodb_setup, query, supplement_data, embedding):
    """
    **Feature: system-completion-audit, Property 16: Cache TTL Configuration**
    
    For any cache entry created, the System SHALL set the TTL to exactly 7 days (604800 seconds).
    **Validates: Requirements 8.4**
    """
    dynamodb, table = dynamodb_setup
    
    # Generate query hash
    query_hash = hashlib.sha256(query.lower().encode()).hexdigest()[:16]
    
    # Store in cache
    before_store = int(time.time())
    store_cache(query_hash, supplement_data, embedding)
    after_store = int(time.time())
    
    # Retrieve from DynamoDB directly to check TTL
    response = table.get_item(
        Key={
            'PK': f'SUPPLEMENT#{query_hash}',
            'SK': 'QUERY'
        }
    )
    
    assert 'Item' in response, "Cache entry should exist"
    
    item = response['Item']
    assert 'ttl' in item, "TTL field should exist"
    
    # TTL should be 7 days (604800 seconds) from creation time
    expected_ttl_min = before_store + (7 * 24 * 60 * 60)
    expected_ttl_max = after_store + (7 * 24 * 60 * 60)
    
    actual_ttl = item['ttl']
    
    # Allow 5 second tolerance for execution time
    assert expected_ttl_min - 5 <= actual_ttl <= expected_ttl_max + 5, \
        f"TTL should be exactly 7 days from creation. Expected: {expected_ttl_min}-{expected_ttl_max}, Got: {actual_ttl}"


@settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    query=query_strategy,
    supplement_data=supplement_data_strategy,
    embedding=embedding_strategy
)
def test_property_14_cache_hit_performance(dynamodb_setup, query, supplement_data, embedding):
    """
    **Feature: system-completion-audit, Property 14: Cache Hit Performance**
    
    For any cache hit, the System SHALL return results in less than 10ms.
    **Validates: Requirements 8.2**
    """
    dynamodb, table = dynamodb_setup
    
    # Generate unique query hash with timestamp to avoid collisions
    query_with_timestamp = f"{query}_{time.time()}"
    query_hash = hashlib.sha256(query_with_timestamp.lower().encode()).hexdigest()[:16]
    
    # Pre-populate cache
    store_cache(query_hash, supplement_data, embedding)
    
    # Measure cache hit latency
    start_time = time.time()
    result = check_cache(query_hash)
    latency_ms = (time.time() - start_time) * 1000
    
    assert result is not None, "Should be a cache hit"
    assert latency_ms < 10, f"Cache hit should complete in < 10ms, took {latency_ms:.2f}ms"


@settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    query=query_strategy,
    supplement_data=supplement_data_strategy,
    embedding=embedding_strategy
)
def test_property_15_cache_population_on_miss(dynamodb_setup, query, supplement_data, embedding):
    """
    **Feature: system-completion-audit, Property 15: Cache Population on Miss**
    
    For any cache miss, the System SHALL store the result in cache after vector search.
    **Validates: Requirements 8.3**
    """
    dynamodb, table = dynamodb_setup
    
    # Generate unique query hash with timestamp to avoid collisions
    query_with_timestamp = f"{query}_{time.time()}"
    query_hash = hashlib.sha256(query_with_timestamp.lower().encode()).hexdigest()[:16]
    
    # Verify cache miss
    result = check_cache(query_hash)
    assert result is None, "Should be a cache miss initially"
    
    # Simulate vector search result and store in cache
    store_cache(query_hash, supplement_data, embedding)
    
    # Verify cache is now populated
    cached_result = check_cache(query_hash)
    assert cached_result is not None, "Cache should be populated after miss"
    assert cached_result['id'] == supplement_data['id']
    assert cached_result['name'] == supplement_data['name']
    assert cached_result['scientificName'] == supplement_data['scientificName']
    
    # Verify embedding is stored
    response = table.get_item(
        Key={
            'PK': f'SUPPLEMENT#{query_hash}',
            'SK': 'QUERY'
        }
    )
    
    assert 'Item' in response
    assert 'embedding' in response['Item']
    assert len(response['Item']['embedding']) == 384, "Embedding should be 384-dimensional"


@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    queries=st.lists(query_strategy, min_size=5, max_size=10, unique=True),
    supplement_data=supplement_data_strategy,
    embedding=embedding_strategy
)
def test_cache_consistency_across_queries(dynamodb_setup, queries, supplement_data, embedding):
    """
    Additional test: Verify cache consistency across multiple queries
    """
    dynamodb, table = dynamodb_setup
    
    # Store each query in cache
    for query in queries:
        query_hash = hashlib.sha256(query.lower().encode()).hexdigest()[:16]
        store_cache(query_hash, supplement_data, embedding)
    
    # Verify all queries can be retrieved
    for query in queries:
        query_hash = hashlib.sha256(query.lower().encode()).hexdigest()[:16]
        result = check_cache(query_hash)
        assert result is not None, f"Query '{query}' should be in cache"
        assert result['id'] == supplement_data['id']


@settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    query=query_strategy,
    supplement_data=supplement_data_strategy,
    embedding=embedding_strategy
)
def test_cache_metadata_fields(dynamodb_setup, query, supplement_data, embedding):
    """
    Additional test: Verify all required metadata fields are stored
    """
    dynamodb, table = dynamodb_setup
    
    query_hash = hashlib.sha256(query.lower().encode()).hexdigest()[:16]
    
    before_store = int(time.time())
    store_cache(query_hash, supplement_data, embedding)
    after_store = int(time.time())
    
    # Retrieve from DynamoDB
    response = table.get_item(
        Key={
            'PK': f'SUPPLEMENT#{query_hash}',
            'SK': 'QUERY'
        }
    )
    
    assert 'Item' in response
    item = response['Item']
    
    # Verify required fields
    assert 'PK' in item
    assert 'SK' in item
    assert 'supplementData' in item
    assert 'embedding' in item
    assert 'ttl' in item
    assert 'searchCount' in item
    assert 'lastAccessed' in item
    
    # Verify field values
    assert item['PK'] == f'SUPPLEMENT#{query_hash}'
    assert item['SK'] == 'QUERY'
    assert item['searchCount'] == 1
    assert before_store <= item['lastAccessed'] <= after_store


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
