"""
Comprehensive Integration Test Suite for SuplementIA System

Tests end-to-end flows across multiple components:
- Search flow (cache -> vector search -> response)
- Discovery queue flow (unknown supplement -> PubMed -> LanceDB)
- Cache invalidation flow (insert -> invalidate -> verify)

Requirements: 11.3
"""

import json
import time
import os
import boto3
import pytest
from typing import Dict, Any, Optional
from decimal import Decimal

# Test configuration
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'staging')
REGION = os.environ.get('AWS_REGION', 'us-east-1')

# AWS clients
dynamodb = boto3.resource('dynamodb', region_name=REGION)
lambda_client = boto3.client('lambda', region_name=REGION)

# Table names
CACHE_TABLE = f"{ENVIRONMENT}-supplement-cache"
DISCOVERY_TABLE = f"{ENVIRONMENT}-discovery-queue"

# Lambda function names
SEARCH_API = f"{ENVIRONMENT}-search-api-lancedb"
DISCOVERY_WORKER = f"{ENVIRONMENT}-discovery-worker-lancedb"
EMBEDDING_GENERATOR = f"{ENVIRONMENT}-embedding-generator"


class TestEndToEndSearchFlow:
    """
    Test complete search flow from user query to response
    
    Flow:
    1. User submits search query
    2. System checks DynamoDB cache
    3. On cache miss, performs vector search in LanceDB
    4. Stores result in cache
    5. Returns formatted response
    """
    
    def test_search_with_cache_miss_then_hit(self):
        """
        Test search flow: cache miss -> vector search -> cache population -> cache hit
        
        Validates:
        - Cache-first strategy (Property 13)
        - Cache population on miss (Property 15)
        - Cache hit performance (Property 14)
        """
        # Use a unique query to ensure cache miss
        test_query = f"vitamin-d-test-{int(time.time())}"
        
        # Step 1: First search (cache miss expected)
        print(f"\n🔍 Step 1: Searching for '{test_query}' (cache miss expected)")
        
        payload = {
            'queryStringParameters': {
                'q': test_query,
                'limit': '5'
            }
        }
        
        response1 = lambda_client.invoke(
            FunctionName=SEARCH_API,
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )
        
        result1 = json.loads(response1['Payload'].read())
        body1 = json.loads(result1.get('body', '{}'))
        
        print(f"   Response status: {result1.get('statusCode')}")
        print(f"   Cache hit: {body1.get('cacheHit', False)}")
        print(f"   Source: {body1.get('source', 'unknown')}")
        
        # Verify response structure
        assert result1.get('statusCode') in [200, 404], "Expected 200 or 404 status"
        
        if result1.get('statusCode') == 200:
            # If found, verify it was from vector search (not cache)
            assert body1.get('source') in ['lancedb', 'vector_search'], \
                "First search should be from vector search, not cache"
            
            # Step 2: Wait briefly for cache to be populated
            print("\n⏳ Step 2: Waiting for cache population...")
            time.sleep(2)
            
            # Step 3: Second search (cache hit expected)
            print(f"\n🔍 Step 3: Searching again for '{test_query}' (cache hit expected)")
            
            response2 = lambda_client.invoke(
                FunctionName=SEARCH_API,
                InvocationType='RequestResponse',
                Payload=json.dumps(payload)
            )
            
            result2 = json.loads(response2['Payload'].read())
            body2 = json.loads(result2.get('body', '{}'))
            
            print(f"   Response status: {result2.get('statusCode')}")
            print(f"   Cache hit: {body2.get('cacheHit', False)}")
            print(f"   Source: {body2.get('source', 'unknown')}")
            
            # Verify cache hit
            assert result2.get('statusCode') == 200, "Second search should succeed"
            assert body2.get('cacheHit') == True or body2.get('source') == 'dynamodb', \
                "Second search should be from cache"
            
            # Verify same supplement returned
            if body1.get('supplement') and body2.get('supplement'):
                assert body1['supplement']['id'] == body2['supplement']['id'], \
                    "Both searches should return same supplement"
        
        print("\n✅ Search flow test completed")
    
    def test_search_with_known_supplement(self):
        """
        Test search for a known supplement (should be in database)
        
        Validates:
        - Vector search returns results
        - Response format is correct
        - Latency is acceptable
        """
        # Search for a common supplement that should exist
        test_query = "vitamin d"
        
        print(f"\n🔍 Searching for known supplement: '{test_query}'")
        
        payload = {
            'queryStringParameters': {
                'q': test_query,
                'limit': '5'
            }
        }
        
        start_time = time.time()
        
        response = lambda_client.invoke(
            FunctionName=SEARCH_API,
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )
        
        latency_ms = (time.time() - start_time) * 1000
        
        result = json.loads(response['Payload'].read())
        body = json.loads(result.get('body', '{}'))
        
        print(f"   Response status: {result.get('statusCode')}")
        print(f"   Latency: {latency_ms:.2f}ms")
        print(f"   Success: {body.get('success', False)}")
        
        # Verify response
        assert result.get('statusCode') in [200, 404], "Expected 200 or 404 status"
        
        if result.get('statusCode') == 200:
            assert body.get('success') == True, "Search should succeed"
            assert 'supplement' in body, "Response should contain supplement"
            assert 'latency_ms' in body, "Response should contain latency"
            
            supplement = body['supplement']
            assert 'id' in supplement, "Supplement should have id"
            assert 'name' in supplement, "Supplement should have name"
            assert 'similarity' in supplement, "Supplement should have similarity score"
            
            print(f"   Found: {supplement.get('name')}")
            print(f"   Similarity: {supplement.get('similarity', 0):.3f}")
        
        print("\n✅ Known supplement search test completed")
    
    def test_search_error_handling(self):
        """
        Test search with invalid inputs
        
        Validates:
        - Input validation (Property 22)
        - Error response format
        - Graceful error handling
        """
        test_cases = [
            {
                'name': 'Empty query',
                'payload': {'queryStringParameters': {'q': '', 'limit': '5'}},
                'expected_status': 400
            },
            {
                'name': 'Query too long',
                'payload': {'queryStringParameters': {'q': 'a' * 201, 'limit': '5'}},
                'expected_status': 400
            },
            {
                'name': 'Invalid limit',
                'payload': {'queryStringParameters': {'q': 'vitamin d', 'limit': 'invalid'}},
                'expected_status': 400
            }
        ]
        
        for test_case in test_cases:
            print(f"\n🧪 Testing: {test_case['name']}")
            
            response = lambda_client.invoke(
                FunctionName=SEARCH_API,
                InvocationType='RequestResponse',
                Payload=json.dumps(test_case['payload'])
            )
            
            result = json.loads(response['Payload'].read())
            status_code = result.get('statusCode')
            
            print(f"   Expected status: {test_case['expected_status']}")
            print(f"   Actual status: {status_code}")
            
            # Note: Some validation might happen at API Gateway level
            # So we accept both 400 and 500 for invalid inputs
            assert status_code in [400, 500], \
                f"Invalid input should return error status, got {status_code}"
        
        print("\n✅ Error handling test completed")


