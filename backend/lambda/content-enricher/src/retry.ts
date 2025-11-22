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
 * Check if an error is retryable based on error name or code
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false;

  const errorIdentifier = error.name || error.code || error.$metadata?.httpStatusCode;

  // Check if error name or code matches
  if (retryableErrors.some(errName =>
    errorIdentifier === errName ||
    error.name === errName ||
    error.code === errName
  )) {
    return true;
  }

  // Check HTTP status codes
  const statusCode = error.$metadata?.httpStatusCode || error.statusCode;
  if (statusCode) {
    // Retry on 429 (rate limit), 500, 503, 504
    return [429, 500, 503, 504].includes(statusCode);
  }

  // Check for network errors
  if (error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND') {
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
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const isRetryable = isRetryableError(error, config.retryableErrors);

      // If not retryable or last attempt, throw immediately
      if (!isRetryable || attempt === config.maxAttempts) {
        if (attempt === config.maxAttempts) {
          console.error(
            JSON.stringify({
              event: 'RETRY_EXHAUSTED',
              operation: operationName,
              attempts: attempt,
              maxAttempts: config.maxAttempts,
              error: error.message,
              errorType: error.name || error.code,
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
          error: error.message,
          errorType: error.name || error.code,
          statusCode: error.$metadata?.httpStatusCode || error.statusCode,
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
