# API Documentation - Frontend Error Display Fix

## Overview

This document describes the enhanced error handling and job management APIs for the async enrichment system.

## Endpoints

### POST /api/portal/enrich-async

Creates a new async enrichment job.

**Request:**
```typescript
{
  supplementName: string;
  category?: string;
  forceRefresh?: boolean;
  isRetry?: boolean;
  retryCount?: number;
  previousJobId?: string;
}
```

**Response (202 Accepted):**
```typescript
{
  success: true;
  jobId: string;
  status: 'processing';
  pollUrl: string;
  pollInterval: number; // milliseconds
  isRetry?: boolean;
  retryCount?: number;
  previousJobId?: string;
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input (empty name, invalid characters)
- `429 Too Many Requests` - Retry limit exceeded (> 5 retries)
- `500 Internal Server Error` - Server error

---

### GET /api/portal/enrichment-status/[id]

Polls the status of an enrichment job.

**Headers:**
- `X-Correlation-ID` (required) - Correlation ID for request tracking

**Response (200 OK - Completed):**
```typescript
{
  status: 'completed';
  recommendation: {
    // Enrichment data
  };
  processingTime: number; // milliseconds
}
```

**Response (202 Accepted - Processing):**
```typescript
{
  status: 'processing';
  elapsedTime: number; // milliseconds
}
```

**Response (408 Request Timeout - Timeout):**
```typescript
{
  status: 'timeout';
  error: 'La búsqueda tomó demasiado tiempo';
  suggestion: 'Por favor, intenta de nuevo';
  canRetry: true;
}
```

**Response (410 Gone - Expired):**
```typescript
{
  status: 'expired';
  error: 'El resultado ya no está disponible';
  suggestion: 'Por favor, realiza una nueva búsqueda';
}
```

**Response (404 Not Found - Never Existed):**
```typescript
{
  error: 'Job not found';
  suggestion: 'Por favor, verifica el ID del trabajo';
}
```

**Response (500 Internal Server Error - Failed):**
```typescript
{
  status: 'failed';
  error: string;
  suggestion: string;
  debugInfo?: {
    // Only in development mode
  };
}
```

---

## Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Job completed successfully |
| 202 | Accepted | Job created or still processing |
| 400 | Bad Request | Invalid input (validation failure) |
| 404 | Not Found | Job never existed |
| 408 | Request Timeout | Job timed out (> 2 minutes) |
| 410 | Gone | Job expired (past retention period) |
| 429 | Too Many Requests | Retry limit exceeded |
| 500 | Internal Server Error | Server error or job failed |

---

## Job Lifecycle

```
CREATE → PROCESSING → COMPLETED (retained 5 min)
                   ↓
                FAILED (retained 2 min)
                   ↓
                TIMEOUT (retained 2 min)
                   ↓
                EXPIRED (removed)
