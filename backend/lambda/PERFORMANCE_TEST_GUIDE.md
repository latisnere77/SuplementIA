# Performance Test Suite Guide

## Overview

This performance test suite validates that the SuplementIA system meets its performance targets under various load conditions.

**Requirements:** 11.4

## Performance Targets

| Metric | Target | Description |
|--------|--------|-------------|
| Cache Hit Latency | < 10ms (P95) | DynamoDB cache response time |
| Vector Search Latency | < 10ms (P95) | LanceDB query time |
| Total Search Latency | < 200ms (P95) | End-to-end search time |
| Throughput | >= 100 req/sec | Sustained request rate |
| Error Rate | < 1% | Failed requests |
| Cache Hit Rate | >= 85% | Percentage of cache hits |

## Test Scenarios

### 1. Cache Hit Latency Test

**Purpose:** Verify DynamoDB cache performance

**Method:**
- Creates test cache entries
- Performs 100 cache lookups
- Measures latency for each operation

**Success Criteria:**
- P95 latency < 10ms
- 100% cache hit rate

**Validates:** Requirements 8.2

### 2. Vector Search Latency Test

**Purpose:** Verify LanceDB query performance

**Method:**
- Loads ML model and database
- Performs vector searches for common supplements
- Measures search time (excluding embedding generation)

**Success Criteria:**
- P95 latency < 10ms
- All queries return results

**Validates:** Requirements 2.5

### 3. Discovery Queue Performance Test

**Purpose:** Verify discovery queue insertion speed

**Method:**
- Inserts 20 unknown supplements to queue
- Measures insertion latency

**Success Criteria:**
- P95 latency < 50ms
- All insertions succeed

**Validates:** Requirements 7.1

### 4. Concurrent Load Test

**Purpose:** Verify system handles high concurrent load

**Method:**
- Creates 10 test cache entries
- Performs 100 concurrent requests with 20 workers
- Measures throughput and latency

**Success Criteria:**
- Throughput >= 100 req/sec
- Error rate < 1%
- P95 latency reasonable

**Validates:** Requirements 11.4

## Running Tests

### Prerequisites

**Backend Tests:**
- Access to AWS resources (DynamoDB, EFS)
- Lambda execution environment or EC2 with EFS mounted
- Python 3.11+ with dependencies installed
- AWS credentials configured

**Frontend Tests:**
- Node.js 18+
- tsx or ts-node installed
- API Gateway URL configured

### Backend Tests

```bash
# From Lambda or EC2 with EFS mounted
cd backend/lambda
python3 test_performance.py
```

### Frontend Tests

```bash
# Set API URL
export NEXT_PUBLIC_SEARCH_API_URL=https://xxx.execute-api.us-east-1.amazonaws.com/prod

# Run tests
tsx scripts/test-performance-frontend.ts
```

### All Tests

```bash
# Run complete test suite
./scripts/run-performance-tests.sh
```

## Test Output

### Successful Test Output

```
======================================================================
PERFORMANCE TEST SUITE - System Completion Audit
======================================================================

Performance Targets:
  Cache hit latency: < 10ms
  Vector search latency: < 10ms
  Total search latency: < 200ms
  Throughput: >= 100 req/sec

=== Test: Cache Hit Latency ===
✓ Created test cache entry: test_performance_001
Running 100 cache hit tests...
  Progress: 20/100
  Progress: 40/100
  Progress: 60/100
  Progress: 80/100
  Progress: 100/100

📊 Cache Hit Performance:
  Iterations: 100
  Mean latency: 5.23ms
  Median latency: 4.89ms
  P95 latency: 7.45ms
  P99 latency: 8.92ms
  Min latency: 3.12ms
  Max latency: 9.87ms
  Cache hit rate: 100.0%
✅ PASS: P95 latency (7.45ms) <= target (10ms)

[... additional tests ...]

======================================================================
PERFORMANCE TEST SUMMARY
======================================================================
✅ PASS: cache_hit
✅ PASS: vector_search
✅ PASS: discovery_queue
✅ PASS: concurrent_load

Total: 4/4 tests passed

🎉 All performance tests passed!
```

### Failed Test Output

```
=== Test: Cache Hit Latency ===
[... test execution ...]

📊 Cache Hit Performance:
  P95 latency: 15.23ms
❌ FAIL: P95 latency (15.23ms) > target (10ms)

[... additional tests ...]

⚠️  1 performance test(s) failed
```

