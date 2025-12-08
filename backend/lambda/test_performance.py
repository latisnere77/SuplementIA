"""
Performance Test Suite - System Completion Audit
Tests search latency, cache performance, and load handling

Requirements: 11.4
"""

import time
import statistics
import json
import concurrent.futures
from typing import List, Dict, Tuple
from decimal import Decimal

# Test configuration
PERFORMANCE_TARGETS = {
    'cache_hit_latency_ms': 10,
    'vector_search_latency_ms': 10,
    'total_search_latency_ms': 200,
    'throughput_req_per_sec': 100
}


class PerformanceMetrics:
    """Track and analyze performance metrics"""
    
    def __init__(self):
        self.latencies: List[float] = []
        self.cache_hits = 0
        self.cache_misses = 0
        self.errors = 0
        
    def add_latency(self, latency_ms: float):
        """Add a latency measurement"""
        self.latencies.append(latency_ms)
    
    def record_cache_hit(self):
        """Record a cache hit"""
        self.cache_hits += 1
    
    def record_cache_miss(self):
        """Record a cache miss"""
        self.cache_misses += 1
    
    def record_error(self):
        """Record an error"""
        self.errors += 1
    
    def get_percentile(self, percentile: int) -> float:
        """Calculate percentile latency"""
        if not self.latencies:
            return 0.0
        sorted_latencies = sorted(self.latencies)
        index = int(len(sorted_latencies) * percentile / 100)
        return sorted_latencies[min(index, len(sorted_latencies) - 1)]
    
    def get_cache_hit_rate(self) -> float:
        """Calculate cache hit rate percentage"""
        total = self.cache_hits + self.cache_misses
        if total == 0:
            return 0.0
        return (self.cache_hits / total) * 100
    
    def get_error_rate(self) -> float:
        """Calculate error rate percentage"""
        total = len(self.latencies) + self.errors
        if total == 0:
            return 0.0
        return (self.errors / total) * 100
    
    def get_summary(self) -> Dict:
        """Get performance summary"""
        if not self.latencies:
            return {
                'count': 0,
                'errors': self.errors,
                'error_rate_percent': self.get_error_rate()
            }
        
        return {
            'count': len(self.latencies),
            'min_ms': min(self.latencies),
            'max_ms': max(self.latencies),
            'mean_ms': statistics.mean(self.latencies),
            'median_ms': statistics.median(self.latencies),
            'p50_ms': self.get_percentile(50),
            'p95_ms': self.get_percentile(95),
            'p99_ms': self.get_percentile(99),
            'cache_hits': self.cache_hits,
            'cache_misses': self.cache_misses,
            'cache_hit_rate_percent': self.get_cache_hit_rate(),
            'errors': self.errors,
            'error_rate_percent': self.get_error_rate()
        }


