/**
 * Frontend Performance Test Suite
 * Tests API integration performance and error handling
 * 
 * Requirements: 11.4
 */

interface PerformanceMetrics {
  latencies: number[];
  errors: number;
  cacheHits: number;
  cacheMisses: number;
}

interface PerformanceSummary {
  count: number;
  min_ms: number;
  max_ms: number;
  mean_ms: number;
  median_ms: number;
  p95_ms: number;
  p99_ms: number;
  cache_hit_rate_percent: number;
  error_rate_percent: number;
}

const PERFORMANCE_TARGETS = {
  api_latency_ms: 200,
  error_rate_percent: 1.0,
  cache_hit_rate_percent: 85.0,
};

class PerformanceTracker {
  private metrics: PerformanceMetrics = {
    latencies: [],
    errors: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  addLatency(latency_ms: number): void {
    this.metrics.latencies.push(latency_ms);
  }

  recordError(): void {
    this.metrics.errors++;
  }

  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  getPercentile(percentile: number): number {
    if (this.metrics.latencies.length === 0) return 0;
    
    const sorted = [...this.metrics.latencies].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * percentile / 100);
    return sorted[Math.min(index, sorted.length - 1)];
  }

  getSummary(): PerformanceSummary {
    const { latencies, errors, cacheHits, cacheMisses } = this.metrics;
    
    if (latencies.length === 0) {
      return {
        count: 0,
        min_ms: 0,
        max_ms: 0,
        mean_ms: 0,
        median_ms: 0,
        p95_ms: 0,
        p99_ms: 0,
        cache_hit_rate_percent: 0,
        error_rate_percent: errors > 0 ? 100 : 0,
      };
    }

    const sum = latencies.reduce((a, b) => a + b, 0);
    const mean = sum / latencies.length;
    const sorted = [...latencies].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    const totalCacheRequests = cacheHits + cacheMisses;
    const cacheHitRate = totalCacheRequests > 0 
      ? (cacheHits / totalCacheRequests) * 100 
      : 0;

    const totalRequests = latencies.length + errors;
    const errorRate = totalRequests > 0 
      ? (errors / totalRequests) * 100 
      : 0;

    return {
      count: latencies.length,
      min_ms: Math.min(...latencies),
      max_ms: Math.max(...latencies),
      mean_ms: mean,
      median_ms: median,
      p95_ms: this.getPercentile(95),
      p99_ms: this.getPercentile(99),
      cache_hit_rate_percent: cacheHitRate,
      error_rate_percent: errorRate,
    };
  }
}

