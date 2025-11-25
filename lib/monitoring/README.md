# Monitoring and Analytics System

Comprehensive monitoring infrastructure for the Intelligent Supplement Search system.

## Components

### CloudWatch Logger
Structured JSON logging with CloudWatch integration.

```typescript
import { logger } from '@/lib/monitoring';

// Log info
logger.info('Search completed', {
  query: 'vitamin d',
  latency: 120,
  cacheHit: true,
});

// Log error
logger.error('Search failed', {
  query: 'invalid',
  errorCode: 'VALIDATION_ERROR',
});

// Log search operation
logger.logSearch('vitamin d', {
  latency: 120,
  cacheHit: true,
});
```

### Metrics Collector
Tracks latency, cache performance, errors, and search patterns.

```typescript
import { metricsCollector } from '@/lib/monitoring';

// Record latency
metricsCollector.recordLatency(120);

// Record cache hit
metricsCollector.recordCacheHit('redis');

// Record error
metricsCollector.recordError('NetworkError');

// Record search pattern
metricsCollector.recordSearchPattern('vitamin d', 120);

// Get metrics
const metrics = metricsCollector.getAllMetrics();
console.log('P95 latency:', metrics.latency.p95);
console.log('Cache hit rate:', metrics.cache.hitRate);
```

### X-Ray Tracer
Distributed tracing for request tracking.

```typescript
import { xrayTracer } from '@/lib/monitoring';

// Start segment
const segment = xrayTracer.startSegment('search');

// Add subsegment
const cacheSegment = xrayTracer.traceCacheOperation('get', 'key', 'redis');
xrayTracer.endSubsegment(cacheSegment.id);

// End segment
xrayTracer.endSegment(segment.id);
```

### Monitoring Middleware
Integrated monitoring for API requests.

```typescript
import {
  startMonitoring,
  endMonitoring,
  monitorCacheOperation,
  monitorSearch,
} from '@/lib/monitoring/monitoring-middleware';

// Start monitoring
const context = startMonitoring('search');

try {
  // Monitor cache operation
  monitorCacheOperation(context, 'hit', 'redis', 'supplement:query:123');
  
  // Monitor search
  monitorSearch(context, 'vitamin d', 120);
  
  // End monitoring (success)
  endMonitoring(context, true);
} catch (error) {
  // End monitoring (failure)
  endMonitoring(context, false, error);
}
```

## API Endpoints

### Get Metrics
```bash
GET /api/monitoring/metrics
```

Returns current metrics:
```json
{
  "success": true,
  "metrics": {
    "latency": {
      "p50": 100,
      "p95": 200,
      "p99": 300
    },
    "cache": {
      "hitRate": 85.5,
      "hits": 855,
      "misses": 145
    },
    "errors": {
      "errorRate": 0.5,
      "totalErrors": 5
    }
  }
}
```

### Export Metrics (CloudWatch Format)
```bash
POST /api/monitoring/metrics
```

Returns metrics in CloudWatch format for export.

## CloudWatch Alarms

Deploy alarms using CloudFormation:

```bash
./infrastructure/deploy-cloudwatch-alarms.sh production alerts@example.com
```

### Configured Alarms

- **High Error Rate**: Triggers when error rate > 1%
- **Low Cache Hit Rate**: Triggers when hit rate < 80%
- **High P95 Latency**: Triggers when P95 > 300ms
- **High P99 Latency**: Triggers when P99 > 500ms
- **Discovery Queue Backlog**: Triggers when queue > 100 items

## Testing

All monitoring components have comprehensive property-based tests:

```bash
npm test -- lib/monitoring/__tests__/
```

### Test Coverage

- ✅ Analytics logging (3 tests, 300 runs)
- ✅ Error logging (4 tests, 400 runs)
- ✅ Cache hit rate alerting (6 tests, 600 runs)
- ✅ Latency alerting (7 tests, 700 runs)
- ✅ Anomaly detection (5 tests, 500 runs)

**Total: 25 property tests, 2,500 test runs**

## Metrics Reference

### Latency Metrics
- `p50`: 50th percentile (median)
- `p95`: 95th percentile
- `p99`: 99th percentile
- `min`: Minimum latency
- `max`: Maximum latency
- `avg`: Average latency
- `count`: Number of measurements

### Cache Metrics
- `hitRate`: Percentage of cache hits
- `hits`: Total cache hits
- `misses`: Total cache misses
- `daxHits`: Hits from DynamoDB DAX
- `redisHits`: Hits from ElastiCache Redis
- `postgresHits`: Hits from RDS Postgres

### Error Metrics
- `errorRate`: Percentage of requests with errors
- `totalErrors`: Total number of errors
- `totalRequests`: Total number of requests
- `errorsByType`: Breakdown of errors by type

## Best Practices

1. **Always use monitoring middleware** for API requests
2. **Log errors with full context** including stack traces
3. **Record metrics for all operations** (search, cache, database)
4. **Use structured logging** with JSON format
5. **Include request IDs** for distributed tracing
6. **Monitor anomalies** and investigate unusual patterns

## Architecture

```
Request
  ↓
Monitoring Middleware
  ├─→ CloudWatch Logger (logs)
  ├─→ Metrics Collector (metrics)
  └─→ X-Ray Tracer (traces)
  
Metrics
  ↓
CloudWatch Metrics
  ↓
CloudWatch Alarms
  ↓
SNS Notifications
  ↓
Email Alerts
```

## Environment Variables

```bash
NODE_ENV=production  # Enable production logging
AWS_REGION=us-east-1 # AWS region for CloudWatch
```

## Integration with Existing Code

The monitoring system integrates seamlessly with existing services:

```typescript
// In your API route
import { startMonitoring, endMonitoring } from '@/lib/monitoring/monitoring-middleware';

export async function GET(request: NextRequest) {
  const context = startMonitoring('api_search');
  
  try {
    // Your existing code
    const result = await searchSupplements(query);
    
    endMonitoring(context, true);
    return NextResponse.json(result);
  } catch (error) {
    endMonitoring(context, false, error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
```

## Troubleshooting

### Metrics not appearing
- Check that `metricsCollector.recordLatency()` is being called
- Verify API endpoint is accessible: `GET /api/monitoring/metrics`

### Alarms not triggering
- Verify CloudFormation stack is deployed
- Check SNS subscription is confirmed (check email)
- Verify metrics are being sent to CloudWatch

### Logs not structured
- Ensure `logger` is imported from `@/lib/monitoring`
- Check that `NODE_ENV` is set correctly

## Future Enhancements

- [ ] CloudWatch Dashboards for visualization
- [ ] Real-time alerting via Slack/PagerDuty
- [ ] Custom metrics for business KPIs
- [ ] Automated anomaly detection with ML
- [ ] Cost tracking and optimization alerts
