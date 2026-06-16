/**
 * Retry logic with exponential backoff for Bedrock API calls
 */
export interface RetryConfig {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    retryableErrors: string[];
}
export declare const DEFAULT_RETRY_CONFIG: RetryConfig;
/**
 * Retry an async operation with exponential backoff
 */
export declare function retryWithBackoff<T>(operation: () => Promise<T>, operationName: string, config?: RetryConfig): Promise<T>;
//# sourceMappingURL=retry.d.ts.map