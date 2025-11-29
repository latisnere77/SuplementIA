"""
Search API Lambda Function

Main search endpoint for intelligent supplement search.
Implements multi-tier caching: DynamoDB DAX → ElastiCache Redis → RDS Postgres

Flow:
1. Check DynamoDB cache (via DAX for microsecond latency)
2. If miss, check ElastiCache Redis
3. If miss, generate embedding and query RDS Postgres (pgvector)
4. Cache result in Redis and DynamoDB
5. Return result

Validates: Requirements 1.1, 1.2, 2.1, 2.2, 5.1
"""

import json
import os
import time
import hashlib
import boto3
import redis
import psycopg2
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta

# AWS Clients
dynamodb = boto3.client('dynamodb')
lambda_client = boto3.client('lambda')
cloudwatch = boto3.client('cloudwatch')
ssm = boto3.client('ssm')

# Environment Variables
SUPPLEMENT_CACHE_TABLE = os.environ.get('SUPPLEMENT_CACHE_TABLE', 'staging-supplement-cache')
DISCOVERY_QUEUE_TABLE = os.environ.get('DISCOVERY_QUEUE_TABLE', 'staging-discovery-queue')
REDIS_ENDPOINT = os.environ.get('REDIS_ENDPOINT')
REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
RDS_HOST = os.environ.get('RDS_HOST')
RDS_DATABASE = os.environ.get('RDS_DATABASE', 'postgres')
RDS_USER = os.environ.get('RDS_USER', 'postgres')
RDS_PASSWORD_PARAM = os.environ.get('RDS_PASSWORD_PARAM', '/suplementia/rds/password')
EMBEDDING_LAMBDA_ARN = os.environ.get('EMBEDDING_LAMBDA_ARN')

# Cache Configuration
CACHE_TTL_DAYS = 7
CACHE_TTL_SECONDS = CACHE_TTL_DAYS * 24 * 60 * 60

# Search Configuration
SIMILARITY_THRESHOLD = 0.85
MAX_RESULTS = 5
DISCOVERY_THRESHOLD = 10  # Add to discovery queue after 10 searches

# Connection pools (reused across invocations)
redis_client = None
db_conn = None


def get_redis_client():
    """Get or create Redis client"""
    global redis_client
    
    if redis_client is None:
        redis_client = redis.Redis(
            host=REDIS_ENDPOINT,
            port=REDIS_PORT,
            decode_responses=True,
            socket_connect_timeout=1,
            socket_timeout=1
        )
    
    return redis_client


def get_db_connection():
    """Get or create database connection"""
    global db_conn
    
    if db_conn is None or db_conn.closed:
        # Get password from Parameter Store
        password = ssm.get_parameter(
            Name=RDS_PASSWORD_PARAM,
            WithDecryption=True
        )['Parameter']['Value']
        
        db_conn = psycopg2.connect(
            host=RDS_HOST,
            database=RDS_DATABASE,
            user=RDS_USER,
            password=password,
            connect_timeout=5
        )
    
    return db_conn


def hash_query(query: str) -> str:
    """Generate hash for cache key"""
    return hashlib.sha256(query.lower().encode()).hexdigest()[:16]


def check_dynamodb_cache(query_hash: str) -> Optional[Dict]:
    """
    Check DynamoDB cache (L1 - via DAX for microsecond latency)
    
    Returns:
        Cached supplement data or None
    """
    try:
        start_time = time.time()
        
        response = dynamodb.get_item(
            TableName=SUPPLEMENT_CACHE_TABLE,
            Key={
                'PK': {'S': f'SUPPLEMENT#{query_hash}'},
                'SK': {'S': 'QUERY'}
            }
        )
        
        latency = (time.time() - start_time) * 1000  # ms
        
        if 'Item' in response:
            print(f'DynamoDB cache HIT (latency: {latency:.2f}ms)')
            
            # Parse supplement data
            item = response['Item']
            supplement_data = json.loads(item['supplementData']['S'])
            
            # Update access metrics
            dynamodb.update_item(
                TableName=SUPPLEMENT_CACHE_TABLE,
                Key={
                    'PK': {'S': f'SUPPLEMENT#{query_hash}'},
                    'SK': {'S': 'QUERY'}
                },
                UpdateExpression='SET lastAccessed = :now, searchCount = searchCount + :inc',
                ExpressionAttributeValues={
                    ':now': {'N': str(int(time.time()))},
                    ':inc': {'N': '1'}
                }
            )
            
            return {
                'supplement': supplement_data,
                'source': 'dynamodb',
                'latency': latency
            }
        
        print(f'DynamoDB cache MISS (latency: {latency:.2f}ms)')
        return None
        
    except Exception as e:
        print(f'DynamoDB cache error: {str(e)}')
        return None


