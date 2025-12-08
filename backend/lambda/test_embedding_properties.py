#!/usr/bin/env python3
"""
Property-Based Tests for Embedding Generation

**Feature: system-completion-audit, Property 3: Embedding Generation Consistency**

Tests that embedding generation produces consistent 384-dimensional vectors
for all text inputs.

Validates: Requirements 3.3
"""

import pytest
from hypothesis import given, strategies as st, settings
import os

# Configuration
EXPECTED_DIMENSIONS = 384

# Global model instance (lazy loaded)
_model = None


def get_model():
    """
    Load the Sentence Transformers model (lazy loading)
    
    Returns:
        SentenceTransformer model instance
    """
    global _model
    
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            
            # Try to load from EFS path first (if running in Lambda environment)
            model_path = os.environ.get('MODEL_PATH', '/mnt/efs/models/all-MiniLM-L6-v2')
            
            if os.path.exists(model_path):
                print(f"Loading model from EFS: {model_path}")
                _model = SentenceTransformer(model_path)
            else:
                # Fall back to downloading model (for local testing)
                print("Loading model from HuggingFace (local testing)")
                _model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
                
        except Exception as e:
            pytest.skip(f"Could not load model: {str(e)}")
    
    return _model


def generate_embedding(text: str) -> list:
    """
    Generate embedding using Sentence Transformers model
    
    Args:
        text: Input text
        
    Returns:
        Embedding vector as list of floats
    """
    model = get_model()
    
    try:
        embedding = model.encode(text, convert_to_numpy=True)
        return embedding.tolist()
    except Exception as e:
        pytest.fail(f"Embedding generation failed: {str(e)}")


@pytest.mark.property
@given(text=st.text(min_size=1, max_size=200, alphabet=st.characters(blacklist_categories=('Cs',))))
@settings(max_examples=100, deadline=None)
def test_embedding_dimensions_consistency(text):
    """
    **Feature: system-completion-audit, Property 3: Embedding Generation Consistency**
    
    Property: For any text input, the embedding generator SHALL produce 
    a 384-dimensional vector.
    
    **Validates: Requirements 3.3**
    
    This property verifies that:
    1. All embeddings have exactly 384 dimensions
    2. The model produces consistent output format
    3. No text input causes dimension mismatch
    """
    # Skip empty or whitespace-only strings
    if not text.strip():
        return
    
    # Generate embedding
    embedding = generate_embedding(text)
    
    # Verify embedding is a list
    assert isinstance(embedding, list), f"Embedding should be a list, got {type(embedding)}"
    
    # Verify embedding has exactly 384 dimensions
    assert len(embedding) == EXPECTED_DIMENSIONS, \
        f"Embedding should have {EXPECTED_DIMENSIONS} dimensions, got {len(embedding)}"
    
    # Verify all elements are floats
    assert all(isinstance(x, (int, float)) for x in embedding), \
        "All embedding elements should be numeric"
    
    # Verify no NaN or Inf values
    import math
    assert all(math.isfinite(x) for x in embedding), \
        "All embedding elements should be finite (no NaN or Inf)"


@pytest.mark.property
@given(text=st.text(min_size=1, max_size=100, alphabet=st.characters(blacklist_categories=('Cs',))))
@settings(max_examples=50, deadline=None)
def test_embedding_deterministic(text):
    """
    **Feature: system-completion-audit, Property 3: Embedding Generation Consistency**
    
    Property: For any text input, generating the embedding twice SHALL
    produce identical results.
    
    **Validates: Requirements 3.3**
    
    This property verifies that:
    1. Embeddings are deterministic (same input = same output)
    2. No randomness in embedding generation
    3. Model behavior is consistent
    """
    # Skip empty or whitespace-only strings
    if not text.strip():
        return
    
    # Generate embedding twice
    embedding1 = generate_embedding(text)
    embedding2 = generate_embedding(text)
    
    # Verify both have correct dimensions
    assert len(embedding1) == EXPECTED_DIMENSIONS
    assert len(embedding2) == EXPECTED_DIMENSIONS
    
    # Verify embeddings are identical (or very close due to floating point)
    import math
    for i, (e1, e2) in enumerate(zip(embedding1, embedding2)):
        assert math.isclose(e1, e2, rel_tol=1e-9), \
            f"Embedding element {i} differs: {e1} vs {e2}"


# Unit tests for specific cases
class TestEmbeddingGeneration:
    """Unit tests for embedding generation"""
    
    def test_simple_text(self):
        """Test embedding generation for simple text"""
        embedding = generate_embedding("vitamin d")
        assert len(embedding) == EXPECTED_DIMENSIONS
    
    def test_scientific_name(self):
        """Test embedding generation for scientific names"""
        embedding = generate_embedding("Cholecalciferol")
        assert len(embedding) == EXPECTED_DIMENSIONS
    
    def test_multilingual_text(self):
        """Test embedding generation for Spanish text"""
        embedding = generate_embedding("vitamina d")
        assert len(embedding) == EXPECTED_DIMENSIONS
    
    def test_long_text(self):
        """Test embedding generation for longer text"""
        text = "vitamin d is essential for bone health and immune function"
        embedding = generate_embedding(text)
        assert len(embedding) == EXPECTED_DIMENSIONS
    
    def test_special_characters(self):
        """Test embedding generation with special characters"""
        embedding = generate_embedding("Coenzyme Q10 (CoQ10)")
        assert len(embedding) == EXPECTED_DIMENSIONS
    
    def test_numbers(self):
        """Test embedding generation with numbers"""
        embedding = generate_embedding("vitamin b12")
        assert len(embedding) == EXPECTED_DIMENSIONS


if __name__ == '__main__':
    # Run tests
    pytest.main([__file__, '-v', '--tb=short'])
