"""
SuplementIA - Vector Search API with LanceDB (OPTIMIZED)
Lambda ARM64 function with performance improvements
"""

import json
import os
import time
from typing import List, Dict, Optional
from functools import lru_cache, wraps
import hashlib
import boto3
from botocore.config import Config
import lancedb
from sentence_transformers import SentenceTransformer

# AWS X-Ray
try:
    from aws_xray_sdk.core import xray_recorder
    XRAY_ENABLED = True
except ImportError:
    XRAY_ENABLED = False
    # Mock xray_recorder for local testing
    class MockXRay:
        def capture(self, name):
            class MockContext:
                def __enter__(self): return self
                def __exit__(self, *args): pass
            return MockContext()
    xray_recorder = MockXRay()

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

# Global variables (cached across invocations)
db = None
model = None
dynamodb = boto3.resource('dynamodb', config=boto_config)
cache_table = dynamodb.Table(DYNAMODB_CACHE_TABLE)
cloudwatch = boto3.client('cloudwatch', config=boto_config)

# Metrics tracking
metrics = {
    'cache_hits': 0,
    'cache_misses': 0,
    'searches': 0,
    'errors': 0
}


def log_structured(event_type: str, **kwargs):
    """Structured logging for better CloudWatch Insights"""
    log_entry = {
        'timestamp': time.time(),
        'event_type': event_type,
        **kwargs
    }
    print(json.dumps(log_entry))


def publish_metric(metric_name: str, value: float, unit: str = 'None'):
    """Publish custom CloudWatch metric"""
    try:
        cloudwatch.put_metric_data(
            Namespace='SuplementIA/Search',
            MetricData=[{
                'MetricName': metric_name,
                'Value': value,
                'Unit': unit,
                'Timestamp': time.time()
            }]
        )
    except Exception as e:
        log_structured('metric_error', error=str(e), metric=metric_name)


