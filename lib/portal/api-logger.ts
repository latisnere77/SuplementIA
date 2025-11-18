/**
 * Portal API Logger
 * Structured logging for portal API endpoints with error tracking
 */

// Sentry is optional - we'll check if it's available at runtime
// This avoids build-time errors if Sentry is not installed
function getSentry() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@sentry/nextjs');
  } catch {
    return null;
  }
}

export interface LogContext {
  recommendationId?: string;
  quizId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

class PortalAPILogger {
  private startTime: number = Date.now();

  /**
   * Log request start with context
   */
  logRequest(context: LogContext) {
    this.startTime = Date.now();
    const logData = {
      type: 'request',
      timestamp: new Date().toISOString(),
      ...context,
    };
    
    // eslint-disable-next-line no-console
    console.log('📥 [PORTAL API] Request:', JSON.stringify(logData, null, 2));
    
    // Add Sentry breadcrumb if available
    const Sentry = getSentry();
    if (Sentry?.addBreadcrumb) {
      try {
        Sentry.addBreadcrumb({
          category: 'portal.api.request',
          message: `Portal API Request: ${context.method} ${context.endpoint}`,
          level: 'info',
          data: context,
        });
      } catch {
        // Ignore Sentry errors
      }
    }
  }

  /**
   * Log successful response
   */
  logSuccess(context: LogContext) {
    const duration = Date.now() - this.startTime;
    const logData = {
      type: 'success',
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      ...context,
    };
    
    // eslint-disable-next-line no-console
    console.log('✅ [PORTAL API] Success:', JSON.stringify(logData, null, 2));
    
    const Sentry = getSentry();
    if (Sentry?.addBreadcrumb) {
      try {
        Sentry.addBreadcrumb({
          category: 'portal.api.success',
          message: `Portal API Success: ${context.endpoint}`,
          level: 'info',
          data: { ...context, duration },
        });
      } catch {
        // Ignore Sentry errors
      }
    }
  }

  /**
   * Log error with full context
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logError(error: Error | any, context: LogContext) {
    const duration = Date.now() - this.startTime;
    const errorData = {
      type: 'error',
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      error: {
        name: error?.name || 'UnknownError',
        message: error?.message || String(error),
        stack: error?.stack,
        cause: error?.cause,
      },
      ...context,
    };
    
    // eslint-disable-next-line no-console
    console.error('❌ [PORTAL API] Error:', JSON.stringify(errorData, null, 2));
    
    // Capture in Sentry with full context if available
    const Sentry = getSentry();
    if (Sentry?.withScope) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Sentry.withScope((scope: any) => {
          scope.setTag('portal.api', 'true');
          scope.setTag('endpoint', context.endpoint || 'unknown');
          scope.setTag('method', context.method || 'unknown');
          scope.setContext('request', {
            recommendationId: context.recommendationId,
            quizId: context.quizId,
            userId: context.userId,
            endpoint: context.endpoint,
            method: context.method,
            duration,
          });
          scope.setContext('error', {
            name: error?.name,
            message: error?.message,
            stack: error?.stack,
            statusCode: context.statusCode,
          });
          
          if (error instanceof Error) {
            Sentry.captureException(error);
          } else {
            Sentry.captureMessage(`Portal API Error: ${error?.message || String(error)}`, 'error');
          }
        });
      } catch {
        // Ignore Sentry errors
      }
    }
  }

  /**
   * Log backend API call
   */
  logBackendCall(url: string, method: string = 'GET', context?: LogContext) {
    const logData = {
      type: 'backend_call',
      timestamp: new Date().toISOString(),
      url,
      method,
      ...context,
    };
    
    // eslint-disable-next-line no-console
    console.log('🔗 [PORTAL API] Backend Call:', JSON.stringify(logData, null, 2));
    
    const Sentry = getSentry();
    if (Sentry?.addBreadcrumb) {
      try {
        Sentry.addBreadcrumb({
          category: 'portal.api.backend',
          message: `Backend API Call: ${method} ${url}`,
          level: 'info',
          data: { url, method, ...context },
        });
      } catch {
        // Ignore Sentry errors
      }
    }
  }

  /**
   * Log backend response
   */
  logBackendResponse(url: string, status: number, responseTime: number, context?: LogContext) {
    const logData = {
      type: 'backend_response',
      timestamp: new Date().toISOString(),
      url,
      status,
      responseTime: `${responseTime}ms`,
      ...context,
    };
    
    const level = status >= 400 ? 'error' : 'info';
    const emoji = status >= 400 ? '❌' : '✅';
    
    // eslint-disable-next-line no-console
    console.log(`${emoji} [PORTAL API] Backend Response:`, JSON.stringify(logData, null, 2));
    
    const Sentry = getSentry();
    if (Sentry?.addBreadcrumb) {
      try {
        Sentry.addBreadcrumb({
          category: 'portal.api.backend',
          message: `Backend Response: ${status} ${url}`,
          level,
          data: { url, status, responseTime, ...context },
        });
      } catch {
        // Ignore Sentry errors
      }
    }
  }
}

export const portalLogger = new PortalAPILogger();