def check_redis_cache(query_hash: str) -> Optional[Dict]:
    """
    Check ElastiCache Redis (L2 - millisecond latency)
    
    Returns:
        Cached supplement data or None
    """
    try:
        start_time = time.time()
        redis_conn = get_redis_client()
        
        cache_key = f'supplement:query:{query_hash}'
        cached_data = redis_conn.get(cache_key)
        
        latency = (time.time() - start_time) * 1000  # ms
        
        if cached_data:
            print(f'Redis cache HIT (latency: {latency:.2f}ms)')
            
            supplement_data = json.loads(cached_data)
            
            # Update access count
            redis_conn.incr(f'supplement:count:{query_hash}')
            
            return {
                'supplement': supplement_data,
                'source': 'redis',
                'latency': latency
            }
        
        print(f'Redis cache MISS (latency: {latency:.2f}ms)')
        return None
        
    except Exception as e:
        print(f'Redis cache error: {str(e)}')
        return None


def generate_embedding(text: str) -> List[float]:
    """Generate embedding by invoking embedding generator Lambda"""
    try:
        response = lambda_client.invoke(
            FunctionName=EMBEDDING_LAMBDA_ARN,
            InvocationType='RequestResponse',
            Payload=json.dumps({'text': text})
        )
        
        result = json.loads(response['Payload'].read())
        body = json.loads(result.get('body', '{}'))
        
        embedding = body.get('embedding')
        if not embedding or len(embedding) != 384:
            raise Exception(f'Invalid embedding dimensions: {len(embedding) if embedding else 0}')
        
        return embedding
        
    except Exception as e:
        print(f'Embedding generation error: {str(e)}')
        raise


def exact_name_search(query: str) -> Optional[Dict]:
    """
    Search RDS Postgres by exact name/common_names match

    This runs BEFORE vector search to handle supplements with null embeddings
    and ensure exact matches are prioritized.

    Returns:
        Matching supplement or None
    """
    try:
        start_time = time.time()
        conn = get_db_connection()
        cursor = conn.cursor()

        # Normalize query for comparison
        query_lower = query.lower().strip()

        # Search by exact name match (case-insensitive) or in common_names array
        cursor.execute("""
            SELECT
                id,
                name,
                scientific_name,
                common_names,
                metadata,
                search_count
            FROM supplements
            WHERE LOWER(name) = %s
               OR LOWER(scientific_name) = %s
               OR EXISTS (
                   SELECT 1 FROM unnest(common_names) AS cn
                   WHERE LOWER(cn) = %s
               )
            LIMIT 1
        """, (query_lower, query_lower, query_lower))

        result = cursor.fetchone()
        latency = (time.time() - start_time) * 1000  # ms

        cursor.close()

        if result:
            supplement = {
                'id': result[0],
                'name': result[1],
                'scientificName': result[2],
                'commonNames': result[3],
                'metadata': result[4],
                'searchCount': result[5],
                'similarity': 1.0  # Exact match = 100% similarity
            }

            print(f'Exact name search: Found {result[1]} (latency: {latency:.2f}ms)')

            # Update search count
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE supplements
                SET search_count = search_count + 1,
                    last_searched_at = NOW()
                WHERE id = %s
            """, (supplement['id'],))
            conn.commit()
            cursor.close()

            return {
                'supplement': supplement,
                'source': 'postgres-exact',
                'latency': latency
            }

        print(f'Exact name search: No match for "{query}" (latency: {latency:.2f}ms)')
        return None

    except Exception as e:
        print(f'Exact name search error: {str(e)}')
        return None


def vector_search(embedding: List[float]) -> Optional[Dict]:
    """
    Search RDS Postgres using pgvector similarity

    Returns:
        Best matching supplement or None
    """
    try:
        start_time = time.time()
        conn = get_db_connection()
        cursor = conn.cursor()

        # Vector similarity search using cosine distance
        # Only search supplements that HAVE embeddings (not null)
        cursor.execute("""
            SELECT
                id,
                name,
                scientific_name,
                common_names,
                metadata,
                search_count,
                1 - (embedding <=> %s::vector) as similarity
            FROM supplements
            WHERE embedding IS NOT NULL
              AND 1 - (embedding <=> %s::vector) > %s
            ORDER BY similarity DESC
            LIMIT %s
        """, (embedding, embedding, SIMILARITY_THRESHOLD, MAX_RESULTS))
        
        results = cursor.fetchall()
        latency = (time.time() - start_time) * 1000  # ms
        
        cursor.close()
        
        if not results:
            print(f'Vector search: No results above threshold {SIMILARITY_THRESHOLD}')
            return None
        
        # Parse best result
        row = results[0]
        supplement = {
            'id': row[0],
            'name': row[1],
            'scientificName': row[2],
            'commonNames': row[3],
            'metadata': row[4],
            'searchCount': row[5],
            'similarity': float(row[6])
        }
        
        print(f'Vector search: Found {row[1]} (similarity: {supplement["similarity"]:.3f}, latency: {latency:.2f}ms)')
        
        # Update search count
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE supplements
            SET search_count = search_count + 1,
                last_searched_at = NOW()
            WHERE id = %s
        """, (supplement['id'],))
        conn.commit()
        cursor.close()
        
        return {
            'supplement': supplement,
            'source': 'postgres',
            'latency': latency
        }
        
    except Exception as e:
        print(f'Vector search error: {str(e)}')
        raise


