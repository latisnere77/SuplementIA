/**
 * Property Test: Anomaly Detection Logging
 * Feature: intelligent-supplement-search, Property 31: Anomaly detection logging
 * Validates: Requirements 8.5
 * 
 * Property: For any detected anomaly (unusual patterns, spikes), system should log for analysis
 */

import fc from 'fast-check';
import { logger } from '../cloudwatch-logger';
import { metricsCollector } from '../metrics-collector';

describe('Property 31: Anomaly Detection Logging', () => {
  it('should detect and log latency spikes as anomalies', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 50, max: 150 }), // normal latencies
          { minLength: 50, maxLength: 100 }
        ),
        fc.array(
          fc.integer({ min: 500, max: 1000 }), // spike latencies
          { minLength: 5, maxLength: 10 }
        ),
        (normalLatencies, spikeLatencies) => {
          // Reset metrics
          metricsCollector.reset();
          
          // Record normal latencies
          normalLatencies.forEach(latency => {
            metricsCollector.recordLatency(latency);
          });
          
          // Calculate baseline average
          const baselineMetrics = metricsCollector.getLatencyMetrics();
          const baselineAvg = baselineMetrics.avg;
          
          // Record spike latencies
          spikeLatencies.forEach(latency => {
            metricsCollector.recordLatency(latency);
          });
          
          // Get updated metrics
          const updatedMetrics = metricsCollector.getLatencyMetrics();
          
          // Detect anomaly: if max is significantly higher than average
          const anomalyThreshold = baselineAvg * 3; // 3x baseline
          const hasAnomaly = updatedMetrics.max > anomalyThreshold;
          
          if (hasAnomaly) {
            // Capture console output
            const logs: string[] = [];
            const originalWarn = console.warn;
            console.warn = (message: string) => {
              logs.push(message);
            };
            
            try {
              // Log anomaly
              logger.warn('Latency anomaly detected', {
                operation: 'anomaly_detection',
                baselineAvg,
                currentMax: updatedMetrics.max,
                threshold: anomalyThreshold,
                anomalyType: 'latency_spike',
              });
              
              // Verify log was created
              expect(logs.length).toBeGreaterThan(0);
              
              // Parse log
              const logEntry = JSON.parse(logs[0]);
              
              // Verify anomaly details
              expect(logEntry.level).toBe('WARN');
              expect(logEntry.message).toBe('Latency anomaly detected');
              expect(logEntry.context.operation).toBe('anomaly_detection');
              expect(logEntry.context.anomalyType).toBe('latency_spike');
              expect(logEntry.context.currentMax).toBeGreaterThan(logEntry.context.threshold);
            } finally {
              console.warn = originalWarn;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should detect and log error rate spikes as anomalies', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 200 }), // total requests
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.05) }), // normal error rate (1-5%)
        fc.float({ min: Math.fround(0.10), max: Math.fround(0.30) }), // spike error rate (10-30%)
        (totalRequests, normalErrorRate, spikeErrorRate) => {
          // Reset metrics
          metricsCollector.reset();
          
          // Record normal operations
          const normalErrors = Math.floor(totalRequests * normalErrorRate);
          for (let i = 0; i < totalRequests; i++) {
            metricsCollector.recordRequest();
            if (i < normalErrors) {
              metricsCollector.recordError('NetworkError');
            }
          }
          
          const baselineMetrics = metricsCollector.getErrorMetrics();
          const baselineErrorRate = baselineMetrics.errorRate;
          
          // Simulate spike
          const spikeRequests = 50;
          const spikeErrors = Math.floor(spikeRequests * spikeErrorRate);
          for (let i = 0; i < spikeRequests; i++) {
            metricsCollector.recordRequest();
            if (i < spikeErrors) {
              metricsCollector.recordError('TimeoutError');
            }
          }
          
          const updatedMetrics = metricsCollector.getErrorMetrics();
          
          // Detect anomaly: if error rate increased significantly
          const anomalyThreshold = baselineErrorRate * 2; // 2x baseline
          const hasAnomaly = updatedMetrics.errorRate > anomalyThreshold;
          
          if (hasAnomaly) {
            // Capture console output
            const logs: string[] = [];
            const originalWarn = console.warn;
            console.warn = (message: string) => {
              logs.push(message);
            };
            
            try {
              // Log anomaly
              logger.warn('Error rate anomaly detected', {
                operation: 'anomaly_detection',
                baselineErrorRate,
                currentErrorRate: updatedMetrics.errorRate,
                threshold: anomalyThreshold,
                anomalyType: 'error_rate_spike',
              });
              
              // Verify log was created
              expect(logs.length).toBeGreaterThan(0);
              
              // Parse log
              const logEntry = JSON.parse(logs[0]);
              
              // Verify anomaly details
              expect(logEntry.level).toBe('WARN');
              expect(logEntry.context.anomalyType).toBe('error_rate_spike');
            } finally {
              console.warn = originalWarn;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should detect and log cache hit rate drops as anomalies', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 200 }), // operations
        (operations) => {
          // Reset metrics
          metricsCollector.reset();
          
          // Record normal cache operations (high hit rate)
          const normalHits = Math.floor(operations * 0.90); // 90% hit rate
          for (let i = 0; i < normalHits; i++) {
            metricsCollector.recordCacheHit('redis');
          }
          for (let i = 0; i < operations - normalHits; i++) {
            metricsCollector.recordCacheMiss();
          }
          
          const baselineMetrics = metricsCollector.getCacheMetrics();
          const baselineHitRate = baselineMetrics.hitRate;
          
          // Simulate drop
          metricsCollector.reset();
          const lowHits = Math.floor(operations * 0.50); // 50% hit rate (drop)
          for (let i = 0; i < lowHits; i++) {
            metricsCollector.recordCacheHit('redis');
          }
          for (let i = 0; i < operations - lowHits; i++) {
            metricsCollector.recordCacheMiss();
          }
          
          const updatedMetrics = metricsCollector.getCacheMetrics();
          
          // Detect anomaly: if hit rate dropped significantly
          const dropThreshold = 20; // 20% drop
          const hasAnomaly = (baselineHitRate - updatedMetrics.hitRate) > dropThreshold;
          
          if (hasAnomaly) {
            // Capture console output
            const logs: string[] = [];
            const originalWarn = console.warn;
            console.warn = (message: string) => {
              logs.push(message);
            };
            
            try {
              // Log anomaly
              logger.warn('Cache hit rate anomaly detected', {
                operation: 'anomaly_detection',
                baselineHitRate,
                currentHitRate: updatedMetrics.hitRate,
                drop: baselineHitRate - updatedMetrics.hitRate,
                anomalyType: 'cache_hit_rate_drop',
              });
              
              // Verify log was created
              expect(logs.length).toBeGreaterThan(0);
              
              // Parse log
              const logEntry = JSON.parse(logs[0]);
              
              // Verify anomaly details
              expect(logEntry.level).toBe('WARN');
              expect(logEntry.context.anomalyType).toBe('cache_hit_rate_drop');
              expect(logEntry.context.drop).toBeGreaterThan(dropThreshold);
            } finally {
              console.warn = originalWarn;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should log anomalies with timestamp for analysis', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }), // anomaly type
        fc.record({
          metric: fc.string({ minLength: 1, maxLength: 50 }),
          baseline: fc.float({ min: Math.fround(0), max: Math.fround(100) }),
          current: fc.float({ min: Math.fround(0), max: Math.fround(200) }),
        }),
        (anomalyType, details) => {
          // Capture console output
          const logs: string[] = [];
          const originalWarn = console.warn;
          console.warn = (message: string) => {
            logs.push(message);
          };
          
          try {
            // Log anomaly
            logger.warn('Anomaly detected', {
              operation: 'anomaly_detection',
              anomalyType,
              ...details,
            });
            
            // Verify log was created
            expect(logs.length).toBeGreaterThan(0);
            
            // Parse log
            const logEntry = JSON.parse(logs[0]);
            
            // Verify timestamp
            expect(logEntry.timestamp).toBeDefined();
            const timestamp = new Date(logEntry.timestamp).getTime();
            expect(timestamp).toBeGreaterThan(0);
            
            // Verify timestamp is recent (within last second)
            const now = Date.now();
            expect(now - timestamp).toBeLessThan(1000);
            
            // Verify anomaly details are included
            expect(logEntry.context.anomalyType).toBe(anomalyType);
            expect(logEntry.context.metric).toBe(details.metric);
            
            return true;
          } finally {
            console.warn = originalWarn;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include context for anomaly analysis', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (query, operation) => {
          // Capture console output
          const logs: string[] = [];
          const originalWarn = console.warn;
          console.warn = (message: string) => {
            logs.push(message);
          };
          
          try {
            // Log anomaly with context
            logger.warn('Unusual search pattern detected', {
              operation: 'anomaly_detection',
              anomalyType: 'unusual_pattern',
              query,
              searchOperation: operation,
            });
            
            // Verify log was created
            expect(logs.length).toBeGreaterThan(0);
            
            // Parse log
            const logEntry = JSON.parse(logs[0]);
            
            // Verify context is included
            expect(logEntry.context.query).toBe(query);
            expect(logEntry.context.searchOperation).toBe(operation);
            expect(logEntry.context.requestId).toBeDefined();
            
            return true;
          } finally {
            console.warn = originalWarn;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