def test_cache_hit_latency():
    """
    Test cache hit latency performance
    
    Property: Cache hits should complete in < 10ms
    Validates: Requirements 8.2
    """
    print("\n=== Test: Cache Hit Latency ===")
    
    try:
        import boto3
        from botocore.config import Config
        
        # Setup
        boto_config = Config(
            max_pool_connections=50,
            retries={'max_attempts': 3, 'mode': 'adaptive'}
        )
        dynamodb = boto3.resource('dynamodb', config=boto_config)
        cache_table = dynamodb.Table('supplement-cache')
        
        # Create test cache entry
        test_query_hash = 'test_performance_001'
        test_data = {
            'PK': f'SUPPLEMENT#{test_query_hash}',
            'SK': 'QUERY',
            'supplementData': {
                'id': 'test-001',
                'name': 'Test Supplement',
                'scientificName': 'Testus supplementus',
                'commonNames': ['test'],
                'metadata': {},
                'similarity': Decimal('0.95')
            },
            'embedding': [Decimal('0.1')] * 384,
            'ttl': int(time.time()) + 3600,
            'searchCount': 1,
            'lastAccessed': int(time.time())
        }
        
        cache_table.put_item(Item=test_data)
        print(f"✓ Created test cache entry: {test_query_hash}")
        
        # Warm up
        for _ in range(5):
            cache_table.get_item(
                Key={'PK': f'SUPPLEMENT#{test_query_hash}', 'SK': 'QUERY'}
            )
        
        # Run performance test
        metrics = PerformanceMetrics()
        iterations = 100
        
        print(f"Running {iterations} cache hit tests...")
        for i in range(iterations):
            start = time.time()
            
            response = cache_table.get_item(
                Key={'PK': f'SUPPLEMENT#{test_query_hash}', 'SK': 'QUERY'}
            )
            
            latency_ms = (time.time() - start) * 1000
            metrics.add_latency(latency_ms)
            
            if 'Item' in response:
                metrics.record_cache_hit()
            else:
                metrics.record_cache_miss()
            
            if (i + 1) % 20 == 0:
                print(f"  Progress: {i + 1}/{iterations}")
        
        # Analyze results
        summary = metrics.get_summary()
        print(f"\n📊 Cache Hit Performance:")
        print(f"  Iterations: {summary['count']}")
        print(f"  Mean latency: {summary['mean_ms']:.2f}ms")
        print(f"  Median latency: {summary['median_ms']:.2f}ms")
        print(f"  P95 latency: {summary['p95_ms']:.2f}ms")
        print(f"  P99 latency: {summary['p99_ms']:.2f}ms")
        print(f"  Min latency: {summary['min_ms']:.2f}ms")
        print(f"  Max latency: {summary['max_ms']:.2f}ms")
        print(f"  Cache hit rate: {summary['cache_hit_rate_percent']:.1f}%")
        
        # Verify target
        target = PERFORMANCE_TARGETS['cache_hit_latency_ms']
        if summary['p95_ms'] <= target:
            print(f"✅ PASS: P95 latency ({summary['p95_ms']:.2f}ms) <= target ({target}ms)")
            return True
        else:
            print(f"❌ FAIL: P95 latency ({summary['p95_ms']:.2f}ms) > target ({target}ms)")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_cache_miss_vector_search():
    """
    Test vector search latency on cache miss
    
    Property: Vector search should complete in < 10ms
    Validates: Requirements 2.5
    """
    print("\n=== Test: Vector Search Latency (Cache Miss) ===")
    
    try:
        import lancedb
        from sentence_transformers import SentenceTransformer
        
        # Setup
        LANCEDB_PATH = '/mnt/efs/suplementia-lancedb'
        MODEL_PATH = '/mnt/efs/models/all-MiniLM-L6-v2'
        
        print("Loading model and database...")
        model = SentenceTransformer(MODEL_PATH)
        db = lancedb.connect(LANCEDB_PATH)
        table = db.open_table("supplements")
        print("✓ Model and database loaded")
        
        # Test queries
        test_queries = [
            "vitamin d",
            "omega 3",
            "magnesium",
            "vitamin c",
            "zinc"
        ]
        
        metrics = PerformanceMetrics()
        
        print(f"Running vector search tests with {len(test_queries)} queries...")
        for query in test_queries:
            # Generate embedding
            embedding = model.encode(query).tolist()
            
            # Measure search time only (not embedding generation)
            start = time.time()
            
            results = (
                table.search(embedding)
                .metric("cosine")
                .limit(5)
                .to_list()
            )
            
            search_latency_ms = (time.time() - start) * 1000
            metrics.add_latency(search_latency_ms)
            
            print(f"  Query '{query}': {search_latency_ms:.2f}ms ({len(results)} results)")
        
        # Analyze results
        summary = metrics.get_summary()
        print(f"\n📊 Vector Search Performance:")
        print(f"  Queries: {summary['count']}")
        print(f"  Mean latency: {summary['mean_ms']:.2f}ms")
        print(f"  Median latency: {summary['median_ms']:.2f}ms")
        print(f"  P95 latency: {summary['p95_ms']:.2f}ms")
        print(f"  P99 latency: {summary['p99_ms']:.2f}ms")
        print(f"  Min latency: {summary['min_ms']:.2f}ms")
        print(f"  Max latency: {summary['max_ms']:.2f}ms")
        
        # Verify target
        target = PERFORMANCE_TARGETS['vector_search_latency_ms']
        if summary['p95_ms'] <= target:
            print(f"✅ PASS: P95 latency ({summary['p95_ms']:.2f}ms) <= target ({target}ms)")
            return True
        else:
            print(f"❌ FAIL: P95 latency ({summary['p95_ms']:.2f}ms) > target ({target}ms)")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_discovery_queue_performance():
    """
    Test discovery queue insertion performance
    
    Property: Discovery queue insertion should be fast
    Validates: Requirements 7.1
    """
    print("\n=== Test: Discovery Queue Performance ===")
    
    try:
        import boto3
        import hashlib
        from botocore.config import Config
        
        # Setup
        boto_config = Config(
            max_pool_connections=50,
            retries={'max_attempts': 3, 'mode': 'adaptive'}
        )
        dynamodb = boto3.resource('dynamodb', config=boto_config)
        discovery_table = dynamodb.Table('discovery-queue')
        
        # Test queries
        test_queries = [
            f"unknown_supplement_{i}" for i in range(20)
        ]
        
        metrics = PerformanceMetrics()
        
        print(f"Testing discovery queue insertion with {len(test_queries)} items...")
        for query in test_queries:
            query_id = hashlib.sha256(query.encode()).hexdigest()[:16]
            
            start = time.time()
            
            discovery_table.put_item(
                Item={
                    'PK': f'DISCOVERY#{query_id}',
                    'SK': 'PENDING',
                    'query': query,
                    'searchCount': 1,
                    'priority': 1,
                    'status': 'pending',
                    'createdAt': int(time.time())
                }
            )
            
            latency_ms = (time.time() - start) * 1000
            metrics.add_latency(latency_ms)
        
        # Analyze results
        summary = metrics.get_summary()
        print(f"\n📊 Discovery Queue Performance:")
        print(f"  Insertions: {summary['count']}")
        print(f"  Mean latency: {summary['mean_ms']:.2f}ms")
        print(f"  Median latency: {summary['median_ms']:.2f}ms")
        print(f"  P95 latency: {summary['p95_ms']:.2f}ms")
        print(f"  Max latency: {summary['max_ms']:.2f}ms")
        
        # Discovery queue should be reasonably fast (< 50ms p95)
        if summary['p95_ms'] <= 50:
            print(f"✅ PASS: P95 latency ({summary['p95_ms']:.2f}ms) <= 50ms")
            return True
        else:
            print(f"❌ FAIL: P95 latency ({summary['p95_ms']:.2f}ms) > 50ms")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_concurrent_load():
    """
    Test system under concurrent load
    
    Property: System should handle 100 req/sec
    Validates: Requirements 11.4
    """
    print("\n=== Test: Concurrent Load (100 req/sec) ===")
    
    try:
        import boto3
        from botocore.config import Config
        
        # Setup
        boto_config = Config(
            max_pool_connections=50,
            retries={'max_attempts': 3, 'mode': 'adaptive'}
        )
        dynamodb = boto3.resource('dynamodb', config=boto_config)
        cache_table = dynamodb.Table('supplement-cache')
        
        # Create test cache entries
        print("Setting up test data...")
        for i in range(10):
            test_query_hash = f'load_test_{i:03d}'
            cache_table.put_item(
                Item={
                    'PK': f'SUPPLEMENT#{test_query_hash}',
                    'SK': 'QUERY',
                    'supplementData': {
                        'id': f'test-{i:03d}',
                        'name': f'Test Supplement {i}',
                        'scientificName': f'Testus {i}',
                        'commonNames': [f'test{i}'],
                        'metadata': {},
                        'similarity': Decimal('0.95')
                    },
                    'embedding': [Decimal('0.1')] * 384,
                    'ttl': int(time.time()) + 3600,
                    'searchCount': 1,
                    'lastAccessed': int(time.time())
                }
            )
        print("✓ Test data created")
        
        def perform_search(query_id: int) -> Tuple[float, bool]:
            """Perform a single search operation"""
            try:
                test_query_hash = f'load_test_{query_id % 10:03d}'
                start = time.time()
                
                response = cache_table.get_item(
                    Key={'PK': f'SUPPLEMENT#{test_query_hash}', 'SK': 'QUERY'}
                )
                
                latency_ms = (time.time() - start) * 1000
                success = 'Item' in response
                return latency_ms, success
            except Exception as e:
                return 0.0, False
        
        # Run concurrent load test
        num_requests = 100
        max_workers = 20
        
        print(f"Running {num_requests} concurrent requests with {max_workers} workers...")
        start_time = time.time()
        
        metrics = PerformanceMetrics()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(perform_search, i) for i in range(num_requests)]
            
            for future in concurrent.futures.as_completed(futures):
                latency_ms, success = future.result()
                if success:
                    metrics.add_latency(latency_ms)
                    metrics.record_cache_hit()
                else:
                    metrics.record_error()
        
        total_time = time.time() - start_time
        throughput = num_requests / total_time
        
        # Analyze results
        summary = metrics.get_summary()
        print(f"\n📊 Concurrent Load Performance:")
        print(f"  Total requests: {num_requests}")
        print(f"  Successful: {summary['count']}")
        print(f"  Errors: {summary['errors']}")
        print(f"  Total time: {total_time:.2f}s")
        print(f"  Throughput: {throughput:.1f} req/sec")
        print(f"  Mean latency: {summary['mean_ms']:.2f}ms")
        print(f"  P95 latency: {summary['p95_ms']:.2f}ms")
        print(f"  P99 latency: {summary['p99_ms']:.2f}ms")
        print(f"  Error rate: {summary['error_rate_percent']:.1f}%")
        
        # Verify targets
        target_throughput = PERFORMANCE_TARGETS['throughput_req_per_sec']
        success = True
        
        if throughput >= target_throughput:
            print(f"✅ PASS: Throughput ({throughput:.1f} req/sec) >= target ({target_throughput} req/sec)")
        else:
            print(f"❌ FAIL: Throughput ({throughput:.1f} req/sec) < target ({target_throughput} req/sec)")
            success = False
        
        if summary['error_rate_percent'] <= 1.0:
            print(f"✅ PASS: Error rate ({summary['error_rate_percent']:.1f}%) <= 1%")
        else:
            print(f"❌ FAIL: Error rate ({summary['error_rate_percent']:.1f}%) > 1%")
            success = False
        
        return success
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def run_all_performance_tests():
    """Run all performance tests and generate report"""
    print("=" * 70)
    print("PERFORMANCE TEST SUITE - System Completion Audit")
    print("=" * 70)
    print(f"\nPerformance Targets:")
    print(f"  Cache hit latency: < {PERFORMANCE_TARGETS['cache_hit_latency_ms']}ms")
    print(f"  Vector search latency: < {PERFORMANCE_TARGETS['vector_search_latency_ms']}ms")
    print(f"  Total search latency: < {PERFORMANCE_TARGETS['total_search_latency_ms']}ms")
    print(f"  Throughput: >= {PERFORMANCE_TARGETS['throughput_req_per_sec']} req/sec")
    
    results = {}
    
    # Run tests
    results['cache_hit'] = test_cache_hit_latency()
    results['vector_search'] = test_cache_miss_vector_search()
    results['discovery_queue'] = test_discovery_queue_performance()
    results['concurrent_load'] = test_concurrent_load()
    
    # Summary
    print("\n" + "=" * 70)
    print("PERFORMANCE TEST SUMMARY")
    print("=" * 70)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, passed_test in results.items():
        status = "✅ PASS" if passed_test else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All performance tests passed!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} performance test(s) failed")
        return 1


if __name__ == '__main__':
    import sys
    exit_code = run_all_performance_tests()
    sys.exit(exit_code)