def retry_with_backoff(retries=3, backoff_in_seconds=1):
    """Retry decorator with exponential backoff"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            x = 0
            while True:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if x == retries:
                        log_structured('retry_exhausted', 
                                     function=func.__name__, 
                                     attempts=retries,
                                     error=str(e))
                        raise e
                    sleep_time = backoff_in_seconds * (2 ** x)
                    log_structured('retry_attempt',
                                 function=func.__name__,
                                 attempt=x+1,
                                 sleep_time=sleep_time)
                    time.sleep(sleep_time)
                    x += 1
        return wrapper
    return decorator


@lru_cache(maxsize=1000)
def get_embedding_cached(query: str) -> tuple:
    """
    Cache embeddings for common queries
    Returns tuple for hashability
    """
    with xray_recorder.capture('generate_embedding'):
        embedding = model.encode(query).tolist()
        log_structured('embedding_generated', 
                      query_length=len(query),
                      embedding_dim=len(embedding))
        return tuple(embedding)


def initialize():
    """Initialize LanceDB and ML model (cached across invocations)"""
    global db, model
    
    with xray_recorder.capture('initialize_resources'):
        if db is None:
            log_structured('initializing_lancedb', path=LANCEDB_PATH)
            db = lancedb.connect(LANCEDB_PATH)
        
        if model is None:
            log_structured('loading_model', path=MODEL_PATH)
            model = SentenceTransformer(MODEL_PATH)
    
    return db, model


@retry_with_backoff(retries=3, backoff_in_seconds=0.5)
def check_cache(query_hash: str) -> Optional[Dict]:
    """Check DynamoDB cache for cached result with retry"""
    with xray_recorder.capture('check_cache'):
        try:
            response = cache_table.get_item(
                Key={
                    'PK': f'SUPPLEMENT#{query_hash}',
                    'SK': 'QUERY'
                }
            )
            
            if 'Item' in response:
                metrics['cache_hits'] += 1
                log_structured('cache_hit', query_hash=query_hash)
                publish_metric('CacheHitRate', 1, 'Count')
                return response['Item'].get('supplementData')
            
            metrics['cache_misses'] += 1
            log_structured('cache_miss', query_hash=query_hash)
            publish_metric('CacheHitRate', 0, 'Count')
            return None
            
        except Exception as e:
            log_structured('cache_error', error=str(e), query_hash=query_hash)
            metrics['errors'] += 1
            return None


@retry_with_backoff(retries=2, backoff_in_seconds=0.5)
def store_cache(query_hash: str, supplement_data: Dict, embedding: List[float]):
    """Store result in DynamoDB cache with retry"""
    with xray_recorder.capture('store_cache'):
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
            metrics['errors'] += 1


def vector_search(query: str, limit: int = 5) -> List[Dict]:
    """
    Perform vector search using LanceDB with detailed tracing
    
    Args:
        query: Search query text
        limit: Maximum number of results
        
    Returns:
        List of matching supplements with similarity scores
    """
    start_time = time.time()
    
    with xray_recorder.capture('vector_search'):
        # Initialize
        with xray_recorder.capture('initialize'):
            db, model = initialize()
        
        # Generate embedding (with cache)
        embedding = list(get_embedding_cached(query))
        
        # Search LanceDB
        with xray_recorder.capture('lancedb_search'):
            search_start = time.time()
            table = db.open_table("supplements")
            
            results = (
                table.search(embedding)
                .metric("cosine")
                .limit(limit)
                .to_list()
            )
            
            search_time = (time.time() - search_start) * 1000
            log_structured('lancedb_search_complete',
                         duration_ms=search_time,
                         results_count=len(results))
            publish_metric('LanceDBSearchLatency', search_time, 'Milliseconds')
        
        # Filter by similarity threshold
        with xray_recorder.capture('filter_results'):
            filtered_results = [
                r for r in results 
                if (1 - r.get('_distance', 1)) >= SIMILARITY_THRESHOLD
            ]
            
            log_structured('results_filtered',
                         total=len(results),
                         filtered=len(filtered_results),
                         threshold=SIMILARITY_THRESHOLD)
        
        total_time = (time.time() - start_time) * 1000
        log_structured('vector_search_complete',
                     duration_ms=total_time,
                     results=len(filtered_results))
        publish_metric('SearchLatency', total_time, 'Milliseconds')
        publish_metric('ResultsFound', len(filtered_results), 'Count')
        
        return filtered_results


def add_to_discovery_queue(query: str):
    """Add unknown supplement to discovery queue"""
    with xray_recorder.capture('add_to_discovery_queue'):
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
            metrics['errors'] += 1


def lambda_handler(event, context):
    """
    Lambda handler for supplement search with optimizations
    
    Query parameters:
        q: Search query (required)
        limit: Max results (optional, default: 5)
    """
    request_start = time.time()
    
    with xray_recorder.capture('lambda_handler'):
        try:
            metrics['searches'] += 1
            
            # Parse query parameters
            with xray_recorder.capture('parse_request'):
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
                
                log_structured('search_request',
                             query=query,
                             query_length=len(query),
                             limit=limit,
                             request_id=context.request_id)
            
            # Generate query hash for caching
            query_hash = hashlib.sha256(query.lower().encode()).hexdigest()[:16]
            
            # Check cache
            cached_result = check_cache(query_hash)
            if cached_result:
                request_time = (time.time() - request_start) * 1000
                log_structured('request_complete',
                             duration_ms=request_time,
                             cache_hit=True)
                publish_metric('TotalRequestLatency', request_time, 'Milliseconds')
                
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
            
            # Perform vector search
            results = vector_search(query, limit)
            
            if not results:
                # Add to discovery queue
                add_to_discovery_queue(query)
                
                request_time = (time.time() - request_start) * 1000
                log_structured('request_complete',
                             duration_ms=request_time,
                             found=False)
                publish_metric('TotalRequestLatency', request_time, 'Milliseconds')
                
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
            
            publish_metric('SimilarityScore', similarity, 'None')
            
            # Store in cache
            embedding = list(get_embedding_cached(query))
            store_cache(query_hash, supplement_data, embedding)
            
            request_time = (time.time() - request_start) * 1000
            log_structured('request_complete',
                         duration_ms=request_time,
                         cache_hit=False,
                         similarity=similarity)
            publish_metric('TotalRequestLatency', request_time, 'Milliseconds')
            
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
            metrics['errors'] += 1
            log_structured('lambda_error',
                         error=str(e),
                         error_type=type(e).__name__)
            
            import traceback
            traceback.print_exc()
            
            publish_metric('ErrorCount', 1, 'Count')
            
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Internal server error',
                    'message': str(e),
                    'request_id': context.request_id
                })
            }
