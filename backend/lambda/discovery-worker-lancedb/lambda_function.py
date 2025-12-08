"""
SuplementIA - Discovery Worker with LanceDB
Background Lambda Container for auto-discovering new supplements
"""

import json
import time
import os
from typing import Dict, Optional
import boto3
import lancedb
from sentence_transformers import SentenceTransformer
import requests

# Environment variables
LANCEDB_PATH = os.environ.get('LANCEDB_PATH', '/mnt/efs/suplementia-lancedb')
# Model is pre-loaded in container, use default cache location
MODEL_PATH = os.environ.get('MODEL_PATH', 'all-MiniLM-L6-v2')
PUBMED_API_KEY = os.environ.get('PUBMED_API_KEY', '')
MIN_STUDIES = int(os.environ.get('MIN_STUDIES', '3'))

# Global variables
db = None
model = None
dynamodb = boto3.resource('dynamodb')


def initialize():
    """Initialize LanceDB and ML model"""
    global db, model
    
    if db is None:
        print(f"Initializing LanceDB from {LANCEDB_PATH}")
        db = lancedb.connect(LANCEDB_PATH)
    
    if model is None:
        print(f"Loading Sentence Transformers model from {MODEL_PATH}")
        model = SentenceTransformer(MODEL_PATH)
    
    return db, model


def query_pubmed(supplement_name: str) -> Dict:
    """
    Query PubMed for studies about the supplement
    
    Returns:
        {
            'study_count': int,
            'evidence_grade': str,
            'pubmed_query': str
        }
    """
    try:
        # Build PubMed query
        query = f"{supplement_name} AND (supplement OR supplementation)"
        
        # Search PubMed
        url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
        params = {
            'db': 'pubmed',
            'term': query,
            'retmode': 'json',
            'retmax': 0  # Only get count
        }
        
        if PUBMED_API_KEY:
            params['api_key'] = PUBMED_API_KEY
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        study_count = int(data.get('esearchresult', {}).get('count', 0))
        
        # Grade evidence based on study count
        if study_count >= 100:
            evidence_grade = 'A'
        elif study_count >= 50:
            evidence_grade = 'B'
        elif study_count >= 10:
            evidence_grade = 'C'
        else:
            evidence_grade = 'D'
        
        print(f"PubMed results for '{supplement_name}': {study_count} studies, grade {evidence_grade}")
        
        return {
            'study_count': study_count,
            'evidence_grade': evidence_grade,
            'pubmed_query': query
        }
        
    except Exception as e:
        print(f"PubMed query error: {str(e)}")
        return {
            'study_count': 0,
            'evidence_grade': 'D',
            'pubmed_query': supplement_name
        }


def insert_supplement(supplement_name: str, pubmed_data: Dict) -> bool:
    """
    Insert new supplement into LanceDB
    
    Returns:
        True if successful, False otherwise
    """
    try:
        db, model = initialize()
        
        # Generate embedding
        embedding = model.encode(supplement_name).tolist()
        
        # Open table
        table = db.open_table("supplements")
        
        # Get next ID
        existing = table.to_pandas()
        next_id = existing['id'].max() + 1 if len(existing) > 0 else 1
        
        # Insert supplement
        table.add([{
            'id': int(next_id),
            'name': supplement_name,
            'scientific_name': '',
            'common_names': [],
            'vector': embedding,
            'metadata': {
                'category': 'other',
                'popularity': 'low',
                'evidence_grade': pubmed_data['evidence_grade'],
                'study_count': pubmed_data['study_count'],
                'pubmed_query': pubmed_data['pubmed_query']
            },
            'search_count': 1,
            'last_searched_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ')
        }])
        
        print(f"Inserted supplement: {supplement_name} (ID: {next_id})")
        return True
        
    except Exception as e:
        print(f"Error inserting supplement: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def invalidate_cache(supplement_name: str):
    """Invalidate DynamoDB cache for this supplement"""
    try:
        import hashlib
        query_hash = hashlib.sha256(supplement_name.lower().encode()).hexdigest()[:16]
        
        cache_table = dynamodb.Table('supplement-cache')
        cache_table.delete_item(
            Key={
                'PK': f'SUPPLEMENT#{query_hash}',
                'SK': 'QUERY'
            }
        )
        print(f"Invalidated cache for: {supplement_name}")
    except Exception as e:
        print(f"Cache invalidation error: {str(e)}")


def update_discovery_status(pk: str, sk: str, status: str, error: Optional[str] = None):
    """Update discovery queue item status"""
    try:
        discovery_table = dynamodb.Table('discovery-queue')
        
        update_expr = 'SET #status = :status, processedAt = :processed'
        expr_values = {
            ':status': status,
            ':processed': int(time.time())
        }
        expr_names = {'#status': 'status'}
        
        if error:
            update_expr += ', errorMessage = :error'
            expr_values[':error'] = error
        
        discovery_table.update_item(
            Key={'PK': pk, 'SK': sk},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values
        )
    except Exception as e:
        print(f"Error updating discovery status: {str(e)}")


def lambda_handler(event, context):
    """
    Process discovery queue items from DynamoDB Stream
    """
    try:
        print(f"Processing {len(event['Records'])} records")
        
        for record in event['Records']:
            # Only process INSERT events
            if record['eventName'] != 'INSERT':
                continue
            
            # Parse DynamoDB record
            new_image = record['dynamodb']['NewImage']
            pk = new_image['PK']['S']
            sk = new_image['SK']['S']
            query = new_image['query']['S']
            
            print(f"Processing discovery: {query}")
            
            try:
                # Update status to processing
                update_discovery_status(pk, sk, 'processing')
                
                # Query PubMed
                pubmed_data = query_pubmed(query)
                
                # Check if meets minimum study threshold
                if pubmed_data['study_count'] < MIN_STUDIES:
                    print(f"Insufficient studies ({pubmed_data['study_count']} < {MIN_STUDIES}), skipping")
                    update_discovery_status(
                        pk, sk, 'failed',
                        f"Insufficient evidence: {pubmed_data['study_count']} studies"
                    )
                    continue
                
                # Insert into LanceDB
                success = insert_supplement(query, pubmed_data)
                
                if success:
                    # Invalidate cache
                    invalidate_cache(query)
                    
                    # Update status to completed
                    update_discovery_status(pk, sk, 'completed')
                    print(f"Successfully processed: {query}")
                else:
                    update_discovery_status(pk, sk, 'failed', 'Insert failed')
                    
            except Exception as e:
                print(f"Error processing {query}: {str(e)}")
                update_discovery_status(pk, sk, 'failed', str(e))
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Processed {len(event["Records"])} records'
            })
        }
        
    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }
