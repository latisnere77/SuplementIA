"""
Search API Lambda Function - OPTIMIZED (No Redis, DynamoDB only)

Main search endpoint for intelligent supplement search.
Implements single-tier caching: DynamoDB only (replaces Redis)

Flow:
1. Check DynamoDB cache (< 10ms latency)
2. If miss, generate embedding and query RDS Postgres (pgvector)
3. Cache result in DynamoDB
4. Return result

Cost Optimization:
- Removed Redis ($37.96/mes saved)
- DynamoDB pay-per-request ($0.39/mes)
- ARM64 architecture (20% cost reduction)

Validates: Requirements 1.1, 1.2, 2.1, 2.2, 5.1
"""

import json
import os
import time
import hashlib
import boto3
import psycopg2
from typing import Dict, List, Optional
from datetime import datetime, timedelta

# AWS Clients
dynamodb = boto3.resource('dynamodb')
lambda_client = boto3.client('lambda')
cloudwatch = boto3.client('cloudwatch')
secretsmanager = boto3.client('secretsmanager')

# Environment Variables
SUPPLEMENT_CACHE_TABLE = os.environ.get('SUPPLEMENT_CACHE_TABLE', 'production-supplement-cache')
DISCOVERY_QUEUE_TABLE = os.environ.get('DISCOVERY_QUEUE_TABLE', 'production-discovery-queue')
RDS_HOST = os.environ.get('RDS_HOST')
RDS_DATABASE = os.environ.get('RDS_DATABASE', 'postgres')
RDS_SECRET_ARN = os.environ.get('RDS_SECRET_ARN')  # Secrets Manager ARN
EMBEDDING_LAMBDA_ARN = os.environ.get('EMBEDDING_LAMBDA_ARN')

# Cache Configuration
CACHE_TTL_DAYS = 7
CACHE_TTL_SECONDS = CACHE_TTL_DAYS * 24 * 60 * 60

# Search Configuration
SIMILARITY_THRESHOLD = 0.85
MAX_RESULTS = 5
DISCOVERY_THRESHOLD = 10

# Connection pools (reused across invocations)
cache_table = None
discovery_table = None
db_conn = None


def get_cache_table():
    """Get or create DynamoDB cache table resource"""
    global cache_table
    if cache_table is None:
        cache_table = dynamodb.Table(SUPPLEMENT_CACHE_TABLE)
    return cache_table


def get_discovery_table():
    """Get or create DynamoDB discovery table resource"""
    global discovery_table
    if discovery_table is None:
        discovery_table = dynamodb.Table(DISCOVERY_QUEUE_TABLE)
    return discovery_table


def get_db_connection():
    """Get or create database connection"""
    global db_conn
    
    if db_conn is None or db_conn.closed:
        # Get credentials from Secrets Manager (Best Practice)
        secret_response = secretsmanager.get_secret_value(SecretId=RDS_SECRET_ARN)
        secret = json.loads(secret_response['SecretString'])
        
        db_conn = psycopg2.connect(
            host=RDS_HOST,
            database=RDS_DATABASE,
            user=secret['username'],
            password=secret['password'],
            connect_timeout=5
        )
    
    return db_conn


def hash_query(query: str) -> str:
    """Generate hash for cache key"""
    return hashlib.sha256(query.lower().encode()).hexdigest()[:16]


def check_dynamodb_cache(query_hash: str, query: str) -> Optional[Dict]:
    """
    Check DynamoDB cache (< 10ms latency)
    
    Args:
        query_hash: Hash of the query
        query: Original query string
        
    Returns:
        Cached supplement data or None
    """
    try:
        start_time = time.time()
        table = get_cache_table()
        
        response = table.get_item(
            Key={
                'PK': f'CACHE#{query_hash}',
                'SK': 'DATA'
            }
        )
        
        latency = (time.time() - start_time) * 1000  # ms
        
        if 'Item' in response:
            item = response['Item']
            
            # Check TTL
            if item.get('ttl', 0) > int(time.time()):
                print(f'DynamoDB cache HIT (latency: {latency:.2f}ms)')
                
                # Parse supplement data
                supplement_data = json.loads(item['data'])
                
                # Update access metrics (async, don't wait)
                try:
                    table.update_item(
                        Key={
                            'PK': f'CACHE#{query_hash}',
                            'SK': 'DATA'
                        },
                        UpdateExpression='SET lastAccessed = :now, searchCount = if_not_exists(searchCount, :zero) + :inc',
                        ExpressionAttributeValues={
                            ':now': datetime.now().isoformat(),
                            ':zero': 0,
                            ':inc': 1
                        }
                    )
                except Exception as e:
                    print(f'Update metrics error (non-critical): {e}')
                
                return {
                    'supplement': supplement_data,
                    'source': 'dynamodb',
                    'latency': latency
                }
            else:
                print(f'DynamoDB cache EXPIRED (latency: {latency:.2f}ms)')
        else:
            print(f'DynamoDB cache MISS (latency: {latency:.2f}ms)')
        
        return None
        
    except Exception as e:
        print(f'DynamoDB cache error: {str(e)}')
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
            WHERE 1 - (embedding <=> %s::vector) > %s
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


