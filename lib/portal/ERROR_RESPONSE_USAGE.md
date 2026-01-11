# Error Response Templates - Usage Guide

This document explains how to use the error response templates and formatting functions.

## Overview

The error response system provides:
- Structured error responses with consistent format
- User-friendly messages in Spanish
- Automatic sanitization of sensitive data (API keys, credentials, paths)
- Proper HTTP status codes
- Request tracking with correlation IDs

## Basic Usage

### Import the functions

```typescript
import { formatErrorResponse, formatValidationError, ERROR_MESSAGES } from '@/lib/portal/error-responses';
```

### Format a standard error

```typescript
const { response, statusCode } = formatErrorResponse('JOB_EXPIRED', {
  correlationId: request.headers.get('X-Correlation-ID') || undefined,
  details: {
    jobId: 'job-123',
    elapsedTime: 125000,
  }
});

return NextResponse.json(response, { status: statusCode });
```

### Format a validation error

```typescript
const validationErrors = [
  'El nombre del suplemento no puede estar vacío',
  'El nombre contiene caracteres no permitidos'
];

const { response, statusCode } = formatValidationError(validationErrors, {
  correlationId: request.headers.get('X-Correlation-ID') || undefined,
  supplementName: 'Invalid@Name',
});

return NextResponse.json(response, { status: statusCode });
```

## Available Error Types

- `JOB_EXPIRED` (410) - Job has expired from the store
- `JOB_NOT_FOUND` (404) - Job never existed
- `JOB_TIMEOUT` (408) - Job timed out during processing
- `TOO_MANY_REQUESTS` (429) - Too many polling attempts
- `ENRICHMENT_FAILED` (500) - Enrichment process failed
- `VALIDATION_FAILED` (400) - Input validation failed
- `DIRECT_FETCH_FAILED` (500) - Direct fetch from recommend endpoint failed
- `NORMALIZATION_FAILED` (500) - Query normalization failed

## Custom Messages

You can override the default messages:

```typescript
const { response, statusCode } = formatErrorResponse('ENRICHMENT_FAILED', {
  customMessage: 'No pudimos encontrar información sobre este suplemento específico.',
  customSuggestion: 'Intenta con un nombre más común o genérico.',
});
```

## Sensitive Data Sanitization

The system automatically sanitizes:
- API keys and tokens
- AWS credentials
- Database connection strings
- Internal file paths
- Email addresses
- Internal IP addresses

Example:

```typescript
const { response } = formatErrorResponse('ENRICHMENT_FAILED', {
  details: {
    error: 'Failed with api_key=sk_live_123456789',
    stack: 'Error at /home/user/app/lib/api.ts:123',
  }
});

// In development mode, response.details will contain:
// {
//   error: 'Failed with [REDACTED]',
//   stack: 'Error at [REDACTED]'
// }
```

## Development vs Production

- **Development mode**: Includes sanitized details for debugging
- **Production mode**: Excludes details entirely for security

## Response Structure

All error responses follow this structure:

```typescript
{
  success: false,
  status: 'failed' | 'timeout' | 'not_found' | 'expired' | 'validation_failed' | 'too_many_requests',
  error: string,              // Machine-readable error code
  message: string,            // User-friendly message in Spanish
  suggestion?: string,        // Actionable suggestion
  details?: {                 // Only in development mode
    jobId?: string,
    supplementName?: string,
    elapsedTime?: number,
    retryCount?: number,
    validationErrors?: string[],
  },
  requestId: string,          // Unique request ID for tracking
  correlationId?: string,     // From X-Correlation-ID header
}
```

## Example: Enrichment Status Endpoint

```typescript
import { formatErrorResponse } from '@/lib/portal/error-responses';
import { isExpired, getJob } from '@/lib/portal/job-store';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const jobId = params.id;
  const correlationId = request.headers.get('X-Correlation-ID') || undefined;
  
  // Check if job exists
  const job = getJob(jobId);
  
  if (!job) {
    const { response, statusCode } = formatErrorResponse('JOB_NOT_FOUND', {
      correlationId,
      details: { jobId },
    });
    return NextResponse.json(response, { status: statusCode });
  }
  
  // Check if job is expired
  if (isExpired(jobId)) {
    const { response, statusCode } = formatErrorResponse('JOB_EXPIRED', {
      correlationId,
      details: {
        jobId,
        elapsedTime: Date.now() - job.createdAt,
      },
    });
    return NextResponse.json(response, { status: statusCode });
  }
  
  // ... rest of the logic
}
```

## Testing

The error response system includes comprehensive property-based tests:

- **Property 5**: Validates that sensitive data is sanitized from error responses
- **Property 18**: Validates that validation failures return 400 status code

Run tests with:

```bash
npm test -- lib/portal/error-responses.test.ts
```
