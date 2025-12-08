"""
SuplementIA - Vector Search API with LanceDB (LAZY LOADING)
Lambda ARM64 function with lazy initialization to avoid cold start timeout
"""

import json
import os
import time
from typing import List, Dict, Optional
import hashlib
import boto3
from botocore.config import Config

# Environment variables
LANCEDB_PATH = os.environ.get('LANCEDB_PATH', '/mnt/efs/suplementia-lancedb')
MODEL_PATH = os.environ.get('MODEL_PATH', '/mnt/efs/models/all-MiniLM-L6-v2')
DYNAMODB_CACHE_TABLE = os.environ.get('DYNAMODB_CACHE_TABLE', 'supplement-cache')
SIMILARITY_THRESHOLD = float(os.environ.get('SIMILARITY_THRESHOLD', '0.85'))

# Optimized boto3 configuration
boto_config = Config(
    max_pool_connections=50,
    retries={'max_attempts': 3, 'mode': 'adaptive'},
    connect_timeout=5,
    read_timeout=10
)

# Global variables (lazy loaded)
db = None
model = None
dynamodb = boto3.resource('dynamodb', config=boto_config)
cache_table = dynamodb.Table(DYNAMODB_CACHE_TABLE)
cloudwatch = boto3.client('cloudwatch', config=boto_config)


def log_structured(event_type: str, **kwargs):
    """Structured logging for better CloudWatch Insights"""
    log_entry = {
        'timestamp': time.time(),
        'event_type': event_type,
        **kwargs
    }
    print(json.dumps(log_entry))


def initialize_lazy():
    """
    Lazy initialization of LanceDB and ML model
    Only loads when first request comes in
    """
    global db, model
    
    if db is None:
        log_structured('initializing_lancedb', path=LANCEDB_PATH)
        import lancedb
        db = lancedb.connect(LANCEDB_PATH)
        log_structured('lancedb_initialized')
    
    if model is None:
        log_structured('loading_model', path=MODEL_PATH)
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(MODEL_PATH)
        log_structured('model_loaded')
    
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
            log_structured('cache_hit', query_hash=query_hash)
            return response['Item'].get('supplementData')
        
        log_structured('cache_miss', query_hash=query_hash)
        return None
        
    except Exception as e:
        log_structured('cache_error', error=str(e), query_hash=query_hash)
        return None


def store_cache(query_hash: str, supplement_data: Dict, embedding: List[float]):
    """Store result in DynamoDB cache"""
    try:
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
        log_structured('cache_stored', query_hash=query_hash)
    except Exception as e:
        log_structured('cache_store_error', error=str(e), query_hash=query_hash)


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
    
    # Lazy initialize (only on first request)
    db, model = initialize_lazy()
    
    # Generate embedding
    embedding_start = time.time()
    embedding = model.encode(query).tolist()
    embedding_time = (time.time() - embedding_start) * 1000
    log_structured('embedding_generated', duration_ms=embedding_time)
    
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
    log_structured('lancedb_search_complete', duration_ms=search_time, results_count=len(results))
    
    # Filter by similarity threshold
    filtered_results = [
        r for r in results 
        if (1 - r.get('_distance', 1)) >= SIMILARITY_THRESHOLD
    ]
    
    total_time = (time.time() - start_time) * 1000
    log_structured('vector_search_complete', duration_ms=total_time, results=len(filtered_results))
    
    return filtered_results


def add_to_discovery_queue(query: str):
    """Add unknown supplement to discovery queue"""
    try:
        discovery_table = dynamodb.Table('discovery-queue')
        
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
        log_structured('discovery_queued', query=query, query_id=query_id)
    except Exception as e:
        log_structured('discovery_queue_error', error=str(e), query=query)


def lambda_handler(event, context):
    """
    Lambda handler for supplement search with lazy loading
    
    Query parameters:
        q: Search query (required)
        limit: Max results (optional, default: 5)
    """
    request_start = time.time()
    
    try:
        log_structured('request_received', request_id=context.request_id)
        
        # Parse query parameters
        query_params = event.get('queryStringParameters', {})
        if not query_params:
            log_structured('invalid_request', reason='missing_params')
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
            log_structured('invalid_request', reason='empty_query')
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
            log_structured('invalid_request', reason='query_too_long', length=len(query))
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Query too long',
                    'message': 'Query must be less than 200 characters'
                })
            }
        
        limit = int(query_params.get('limit', 5))
        
        log_structured('search_request', query=query, limit=limit)
        
        # Generate query hash for caching
        query_hash = hashlib.sha256(query.lower().encode()).hexdigest()[:16]
        
        # Check cache
        cached_result = check_cache(query_hash)
        if cached_result:
            request_time = (time.time() - request_start) * 1000
            log_structured('request_complete', duration_ms=request_time, cache_hit=True)
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'success': True,
                    'supplement': cached_result,
                    'cacheHit': True,
                    'source': 'dynamodb',
                    'latency_ms': round(request_time, 2)
                })
            }
        
        # Perform vector search (this will trigger lazy loading on first request)
        results = vector_search(query, limit)
        
        if not results:
            # Add to discovery queue
            add_to_discovery_queue(query)
            
            request_time = (time.time() - request_start) * 1000
            log_structured('request_complete', duration_ms=request_time, found=False)
            
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'success': False,
                    'message': 'Supplement not found',
                    'query': query,
                    'suggestion': 'This supplement has been added to our discovery queue',
                    'latency_ms': round(request_time, 2)
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
        
        request_time = (time.time() - request_start) * 1000
        log_structured('request_complete', duration_ms=request_time, cache_hit=False, similarity=similarity)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'success': True,
                'supplement': supplement_data,
                'cacheHit': False,
                'source': 'lancedb',
                'alternativeMatches': len(results) - 1,
                'latency_ms': round(request_time, 2)
            })
        }
        
    except Exception as e:
        log_structured('lambda_error', error=str(e), error_type=type(e).__name__)
        
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
                'request_id': context.request_id
            })
        }
