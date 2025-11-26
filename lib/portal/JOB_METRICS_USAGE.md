# Job Metrics Usage Guide

## Overview

The Job Metrics module provides comprehensive tracking and observability for async enrichment jobs and job store operations. It tracks job lifecycle events, store health, error rates, and endpoint latency.

## Features

- **Job Lifecycle Tracking**: Count jobs created, completed, failed, and timed out
- **Store Operations**: Track store size, cleanup operations, and evictions
- **Error Tracking**: Monitor errors by HTTP status code
- **Latency Metrics**: Calculate P50, P95, P99 percentiles for endpoint performance
- **Structured Export**: Export metrics in JSON format for monitoring dashboards

## Usage

### Automatic Tracking

Metrics are automatically collected when using the job store functions:

```typescript
import { createJob, storeJobResult, markTimeout } from '@/lib/portal/job-store';

// Job creation is automatically tracked
createJob('job_123');

// Job completion/failure is automatically tracked
storeJobResult('job_123', 'completed', { recommendation: data });
storeJobResult('job_456', 'failed', { error: 'Something went wrong' });

// Timeout is automatically tracked
markTimeout('job_789');
```

### Manual Tracking

You can also manually record metrics:

```typescript
import { jobMetrics } from '@/lib/portal/job-metrics';

// Record job events
jobMetrics.recordJobCreated();
jobMetrics.recordJobCompleted();
jobMetrics.recordJobFailed();
jobMetrics.recordJobTimedOut();

// Record store operations
jobMetrics.updateStoreSize(150);
jobMetrics.recordCleanup(5);
jobMetrics.recordEviction(3);

// Record errors
jobMetrics.recordError(404);
jobMetrics.recordError(500);

// Record latency
jobMetrics.recordLatency(45); // milliseconds
```

### Retrieving Metrics

Get a comprehensive metrics summary:

```typescript
import { jobMetrics } from '@/lib/portal/job-metrics';

const summary = jobMetrics.getMetricsSummary();

console.log(summary);
// {
//   jobs: {
//     created: 100,
//     completed: 85,
//     failed: 10,
//     timedOut: 5,
//     successRate: 85.0
//   },
//   store: {
//     currentSize: 50,
//     cleanupOperations: 20,
//     evictions: 5
//   },
//   errors: {
//     total: 15,
//     byStatusCode: {
//       '404': 5,
//       '500': 10
//     }
//   },
//   latency: {
//     p50: 45,
//     p95: 120,
//     p99: 250,
//     min: 10,
//     max: 500,
//     avg: 67.5,
//     count: 100
//   },
//   timestamp: '2024-11-25T10:30:00.000Z'
// }
```

### Exporting Metrics

Export metrics for monitoring dashboards:

```typescript
import { jobMetrics } from '@/lib/portal/job-metrics';

const metrics = jobMetrics.exportMetrics();

// Send to monitoring service
await sendToMonitoring(metrics);
```

### API Endpoint

Metrics are exposed via the `/api/portal/metrics` endpoint:

```bash
curl http://localhost:3000/api/portal/metrics
```

Response:
```json
{
  "success": true,
  "metrics": {
    "jobs": {
      "created": 100,
      "completed": 85,
      "failed": 10,
      "timedOut": 5,
      "successRate": 85.0
    },
    "store": {
      "currentSize": 50,
      "cleanupOperations": 20,
      "evictions": 5
    },
    "errors": {
      "total": 15,
      "byStatusCode": {
        "404": 5,
        "500": 10
      }
    },
    "latency": {
      "p50": 45,
      "p95": 120,
      "p99": 250,
      "min": 10,
      "max": 500,
      "avg": 67.5,
      "count": 100
    },
    "timestamp": "2024-11-25T10:30:00.000Z"
  }
}
```

## Integration with Enrichment Status Endpoint

The enrichment status endpoint automatically tracks:

- Endpoint latency for all requests
- Error counts by status code (404, 410, 408, 500)
- Job lifecycle events (completion, failure, timeout)

No additional code is required - metrics are collected automatically.

## Monitoring Dashboard Integration

### CloudWatch

Export metrics to CloudWatch:

```typescript
import { jobMetrics } from '@/lib/portal/job-metrics';
import { CloudWatch } from 'aws-sdk';

const cloudwatch = new CloudWatch();
const metrics = jobMetrics.exportMetrics();

await cloudwatch.putMetricData({
  Namespace: 'AsyncEnrichment',
  MetricData: [
    {
      MetricName: 'JobsCreated',
      Value: metrics.jobs.created,
      Unit: 'Count',
    },
    {
      MetricName: 'SuccessRate',
      Value: metrics.jobs.successRate,
      Unit: 'Percent',
    },
    {
      MetricName: 'LatencyP95',
      Value: metrics.latency.p95,
      Unit: 'Milliseconds',
    },
  ],
}).promise();
```

### Grafana

Create a dashboard that polls the metrics endpoint:

```javascript
// Grafana data source configuration
{
  "url": "http://your-app.com/api/portal/metrics",
  "method": "GET",
  "interval": "30s"
}
```

## Resetting Metrics

For testing or periodic resets:

```typescript
import { jobMetrics } from '@/lib/portal/job-metrics';

jobMetrics.reset();
```

## Best Practices

1. **Monitor P95 Latency**: Set alerts when P95 > 100ms
2. **Track Success Rate**: Alert when success rate < 90%
3. **Watch Store Size**: Alert when size approaches MAX_STORE_SIZE (1000)
4. **Monitor Error Rates**: Alert when error rate > 5%
5. **Regular Exports**: Export metrics every 1-5 minutes to monitoring service

## Example: Monitoring Script

```typescript
import { jobMetrics } from '@/lib/portal/job-metrics';

// Run every minute
setInterval(async () => {
  const metrics = jobMetrics.exportMetrics();
  
  // Check for alerts
  if (metrics.latency.p95 > 100) {
    console.warn('High latency detected:', metrics.latency.p95);
  }
  
  if (metrics.jobs.successRate < 90) {
    console.warn('Low success rate:', metrics.jobs.successRate);
  }
  
  if (metrics.store.currentSize > 900) {
    console.warn('Store size approaching limit:', metrics.store.currentSize);
  }
  
  // Export to monitoring service
  await sendToMonitoring(metrics);
}, 60000);
```

## Metrics Reference

### Job Metrics

- `jobsCreated`: Total number of jobs created
- `jobsCompleted`: Total number of jobs completed successfully
- `jobsFailed`: Total number of jobs that failed
- `jobsTimedOut`: Total number of jobs that timed out
- `successRate`: Percentage of jobs completed successfully

### Store Metrics

- `currentSize`: Current number of jobs in store
- `cleanupOperations`: Number of cleanup operations performed
- `evictions`: Number of jobs evicted due to size limit

### Error Metrics

- `total`: Total number of errors
- `byStatusCode`: Breakdown of errors by HTTP status code

### Latency Metrics

- `p50`: 50th percentile (median) latency in milliseconds
- `p95`: 95th percentile latency in milliseconds
- `p99`: 99th percentile latency in milliseconds
- `min`: Minimum latency
- `max`: Maximum latency
- `avg`: Average latency
- `count`: Number of latency measurements