def cache_supplement(query_hash: str, supplement: Dict):
    """Cache supplement in both Redis and DynamoDB"""
    try:
        # Cache in Redis (L2)
        redis_conn = get_redis_client()
        cache_key = f'supplement:query:{query_hash}'
        redis_conn.setex(
            cache_key,
            CACHE_TTL_SECONDS,
            json.dumps(supplement)
        )
        print(f'Cached in Redis: {cache_key}')
        
        # Cache in DynamoDB (L1 - will be auto-cached by DAX)
        ttl = int(time.time()) + CACHE_TTL_SECONDS
        dynamodb.put_item(
            TableName=SUPPLEMENT_CACHE_TABLE,
            Item={
                'PK': {'S': f'SUPPLEMENT#{query_hash}'},
                'SK': {'S': 'QUERY'},
                'supplementData': {'S': json.dumps(supplement)},
                'embedding': {'L': [{'N': str(x)} for x in supplement.get('embedding', [])]},
                'ttl': {'N': str(ttl)},
                'searchCount': {'N': '1'},
                'lastAccessed': {'N': str(int(time.time()))}
            }
        )
        print(f'Cached in DynamoDB: SUPPLEMENT#{query_hash}')
        
    except Exception as e:
        print(f'Cache write error: {str(e)}')
        # Non-critical, don't fail the request


def add_to_discovery_queue(query: str, search_count: int):
    """Add unknown supplement to discovery queue"""
    try:
        item_id = hash_query(query)
        priority = search_count  # Higher search count = higher priority
        
        dynamodb.put_item(
            TableName=DISCOVERY_QUEUE_TABLE,
            Item={
                'id': {'S': item_id},
                'query': {'S': query},
                'normalizedQuery': {'S': query.lower().strip()},
                'searchCount': {'N': str(search_count)},
                'priority': {'N': str(priority)},
                'status': {'S': 'pending'},
                'createdAt': {'N': str(int(time.time() * 1000))}
            }
        )
        print(f'Added to discovery queue: {query} (priority: {priority})')
        
    except Exception as e:
        print(f'Discovery queue error: {str(e)}')


def publish_metrics(metric_name: str, value: float, unit: str = 'None'):
    """Publish custom metrics to CloudWatch"""
    try:
        cloudwatch.put_metric_data(
            Namespace='IntelligentSupplementSearch',
            MetricData=[
                {
                    'MetricName': metric_name,
                    'Value': value,
                    'Unit': unit,
                    'Timestamp': datetime.utcnow()
                }
            ]
        )
    except Exception as e:
        print(f'CloudWatch metrics error: {str(e)}')