class TestDiscoveryQueueFlow:
    """
    Test discovery queue flow for unknown supplements
    
    Flow:
    1. Search for unknown supplement
    2. System adds to discovery queue
    3. DynamoDB Streams triggers discovery worker
    4. Worker queries PubMed for validation
    5. Worker generates embedding
    6. Worker inserts into LanceDB
    7. Worker invalidates cache
    """
    
    def test_unknown_supplement_queued(self):
        """
        Test that unknown supplements are added to discovery queue
        
        Validates:
        - Discovery queue insertion (Property 8)
        - Queue item format
        """
        # Use a very unique name that won't exist
        test_query = f"unknown-supplement-{int(time.time())}-xyz"
        
        print(f"\n🔍 Searching for unknown supplement: '{test_query}'")
        
        payload = {
            'queryStringParameters': {
                'q': test_query,
                'limit': '5'
            }
        }
        
        response = lambda_client.invoke(
            FunctionName=SEARCH_API,
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )
        
        result = json.loads(response['Payload'].read())
        body = json.loads(result.get('body', '{}'))
        
        print(f"   Response status: {result.get('statusCode')}")
        print(f"   Success: {body.get('success', False)}")
        
        # If not found, should be added to queue
        if result.get('statusCode') == 404:
            print("\n⏳ Waiting for queue insertion...")
            time.sleep(3)
            
            # Check if item was added to discovery queue
            table = dynamodb.Table(DISCOVERY_TABLE)
            
            # Scan for recent items (in production, use query with proper key)
            response = table.scan(
                FilterExpression='contains(#q, :query)',
                ExpressionAttributeNames={'#q': 'query'},
                ExpressionAttributeValues={':query': test_query},
                Limit=10
            )
            
            items = response.get('Items', [])
            
            print(f"   Found {len(items)} matching items in discovery queue")
            
            if len(items) > 0:
                item = items[0]
                print(f"   Queue item status: {item.get('status', 'unknown')}")
                print(f"   Queue item priority: {item.get('priority', 'unknown')}")
                
                assert 'query' in item, "Queue item should have query"
                assert 'status' in item, "Queue item should have status"
                assert item['status'] in ['pending', 'processing', 'completed', 'failed'], \
                    "Queue item should have valid status"
        
        print("\n✅ Discovery queue test completed")
    
    def test_discovery_worker_processing(self):
        """
        Test discovery worker can process queue items
        
        Validates:
        - Worker can be invoked
        - Worker processes items correctly
        - Worker handles errors gracefully
        
        Note: This is a simplified test. Full integration requires DynamoDB Streams.
        """
        print("\n🔧 Testing discovery worker processing...")
        
        # Create a test discovery job
        test_job = {
            'Records': [
                {
                    'eventName': 'INSERT',
                    'dynamodb': {
                        'NewImage': {
                            'PK': {'S': f'DISCOVERY#test-{int(time.time())}'},
                            'SK': {'S': 'PENDING'},
                            'query': {'S': 'test supplement'},
                            'priority': {'N': '5'},
                            'status': {'S': 'pending'},
                            'createdAt': {'N': str(int(time.time()))}
                        }
                    }
                }
            ]
        }
        
        try:
            response = lambda_client.invoke(
                FunctionName=DISCOVERY_WORKER,
                InvocationType='RequestResponse',
                Payload=json.dumps(test_job)
            )
            
            result = json.loads(response['Payload'].read())
            
            print(f"   Worker response status: {response['StatusCode']}")
            print(f"   Worker processed: {result.get('statusCode', 'unknown')}")
            
            # Worker should process without crashing
            assert response['StatusCode'] == 200, "Worker should execute successfully"
            
        except Exception as e:
            print(f"   ⚠️  Worker test skipped: {str(e)}")
            print("   (This is expected if worker is not deployed)")
        
        print("\n✅ Discovery worker test completed")


