# Structured Logger Usage Guide

## Overview

The structured logger provides consistent JSON-formatted logging with correlation IDs and required fields for all portal API operations. This ensures logs are searchable, parseable, and contain all necessary debugging information.

## Core Features

- **Consistent Structure**: All logs include timestamp, level, event, and relevant context
- **Correlation IDs**: Track requests across multiple services
- **Type Safety**: TypeScript types ensure correct usage
- **Multiple Log Levels**: error, warn, info, debug
- **Specialized Functions**: Pre-configured functions for common scenarios

## Basic Usage

```typescript
import { logStructured } from '@/lib/portal/structured-logger';

// Basic structured log
logStructured('info', 'USER_ACTION', {
  userId: '123',
  action: 'search',
  query: 'vitamin-d',
});

// Output:
// {
//   "timestamp": "2024-11-25T10:30:00.000Z",
//   "level": "info",
//   "event": "USER_ACTION",
//   "userId": "123",
//   "action": "search",
//   "query": "vitamin-d"
// }
```

## Specialized Logging Functions

### 1. Enrichment Errors

**Validates: Requirements 3.1**

```typescript
import { logEnrichmentError } from '@/lib/portal/structured-logger';

try {
  // ... enrichment logic
} catch (error) {
  logEnrichmentError(
    jobId,
    supplementName,
    error,
    {
      correlationId,
      requestId,
      duration: Date.now() - startTime,
    }
  );
}
```

**Required Fields:**
- `jobId`: Job identifier
- `supplementName`: Supplement being processed
- `error`: Error object or string
- `stack`: Stack trace (automatically extracted from Error objects)

### 2. Direct Fetch Failures

**Validates: Requirements 3.3**

```typescript
import { logDirectFetchFailure } from '@/lib/portal/structured-logger';

const response = await fetch(url);
if (!response.ok) {
  const body = await response.json().catch(() => ({}));
  
  logDirectFetchFailure(
    jobId,
    supplementName,
    {
      status: response.status,
      statusText: response.statusText,
      body,
      error: body.error || 'Unknown error',
    },
    {
      correlationId,
      requestId,
      duration: Date.now() - startTime,
    }
  );
}
```

**Required Fields:**
- `jobId`: Job identifier
- `supplementName`: Supplement being processed
- `statusCode`: HTTP status code
- `statusText`: HTTP status text
- `responseBody`: Complete response body
- `error`: Error message from response

### 3. Missing Jobs

**Validates: Requirements 3.2**

```typescript
import { logMissingJob } from '@/lib/portal/structured-logger';

const job = getJob(jobId);
if (!job) {
  const timeSinceCreation = getJobAge(jobId); // undefined if never existed
  
  logMissingJob(
    jobId,
    supplementName,
    timeSinceCreation,
    { correlationId }
  );
}
```

**Required Fields:**
- `jobId`: Job identifier
- `supplementName`: Supplement name (optional)
- `timeSinceCreation`: Time delta in milliseconds (optional)

### 4. Job Lifecycle Events

```typescript
import {
  logJobExpired,
  logJobCompleted,
  logJobFailed,
  logJobTimeout,
  logJobProcessing,
} from '@/lib/portal/structured-logger';

// Job expired
logJobExpired(jobId, supplementName, elapsedTime, status, { correlationId });

// Job completed
logJobCompleted(jobId, supplementName, processingTime, { correlationId });

// Job failed
logJobFailed(jobId, supplementName, error, elapsedTime, { correlationId });

// Job timeout
logJobTimeout(jobId, supplementName, elapsedTime, { correlationId });

// Job processing
logJobProcessing(jobId, supplementName, elapsedTime, { correlationId });
```

### 5. Store Maintenance

```typescript
import { logStoreMaintenance } from '@/lib/portal/structured-logger';

const cleanedCount = cleanupExpired();
const evictedCount = enforceSizeLimit();

if (cleanedCount > 0 || evictedCount > 0) {
  logStoreMaintenance(cleanedCount, evictedCount, { correlationId });
}
```

### 6. Validation Failures

```typescript
import { logValidationFailure } from '@/lib/portal/structured-logger';

const validation = validateSupplementQuery(query);
if (!validation.valid) {
  logValidationFailure(
    query,
    validation.error,
    {
      requestId,
      severity: validation.severity,
    }
  );
}
```

### 7. Problematic Queries

**Validates: Requirements 4.5**

```typescript
import { logProblematicQuery } from '@/lib/portal/structured-logger';

if (detectProblematicQuery(query)) {
  logProblematicQuery(
    query,
    'Contains special characters that may cause issues',
    { requestId }
  );
}
```

### 8. Retry Operations

```typescript
import {
  logRetryAttempt,
  logRetryLimitExceeded,
} from '@/lib/portal/structured-logger';

// Retry attempt
const { newJobId, retryCount } = createRetryJob(previousJobId);
logRetryAttempt(previousJobId, newJobId, retryCount, { requestId });

// Retry limit exceeded
if (hasExceededRetryLimit(jobId, 5)) {
  logRetryLimitExceeded(jobId, retryCount, { requestId });
}
```

## Log Levels

### error
Use for errors that require immediate attention:
- Enrichment failures
- Direct fetch failures
- Job failures
- Validation errors

### warn
Use for issues that should be monitored:
- Job expiration
- Job timeout
- Missing jobs
- Problematic queries
- Retry limit exceeded

### info
Use for normal operations:
- Job creation
- Job completion
- Job processing status
- Successful operations

### debug
Use for detailed debugging information:
- Store maintenance operations
- Cache hits/misses
- Internal state changes

## Correlation IDs

Always include correlation IDs when available to track requests across services:

```typescript
// Extract from request header
const correlationId = request.headers.get('X-Correlation-ID') || undefined;

// Include in all log calls
logStructured('info', 'ENRICHMENT_STATUS_CHECK', {
  jobId,
  supplementName,
  correlationId, // ← Always include
});
```

## Searching Logs

All logs are JSON-formatted for easy parsing and searching:

```bash
# Search by job ID
grep '"jobId":"job_123"' logs.json

# Search by event type
grep '"event":"JOB_FAILED"' logs.json

# Search by correlation ID
grep '"correlationId":"corr_456"' logs.json

# Parse and filter with jq
cat logs.json | jq 'select(.level == "error")'
cat logs.json | jq 'select(.event == "DIRECT_FETCH_FAILURE")'
```

## Best Practices

1. **Always include correlation IDs** when available
2. **Use specialized functions** instead of generic `logStructured` when possible
3. **Include context** in additional data parameter
4. **Don't log sensitive data** (API keys, passwords, PII)
5. **Use appropriate log levels** based on severity
6. **Include timing information** (duration, elapsed time) for performance tracking
7. **Log both success and failure** to understand system behavior

## Migration from console.log

### Before
```typescript
console.log(`Job ${jobId} completed for ${supplementName}`);
```

### After
```typescript
logJobCompleted(jobId, supplementName, processingTime, { correlationId });
```

### Before
```typescript
console.error('Enrichment failed:', error);
```

### After
```typescript
logEnrichmentError(jobId, supplementName, error, { correlationId, requestId });
```

## Testing

Property-based tests ensure all logging functions work correctly across all inputs:

```bash
npm test -- lib/portal/structured-logger.test.ts
```

See `lib/portal/structured-logger.test.ts` for examples of property-based testing with fast-check.
