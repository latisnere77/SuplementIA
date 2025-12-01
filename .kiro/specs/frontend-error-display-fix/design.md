# Design Document: Frontend Error Display Fix

## Overview

This design addresses the 500 error that occurs during enrichment status polling when jobs are missing from the in-memory store. The current implementation has several weaknesses:

1. **No job expiration tracking** - Jobs are cleaned up after 1 hour, but there's no distinction between expired vs never-existed jobs
2. **Uncontrolled direct fetch fallback** - When a job is missing, the system attempts a direct fetch without proper error handling
3. **Infinite polling** - The frontend continues polling indefinitely even after repeated failures
4. **Poor error messages** - Users see generic 500 errors without actionable guidance
5. **Memory leaks** - No size limits on the job store, no proper cleanup of failed jobs

The solution introduces:
- Explicit job lifecycle management with expiration timestamps
- Proper HTTP status codes (410 Gone, 408 Timeout, 429 Too Many Requests)
- Frontend polling limits with exponential backoff
- Structured error responses with user-friendly messages
- Comprehensive logging with correlation IDs
- Store size limits with LRU eviction

## Architecture

### System Components

```
┌─────────────┐
│   Frontend  │
│   (Polling) │
└──────┬──────┘
       │ GET /api/portal/enrichment-status/:id
       │ Headers: X-Correlation-ID
       ▼
┌─────────────────────────────────────┐
│  Enrichment Status Endpoint         │
│  - Check job in store               │
│  - Validate expiration              │
│  - Handle missing jobs              │
│  - Return appropriate status codes  │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Enhanced Job Store                 │
│  - Expiration timestamps            │
│  - Size limits (1000 jobs)          │
│  - LRU eviction                     │
│  - Cleanup on access                │
└─────────────────────────────────────┘
```

### Data Flow

1. **Job Creation** (from recommend endpoint)
   - Generate unique job ID
   - Store with status='processing', createdAt, expiresAt
   - Return 202 Accepted with polling URL

2. **Polling** (frontend → enrichment-status)
   - Include X-Correlation-ID header
   - Check job in store
   - If missing: check if expired (410) or never existed (404)
   - If processing: return 202 with elapsed time
   - If completed: return 200 with recommendation
   - If failed: return 500 with error details

3. **Cleanup** (automatic)
   - Run on every GET request
   - Remove jobs older than expiresAt
   - If store > 1000 jobs, remove oldest first

## Components and Interfaces

### Enhanced Job Interface

```typescript
interface Job {
  jobId: string;
  status: 'processing' | 'completed' | 'failed' | 'timeout';
  supplementName: string;
  recommendation?: any;
  error?: string;
  createdAt: number;        // Unix timestamp
  expiresAt: number;        // Unix timestamp
  completedAt?: number;     // Unix timestamp
  lastAccessedAt: number;   // For LRU eviction
  retryCount?: number;      // Track retry attempts
}
```

### Job Store Interface

```typescript
interface JobStore {
  // Core operations
  createJob(jobId: string, supplementName: string): Job;
  getJob(jobId: string): Job | undefined;
  updateJob(jobId: string, updates: Partial<Job>): void;
  deleteJob(jobId: string): void;
  
  // Lifecycle management
  markCompleted(jobId: string, recommendation: any): void;
  markFailed(jobId: string, error: string): void;
  markTimeout(jobId: string): void;
  
  // Cleanup
  cleanupExpired(): number;  // Returns count of removed jobs
  enforceSize Limit(): number;  // Returns count of evicted jobs
  
  // Queries
  getJobAge(jobId: string): number | undefined;  // Milliseconds since creation
  isExpired(jobId: string): boolean;
  getStoreSize(): number;
  getOldestJob(): Job | undefined;
}
```

### Error Response Interface

```typescript
interface ErrorResponse {
  success: false;
  status: 'failed' | 'timeout' | 'not_found' | 'expired';
  error: string;              // Machine-readable error code
  message: string;            // User-friendly message
  suggestion?: string;        // Actionable suggestion
  details?: {                 // Debug info (only in dev)
    jobId?: string;
    supplementName?: string;
    elapsedTime?: number;
    retryCount?: number;
  };
  requestId: string;          // For support/debugging
  correlationId?: string;     // From request header
}
```

### Success Response Interface

```typescript
interface SuccessResponse {
  success: true;
  status: 'processing' | 'completed';
  jobId: string;
  supplementName: string;
  
  // For processing status
  elapsedTime?: number;       // Milliseconds since creation
  estimatedTimeRemaining?: number;
  
  // For completed status
  recommendation?: any;
  processingTime?: number;    // Total time taken
  
  requestId: string;
  correlationId?: string;
}
```

