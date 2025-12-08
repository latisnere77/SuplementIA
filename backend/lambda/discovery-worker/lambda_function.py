"""
Discovery Worker Lambda

Triggered by DynamoDB Stream events from the discovery queue.
Processes new supplement discoveries:
1. Validates supplement via PubMed
2. Generates embedding
3. Inserts into RDS Postgres
4. Invalidates cache
5. Updates queue item status
"""

import json
import os
import boto3
import requests
from typing import Dict, List, Optional, Tuple
import psycopg2
from psycopg2.extras import execute_values
import time

# AWS Clients
dynamodb = boto3.client('dynamodb')
eventbridge = boto3.client('events')
ssm = boto3.client('ssm')

# Environment Variables
DISCOVERY_QUEUE_TABLE = os.environ.get('DISCOVERY_QUEUE_TABLE', 'supplement-discovery-queue')
RDS_HOST = os.environ.get('RDS_HOST')
RDS_DATABASE = os.environ.get('RDS_DATABASE', 'supplements')
RDS_USER = os.environ.get('RDS_USER', 'postgres')
RDS_PASSWORD_PARAM = os.environ.get('RDS_PASSWORD_PARAM', '/suplementia/rds/password')
EMBEDDING_LAMBDA_ARN = os.environ.get('EMBEDDING_LAMBDA_ARN')
CACHE_INVALIDATION_BUS = os.environ.get('CACHE_INVALIDATION_BUS', 'default')

# PubMed API Configuration
PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
PUBMED_SEARCH_URL = f'{PUBMED_API_BASE}/esearch.fcgi'
PUBMED_RATE_LIMIT = 3  # requests per second (NCBI limit without API key)

# Evidence thresholds
LOW_EVIDENCE_THRESHOLD = 5

# Lambda client for invoking embedding generator
lambda_client = boto3.client('lambda')

# Database connection (reused across invocations)
db_conn = None


def get_db_connection():
    """Get or create database connection (connection pooling)"""
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


