/**
 * Monitoring Middleware
 * Integrates logging, metrics, and tracing into API requests
 */

import { logger } from './cloudwatch-logger';
import { metricsCollector } from './metrics-collector';
import { xrayTracer } from './xray-tracer';

export interface MonitoringContext {
  requestId: string;
  traceId: string;
  startTime: number;
  operation: string;
}

/**
 * Start monitoring for a request
 */
export function startMonitoring(operation: string): MonitoringContext {
  const requestId = logger.generateRequestId();
  const traceId = xrayTracer.generateTraceId();
  const startTime = Date.now();

  // Start X-Ray segment
  xrayTracer.startSegment(operation, {
    requestId,
    timestamp: new Date().toISOString(),
  });

  // Log request start
  logger.info(`Starting ${operation}`, {
    requestId,
    traceId,
    operation,
  });

  // Record request
  metricsCollector.recordRequest();

  return {
    requestId,
    traceId,
    startTime,
    operation,
  };
}

/**
 * End monitoring for a request
 */
export function endMonitoring(
  context: MonitoringContext,
  success: boolean,
  error?: Error
): void {
  const latency = Date.now() - context.startTime;

  // Record latency
  metricsCollector.recordLatency(latency);

  // End X-Ray segment
  if (xrayTracer.getCurrentSegment()) {
    xrayTracer.endSegment(xrayTracer.getCurrentSegment()!.id, error);
  }

  // Log completion
  if (success) {
    logger.info(`Completed ${context.operation}`, {
      requestId: context.requestId,
      traceId: context.traceId,
      latency,
      operation: context.operation,
    });
  } else {
    logger.error(`Failed ${context.operation}`, {
      requestId: context.requestId,
      traceId: context.traceId,
      latency,
      operation: context.operation,
      errorMessage: error?.message,
      errorStack: error?.stack,
    });

    // Record error
    metricsCollector.recordError(error?.name || 'UnknownError');
  }
}

/**
 * Monitor a cache operation
 */
export function monitorCacheOperation(
  context: MonitoringContext,
  operation: 'hit' | 'miss',
  source?: 'dax' | 'redis' | 'postgres',
  key?: string
): void {
  // Record cache metrics
  if (operation === 'hit' && source) {
    metricsCollector.recordCacheHit(source);
  } else if (operation === 'miss') {
    metricsCollector.recordCacheMiss();
  }

  // Log cache operation
  logger.logCacheOperation(operation, key || 'unknown', {
    requestId: context.requestId,
    traceId: context.traceId,
    cacheSource: source,
  });

  // Add X-Ray subsegment
  if (key && source) {
    const subsegment = xrayTracer.traceCacheOperation(
      operation === 'hit' ? 'get' : 'get',
      key,
      source
    );
    xrayTracer.endSubsegment(subsegment.id);
  }
}

/**
 * Monitor a search operation
 */
export function monitorSearch(
  context: MonitoringContext,
  query: string,
  latency: number
): void {
  // Record search pattern
  metricsCollector.recordSearchPattern(query, latency);

  // Log search
  logger.logSearch(query, {
    requestId: context.requestId,
    traceId: context.traceId,
    latency,
  });

  // Add X-Ray annotation
  xrayTracer.addAnnotation('query', query);
  xrayTracer.addAnnotation('latency', latency);
}

/**
 * Get current metrics snapshot
 */
export function getMetricsSnapshot() {
  return metricsCollector.getAllMetrics();
}

/**
 * Export metrics for CloudWatch
 */
export function exportMetricsForCloudWatch() {
  return metricsCollector.exportForCloudWatch();
}