def lambda_handler(event, context):
    """
    Lambda handler for supplement search
    
    Query parameters:
        q: Search query (required)
        
    Response:
        {
            "success": true,
            "supplement": {...},
            "similarity": 0.95,
            "latency": 45,
            "cacheHit": true,
            "source": "dynamodb" | "redis" | "postgres" | "discovery"
        }
    """
    start_time = time.time()
    
    try:
        # Parse query
        query_params = event.get('queryStringParameters', {}) or {}
        query = query_params.get('q', '').strip()
        
        if not query:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'success': False,
                    'error': 'Query parameter "q" is required'
                })
            }
        
        # Validate query length
        if len(query) > 200:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'success': False,
                    'error': 'Query too long (max 200 characters)'
                })
            }
        
        print(f'Search query: {query}')
        query_hash = hash_query(query)
        
        # Step 1: Check DynamoDB cache (L1 via DAX)
        cached_result = check_dynamodb_cache(query_hash)
        if cached_result:
            total_latency = (time.time() - start_time) * 1000
            publish_metrics('CacheHit', 1, 'Count')
            publish_metrics('Latency', total_latency, 'Milliseconds')
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'success': True,
                    'supplement': cached_result['supplement'],
                    'latency': total_latency,
                    'cacheHit': True,
                    'source': 'dynamodb'
                })
            }
        
        # Step 2: Check Redis cache (L2)
        cached_result = check_redis_cache(query_hash)
        if cached_result:
            # Also cache in DynamoDB for next time
            cache_supplement(query_hash, cached_result['supplement'])
            
            total_latency = (time.time() - start_time) * 1000
            publish_metrics('CacheHit', 1, 'Count')
            publish_metrics('Latency', total_latency, 'Milliseconds')
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'success': True,
                    'supplement': cached_result['supplement'],
                    'latency': total_latency,
                    'cacheHit': True,
                    'source': 'redis'
                })
            }
        
        # Step 3: Try exact name match first (handles supplements with null embeddings)
        publish_metrics('CacheMiss', 1, 'Count')

        exact_result = exact_name_search(query)
        if exact_result:
            # Cache the result
            supplement = exact_result['supplement']
            cache_supplement(query_hash, supplement)

            total_latency = (time.time() - start_time) * 1000
            publish_metrics('Latency', total_latency, 'Milliseconds')
            publish_metrics('ExactMatchSuccess', 1, 'Count')

            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'success': True,
                    'supplement': supplement,
                    'similarity': 1.0,
                    'latency': total_latency,
                    'cacheHit': False,
                    'source': 'postgres-exact'
                })
            }

        # Step 4: Generate embedding and search RDS with vector similarity
        embedding = generate_embedding(query)
        search_result = vector_search(embedding)
        
        if search_result:
            # Cache the result
            supplement = search_result['supplement']
            supplement['embedding'] = embedding  # Include for caching
            cache_supplement(query_hash, supplement)

            total_latency = (time.time() - start_time) * 1000
            publish_metrics('Latency', total_latency, 'Milliseconds')
            publish_metrics('VectorSearchSuccess', 1, 'Count')

            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'success': True,
                    'supplement': supplement,
                    'similarity': supplement['similarity'],
                    'latency': total_latency,
                    'cacheHit': False,
                    'source': 'postgres'
                })
            }

        # Step 5: Not found - add to discovery queue
        print(f'Supplement not found: {query}')
        add_to_discovery_queue(query, 1)
        
        total_latency = (time.time() - start_time) * 1000
        publish_metrics('NotFound', 1, 'Count')
        
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'success': False,
                'message': 'Supplement not found. We\'ve added it to our discovery queue.',
                'query': query,
                'latency': total_latency,
                'source': 'discovery'
            })
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f'Search error: {error_msg}')
        
        total_latency = (time.time() - start_time) * 1000
        publish_metrics('Error', 1, 'Count')
        
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'success': False,
                'error': 'Internal server error',
                'latency': total_latency
            })
        }


# For local testing
if __name__ == '__main__':
    event = {
        'queryStringParameters': {
            'q': 'vitamin d'
        }
    }
    result = lambda_handler(event, None)
    print(json.dumps(result, indent=2))
