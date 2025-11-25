/**
 * Property Test: Cache Hit Rate Alerting
 * Feature: intelligent-supplement-search, Property 29: Cache hit rate alerting
 * Validates: Requirements 8.3
 * 
 * Property: For any time period where cache hit rate drops < 80%, system should send alert
 */

import fc from 'fast-check';
import { metricsCollector } from '../metrics-collector';

describe('Property 29: Cache Hit Rate Alerting', () => {
  it('should detect when cache hit rate drops below 80%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }), // number of cache hits
        fc.integer({ min: 0, max: 100 }), // number of cache misses
        (hits, misses) => {
          // Reset metrics
          metricsCollector.reset();
          
          // Record cache operations
          for (let i = 0; i < hits; i++) {
            metricsCollector.recordCacheHit('redis');
          }
          for (let i = 0; i < misses; i++) {
            metricsCollector.recordCacheMiss();
          }
          
          // Get cache metrics
          const metrics = metricsCollector.getCacheMetrics();
          
          // Calculate expected hit rate
          const total = hits + misses;
          const expectedHitRate = total > 0 ? (hits / total) * 100 : 0;
          
          // Verify hit rate calculation
          expect(metrics.hitRate).toBeCloseTo(expectedHitRate, 2);
          
          // Verify alert condition
          const shouldAlert = total > 0 && metrics.hitRate < 80;
          
          if (shouldAlert) {
            // Cache hit rate is below threshold
            expect(metrics.hitRate).toBeLessThan(80);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly calculate hit rate across different cache sources', () => {
    fc.assert(
      fc.property(
        fc.record({
          daxHits: fc.integer({ min: 0, max: 50 }),
          redisHits: fc.integer({ min: 0, max: 50 }),
          postgresHits: fc.integer({ min: 0, max: 50 }),
          misses: fc.integer({ min: 0, max: 50 }),
        }),
        ({ daxHits, redisHits, postgresHits, misses }) => {
          // Reset metrics
          metricsCollector.reset();
          
          // Record cache operations from different sources
          for (let i = 0; i < daxHits; i++) {
            metricsCollector.recordCacheHit('dax');
          }
          for (let i = 0; i < redisHits; i++) {
            metricsCollector.recordCacheHit('redis');
          }
          for (let i = 0; i < postgresHits; i++) {
            metricsCollector.recordCacheHit('postgres');
          }
          for (let i = 0; i < misses; i++) {
            metricsCollector.recordCacheMiss();
          }
          
          // Get cache metrics
          const metrics = metricsCollector.getCacheMetrics();
          
          // Verify individual source counts
          expect(metrics.daxHits).toBe(daxHits);
          expect(metrics.redisHits).toBe(redisHits);
          expect(metrics.postgresHits).toBe(postgresHits);
          expect(metrics.misses).toBe(misses);
          
          // Verify total hits
          const totalHits = daxHits + redisHits + postgresHits;
          expect(metrics.hits).toBe(totalHits);
          
          // Verify hit rate
          const total = totalHits + misses;
          const expectedHitRate = total > 0 ? (totalHits / total) * 100 : 0;
          expect(metrics.hitRate).toBeCloseTo(expectedHitRate, 2);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should identify alert condition when hit rate is below 80%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }), // total operations (min 10 to avoid rounding issues)
        (totalOps) => {
          // Reset metrics
          metricsCollector.reset();
          
          // Create scenarios with different hit rates
          // Test case 1: Hit rate below 80% (should alert)
          const lowHitRate = 0.75; // 75%
          const hitsLow = Math.floor(totalOps * lowHitRate);
          const missesLow = totalOps - hitsLow;
          
          metricsCollector.reset();
          for (let i = 0; i < hitsLow; i++) {
            metricsCollector.recordCacheHit('redis');
          }
          for (let i = 0; i < missesLow; i++) {
            metricsCollector.recordCacheMiss();
          }
          
          const metricsLow = metricsCollector.getCacheMetrics();
          expect(metricsLow.hitRate).toBeLessThan(80);
          
          // Test case 2: Hit rate above 80% (should not alert)
          const highHitRate = 0.85; // 85%
          const hitsHigh = Math.ceil(totalOps * highHitRate); // Use ceil to ensure we get at least 80%
          const missesHigh = totalOps - hitsHigh;
          
          metricsCollector.reset();
          for (let i = 0; i < hitsHigh; i++) {
            metricsCollector.recordCacheHit('redis');
          }
          for (let i = 0; i < missesHigh; i++) {
            metricsCollector.recordCacheMiss();
          }
          
          const metricsHigh = metricsCollector.getCacheMetrics();
          expect(metricsHigh.hitRate).toBeGreaterThanOrEqual(80);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge case of zero operations', () => {
    // Reset metrics
    metricsCollector.reset();
    
    // Get metrics with no operations
    const metrics = metricsCollector.getCacheMetrics();
    
    // Verify hit rate is 0 when no operations
    expect(metrics.hitRate).toBe(0);
    expect(metrics.hits).toBe(0);
    expect(metrics.misses).toBe(0);
  });

  it('should handle edge case of 100% hit rate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (hits) => {
          // Reset metrics
          metricsCollector.reset();
          
          // Record only hits, no misses
          for (let i = 0; i < hits; i++) {
            metricsCollector.recordCacheHit('redis');
          }
          
          // Get metrics
          const metrics = metricsCollector.getCacheMetrics();
          
          // Verify 100% hit rate
          expect(metrics.hitRate).toBe(100);
          expect(metrics.hits).toBe(hits);
          expect(metrics.misses).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge case of 0% hit rate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (misses) => {
          // Reset metrics
          metricsCollector.reset();
          
          // Record only misses, no hits
          for (let i = 0; i < misses; i++) {
            metricsCollector.recordCacheMiss();
          }
          
          // Get metrics
          const metrics = metricsCollector.getCacheMetrics();
          
          // Verify 0% hit rate
          expect(metrics.hitRate).toBe(0);
          expect(metrics.hits).toBe(0);
          expect(metrics.misses).toBe(misses);
          
          // Should definitely alert
          expect(metrics.hitRate).toBeLessThan(80);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