def validate_pubmed(query: str) -> Tuple[int, bool]:
    """
    Validate supplement via PubMed API
    
    Returns:
        (study_count, is_valid)
    """
    try:
        # Search PubMed for studies
        params = {
            'db': 'pubmed',
            'term': f'{query}[Title/Abstract] AND (supplement OR supplementation)',
            'retmode': 'json',
            'retmax': 0,  # We only need the count
        }
        
        response = requests.get(PUBMED_SEARCH_URL, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        study_count = int(data.get('esearchresult', {}).get('count', 0))
        
        # Valid if at least 1 study exists
        is_valid = study_count > 0
        
        # Rate limiting
        time.sleep(1.0 / PUBMED_RATE_LIMIT)
        
        return study_count, is_valid
        
    except Exception as e:
        print(f'PubMed validation error for {query}: {str(e)}')
        # On error, assume valid but with 0 studies
        return 0, True


def generate_embedding(text: str) -> List[float]:
    """
    Generate embedding by invoking the embedding generator Lambda
    
    Returns:
        384-dimensional embedding vector
    """
    try:
        response = lambda_client.invoke(
            FunctionName=EMBEDDING_LAMBDA_ARN,
            InvocationType='RequestResponse',
            Payload=json.dumps({'text': text})
        )
        
        result = json.loads(response['Payload'].read())
        
        if 'errorMessage' in result:
            raise Exception(f"Embedding generation failed: {result['errorMessage']}")
        
        embedding = result.get('embedding')
        if not embedding or len(embedding) != 384:
            raise Exception(f"Invalid embedding dimensions: {len(embedding) if embedding else 0}")
        
        return embedding
        
    except Exception as e:
        print(f'Embedding generation error: {str(e)}')
        raise


def insert_supplement(
    name: str,
    normalized_name: str,
    embedding: List[float],
    study_count: int,
    validation_status: str
) -> int:
    """
    Insert supplement into RDS Postgres
    
    Returns:
        supplement_id
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Prepare metadata
        metadata = {
            'category': 'other',  # Default, can be enhanced later
            'popularity': 'low',
            'evidenceGrade': 'D' if study_count < LOW_EVIDENCE_THRESHOLD else 'C',
            'studyCount': study_count,
            'pubmedQuery': f'{name} supplement',
            'discoveredVia': 'auto-discovery',
        }
        
        # Insert supplement
        cursor.execute("""
            INSERT INTO supplements (
                name,
                scientific_name,
                common_names,
                embedding,
                metadata,
                search_count,
                last_searched_at,
                created_at,
                updated_at
            ) VALUES (
                %s, %s, %s, %s::vector, %s::jsonb, %s, NOW(), NOW(), NOW()
            )
            RETURNING id
        """, (
            name,
            normalized_name,
            [name, normalized_name],
            embedding,
            json.dumps(metadata),
            1  # Initial search count
        ))
        
        supplement_id = cursor.fetchone()[0]
        conn.commit()
        
        print(f'Inserted supplement: {name} (ID: {supplement_id})')
        return supplement_id
        
    except Exception as e:
        conn.rollback()
        print(f'Database insertion error: {str(e)}')
        raise
    finally:
        cursor.close()


def invalidate_cache(supplement_name: str):
    """
    Invalidate cache via EventBridge
    """
    try:
        eventbridge.put_events(
            Entries=[
                {
                    'Source': 'suplementia.discovery',
                    'DetailType': 'CacheInvalidation',
                    'Detail': json.dumps({
                        'supplementName': supplement_name,
                        'reason': 'new-supplement-discovered',
                        'timestamp': int(time.time() * 1000)
                    }),
                    'EventBusName': CACHE_INVALIDATION_BUS
                }
            ]
        )
        print(f'Cache invalidation event sent for: {supplement_name}')
    except Exception as e:
        print(f'Cache invalidation error: {str(e)}')
        # Non-critical, don't fail the whole process


def update_queue_item(item_id: str, updates: Dict):
    """
    Update discovery queue item in DynamoDB
    """
    # Build update expression
    update_expr_parts = []
    expr_attr_names = {}
    expr_attr_values = {}
    
    for key, value in updates.items():
        update_expr_parts.append(f'#{key} = :{key}')
        expr_attr_names[f'#{key}'] = key
        
        # Convert to DynamoDB format
        if isinstance(value, str):
            expr_attr_values[f':{key}'] = {'S': value}
        elif isinstance(value, int):
            expr_attr_values[f':{key}'] = {'N': str(value)}
        elif isinstance(value, bool):
            expr_attr_values[f':{key}'] = {'BOOL': value}
    
    dynamodb.update_item(
        TableName=DISCOVERY_QUEUE_TABLE,
        Key={'id': {'S': item_id}},
        UpdateExpression=f"SET {', '.join(update_expr_parts)}",
        ExpressionAttributeNames=expr_attr_names,
        ExpressionAttributeValues=expr_attr_values
    )


def process_discovery_item(item: Dict) -> Dict:
    """
    Process a single discovery queue item
    
    Returns:
        Processing result with status and details
    """
    item_id = item['id']['S']
    query = item['query']['S']
    normalized_query = item['normalizedQuery']['S']
    
    print(f'Processing discovery item: {item_id} - {query}')
    
    try:
        # Step 1: Validate via PubMed
        study_count, is_valid = validate_pubmed(normalized_query)
        
        if not is_valid:
            # No studies found, mark as invalid but don't fail
            update_queue_item(item_id, {
                'status': 'completed',
                'processedAt': int(time.time() * 1000),
                'pubmedStudyCount': 0,
                'validationStatus': 'invalid'
            })
            return {
                'status': 'completed',
                'reason': 'no-pubmed-studies',
                'studyCount': 0
            }
        
        # Determine validation status
        validation_status = 'low-evidence' if study_count < LOW_EVIDENCE_THRESHOLD else 'valid'
        
        # Step 2: Generate embedding
        embedding = generate_embedding(normalized_query)
        
        # Step 3: Insert into RDS
        supplement_id = insert_supplement(
            name=query,
            normalized_name=normalized_query,
            embedding=embedding,
            study_count=study_count,
            validation_status=validation_status
        )
        
        # Step 4: Invalidate cache
        invalidate_cache(normalized_query)
        
        # Step 5: Update queue item as completed
        update_queue_item(item_id, {
            'status': 'completed',
            'processedAt': int(time.time() * 1000),
            'supplementId': supplement_id,
            'pubmedStudyCount': study_count,
            'validationStatus': validation_status
        })
        
        return {
            'status': 'completed',
            'supplementId': supplement_id,
            'studyCount': study_count,
            'validationStatus': validation_status
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f'Error processing {item_id}: {error_msg}')
        
        # Get current retry count
        retry_count = int(item.get('retryCount', {}).get('N', '0'))
        
        # Update as failed
        update_queue_item(item_id, {
            'status': 'failed',
            'processedAt': int(time.time() * 1000),
            'failureReason': error_msg,
            'retryCount': retry_count + 1
        })
        
        return {
            'status': 'failed',
            'reason': error_msg,
            'retryCount': retry_count + 1
        }


def lambda_handler(event, context):
    """
    Lambda handler triggered by DynamoDB Stream
    """
    print(f'Received {len(event["Records"])} records')
    
    results = []
    
    for record in event['Records']:
        # Only process INSERT and MODIFY events for items with status 'pending'
        if record['eventName'] in ['INSERT', 'MODIFY']:
            new_image = record['dynamodb'].get('NewImage', {})
            status = new_image.get('status', {}).get('S')
            
            # Only process pending items
            if status == 'pending':
                result = process_discovery_item(new_image)
                results.append(result)
    
    # Summary
    completed = sum(1 for r in results if r['status'] == 'completed')
    failed = sum(1 for r in results if r['status'] == 'failed')
    
    print(f'Processing complete: {completed} completed, {failed} failed')
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'processed': len(results),
            'completed': completed,
            'failed': failed,
            'results': results
        })
    }
