import boto3
import json
import time

def stress_test(iterations=10):
    client = boto3.client('lambda', region_name='us-east-1')
    function_name = 'production-search-api-lancedb'
    query = 'Jiaogulan'
    
    print(f"Starting Stress Test: {iterations} invocations for '{query}'...")
    
    payload = {
        "queryStringParameters": {
            "q": query
        }
    }
    
    success_count = 0
    total_duration = 0
    
    for i in range(iterations):
        start = time.time()
        try:
            print(f"[{i+1}/{iterations}] Invoking...", end='', flush=True)
            response = client.invoke(
                FunctionName=function_name,
                Payload=json.dumps(payload)
            )
            
            resp_payload = json.loads(response['Payload'].read())
            duration = time.time() - start
            total_duration += duration
            
            # Check for success in body
            if 'body' in resp_payload:
                body = json.loads(resp_payload['body'])
            else:
                body = resp_payload
                
            # Handle different success shapes (success: true or supplement present)
            if body.get('success') or body.get('supplement'):
                study_count = body.get('supplement', {}).get('metadata', {}).get('study_count', 0)
                print(f" ✅ Success ({duration:.2f}s) - Studies: {study_count}")
                success_count += 1
            else:
                print(f" ❌ Failed ({duration:.2f}s) - Response: {str(body)[:100]}")
                
        except Exception as e:
            print(f" ❌ Error: {e}")
            
    avg_time = total_duration / iterations
    print("\n--- Test Results ---")
    print(f"Total: {iterations}")
    print(f"Success: {success_count}")
    print(f"Failed: {iterations - success_count}")
    print(f"Avg Duration: {avg_time:.2f}s")

if __name__ == "__main__":
    stress_test()
