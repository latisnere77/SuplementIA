"""
SuplementIA - Vector Search API with LanceDB
Lambda ARM64 function for semantic supplement search
"""

import json
import os
import time
from typing import List, Dict, Optional
import boto3
import lancedb
from sentence_transformers import SentenceTransformer

# Environment variables
LANCEDB_PATH = os.environ.get('LANCEDB_PATH', '/mnt/efs/suplementia-lancedb')
MODEL_PATH = os.environ.get('MODEL_PATH', '/mnt/efs/models/all-MiniLM-L6-v2')
DYNAMODB_CACHE_TABLE = os.environ.get('DYNAMODB_CACHE_TABLE', 'supplement-cache')
SIMILARITY_THRESHOLD = float(os.environ.get('SIMILARITY_THRESHOLD', '0.85'))

# Global variables (cached across invocations)
db = None
model = None
dynamodb = boto3.resource('dynamodb')
cache_table = dynamodb.Table(DYNAMODB_CACHE_TABLE)


def initialize():
    """Initialize LanceDB and ML model (cached across invocations)"""
    global db, model
    
    if db is None:
        print(f"Initializing LanceDB from {LANCEDB_PATH}")
        db = lancedb.connect(LANCEDB_PATH)
    
    if model is None:
        print(f"Loading Sentence Transformers model from {MODEL_PATH}")
        model = SentenceTransformer(MODEL_PATH)
    
    return db, model


def check_cache(query_hash: str) -> Optional[Dict]:
    """Check DynamoDB cache for cached result"""
    try:
        response = cache_table.get_item(
            Key={
                'PK': f'SUPPLEMENT#{query_hash}',
                'SK': 'QUERY'
            }
        )
        
        if 'Item' in response:
            print(f"Cache hit for query hash: {query_hash}")
            return response['Item'].get('supplementData')
        
        return None
    except Exception as e:
        print(f"Cache check error: {str(e)}")
        return None


def store_cache(query_hash: str, supplement_data: Dict, embedding: List[float]):
    """Store result in DynamoDB cache"""
    try:
        import time
        ttl = int(time.time()) + (7 * 24 * 60 * 60)  # 7 days
        
        cache_table.put_item(
            Item={
                'PK': f'SUPPLEMENT#{query_hash}',
                'SK': 'QUERY',
                'supplementData': supplement_data,
                'embedding': embedding,
                'ttl': ttl,
                'searchCount': 1,
                'lastAccessed': int(time.time())
            }
        )
        print(f"Cached result for query hash: {query_hash}")
    except Exception as e:
        print(f"Cache store error: {str(e)}")


def vector_search(query: str, limit: int = 5) -> List[Dict]:
    """
    Perform vector search using LanceDB
    
    Args:
        query: Search query text
        limit: Maximum number of results
        
    Returns:
        List of matching supplements with similarity scores
    """
    start_time = time.time()
    
    # Initialize
    db, model = initialize()
    
    # Generate embedding
    embedding_start = time.time()
    embedding = model.encode(query).tolist()
    embedding_time = (time.time() - embedding_start) * 1000
    print(f"Embedding generation: {embedding_time:.2f}ms")
    
    # Search LanceDB
    search_start = time.time()
    table = db.open_table("supplements")
    
    results = (
        table.search(embedding)
        .metric("cosine")
        .limit(limit)
        .to_list()
    )
    
    search_time = (time.time() - search_start) * 1000
    print(f"LanceDB search: {search_time:.2f}ms")
    
    # Filter by similarity threshold
    filtered_results = [
        r for r in results 
        if (1 - r.get('_distance', 1)) >= SIMILARITY_THRESHOLD
    ]
    
    total_time = (time.time() - start_time) * 1000
    print(f"Total search time: {total_time:.2f}ms, Results: {len(filtered_results)}")
    
    return filtered_results


def lambda_handler(event, context):
    """
    Lambda handler for supplement search
    
    Query parameters:
        q: Search query (required)
        limit: Max results (optional, default: 5)
    """
    try:
        # Parse query parameters
        query_params = event.get('queryStringParameters', {})
        if not query_params:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Missing query parameters',
                    'message': 'Query parameter "q" is required'
                })
            }
        
        query = query_params.get('q', '').strip()
        if not query:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Empty query',
                    'message': 'Query parameter "q" cannot be empty'
                })
            }
        
        # Validate query length
        if len(query) > 200:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Query too long',
                    'message': 'Query must be less than 200 characters'
                })
            }
        
        limit = int(query_params.get('limit', 5))
        
        # Generate query hash for caching
        import hashlib
        query_hash = hashlib.sha256(query.lower().encode()).hexdigest()[:16]
        
        # Check cache
        cached_result = check_cache(query_hash)
        if cached_result:
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'success': True,
                    'supplement': cached_result,
                    'cacheHit': True,
                    'source': 'dynamodb'
                })
            }
        
        # Perform vector search
        results = vector_search(query, limit)
        
        if not results:
            # Add to discovery queue
            add_to_discovery_queue(query)
            
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'success': False,
                    'message': 'Supplement not found',
                    'query': query,
                    'suggestion': 'This supplement has been added to our discovery queue'
                })
            }
        
        # Get best match
        best_match = results[0]
        similarity = 1 - best_match.get('_distance', 1)
        
        supplement_data = {
            'id': best_match.get('id'),
            'name': best_match.get('name'),
            'scientificName': best_match.get('scientific_name'),
            'commonNames': best_match.get('common_names', []),
            'metadata': best_match.get('metadata', {}),
            'similarity': round(similarity, 3)
        }
        
        # Store in cache
        embedding = model.encode(query).tolist()
        store_cache(query_hash, supplement_data, embedding)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'success': True,
                'supplement': supplement_data,
                'cacheHit': False,
                'source': 'lancedb',
                'alternativeMatches': len(results) - 1
            })
        }
        
    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }


def add_to_discovery_queue(query: str):
    """Add unknown supplement to discovery queue"""
    try:
        discovery_table = dynamodb.Table('discovery-queue')
        
        import hashlib
        query_id = hashlib.sha256(query.encode()).hexdigest()[:16]
        
        discovery_table.put_item(
            Item={
                'PK': f'DISCOVERY#{query_id}',
                'SK': 'PENDING',
                'query': query,
                'searchCount': 1,
                'priority': 1,
                'status': 'pending',
                'createdAt': int(time.time())
            }
        )
        print(f"Added to discovery queue: {query}")
    except Exception as e:
        print(f"Error adding to discovery queue: {str(e)}")