## Data Models

### Job Lifecycle States

```
┌──────────┐
│ Created  │ (status: 'processing', createdAt, expiresAt)
└────┬─────┘
     │
     ├─────► ┌───────────┐
     │       │ Completed │ (status: 'completed', completedAt, keep 5min)
     │       └───────────┘
     │
     ├─────► ┌─────────┐
     │       │ Failed  │ (status: 'failed', error, keep 2min)
     │       └─────────┘
     │
     └─────► ┌─────────┐
             │ Timeout │ (status: 'timeout', keep 2min)
             └─────────┘
```

### Expiration Rules

- **Processing jobs**: Expire after 2 minutes (120 seconds)
- **Completed jobs**: Keep for 5 minutes after completion
- **Failed jobs**: Keep for 2 minutes after failure
- **Timeout jobs**: Keep for 2 minutes after timeout

### Store Size Management

- **Max size**: 1000 jobs
- **Eviction strategy**: LRU (Least Recently Used)
- **Cleanup trigger**: On every GET request
- **Eviction trigger**: When size > max after cleanup

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Missing job verification before direct fetch
*For any* job ID that doesn't exist in the store, the system should check if it expired or never existed before attempting a direct fetch
**Validates: Requirements 1.1**

### Property 2: Expired jobs return 410 Gone
*For any* job that has exceeded its expiration time, the system should return HTTP 410 (Gone) with a message indicating the process took too long
**Validates: Requirements 1.2**

### Property 3: Direct fetch errors are captured
*For any* direct fetch attempt that fails, the system should capture the specific error and return an appropriate message to the frontend
**Validates: Requirements 1.3**

### Property 4: Polling stops after 3 failures
*For any* sequence of polling requests, if 3 consecutive failures occur, the frontend should stop polling
**Validates: Requirements 1.4**

### Property 5: 500 errors include debug info without sensitive data
*For any* 500 error response, the message should include sufficient debugging information but no sensitive data (API keys, internal paths, etc.)
**Validates: Requirements 1.5**

### Property 6: Auto-switch to async at 30 seconds
*For any* enrichment process that exceeds 30 seconds, the system should automatically switch to async mode
**Validates: Requirements 2.1**

### Property 7: Async jobs timeout at 2 minutes
*For any* async job that exceeds 2 minutes, the system should return a timeout error with a suggestion to retry
**Validates: Requirements 2.3**

### Property 8: Timeout triggers cleanup
*For any* job that times out, the system should remove it from the store to prevent memory leaks
**Validates: Requirements 2.4**

### Property 9: Retry creates new job ID
*For any* retry attempt after a timeout, the system should create a new job with a new unique ID
**Validates: Requirements 2.5**

### Property 10: Error logging includes required fields
*For any* error in enrichment-status, the system should log jobId, supplement name, error type, and stack trace
**Validates: Requirements 3.1**

### Property 11: Missing job logs time delta
*For any* job not found in the store, the system should log how much time has passed since job creation (if known)
**Validates: Requirements 3.2**

### Property 12: Direct fetch failure logs complete response
*For any* direct fetch failure, the system should log the complete response from the recommend endpoint
**Validates: Requirements 3.3**

### Property 13: Polling requests include correlation ID
*For any* polling request from the frontend, the request should include a correlation ID header for tracking
**Validates: Requirements 3.4**

### Property 14: Repeated failures trigger alerts
*For any* pattern of repeated failures (>5 in 1 minute), the system should generate an alert for investigation
**Validates: Requirements 3.5**

### Property 15: Empty supplement names are rejected
*For any* supplement search with an empty or whitespace-only name, the system should reject it with validation error
**Validates: Requirements 4.1**

### Property 16: Normalization success is verified
*For any* query normalization attempt, the system should verify success before proceeding with the search
**Validates: Requirements 4.2**

### Property 17: Special characters are sanitized
*For any* supplement name containing special characters, the system should sanitize them correctly
**Validates: Requirements 4.3**

### Property 18: Validation failures return 400
*For any* validation failure, the system should return HTTP 400 with a descriptive message
**Validates: Requirements 4.4**

### Property 19: Problematic queries log warnings
*For any* query detected as potentially problematic, the system should log a warning
**Validates: Requirements 4.5**

### Property 20: Jobs have creation and expiration timestamps
*For any* job created, the system should assign both a creation timestamp and an expiration timestamp
**Validates: Requirements 6.1**

### Property 21: Completed jobs retained for 5 minutes
*For any* job that completes successfully, the system should keep it in the store for 5 minutes to allow re-fetches
**Validates: Requirements 6.2**

### Property 22: Failed jobs retained for 2 minutes
*For any* job that fails, the system should keep the error in the store for 2 minutes
**Validates: Requirements 6.3**

