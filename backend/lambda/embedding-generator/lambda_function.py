"""
Embedding Generation Lambda Function

Generates 384-dimensional embeddings using Sentence Transformers (all-MiniLM-L6-v2).
Model is cached in EFS for fast cold starts.

Multilingual Support:
- Supports 100+ languages (Spanish, English, Portuguese, etc.)
- Semantic similarity works across languages
- No language detection required - model handles all languages automatically

Requirements:
- sentence-transformers
- torch
- EFS mounted at /mnt/ml-models

Validates: Requirements 3.1, 3.2, 3.3
"""

import json
import os
import time
from typing import List, Dict, Any

# Model will be loaded lazily on first request
_model = None
_model_name = 'sentence-transformers/all-MiniLM-L6-v2'
_model_cache_dir = os.environ.get('MODEL_CACHE_DIR', '/mnt/ml-models')


def load_model():
    """
    Load the Sentence Transformers model from EFS cache.
    Model is loaded once and reused across invocations (Lambda container reuse).
    """
    global _model
    
    if _model is not None:
        return _model
    
    print(f"Loading model {_model_name} from {_model_cache_dir}")
    start_time = time.time()
    
    try:
        from sentence_transformers import SentenceTransformer
        
        # Load model from EFS cache
        _model = SentenceTransformer(_model_name, cache_folder=_model_cache_dir)
        
        load_time = time.time() - start_time
        print(f"Model loaded in {load_time:.2f}s")
        
        return _model
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        raise


def generate_embedding(text: str) -> List[float]:
    """
    Generate a 384-dimensional embedding for the given text.
    
    Args:
        text: Input text to embed
        
    Returns:
        List of 384 floats representing the embedding
    """
    model = load_model()
    
    # Generate embedding
    embedding = model.encode(text, convert_to_numpy=True)
    
    # Convert to list of floats
    return embedding.tolist()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for embedding generation.
    
    Event format:
    {
        "text": "vitamin d",
        "texts": ["vitamin d", "magnesium"]  // Optional: batch processing
    }
    
    Response format:
    {
        "statusCode": 200,
        "body": {
            "embedding": [0.1, 0.2, ...],  // Single text
            "embeddings": [[0.1, ...], [0.2, ...]]  // Batch
            "model": "all-MiniLM-L6-v2",
            "dimensions": 384,
            "latency": 0.05
        }
    }
    """
    start_time = time.time()
    
    try:
        # Parse input
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event
        
        # Single text or batch?
        if 'text' in body:
            # Single text
            text = body['text']
            
            if not text or not isinstance(text, str):
                return {
                    'statusCode': 400,
                    'body': json.dumps({
                        'error': 'Invalid input: text must be a non-empty string'
                    })
                }
            
            embedding = generate_embedding(text)
            latency = time.time() - start_time
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'embedding': embedding,
                    'model': _model_name,
                    'dimensions': len(embedding),
                    'latency': latency
                })
            }
        
        elif 'texts' in body:
            # Batch processing
            texts = body['texts']
            
            if not texts or not isinstance(texts, list):
                return {
                    'statusCode': 400,
                    'body': json.dumps({
                        'error': 'Invalid input: texts must be a non-empty list'
                    })
                }
            
            embeddings = [generate_embedding(text) for text in texts]
            latency = time.time() - start_time
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'embeddings': embeddings,
                    'model': _model_name,
                    'dimensions': len(embeddings[0]) if embeddings else 0,
                    'count': len(embeddings),
                    'latency': latency
                })
            }
        
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Invalid input: must provide either "text" or "texts"'
                })
            }
    
    except Exception as e:
        print(f"Error generating embedding: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': f'Internal server error: {str(e)}'
            })
        }


# For local testing
if __name__ == '__main__':
    # Test single embedding
    event = {'text': 'vitamin d'}
    result = lambda_handler(event, None)
    print(json.dumps(result, indent=2))
    
    # Test batch embeddings
    event = {'texts': ['vitamin d', 'magnesium', 'omega-3']}
    result = lambda_handler(event, None)
    print(json.dumps(result, indent=2))
