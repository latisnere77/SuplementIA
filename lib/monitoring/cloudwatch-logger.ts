/**
 * CloudWatch Logger
 * Structured logging with CloudWatch Logs integration
 * Supports request ID tracking and JSON format
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogContext {
  requestId?: string;
  traceId?: string;
  userId?: string;
  operation?: string;
  latency?: number;
  cacheHit?: boolean;
  cacheSource?: 'dax' | 'redis' | 'postgres';
  errorCode?: string;
  errorMessage?: string;
  [key: string]: any;
}

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  environment: string;
  service: string;
}

class CloudWatchLogger {
  private service: string;
  private environment: string;

  constructor(service: string = 'intelligent-supplement-search') {
    this.service = service;
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Generate a unique request ID for tracking
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Create structured log entry
   */
  private createLog(
    level: LogLevel,
    message: string,
    context: LogContext = {}
  ): StructuredLog {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
        requestId: context.requestId || this.generateRequestId(),
      },
      environment: this.environment,
      service: this.service,
    };
  }

  /**
   * Write log to CloudWatch (or console in development)
   */
  private write(log: StructuredLog): void {
    const logString = JSON.stringify(log);

    // In production, this would use AWS CloudWatch Logs SDK
    // For now, we use structured console logging
    switch (log.level) {
      case 'DEBUG':
        console.debug(logString);
        break;
      case 'INFO':
        console.info(logString);
        break;
      case 'WARN':
        console.warn(logString);
        break;
      case 'ERROR':
      case 'FATAL':
        console.error(logString);
        break;
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.write(this.createLog('DEBUG', message, context));
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.write(this.createLog('INFO', message, context));
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.write(this.createLog('WARN', message, context));
  }

  /**
   * Log error message
   */
  error(message: string, context?: LogContext): void {
    this.write(this.createLog('ERROR', message, context));
  }

  /**
   * Log fatal error message
   */
  fatal(message: string, context?: LogContext): void {
    this.write(this.createLog('FATAL', message, context));
  }

  /**
   * Log search operation
   */
  logSearch(query: string, context: LogContext): void {
    this.info('Search operation', {
      ...context,
      operation: 'search',
      query,
    });
  }

  /**
   * Log cache operation
   */
  logCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'invalidate',
    key: string,
    context?: LogContext
  ): void {
    this.info(`Cache ${operation}`, {
      ...context,
      operation: `cache_${operation}`,
      cacheKey: key,
    });
  }

  /**
   * Log API request
   */
  logApiRequest(
    method: string,
    path: string,
    statusCode: number,
    latency: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
    
    this.write(
      this.createLog(level, `API ${method} ${path}`, {
        ...context,
        operation: 'api_request',
        method,
        path,
        statusCode,
        latency,
      })
    );
  }

  /**
   * Log error with full context
   */
  logError(error: Error, context?: LogContext): void {
    this.error(error.message, {
      ...context,
      errorCode: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    });
  }
}

// Export singleton instance
export const logger = new CloudWatchLogger();
