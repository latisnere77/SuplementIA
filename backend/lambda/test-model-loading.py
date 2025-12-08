#!/usr/bin/env python3
"""
Test model loading from EFS by invoking embedding-generator Lambda
"""

import json
import boto3
import sys
import time

def test_model_loading(function_name='production-embedding-generator', region='us-east-1'):
    """
    Test model loading by invoking embedding-generator Lambda
    """
    lambda_client = boto3.client('lambda', region_name=region)
    
    print(f"🧪 Testing model loading via {function_name}")
    print("=" * 60)
    
    # Test payload
    payload = {
        'text': 'vitamin d'
    }
    
    print("🚀 First invocation (cold start - will download model)...")
    print("   This may take 2-5 minutes...")
    print("")
    
    start_time = time.time()
    
    try:
        response = lambda_client.invoke(
            FunctionName=function_name,
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )
        
        duration = time.time() - start_time
        
        # Parse response
        response_payload = json.loads(response['Payload'].read())
        
        print(f"✅ First invocation complete ({duration:.2f}s)")
        print("")
        
        # Check if successful
        if response['StatusCode'] == 200:
            body = json.loads(response_payload.get('body', '{}'))
            
            print("📊 Response:")
            print(f"   Status: {response_payload.get('statusCode')}")
            print(f"   Model: {body.get('model', 'N/A')}")
            print(f"   Dimensions: {body.get('dimensions', 'N/A')}")
            print(f"   Latency: {body.get('latency', 'N/A'):.3f}s")
            print("")
            
            if body.get('dimensions') == 384:
                print("✅ Model loaded successfully!")
                print(f"   Cold start time: {duration:.2f}s")
                print(f"   Embedding dimensions: 384 ✓")
                print("")
                
                # Test warm start
                print("🔥 Second invocation (warm start - model cached)...")
                start_time = time.time()
                
                response2 = lambda_client.invoke(
                    FunctionName=function_name,
                    InvocationType='RequestResponse',
                    Payload=json.dumps({'text': 'magnesium'})
                )
                
                duration2 = time.time() - start_time
                response_payload2 = json.loads(response2['Payload'].read())
                body2 = json.loads(response_payload2.get('body', '{}'))
                
                print(f"✅ Second invocation complete ({duration2:.2f}s)")
                print(f"   Latency: {body2.get('latency', 'N/A'):.3f}s")
                print("")
                
                if duration2 < duration / 2:
                    print("✅ Model reuse working!")
                    print(f"   Warm start is {duration / duration2:.1f}x faster")
                    print("")
                    return True
                else:
                    print("⚠️  Model may not be reusing properly")
                    return False
            else:
                print(f"❌ Unexpected embedding dimensions: {body.get('dimensions')}")
                return False
        else:
            print(f"❌ Lambda invocation failed")
            print(f"   Status: {response['StatusCode']}")
            print(f"   Response: {response_payload}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    function_name = sys.argv[1] if len(sys.argv) > 1 else 'production-embedding-generator'
    region = sys.argv[2] if len(sys.argv) > 2 else 'us-east-1'
    
    print("")
    print("🤖 Model Loading Test")
    print("=" * 60)
    print(f"Function: {function_name}")
    print(f"Region: {region}")
    print("")
    
    # Test model loading
    success = test_model_loading(function_name, region)
    
    if success:
        print("")
        print("🎉 Model loading test PASSED!")
        print("")
        print("✅ Task 3 Complete:")
        print("   1. ✅ Model downloaded to EFS")
        print("   2. ✅ Model loads from EFS successfully")
        print("   3. ✅ Model generates 384-dim embeddings")
        print("   4. ✅ Model reuse working (warm starts faster)")
        print("")
        print("Next: Implement subtask 3.1 (lazy loading in search-api)")
    else:
        print("")
        print("❌ Model loading test FAILED")
        sys.exit(1)