async function testSearchAPILatency(): Promise<boolean> {
  console.log('\n=== Test: Search API Latency ===');
  
  try {
    const API_URL = process.env.NEXT_PUBLIC_SEARCH_API_URL || 
                    'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';
    
    const testQueries = [
      'vitamin d',
      'omega 3',
      'magnesium',
      'vitamin c',
      'zinc',
      'vitamin b12',
      'iron',
      'calcium',
      'vitamin e',
      'vitamin a',
    ];

    const tracker = new PerformanceTracker();

    console.log(`Testing ${testQueries.length} search queries...`);

    for (const query of testQueries) {
      const start = Date.now();
      
      try {
        const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
        const latency_ms = Date.now() - start;
        
        if (response.ok) {
          tracker.addLatency(latency_ms);
          
          const data = await response.json();
          if (data.cacheHit) {
            tracker.recordCacheHit();
          } else {
            tracker.recordCacheMiss();
          }
          
          console.log(`  ✓ Query '${query}': ${latency_ms}ms (${data.cacheHit ? 'cache hit' : 'cache miss'})`);
        } else {
          tracker.recordError();
          console.log(`  ✗ Query '${query}': HTTP ${response.status}`);
        }
      } catch (error) {
        tracker.recordError();
        console.log(`  ✗ Query '${query}': ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Analyze results
    const summary = tracker.getSummary();
    console.log('\n📊 Search API Performance:');
    console.log(`  Requests: ${summary.count}`);
    console.log(`  Mean latency: ${summary.mean_ms.toFixed(2)}ms`);
    console.log(`  Median latency: ${summary.median_ms.toFixed(2)}ms`);
    console.log(`  P95 latency: ${summary.p95_ms.toFixed(2)}ms`);
    console.log(`  P99 latency: ${summary.p99_ms.toFixed(2)}ms`);
    console.log(`  Min latency: ${summary.min_ms.toFixed(2)}ms`);
    console.log(`  Max latency: ${summary.max_ms.toFixed(2)}ms`);
    console.log(`  Cache hit rate: ${summary.cache_hit_rate_percent.toFixed(1)}%`);
    console.log(`  Error rate: ${summary.error_rate_percent.toFixed(1)}%`);

    // Verify targets
    let passed = true;

    if (summary.p95_ms <= PERFORMANCE_TARGETS.api_latency_ms) {
      console.log(`✅ PASS: P95 latency (${summary.p95_ms.toFixed(2)}ms) <= target (${PERFORMANCE_TARGETS.api_latency_ms}ms)`);
    } else {
      console.log(`❌ FAIL: P95 latency (${summary.p95_ms.toFixed(2)}ms) > target (${PERFORMANCE_TARGETS.api_latency_ms}ms)`);
      passed = false;
    }

    if (summary.error_rate_percent <= PERFORMANCE_TARGETS.error_rate_percent) {
      console.log(`✅ PASS: Error rate (${summary.error_rate_percent.toFixed(1)}%) <= target (${PERFORMANCE_TARGETS.error_rate_percent}%)`);
    } else {
      console.log(`❌ FAIL: Error rate (${summary.error_rate_percent.toFixed(1)}%) > target (${PERFORMANCE_TARGETS.error_rate_percent}%)`);
      passed = false;
    }

    return passed;
  } catch (error) {
    console.error('❌ ERROR:', error);
    return false;
  }
}

async function testConcurrentRequests(): Promise<boolean> {
  console.log('\n=== Test: Concurrent Request Handling ===');
  
  try {
    const API_URL = process.env.NEXT_PUBLIC_SEARCH_API_URL || 
                    'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';
    
    const numRequests = 50;
    const queries = ['vitamin d', 'omega 3', 'magnesium', 'vitamin c', 'zinc'];
    
    console.log(`Running ${numRequests} concurrent requests...`);
    
    const tracker = new PerformanceTracker();
    const startTime = Date.now();

    const requests = Array.from({ length: numRequests }, (_, i) => {
      const query = queries[i % queries.length];
      return (async () => {
        const start = Date.now();
        try {
          const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
          const latency_ms = Date.now() - start;
          
          if (response.ok) {
            tracker.addLatency(latency_ms);
            const data = await response.json();
            if (data.cacheHit) {
              tracker.recordCacheHit();
            } else {
              tracker.recordCacheMiss();
            }
          } else {
            tracker.recordError();
          }
        } catch (error) {
          tracker.recordError();
        }
      })();
    });

    await Promise.all(requests);
    
    const totalTime = (Date.now() - startTime) / 1000;
    const throughput = numRequests / totalTime;

    // Analyze results
    const summary = tracker.getSummary();
    console.log('\n📊 Concurrent Request Performance:');
    console.log(`  Total requests: ${numRequests}`);
    console.log(`  Successful: ${summary.count}`);
    console.log(`  Total time: ${totalTime.toFixed(2)}s`);
    console.log(`  Throughput: ${throughput.toFixed(1)} req/sec`);
    console.log(`  Mean latency: ${summary.mean_ms.toFixed(2)}ms`);
    console.log(`  P95 latency: ${summary.p95_ms.toFixed(2)}ms`);
    console.log(`  P99 latency: ${summary.p99_ms.toFixed(2)}ms`);
    console.log(`  Error rate: ${summary.error_rate_percent.toFixed(1)}%`);

    // Verify targets
    let passed = true;

    if (summary.error_rate_percent <= PERFORMANCE_TARGETS.error_rate_percent) {
      console.log(`✅ PASS: Error rate (${summary.error_rate_percent.toFixed(1)}%) <= target (${PERFORMANCE_TARGETS.error_rate_percent}%)`);
    } else {
      console.log(`❌ FAIL: Error rate (${summary.error_rate_percent.toFixed(1)}%) > target (${PERFORMANCE_TARGETS.error_rate_percent}%)`);
      passed = false;
    }

    if (summary.p95_ms <= PERFORMANCE_TARGETS.api_latency_ms) {
      console.log(`✅ PASS: P95 latency (${summary.p95_ms.toFixed(2)}ms) <= target (${PERFORMANCE_TARGETS.api_latency_ms}ms)`);
    } else {
      console.log(`❌ FAIL: P95 latency (${summary.p95_ms.toFixed(2)}ms) > target (${PERFORMANCE_TARGETS.api_latency_ms}ms)`);
      passed = false;
    }

    return passed;
  } catch (error) {
    console.error('❌ ERROR:', error);
    return false;
  }
}

async function testErrorHandling(): Promise<boolean> {
  console.log('\n=== Test: Error Handling Performance ===');
  
  try {
    const API_URL = process.env.NEXT_PUBLIC_SEARCH_API_URL || 
                    'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';
    
    const errorScenarios = [
      { query: '', expectedStatus: 400, description: 'Empty query' },
      { query: 'a'.repeat(201), expectedStatus: 400, description: 'Query too long' },
      { query: 'unknown_supplement_xyz_123', expectedStatus: 404, description: 'Not found' },
    ];

    console.log(`Testing ${errorScenarios.length} error scenarios...`);

    let passed = true;

    for (const scenario of errorScenarios) {
      const start = Date.now();
      
      try {
        const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(scenario.query)}`);
        const latency_ms = Date.now() - start;
        
        if (response.status === scenario.expectedStatus) {
          console.log(`  ✓ ${scenario.description}: HTTP ${response.status} (${latency_ms}ms)`);
        } else {
          console.log(`  ✗ ${scenario.description}: Expected ${scenario.expectedStatus}, got ${response.status}`);
          passed = false;
        }
      } catch (error) {
        console.log(`  ✗ ${scenario.description}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        passed = false;
      }
    }

    if (passed) {
      console.log('\n✅ PASS: All error scenarios handled correctly');
    } else {
      console.log('\n❌ FAIL: Some error scenarios failed');
    }

    return passed;
  } catch (error) {
    console.error('❌ ERROR:', error);
    return false;
  }
}

async function runAllPerformanceTests(): Promise<number> {
  console.log('='.repeat(70));
  console.log('FRONTEND PERFORMANCE TEST SUITE');
  console.log('='.repeat(70));
  console.log('\nPerformance Targets:');
  console.log(`  API latency (P95): < ${PERFORMANCE_TARGETS.api_latency_ms}ms`);
  console.log(`  Error rate: < ${PERFORMANCE_TARGETS.error_rate_percent}%`);
  console.log(`  Cache hit rate: >= ${PERFORMANCE_TARGETS.cache_hit_rate_percent}%`);

  const results: Record<string, boolean> = {};

  // Run tests
  results['search_api_latency'] = await testSearchAPILatency();
  results['concurrent_requests'] = await testConcurrentRequests();
  results['error_handling'] = await testErrorHandling();

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('PERFORMANCE TEST SUMMARY');
  console.log('='.repeat(70));

  const passed = Object.values(results).filter(v => v).length;
  const total = Object.keys(results).length;

  for (const [testName, testPassed] of Object.entries(results)) {
    const status = testPassed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${testName}`);
  }

  console.log(`\nTotal: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 All frontend performance tests passed!');
    return 0;
  } else {
    console.log(`\n⚠️  ${total - passed} frontend performance test(s) failed`);
    return 1;
  }
}

// Run tests
runAllPerformanceTests()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