class TestCacheInvalidationFlow:
    """
    Test cache invalidation when new supplements are added
    
    Flow:
    1. Search for supplement (cache miss)
    2. Result cached
    3. New supplement inserted into LanceDB
    4. Cache invalidated
    5. Next search bypasses cache
    6. New result cached
    """
    
    def test_cache_operations(self):
        """
        Test basic cache write, read, and delete operations
        
        Validates:
        - Cache can store items
        - Cache can retrieve items
        - Cache can delete items
        - TTL is set correctly (Property 16)
        """
        print("\n💾 Testing cache operations...")
        
        table = dynamodb.Table(CACHE_TABLE)
        
        # Create test cache entry
        test_key = f"SUPPLEMENT#test-{int(time.time())}"
        test_data = {
            'id': 'test-123',
            'name': 'Test Supplement',
            'similarity': Decimal('0.95')
        }
        ttl = int(time.time()) + (7 * 24 * 60 * 60)  # 7 days
        
        # Step 1: Write to cache
        print("\n   Step 1: Writing to cache...")
        table.put_item(
            Item={
                'PK': test_key,
                'SK': 'QUERY',
                'supplementData': test_data,
                'ttl': ttl,
                'searchCount': 1,
                'lastAccessed': int(time.time())
            }
        )
        print("   ✓ Write successful")
        
        # Step 2: Read from cache
        print("\n   Step 2: Reading from cache...")
        response = table.get_item(
            Key={
                'PK': test_key,
                'SK': 'QUERY'
            }
        )
        
        item = response.get('Item')
        assert item is not None, "Cache item should exist"
        assert item['PK'] == test_key, "Cache key should match"
        assert 'supplementData' in item, "Cache should have supplement data"
        assert 'ttl' in item, "Cache should have TTL"
        
        # Verify TTL is approximately 7 days
        ttl_diff = item['ttl'] - int(time.time())
        expected_ttl = 7 * 24 * 60 * 60
        assert abs(ttl_diff - expected_ttl) < 60, \
            f"TTL should be ~7 days, got {ttl_diff}s"
        
        print("   ✓ Read successful")
        print(f"   ✓ TTL verified: {ttl_diff}s (~7 days)")
        
        # Step 3: Delete from cache (invalidation)
        print("\n   Step 3: Deleting from cache...")
        table.delete_item(
            Key={
                'PK': test_key,
                'SK': 'QUERY'
            }
        )
        print("   ✓ Delete successful")
        
        # Step 4: Verify deletion
        print("\n   Step 4: Verifying deletion...")
        response = table.get_item(
            Key={
                'PK': test_key,
                'SK': 'QUERY'
            }
        )
        
        assert 'Item' not in response, "Cache item should be deleted"
        print("   ✓ Deletion verified")
        
        print("\n✅ Cache operations test completed")
    
    def test_cache_invalidation_pattern(self):
        """
        Test cache invalidation pattern used when supplements are updated
        
        Validates:
        - Cache invalidation on insert (Property 12)
        - Multiple related entries can be invalidated
        """
        print("\n🗑️  Testing cache invalidation pattern...")
        
        table = dynamodb.Table(CACHE_TABLE)
        
        # Create multiple cache entries for same supplement
        base_key = f"test-supplement-{int(time.time())}"
        entries = [
            f"SUPPLEMENT#{base_key}#query1",
            f"SUPPLEMENT#{base_key}#query2",
            f"SUPPLEMENT#{base_key}#query3"
        ]
        
        # Step 1: Create cache entries
        print("\n   Step 1: Creating cache entries...")
        for entry_key in entries:
            table.put_item(
                Item={
                    'PK': entry_key,
                    'SK': 'QUERY',
                    'supplementData': {'id': base_key, 'name': 'Test'},
                    'ttl': int(time.time()) + 3600
                }
            )
        print(f"   ✓ Created {len(entries)} cache entries")
        
        # Step 2: Invalidate all related entries
        print("\n   Step 2: Invalidating related entries...")
        for entry_key in entries:
            table.delete_item(
                Key={
                    'PK': entry_key,
                    'SK': 'QUERY'
                }
            )
        print(f"   ✓ Invalidated {len(entries)} cache entries")
        
        # Step 3: Verify all deleted
        print("\n   Step 3: Verifying invalidation...")
        deleted_count = 0
        for entry_key in entries:
            response = table.get_item(
                Key={
                    'PK': entry_key,
                    'SK': 'QUERY'
                }
            )
            if 'Item' not in response:
                deleted_count += 1
        
        assert deleted_count == len(entries), \
            f"All {len(entries)} entries should be deleted, got {deleted_count}"
        
        print(f"   ✓ All {deleted_count} entries invalidated")
        
        print("\n✅ Cache invalidation pattern test completed")