```

### Retention Times

- **Processing**: 2 minutes (then timeout)
- **Completed**: 5 minutes (then expired)
- **Failed**: 2 minutes (then expired)
- **Timeout**: 2 minutes (then expired)

---

## Error Messages

All error responses include:
- `error`: User-friendly message in Spanish
- `suggestion`: Actionable suggestion
- `requestId`: Unique request identifier
- `correlationId`: Correlation ID for tracking

### Sensitive Data Sanitization

The following patterns are automatically sanitized from error responses:
- API keys (`sk-...`, `Bearer ...`)
- AWS credentials (`AKIA...`, `aws_secret_access_key`)
- Database connection strings
- Internal file paths
- Email addresses (in production)

---

## Retry Logic

### Client-Side Retry

The frontend implements exponential backoff:
- Attempt 1: 2 seconds
- Attempt 2: 4 seconds
- Attempt 3: 8 seconds
- Max attempts: 3

After 3 consecutive failures, polling stops and user is prompted to retry manually.

### Server-Side Retry

Each retry creates a new job ID:
- Max retries: 5
- Retry count tracked in job metadata
- Returns 429 if retry limit exceeded

---

## Correlation IDs

All requests should include `X-Correlation-ID` header for tracking:
```
X-Correlation-ID: corr_1234567890_abc123def
```

Format: `corr_{timestamp}_{random}`

---

## Logging

All operations are logged in structured JSON format:

```json
{
  "timestamp": "2025-11-26T00:00:00.000Z",
  "level": "info|warn|error",
  "event": "JOB_CREATED|JOB_COMPLETED|JOB_FAILED|...",
  "jobId": "job_1234567890_abc123def",
  "correlationId": "corr_1234567890_abc123def",
  "supplementName": "L-Carnitine",
  "elapsedTime": 1234
}
```

### Log Events

- `JOB_CREATED` - New job created
- `JOB_PROCESSING` - Job status checked (processing)
- `JOB_COMPLETED` - Job completed successfully
- `JOB_FAILED` - Job failed with error
- `JOB_TIMEOUT` - Job timed out
- `JOB_EXPIRED` - Job expired and removed
- `ENRICHMENT_STATUS_CHECK` - Status endpoint called
- `VALIDATION_FAILURE` - Input validation failed
- `PROBLEMATIC_QUERY` - Potentially problematic query detected

---

## Metrics

The system tracks the following metrics:

### Job Metrics
- Jobs created
- Jobs completed
- Jobs failed
- Jobs timed out

### Store Metrics
- Current store size
- Cleanup operations
- Evictions (LRU)

### Error Metrics
- Error count by status code (400, 404, 408, 410, 429, 500)

### Performance Metrics
- Endpoint latency (p50, p95, p99)
- Cleanup duration
- Eviction duration

---

## Examples

### Create Job
```bash
curl -X POST https://api.example.com/api/portal/enrich-async \
  -H "Content-Type: application/json" \
  -d '{"supplementName": "L-Carnitine"}'
```

### Poll Status
```bash
curl https://api.example.com/api/portal/enrichment-status/job_123 \
  -H "X-Correlation-ID: corr_456"
```

### Retry After Timeout
```bash
curl -X POST https://api.example.com/api/portal/enrich-async \
  -H "Content-Type: application/json" \
  -d '{
    "supplementName": "L-Carnitine",
    "isRetry": true,
    "retryCount": 1,
    "previousJobId": "job_123"
  }'
```

---

## Frontend Integration

### AsyncEnrichmentLoader Component

```tsx
import AsyncEnrichmentLoader from '@/components/portal/AsyncEnrichmentLoader';

<AsyncEnrichmentLoader
  supplementName="L-Carnitine"
  onComplete={(data) => console.log('Success:', data)}
  onError={(error) => console.error('Error:', error)}
/>
```

### ErrorMessage Component

```tsx
import { ErrorMessage } from '@/components/portal/ErrorMessage';

<ErrorMessage
  message="Error message"
  type="error" // 'error' | 'warning' | 'info'
  suggestion="Try again"
  onRetry={() => handleRetry()}
  showRetryButton={true}
/>
```

---

## Monitoring

### Key Metrics to Monitor

1. **Job Success Rate**: `completed / (completed + failed + timeout)`
2. **Average Processing Time**: Time from create to complete
3. **Timeout Rate**: `timeout / total_jobs`
4. **Retry Rate**: `retries / total_jobs`
5. **Store Size**: Current number of jobs in memory
6. **Cleanup Frequency**: Cleanups per minute
7. **Error Rate by Status Code**: Errors grouped by 4xx/5xx

### Alerts

Set up alerts for:
- Job success rate < 95%
- Timeout rate > 5%
- Store size > 900 (approaching limit)
- Error rate > 10%
- Repeated failures for same supplement (> 5 in 1 minute)

---

## Troubleshooting

### Job Not Found (404)
- Verify job ID is correct
- Check if job expired (> retention time)
- Check logs for job creation

### Job Timeout (408)
- Check backend Lambda performance
- Verify network connectivity
- Check if supplement name is valid
- Retry with new job ID

### Job Expired (410)
- Job was created but expired before polling
- Increase polling frequency
- Create new job

### Retry Limit Exceeded (429)
- User has retried > 5 times
- Wait before allowing new attempts
- Investigate why jobs are failing

### Internal Server Error (500)
- Check logs for error details
- Verify backend Lambda is healthy
- Check for validation issues
- Contact support if persistent