def cache_supplement(query_hash: str, query: str, supplement: Dict):
    """
    Cache supplement in DynamoDB
    
    Args:
        query_hash: Hash of the query
        query: Original query string
        supplement: Supplement data to cache
    """
    try:
        start_time = time.time()
        table = get_cache_table()
        
        ttl = int(time.time()) + CACHE_TTL_SECONDS
        
        table.put_item(
            Item={
                'PK': f'CACHE#{query_hash}',
                'SK': 'DATA',
                'data': json.dumps(supplement),
                'searchQuery': query.lower(),  # For GSI
                'ttl': ttl,
                'searchCount': 1,
                'createdAt': datetime.now().isoformat(),
                'lastAccessed': datetime.now().isoformat()
            }
        )
        
        latency = (time.time() - start_time) * 1000
        print(f'Cached in DynamoDB: CACHE#{query_hash} (latency: {latency:.2f}ms)')
        
    except Exception as e:
        print(f'Cache write error (non-critical): {str(e)}')
        # Non-critical, don't fail the request


def add_to_discovery_queue(query: str, search_count: int):
    """Add unknown supplement to discovery queue"""
    try:
        table = get_discovery_table()
        item_id = hash_query(query)
        priority = search_count  # Higher search count = higher priority
        
        table.put_item(
            Item={
                'id': item_id,
                'query': query,
                'normalizedQuery': query.lower().strip(),
                'searchCount': search_count,
                'priority': priority,
                'status': 'pending',
                'createdAt': int(time.time() * 1000)
            }
        )
        print(f'Added to discovery queue: {query} (priority: {priority})')
        
    except Exception as e:
        print(f'Discovery queue error: {str(e)}')


def publish_metrics(metric_name: str, value: float, unit: str = 'None'):
    """Publish custom metrics to CloudWatch"""
    try:
        cloudwatch.put_metric_data(
            Namespace='IntelligentSearch',
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
            "source": "dynamodb" | "postgres" | "discovery"
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
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'error': 'Query parameter "q" is required'
                })
            }
        
        # Validate query length
        if len(query) > 200:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'error': 'Query too long (max 200 characters)'
                })
            }
        
        print(f'Search query: {query}')
        query_hash = hash_query(query)
        
        # Step 1: Check DynamoDB cache
        cached_result = check_dynamodb_cache(query_hash, query)
        if cached_result:
            total_latency = (time.time() - start_time) * 1000
            publish_metrics('CacheHit', 1, 'Count')
            publish_metrics('CacheHitRate', 100, 'Percent')
            publish_metrics('Latency', total_latency, 'Milliseconds')
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': True,
                    'supplement': cached_result['supplement'],
                    'latency': total_latency,
                    'cacheHit': True,
                    'source': 'dynamodb'
                })
            }
        
        # Step 2: Generate embedding and search RDS
        publish_metrics('CacheMiss', 1, 'Count')
        publish_metrics('CacheHitRate', 0, 'Percent')
        
        embedding = generate_embedding(query)
        search_result = vector_search(embedding)
        
        if search_result:
            # Cache the result
            supplement = search_result['supplement']
            cache_supplement(query_hash, query, supplement)
            
            total_latency = (time.time() - start_time) * 1000
            publish_metrics('Latency', total_latency, 'Milliseconds')
            publish_metrics('VectorSearchSuccess', 1, 'Count')
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': True,
                    'supplement': supplement,
                    'similarity': supplement['similarity'],
                    'latency': total_latency,
                    'cacheHit': False,
                    'source': 'postgres'
                })
            }
        
        # Step 3: Not found - add to discovery queue
        print(f'Supplement not found: {query}')
        add_to_discovery_queue(query, 1)
        
        total_latency = (time.time() - start_time) * 1000
        publish_metrics('NotFound', 1, 'Count')
        
        return {
            'statusCode': 404,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
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
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
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
