# Retry Logic Usage Guide

This document explains how the retry logic works for async enrichment jobs.

## Overview

The retry logic ensures that when a job times out or fails, users can retry with a new job ID while tracking the retry count to prevent infinite retries.

## Key Features

1. **New Job ID per Retry**: Each retry attempt generates a unique job ID
2. **Retry Count Tracking**: The system tracks how many times a job has been retried
3. **Retry Limit Enforcement**: Maximum of 5 retries allowed (returns 429 Too Many Requests after that)
4. **Previous Job State Preservation**: Previous jobs remain in the store for debugging

## API Usage

### Backend (Job Store)

```typescript
import { createJob, createRetryJob, hasExceededRetryLimit } from '@/lib/portal/job-store';

// Create initial job
createJob('job_123');

// Create retry job (generates new job ID)
const { newJobId, retryCount } = createRetryJob('job_123');
// Returns: { newJobId: 'job_456', retryCount: 1 }

// Check if retry limit exceeded
const exceeded = hasExceededRetryLimit('job_456', 5);
// Returns: false (retry count is 1, limit is 5)
```

### Backend (API Endpoints)

#### `/api/portal/enrich-async`

Handles retry requests by checking the `X-Previous-Job-ID` header:

```typescript
// Client sends retry request
fetch('/api/portal/enrich-async', {
  method: 'POST',
  headers: {
    'X-Previous-Job-ID': 'job_123', // Previous job ID
  },
  body: JSON.stringify({ supplementName: 'Vitamin D' }),
});

// Server response (202 Accepted)
{
  "success": true,
  "status": "processing",
  "jobId": "job_456", // New job ID
  "isRetry": true,
  "retryCount": 1,
  "previousJobId": "job_123",
  "pollUrl": "/api/portal/enrichment-status/job_456"
}

// If retry limit exceeded (429 Too Many Requests)
{
  "success": false,
  "error": "too_many_retries",
  "message": "Demasiados intentos de reintento.",
  "suggestion": "Por favor, espera unos minutos antes de intentar de nuevo."
}
```

#### `/api/portal/recommend`

Also supports retry logic via `X-Previous-Job-ID` header for sync-to-async transitions.

### Frontend (AsyncEnrichmentLoader)

The component automatically handles retries when the user clicks the retry button:

```typescript
// User clicks retry button
handleRetry();

// Component sends request with previous job ID
fetch('/api/portal/enrich-async', {
  headers: {
    'X-Previous-Job-ID': previousJobId,
  },
});

// Component receives new job ID and starts polling
```

## Retry Flow

```
User searches for supplement
  ↓
Job created (job_123, retryCount: 0)
  ↓
Job times out or fails
  ↓
User clicks "Retry"
  ↓
Frontend sends X-Previous-Job-ID: job_123
  ↓
Backend checks retry limit
  ↓
Backend creates new job (job_456, retryCount: 1)
  ↓
Frontend polls new job ID
  ↓
... (repeat up to 5 times)
  ↓
After 5 retries, return 429 Too Many Requests
```

## Retry Limits

- **Maximum retries**: 5
- **Retry count tracking**: Stored in job metadata
- **Limit enforcement**: Checked before creating retry job
- **Error response**: 429 Too Many Requests when limit exceeded

## Job ID Format

All job IDs follow the format: `job_{timestamp}_{random}`

Example: `job_1732547890123_abc123def`

This ensures:
- Uniqueness across retries
- Chronological ordering
- Easy debugging with timestamps

## Testing

Property-based tests verify:
- Each retry generates a unique job ID
- Retry count increments correctly
- Retry limit is enforced
- Job state is preserved across retries

See:
- `lib/portal/retry-logic.test.ts` - Property tests
- `lib/portal/retry-integration.test.ts` - Integration tests

## Error Handling

### 429 Too Many Requests

Returned when retry count exceeds 5:

```json
{
  "success": false,
  "error": "too_many_retries",
  "message": "Demasiados intentos de reintento.",
  "suggestion": "Por favor, espera unos minutos antes de intentar de nuevo."
}
```

Frontend behavior:
- Hides retry button
- Shows "contact support" message
- Prevents further retry attempts

### 408 Request Timeout

Returned when job times out:

```json
{
  "success": false,
  "status": "timeout",
  "error": "job_timeout",
  "message": "La búsqueda está tomando más tiempo del esperado.",
  "suggestion": "Por favor, intenta de nuevo en unos momentos."
}
```

Frontend behavior:
- Shows retry button
- Allows user to retry with new job ID

## Best Practices

1. **Always pass previous job ID on retry**: Use `X-Previous-Job-ID` header
2. **Check retry limit before creating job**: Use `hasExceededRetryLimit()`
3. **Generate new job ID for each retry**: Use `createRetryJob()`
4. **Log retry attempts**: Include retry count in logs for debugging
5. **Preserve previous job state**: Keep old jobs in store for tracking

## Monitoring

Track these metrics:
- Retry rate (retries / total jobs)
- Average retry count per job
- Jobs exceeding retry limit
- Time between retries

## Future Enhancements

- Exponential backoff between retries
- Circuit breaker for failing supplements
- Retry history tracking
- Automatic retry for transient errors