### Property 23: Cleanup removes expired jobs
*For any* cleanup execution, the system should remove all jobs older than their expiration time
**Validates: Requirements 6.4**

### Property 24: Store evicts oldest jobs when full
*For any* store that reaches its size limit, the system should remove the oldest (least recently accessed) jobs first
**Validates: Requirements 6.5**

## Error Handling

### HTTP Status Codes

- **200 OK**: Job completed successfully
- **202 Accepted**: Job still processing
- **400 Bad Request**: Invalid input (empty supplement name, invalid characters)
- **404 Not Found**: Job never existed
- **408 Request Timeout**: Job timed out during processing
- **410 Gone**: Job expired from store
- **429 Too Many Requests**: Too many polling attempts
- **500 Internal Server Error**: System error (enrichment failed, unexpected error)

### Error Categories

1. **Client Errors (4xx)**
   - User-friendly messages
   - Actionable suggestions
   - No retry recommended (except 408, 429)

2. **Server Errors (5xx)**
   - Generic user message
   - Detailed logs for debugging
   - Retry recommended with backoff

### Error Message Templates

```typescript
const ERROR_MESSAGES = {
  JOB_EXPIRED: {
    status: 410,
    error: 'job_expired',
    message: 'El proceso de búsqueda tomó demasiado tiempo y expiró.',
    suggestion: 'Por favor, intenta buscar de nuevo.',
  },
  JOB_NOT_FOUND: {
    status: 404,
    error: 'job_not_found',
    message: 'No encontramos el proceso de búsqueda solicitado.',
    suggestion: 'Verifica el enlace o inicia una nueva búsqueda.',
  },
  JOB_TIMEOUT: {
    status: 408,
    error: 'job_timeout',
    message: 'La búsqueda está tomando más tiempo del esperado.',
    suggestion: 'Por favor, intenta de nuevo en unos momentos.',
  },
  TOO_MANY_REQUESTS: {
    status: 429,
    error: 'too_many_requests',
    message: 'Demasiados intentos de consulta.',
    suggestion: 'Por favor, espera unos segundos antes de intentar de nuevo.',
  },
  ENRICHMENT_FAILED: {
    status: 500,
    error: 'enrichment_failed',
    message: 'Hubo un error al procesar tu búsqueda.',
    suggestion: 'Por favor, intenta de nuevo. Si el problema persiste, contáctanos.',
  },
  VALIDATION_FAILED: {
    status: 400,
    error: 'validation_failed',
    message: 'El nombre del suplemento no es válido.',
    suggestion: 'Verifica que el nombre no esté vacío y no contenga caracteres especiales.',
  },
};
```

## Testing Strategy

### Unit Testing

We will write unit tests for:

1. **Job Store Operations**
   - Creating jobs with correct timestamps
   - Updating job status
   - Retrieving jobs
   - Deleting jobs

2. **Expiration Logic**
   - Calculating expiration times based on status
   - Checking if jobs are expired
   - Cleanup removing only expired jobs

3. **Size Management**
   - LRU eviction when store is full
   - Tracking last accessed time
   - Finding oldest jobs

4. **Error Response Formatting**
   - Generating user-friendly messages
   - Including/excluding debug info based on environment
   - Sanitizing sensitive data

### Property-Based Testing

We will use **fast-check** (JavaScript/TypeScript property-based testing library) to verify correctness properties. Each property test should run a minimum of 100 iterations.

Property tests will cover:

1. **Job Lifecycle Properties**
   - Property 20: Jobs always have creation and expiration timestamps
   - Property 21: Completed jobs are retained for exactly 5 minutes
   - Property 22: Failed jobs are retained for exactly 2 minutes
   - Property 23: Cleanup removes all and only expired jobs
   - Property 24: LRU eviction removes oldest jobs first

2. **Error Handling Properties**
   - Property 2: Expired jobs always return 410
   - Property 5: 500 errors never contain sensitive data
   - Property 18: Validation failures always return 400

3. **Input Validation Properties**
   - Property 15: Empty names are always rejected
   - Property 17: Special characters are always sanitized
   - Property 19: Problematic queries always log warnings

4. **Timeout Properties**
   - Property 7: Jobs exceeding 2 minutes always timeout
   - Property 8: Timeouts always trigger cleanup
   - Property 9: Retries always generate new job IDs

5. **Logging Properties**
   - Property 10: Errors always log required fields
   - Property 13: Polling requests always include correlation IDs

### Integration Testing

Integration tests will verify:

1. **End-to-End Polling Flow**
   - Create job → Poll → Complete → Verify response
   - Create job → Poll → Timeout → Verify 408
   - Create job → Wait for expiration → Poll → Verify 410

