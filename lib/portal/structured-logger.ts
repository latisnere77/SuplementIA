/**
 * Structured Logging Module
 * Provides consistent structured logging with correlation IDs and required fields
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export type LogEvent =
  | 'ENRICHMENT_STATUS_CHECK'
  | 'JOB_EXPIRED'
  | 'JOB_NOT_FOUND'
  | 'JOB_COMPLETED'
  | 'JOB_FAILED'
  | 'JOB_TIMEOUT'
  | 'JOB_PROCESSING'
  | 'STORE_MAINTENANCE'
  | 'DIRECT_FETCH_FAILURE'
  | 'ENRICHMENT_ERROR'
  | 'RETRY_ATTEMPT'
  | 'RETRY_LIMIT_EXCEEDED'
  | 'QUERY_NORMALIZED'
  | 'VALIDATION_FAILED'
  | 'PROBLEMATIC_QUERY'
  | 'REPEATED_FAILURE_ALERT'
  | string; // Allow custom events

export interface LogData {
  jobId?: string;
  supplementName?: string;
  correlationId?: string;
  requestId?: string;
  elapsedTime?: number;
  processingTime?: number;
  error?: string;
  stack?: string;
  statusCode?: number;
  retryCount?: number;
  cleanedCount?: number;
  evictedCount?: number;
  [key: string]: unknown;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  event: LogEvent;
  jobId?: string;
  supplementName?: string;
  correlationId?: string;
  requestId?: string;
  [key: string]: unknown;
}

/**
 * Core structured logging function
 * Outputs JSON-formatted logs with consistent structure
 */
export function logStructured(
  level: LogLevel,
  event: LogEvent,
  data: LogData = {}
): void {
  const logEntry: StructuredLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...data,
  };

  const logString = JSON.stringify(logEntry);

  if (level === 'error') {
    console.error(logString);
  } else if (level === 'warn') {
    console.warn(logString);
  } else {
    console.log(logString);
  }
}

/**
 * Log enrichment errors with all required fields
 * Validates: Requirements 3.1
 */
export function logEnrichmentError(
  jobId: string,
  supplementName: string,
  error: Error | string,
  additionalData: Partial<LogData> = {}
): void {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const stack = typeof error === 'string' ? undefined : error.stack;

  logStructured('error', 'ENRICHMENT_ERROR', {
    jobId,
    supplementName,
    error: errorMessage,
    stack,
    ...additionalData,
  });
}

/**
 * Log direct fetch failures with complete response
 * Validates: Requirements 3.3
 */
export function logDirectFetchFailure(
  jobId: string,
  supplementName: string,
  response: {
    status: number;
    statusText: string;
    body?: unknown;
    error?: string;
  },
  additionalData: Partial<LogData> = {}
): void {
  logStructured('error', 'DIRECT_FETCH_FAILURE', {
    jobId,
    supplementName,
    statusCode: response.status,
    statusText: response.statusText,
    responseBody: response.body,
    error: response.error,
    ...additionalData,
  });
}

/**
 * Log missing job with time delta
 * Validates: Requirements 3.2
 */
export function logMissingJob(
  jobId: string,
  supplementName: string | undefined,
  timeSinceCreation: number | undefined,
  additionalData: Partial<LogData> = {}
): void {
  logStructured('warn', 'JOB_NOT_FOUND', {
    jobId,
    supplementName,
    timeSinceCreation,
    ...additionalData,
  });
}

/**
 * Log job expiration
 */
export function logJobExpired(
  jobId: string,
  supplementName: string | undefined,
  elapsedTime: number | undefined,
  status: string,
  additionalData: Partial<LogData> = {}
): void {
  logStructured('warn', 'JOB_EXPIRED', {
    jobId,
    supplementName,
    elapsedTime,
    status,
    ...additionalData,
  });
}

/**
 * Log job completion
 */
export function logJobCompleted(
  jobId: string,
  supplementName: string | undefined,
  processingTime: number | undefined,
  additionalData: Partial<LogData> = {}
): void {
  logStructured('info', 'JOB_COMPLETED', {
    jobId,
    supplementName,
    processingTime,
    ...additionalData,
  });
}

/**
 * Log job failure
 */
export function logJobFailed(
  jobId: string,
  supplementName: string | undefined,
  error: string | undefined,
  elapsedTime: number,
  additionalData: Partial<LogData> = {}
): void {
  logStructured('error', 'JOB_FAILED', {
    jobId,
    supplementName,
    error,
    elapsedTime,
    ...additionalData,
  });
}

/**
 * Log job timeout
 */
export function logJobTimeout(
  jobId: string,
  supplementName: string | undefined,
  elapsedTime: number,
  additionalData: Partial<LogData> = {}
): void {
  logStructured('warn', 'JOB_TIMEOUT', {
    jobId,
    supplementName,
    elapsedTime,
    ...additionalData,
  });
}

/**
 * Log job processing status
 */
export function logJobProcessing(
  jobId: string,
  supplementName: string | undefined,
  elapsedTime: number,
  additionalData: Partial<LogData> = {}
): void {
  logStructured('info', 'JOB_PROCESSING', {
    jobId,
    supplementName,
    elapsedTime,
    ...additionalData,
  });
}

/**
 * Log store maintenance operations
 */
export function logStoreMaintenance(
  cleanedCount: number,
  evictedCount: number,
  additionalData: Partial<LogData> = {}
): void {
  logStructured('debug', 'STORE_MAINTENANCE', {
    cleanedCount,
    evictedCount,
    ...additionalData,
  });
}

/**
 * Log validation failures
 */
export function logValidationFailure(
  supplementName: string,
  validationError: string,
  additionalData: Partial<LogData> = {}
): void {
  logStructured('warn', 'VALIDATION_FAILED', {
    supplementName,
    error: validationError,
    ...additionalData,
  });
}

/**
 * Log problematic queries
 * Validates: Requirements 4.5
 */
export function logProblematicQuery(
  supplementName: string,
  reason: string,
  additionalData: Partial<LogData> = {}
): void {
  logStructured('warn', 'PROBLEMATIC_QUERY', {
    supplementName,
    reason,
    ...additionalData,
  });
}

/**
 * Log retry attempts
 */
export function logRetryAttempt(
  previousJobId: string,
  newJobId: string,
  retryCount: number,
  additionalData: Partial<LogData> = {}
): void {
  logStructured('info', 'RETRY_ATTEMPT', {
    previousJobId,
    jobId: newJobId,
    retryCount,
    ...additionalData,
  });
}

/**
 * Log retry limit exceeded
 */
export function logRetryLimitExceeded(
  jobId: string,
  retryCount: number,
  additionalData: Partial<LogData> = {}
): void {
  logStructured('warn', 'RETRY_LIMIT_EXCEEDED', {
    jobId,
    retryCount,
    ...additionalData,
  });
}
