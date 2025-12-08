"""
SageMaker Proxy Lambda - Ultra-lightweight proxy for Function URL
Routes HTTP requests to SageMaker endpoint with CORS support
"""

import json
import os
import boto3

# Initialize SageMaker runtime client (reused across invocations)
sagemaker_runtime = boto3.client('sagemaker-runtime')

# Environment variables
ENDPOINT_NAME = os.environ.get('SAGEMAKER_ENDPOINT_NAME', 'suplementia-search-api')

# CORS headers for all responses
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json'
}


def handler(event, context):
    """
    Lambda handler for Function URL requests
    Proxies search requests to SageMaker endpoint
    """

    # Handle CORS preflight
    http_method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': ''
        }

    try:
        # Extract query parameter
        query_params = event.get('queryStringParameters') or {}
        query = query_params.get('q', '').strip()

        if not query:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Missing required parameter: q',
                    'message': 'Please provide a search query'
                })
            }

        # Prepare payload for SageMaker
        payload = json.dumps({'query': query})

        # Invoke SageMaker endpoint
        response = sagemaker_runtime.invoke_endpoint(
            EndpointName=ENDPOINT_NAME,
            ContentType='application/json',
            Accept='application/json',
            Body=payload
        )

        # Parse SageMaker response
        result = json.loads(response['Body'].read().decode('utf-8'))

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps(result)
        }

    except sagemaker_runtime.exceptions.ModelError as e:
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'error': 'ModelError',
                'message': str(e)
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'error': 'InternalError',
                'message': str(e)
            })
        }