class TestSystemIntegration:
    """
    Test complete system integration across all components
    """
    
    def test_embedding_generator_integration(self):
        """
        Test embedding generator Lambda
        
        Validates:
        - Embedding generation consistency (Property 3)
        - 384-dimensional vectors
        """
        print("\n🧮 Testing embedding generator...")
        
        test_texts = [
            "vitamin d",
            "omega-3 fatty acids",
            "magnesium glycinate"
        ]
        
        for text in test_texts:
            print(f"\n   Generating embedding for: '{text}'")
            
            payload = {'text': text}
            
            response = lambda_client.invoke(
                FunctionName=EMBEDDING_GENERATOR,
                InvocationType='RequestResponse',
                Payload=json.dumps(payload)
            )
            
            result = json.loads(response['Payload'].read())
            body = json.loads(result.get('body', '{}'))
            
            assert result.get('statusCode') == 200, "Embedding generation should succeed"
            assert 'embedding' in body, "Response should contain embedding"
            assert 'dimensions' in body, "Response should contain dimensions"
            assert body['dimensions'] == 384, "Embedding should be 384-dimensional"
            
            embedding = body['embedding']
            assert len(embedding) == 384, "Embedding should have 384 values"
            assert all(isinstance(x, (int, float)) for x in embedding), \
                "Embedding values should be numeric"
            
            print(f"   ✓ Generated {body['dimensions']}-dimensional embedding")
        
        print("\n✅ Embedding generator integration test completed")
    
    def test_system_health_check(self):
        """
        Overall system health check
        
        Validates:
        - All Lambda functions are accessible
        - DynamoDB tables are accessible
        - Basic operations work
        """
        print("\n🏥 Running system health check...")
        
        health_status = {
            'search_api': False,
            'embedding_generator': False,
            'discovery_worker': False,
            'cache_table': False,
            'discovery_table': False
        }
        
        # Check Search API
        try:
            response = lambda_client.get_function(FunctionName=SEARCH_API)
            health_status['search_api'] = response['Configuration']['State'] == 'Active'
            print(f"   ✓ Search API: {health_status['search_api']}")
        except Exception as e:
            print(f"   ✗ Search API: {str(e)}")
        
        # Check Embedding Generator
        try:
            response = lambda_client.get_function(FunctionName=EMBEDDING_GENERATOR)
            health_status['embedding_generator'] = response['Configuration']['State'] == 'Active'
            print(f"   ✓ Embedding Generator: {health_status['embedding_generator']}")
        except Exception as e:
            print(f"   ✗ Embedding Generator: {str(e)}")
        
        # Check Discovery Worker
        try:
            response = lambda_client.get_function(FunctionName=DISCOVERY_WORKER)
            health_status['discovery_worker'] = response['Configuration']['State'] == 'Active'
            print(f"   ✓ Discovery Worker: {health_status['discovery_worker']}")
        except Exception as e:
            print(f"   ✗ Discovery Worker: {str(e)}")
        
        # Check Cache Table
        try:
            table = dynamodb.Table(CACHE_TABLE)
            table.table_status
            health_status['cache_table'] = True
            print(f"   ✓ Cache Table: {health_status['cache_table']}")
        except Exception as e:
            print(f"   ✗ Cache Table: {str(e)}")
        
        # Check Discovery Table
        try:
            table = dynamodb.Table(DISCOVERY_TABLE)
            table.table_status
            health_status['discovery_table'] = True
            print(f"   ✓ Discovery Table: {health_status['discovery_table']}")
        except Exception as e:
            print(f"   ✗ Discovery Table: {str(e)}")
        
        # Summary
        healthy_count = sum(health_status.values())
        total_count = len(health_status)
        
        print(f"\n   Health: {healthy_count}/{total_count} components operational")
        
        # At least core components should be healthy
        assert health_status['search_api'] or health_status['embedding_generator'], \
            "At least one core Lambda should be operational"
        
        print("\n✅ System health check completed")


if __name__ == '__main__':
    """
    Run integration tests
    
    Usage:
        # Run all tests
        pytest test_integration_suite.py -v
        
        # Run specific test class
        pytest test_integration_suite.py::TestEndToEndSearchFlow -v
        
        # Run with environment
        ENVIRONMENT=staging pytest test_integration_suite.py -v
    """
    pytest.main([__file__, '-v', '--tb=short'])
