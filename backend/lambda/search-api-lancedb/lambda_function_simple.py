"""
SuplementIA - Simple Search API (loads libraries from EFS)
This version loads heavy dependencies from EFS instead of packaging them
"""

import json
import sys
import os

# Add EFS Python libraries to path
sys.path.insert(0, '/mnt/efs/python')

# Now import heavy dependencies
import lancedb
from sentence_transformers import SentenceTransformer
import boto3

# Configuration
LANCEDB_PATH = os.environ.get('LANCEDB_PATH', '/mnt/efs/suplementia-lancedb')
MODEL_PATH = os.environ.get('MODEL_PATH', '/mnt/efs/models/all-MiniLM-L6-v2')
DYNAMODB_CACHE_TABLE = os.environ.get('DYNAMODB_CACHE_TABLE', 'production-lancedb-supplement-cache')
SIMILARITY_THRESHOLD = float(os.environ.get('SIMILARITY_THRESHOLD', '0.85'))

# Global variables (cached across invocations)
db = None
model = None
dynamodb = boto3.resource('dynamodb')
cache_table = dynamodb.Table(DYNAMODB_CACHE_TABLE)


def initialize():
    """Initialize LanceDB and ML model"""
    global db, model
    
    if db is None:
        print(f"Initializing LanceDB from {LANCEDB_PATH}")
        db = lancedb.connect(LANCEDB_PATH)
    
    if model is None:
        print(f"Loading model from {MODEL_PATH}")
        model = SentenceTransformer(MODEL_PATH)
    
    return db, model


def lambda_handler(event, context):
    """Lambda handler for supplement search"""
    try:
        # Parse query
        query_params = event.get('queryStringParameters', {})
        if not query_params:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing query parameters'})
            }
        
        query = query_params.get('q', '').strip()
        if not query:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Empty query'})
            }
        
        # Initialize
        db, model = initialize()
        
        # Generate embedding
        embedding = model.encode(query).tolist()
        
        # Search
        table = db.open_table("supplements")
        results = (
            table.search(embedding)
            .metric("cosine")
            .limit(5)
            .to_list()
        )
        
        # Filter by threshold
        filtered = [r for r in results if (1 - r.get('_distance', 1)) >= SIMILARITY_THRESHOLD]
        
        if not filtered:
            return {
                'statusCode': 404,
                'body': json.dumps({
                    'success': False,
                    'message': 'No results found'
                })
            }
        
        # Return best match
        best = filtered[0]
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'supplement': {
                    'name': best.get('name'),
                    'similarity': round(1 - best.get('_distance', 1), 3)
                },
                'source': 'lancedb'
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