2. **Error Recovery**
   - Failed enrichment → Retry → Success
   - Timeout → Retry with new job ID → Success

3. **Concurrent Access**
   - Multiple jobs processing simultaneously
   - Store cleanup while jobs are being accessed
   - Eviction while new jobs are being created

### Test Configuration

```typescript
// fast-check configuration
const FC_CONFIG = {
  numRuns: 100,  // Minimum 100 iterations per property
  verbose: true,
  seed: Date.now(),  // Reproducible with seed
};

// Test data generators
const jobIdGenerator = fc.uuid();
const supplementNameGenerator = fc.string({ minLength: 1, maxLength: 100 });
const timestampGenerator = fc.integer({ min: Date.now() - 86400000, max: Date.now() });
const statusGenerator = fc.constantFrom('processing', 'completed', 'failed', 'timeout');
```

## Performance Considerations

### Memory Management

- **Store size limit**: 1000 jobs maximum
- **Average job size**: ~2KB (including recommendation data)
- **Total memory**: ~2MB maximum for job store
- **Cleanup frequency**: On every GET request (amortized O(1) with lazy cleanup)

### Latency Targets

- **Job lookup**: < 1ms (Map.get)
- **Cleanup**: < 10ms (iterate expired jobs)
- **Eviction**: < 5ms (find and remove oldest)
- **Total endpoint latency**: < 100ms (95th percentile)

### Scalability

Current in-memory solution is suitable for:
- Single-instance deployments
- < 1000 concurrent users
- < 100 requests/second

For higher scale, migrate to:
- Redis for distributed job storage
- DynamoDB with TTL for automatic expiration
- SQS for async job processing

## Observability

### Logging

All logs will use structured JSON format:

```typescript
{
  timestamp: '2024-11-25T10:30:00.000Z',
  level: 'error' | 'warn' | 'info' | 'debug',
  event: 'JOB_EXPIRED' | 'JOB_NOT_FOUND' | 'ENRICHMENT_FAILED' | ...,
  jobId: 'job_123',
  supplementName: 'Yodo',
  correlationId: 'corr_456',
  requestId: 'req_789',
  elapsedTime: 125000,  // milliseconds
  error: 'Error message',
  stack: 'Stack trace',
  metadata: { ... }
}
```

### Metrics

Track the following metrics:

1. **Job Metrics**
   - Jobs created per minute
   - Jobs completed per minute
   - Jobs failed per minute
   - Jobs timed out per minute
   - Average job duration

2. **Store Metrics**
   - Current store size
   - Cleanup operations per minute
   - Evictions per minute
   - Average job age

3. **Error Metrics**
   - 4xx errors per minute (by status code)
   - 5xx errors per minute (by status code)
   - Error rate (errors / total requests)
   - Repeated failure patterns

4. **Performance Metrics**
   - Endpoint latency (p50, p95, p99)
   - Cleanup duration
   - Eviction duration

### Alerts

Configure alerts for:

- Error rate > 5% for 5 minutes
- Store size > 900 jobs
- Average job duration > 60 seconds
- Repeated failures > 5 in 1 minute
- Endpoint latency p95 > 200ms

## Migration Strategy

### Phase 1: Enhanced Job Store (Week 1)
- Add expiration timestamps to Job interface
- Implement size limits and LRU eviction
- Add cleanup on access
- Unit tests for new functionality

### Phase 2: Improved Error Handling (Week 1)
- Implement proper HTTP status codes
- Add error message templates
- Improve error logging
- Property tests for error handling

### Phase 3: Frontend Polling Limits (Week 2)
- Add retry counter to frontend
- Implement exponential backoff
- Add correlation ID headers
- Integration tests for polling

### Phase 4: Monitoring & Alerts (Week 2)
- Add structured logging
- Implement metrics collection
- Configure alerts
- Dashboard for observability

### Phase 5: Production Rollout (Week 3)
- Deploy to staging
- Load testing
- Monitor for issues
- Gradual rollout to production

## Future Enhancements

1. **Distributed Job Store**
   - Migrate to Redis for multi-instance support
   - Add job persistence for crash recovery

2. **Advanced Retry Logic**
   - Exponential backoff with jitter
   - Circuit breaker for failing supplements
   - Automatic retry for transient errors

3. **Predictive Timeouts**
   - ML model to predict job duration
   - Dynamic timeout based on supplement complexity
   - Proactive async mode switching

4. **User Notifications**
   - Email/SMS when long-running job completes
   - Push notifications for mobile app
   - Webhook callbacks for API users

5. **Analytics**
   - Track which supplements timeout most
   - Identify patterns in failures
   - Optimize enrichment for slow supplements
