#!/usr/bin/env python3
"""
Local testing script for Search API Lambda
Tests LanceDB vector search without deploying to AWS
"""

import json
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Mock environment variables
os.environ['LANCEDB_PATH'] = '/tmp/test-lancedb'
os.environ['MODEL_PATH'] = '/tmp/test-model'
os.environ['DYNAMODB_CACHE_TABLE'] = 'test-cache'
os.environ['SIMILARITY_THRESHOLD'] = '0.85'

# Import Lambda function
from lambda_function import lambda_handler

def test_search():
    """Test search functionality"""
    
    print("="*60)
    print("Testing Search API Lambda (Local)")
    print("="*60)
    
    # Test cases
    test_cases = [
        {"q": "vitamin d"},
        {"q": "omega 3"},
        {"q": "magnesium"},
        {"q": "vitamin c"},
        {"q": ""},  # Empty query (should fail)
        {"q": "x" * 201},  # Too long (should fail)
    ]
    
    for i, params in enumerate(test_cases, 1):
        print(f"\nTest {i}: {params}")
        print("-" * 60)
        
        event = {
            'queryStringParameters': params
        }
        
        try:
            response = lambda_handler(event, None)
            print(f"Status: {response['statusCode']}")
            body = json.loads(response['body'])
            print(f"Response: {json.dumps(body, indent=2)}")
        except Exception as e:
            print(f"Error: {str(e)}")
    
    print("\n" + "="*60)
    print("Testing complete!")
    print("="*60)

if __name__ == "__main__":
    test_search()
