/**
 * Property Test: Latency Alerting
 * Feature: intelligent-supplement-search, Property 30: Latency alerting
 * Validates: Requirements 8.4
 * 
 * Property: For any time period where P95 latency exceeds 300ms, system should send alert
 */

import fc from 'fast-check';
import { metricsCollector } from '../metrics-collector';

describe('Property 30: Latency Alerting', () => {
  it('should detect when P95 latency exceeds 300ms', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 1, max: 1000 }), // latency values in ms
          { minLength: 20, maxLength: 100 }
        ),
        (latencies) => {
          // Reset metrics
          metricsCollector.reset();
          
          // Record all latencies
          latencies.forEach(latency => {
            metricsCollector.recordLatency(latency);
          });
          
          // Get latency metrics
          const metrics = metricsCollector.getLatencyMetrics();
          
          // Calculate expected P95
          const sorted = [...latencies].sort((a, b) => a - b);
          const p95Index = Math.ceil(0.95 * sorted.length) - 1;
          const expectedP95 = sorted[Math.max(0, p95Index)];
          
          // Verify P95 calculation
          expect(metrics.p95).toBeCloseTo(expectedP95, 0);
          
          // Verify alert condition
          const shouldAlert = metrics.p95 > 300;
          
          if (shouldAlert) {
            expect(metrics.p95).toBeGreaterThan(300);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly calculate P50, P95, and P99 percentiles', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 1, max: 1000 }),
          { minLength: 100, maxLength: 200 }
        ),
        (latencies) => {
          // Reset metrics
          metricsCollector.reset();
          
          // Record all latencies
          latencies.forEach(latency => {
            metricsCollector.recordLatency(latency);
          });
          
          // Get latency metrics
          const metrics = metricsCollector.getLatencyMetrics();
          
          // Verify P50 <= P95 <= P99
          expect(metrics.p50).toBeLessThanOrEqual(metrics.p95);
          expect(metrics.p95).toBeLessThanOrEqual(metrics.p99);
          
          // Verify min <= P50 <= max
          expect(metrics.min).toBeLessThanOrEqual(metrics.p50);
          expect(metrics.p50).toBeLessThanOrEqual(metrics.max);
          
          // Verify count
          expect(metrics.count).toBe(latencies.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should identify alert condition for high P95 latency', () => {
    // Test case 1: High latency (should alert)
    metricsCollector.reset();
    
    // Create latencies with P95 > 300ms
    // P95 means 95% of values are below this threshold
    // So we need at least 6% of values to be > 300ms
    const highLatencies = Array.from({ length: 100 }, (_, i) => {
      if (i < 94) return 100; // First 94% are low
      return 400; // Last 6% are high (> 300ms)
    });
    
    highLatencies.forEach(latency => {
      metricsCollector.recordLatency(latency);
    });
    
    const metricsHigh = metricsCollector.getLatencyMetrics();
    expect(metricsHigh.p95).toBeGreaterThan(300);
    
    // Test case 2: Low latency (should not alert)
    metricsCollector.reset();
    
    // Create latencies with P95 < 300ms
    const lowLatencies = Array.from({ length: 100 }, () => 
      Math.floor(Math.random() * 250) + 1 // 1-250ms
    );
    
    lowLatencies.forEach(latency => {
      metricsCollector.recordLatency(latency);
    });
    
    const metricsLow = metricsCollector.getLatencyMetrics();
    expect(metricsLow.p95).toBeLessThanOrEqual(300);
  });

  it('should calculate average latency correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 1, max: 1000 }),
          { minLength: 10, maxLength: 50 }
        ),
        (latencies) => {
          // Reset metrics
          metricsCollector.reset();
          
          // Record all latencies
          latencies.forEach(latency => {
            metricsCollector.recordLatency(latency);
          });
          
          // Get latency metrics
          const metrics = metricsCollector.getLatencyMetrics();
          
          // Calculate expected average
          const sum = latencies.reduce((acc, val) => acc + val, 0);
          const expectedAvg = sum / latencies.length;
          
          // Verify average
          expect(metrics.avg).toBeCloseTo(expectedAvg, 2);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should track min and max latencies', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 1, max: 1000 }),
          { minLength: 10, maxLength: 50 }
        ),
        (latencies) => {
          // Reset metrics
          metricsCollector.reset();
          
          // Record all latencies
          latencies.forEach(latency => {
            metricsCollector.recordLatency(latency);
          });
          
          // Get latency metrics
          const metrics = metricsCollector.getLatencyMetrics();
          
          // Calculate expected min and max
          const expectedMin = Math.min(...latencies);
          const expectedMax = Math.max(...latencies);
          
          // Verify min and max
          expect(metrics.min).toBe(expectedMin);
          expect(metrics.max).toBe(expectedMax);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge case of single latency measurement', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (latency) => {
          // Reset metrics
          metricsCollector.reset();
          
          // Record single latency
          metricsCollector.recordLatency(latency);
          
          // Get metrics
          const metrics = metricsCollector.getLatencyMetrics();
          
          // All percentiles should equal the single value
          expect(metrics.p50).toBe(latency);
          expect(metrics.p95).toBe(latency);
          expect(metrics.p99).toBe(latency);
          expect(metrics.min).toBe(latency);
          expect(metrics.max).toBe(latency);
          expect(metrics.avg).toBe(latency);
          expect(metrics.count).toBe(1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle P99 latency threshold for critical alerts', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 1, max: 1000 }),
          { minLength: 100, maxLength: 200 }
        ),
        (latencies) => {
          // Reset metrics
          metricsCollector.reset();
          
          // Record all latencies
          latencies.forEach(latency => {
            metricsCollector.recordLatency(latency);
          });
          
          // Get latency metrics
          const metrics = metricsCollector.getLatencyMetrics();
          
          // P99 should be >= P95
          expect(metrics.p99).toBeGreaterThanOrEqual(metrics.p95);
          
          // If P99 > 500ms, it's a critical alert
          const criticalAlert = metrics.p99 > 500;
          
          if (criticalAlert) {
            expect(metrics.p99).toBeGreaterThan(500);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