## Interpreting Results

### Latency Metrics

- **Mean:** Average latency across all requests
- **Median (P50):** 50% of requests complete faster
- **P95:** 95% of requests complete faster (key metric)
- **P99:** 99% of requests complete faster
- **Min/Max:** Best and worst case latencies

### Cache Metrics

- **Cache Hit Rate:** Percentage of requests served from cache
- **Cache Hits/Misses:** Absolute counts

### Error Metrics

- **Error Rate:** Percentage of failed requests
- **Errors:** Absolute count of failures

## Troubleshooting

### High Cache Latency

**Symptoms:** P95 cache latency > 10ms

**Possible Causes:**
- DynamoDB throttling
- Network latency
- Cold start issues

**Solutions:**
- Check DynamoDB metrics in CloudWatch
- Increase provisioned capacity (if using provisioned mode)
- Verify VPC endpoint configuration
- Check security group rules

### High Vector Search Latency

**Symptoms:** P95 vector search latency > 10ms

**Possible Causes:**
- Large database size
- Missing or inefficient index
- EFS throughput limits

**Solutions:**
- Verify HNSW index is created
- Check EFS performance mode
- Consider increasing EFS throughput
- Optimize index parameters

### Low Throughput

**Symptoms:** Throughput < 100 req/sec

**Possible Causes:**
- Lambda concurrency limits
- DynamoDB throttling
- Connection pool exhaustion

**Solutions:**
- Increase Lambda reserved concurrency
- Optimize connection pooling
- Check CloudWatch metrics for throttling
- Review boto3 configuration

### High Error Rate

**Symptoms:** Error rate > 1%

**Possible Causes:**
- Timeout issues
- Resource exhaustion
- Configuration errors

**Solutions:**
- Check CloudWatch logs for error details
- Increase Lambda timeout
- Verify environment variables
- Check IAM permissions

## Performance Optimization Tips

### Cache Optimization

1. **Increase TTL for popular queries**
   - Current: 7 days
   - Consider: 14 days for top 100 queries

2. **Implement cache warming**
   - Pre-populate cache with common queries
   - Schedule periodic refresh

3. **Use DAX for ultra-low latency**
   - Sub-millisecond cache hits
   - Transparent caching layer

### Vector Search Optimization

1. **Optimize index parameters**
   ```python
   table.create_index(
       metric='cosine',
       num_partitions=256,  # Adjust based on data size
       num_sub_vectors=96   # Adjust for speed/accuracy tradeoff
   )
   ```

2. **Use appropriate similarity threshold**
   - Current: 0.85
   - Lower threshold = more results, lower precision
   - Higher threshold = fewer results, higher precision

3. **Batch queries when possible**
   - Reduces overhead
   - Better resource utilization

### Lambda Optimization

1. **Use ARM64 architecture**
   - 20% cheaper than x86
   - Better price/performance

2. **Optimize memory allocation**
   - Monitor actual usage
   - Right-size based on metrics

3. **Implement connection pooling**
   - Reuse database connections
   - Reduce connection overhead

4. **Use provisioned concurrency for critical functions**
   - Eliminates cold starts
   - Consistent performance

## Continuous Monitoring

### CloudWatch Metrics

Monitor these metrics in production:

- `SearchLatency` - P50, P95, P99
- `CacheHitRate` - Target >= 85%
- `VectorSearchLatency` - P95 < 10ms
- `ErrorRate` - Target < 1%
- `Throughput` - Requests per second

### Alarms

Set up CloudWatch alarms for:

- P95 latency > 200ms for 5 minutes
- Error rate > 1% for 5 minutes
- Cache hit rate < 85% for 10 minutes
- Throughput drops > 50% for 5 minutes

### Regular Testing

- Run performance tests weekly
- Compare results over time
- Identify performance regressions early
- Adjust targets as system evolves

## Related Documentation

- [Design Document](../../.kiro/specs/system-completion-audit/design.md)
- [Requirements Document](../../.kiro/specs/system-completion-audit/requirements.md)
- [Deployment Guide](../../infrastructure/DEPLOYMENT_GUIDE.md)
- [Monitoring Guide](../../docs/MONITORING.md)

## Support

For issues or questions:

1. Check CloudWatch logs for error details
2. Review this troubleshooting guide
3. Consult the design document for architecture details
4. Contact the DevOps team for infrastructure issues
