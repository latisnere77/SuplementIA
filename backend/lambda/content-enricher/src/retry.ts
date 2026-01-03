/**
 * Retry logic with exponential backoff for Bedrock API calls
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  retryableErrors: [
    'ThrottlingException',
    'ServiceUnavailable',
    'InternalServerException',
    'RequestTimeout',
    'ServiceException',
    'ModelTimeoutException',
    'ModelErrorException',
  ],
};

/**
 * Type guard for errors with AWS SDK metadata
 */
interface AWSError {
  name?: string;
  code?: string;
  statusCode?: number;
  $metadata?: {
    httpStatusCode?: number;
  };
}

/**
 * Check if an error is retryable based on error name or code
 */
function isRetryableError(error: unknown, retryableErrors: string[]): boolean {
  if (!error || typeof error !== 'object') return false;

  const err = error as AWSError;
  const errorIdentifier = err.name || err.code || err.$metadata?.httpStatusCode;

  // Check if error name or code matches
  if (retryableErrors.some(errName =>
    errorIdentifier === errName ||
    err.name === errName ||
    err.code === errName
  )) {
    return true;
  }

  // Check HTTP status codes
  const statusCode = err.$metadata?.httpStatusCode || err.statusCode;
  if (statusCode) {
    // Retry on 429 (rate limit), 500, 503, 504
    return [429, 500, 503, 504].includes(statusCode);
  }

  // Check for network errors
  if (err.code === 'ECONNRESET' ||
      err.code === 'ETIMEDOUT' ||
      err.code === 'ENOTFOUND') {
    return true;
  }

  return false;
}

/**
 * Calculate exponential backoff delay
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  // Exponential backoff: baseDelay * 2^(attempt-1)
  const delay = baseDelay * Math.pow(2, attempt - 1);

  // Add jitter (random 0-25% variance) to prevent thundering herd
  const jitter = delay * 0.25 * Math.random();

  return Math.min(delay + jitter, maxDelay);
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const isRetryable = isRetryableError(error, config.retryableErrors);

      // Type guard for AWS errors
      const err = error as AWSError;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorType = err.name || err.code || 'UnknownError';
      const statusCode = err.$metadata?.httpStatusCode || err.statusCode;

      // If not retryable or last attempt, throw immediately
      if (!isRetryable || attempt === config.maxAttempts) {
        if (attempt === config.maxAttempts) {
          console.error(
            JSON.stringify({
              event: 'RETRY_EXHAUSTED',
              operation: operationName,
              attempts: attempt,
              maxAttempts: config.maxAttempts,
              error: errorMessage,
              errorType,
              isRetryable,
            })
          );
        }
        throw error;
      }

      // Calculate delay for next retry
      const delay = calculateDelay(attempt, config.baseDelay, config.maxDelay);

      console.warn(
        JSON.stringify({
          event: 'RETRY_ATTEMPT',
          operation: operationName,
          attempt,
          maxAttempts: config.maxAttempts,
          error: errorMessage,
          errorType,
          statusCode,
          retryAfterMs: Math.round(delay),
          nextAttempt: attempt + 1,
        })
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}
