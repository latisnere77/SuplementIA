/**
 * Property Test: Analytics Logging
 * Feature: intelligent-supplement-search, Property 24: Analytics logging
 * Validates: Requirements 7.2, 8.1
 * 
 * Property: For any search performed, analytics should be recorded with latency, cache hit, and timestamp
 */

import fc from 'fast-check';
import { metricsCollector } from '../metrics-collector';
import { logger } from '../cloudwatch-logger';

describe('Property 24: Analytics Logging', () => {
  it('should record analytics for all searches with latency, cache hit, and timestamp', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // query
        fc.integer({ min: 1, max: 1000 }), // latency in ms
        fc.boolean(), // cache hit
        fc.constantFrom('dax', 'redis', 'postgres'), // cache source
        (query, latency, cacheHit, cacheSource) => {
          // Reset metrics for this test run
          metricsCollector.reset();
          
          // Record search pattern
          metricsCollector.recordSearchPattern(query, latency);
          
          // Record cache operation
          if (cacheHit) {
            metricsCollector.recordCacheHit(cacheSource);
          } else {
            metricsCollector.recordCacheMiss();
          }
          
          // Record latency
          metricsCollector.recordLatency(latency);
          
          // Get metrics
          const metrics = metricsCollector.getAllMetrics();
          
          // Verify analytics are recorded
          expect(metrics.timestamp).toBeDefined();
          expect(new Date(metrics.timestamp).getTime()).toBeGreaterThan(0);
          
          // Verify latency is recorded
          expect(metrics.latency.count).toBeGreaterThan(0);
          expect(metrics.latency.avg).toBeGreaterThan(0);
          
          // Verify cache metrics are recorded
          const totalCacheOps = metrics.cache.hits + metrics.cache.misses;
          expect(totalCacheOps).toBeGreaterThan(0);
          
          // Verify search pattern is recorded
          const searchPatterns = metricsCollector.getTopSearchPatterns();
          const foundPattern = searchPatterns.find(p => p.query === query);
          expect(foundPattern).toBeDefined();
          expect(foundPattern?.avgLatency).toBeGreaterThan(0);
          expect(foundPattern?.lastSearched).toBeInstanceOf(Date);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain analytics across multiple searches', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            query: fc.string({ minLength: 1, maxLength: 50 }),
            latency: fc.integer({ min: 1, max: 500 }),
            cacheHit: fc.boolean(),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (searches) => {
          // Reset metrics
          metricsCollector.reset();
          
          // Record all searches
          searches.forEach(search => {
            metricsCollector.recordSearchPattern(search.query, search.latency);
            metricsCollector.recordLatency(search.latency);
            
            if (search.cacheHit) {
              metricsCollector.recordCacheHit('redis');
            } else {
              metricsCollector.recordCacheMiss();
            }
          });
          
          // Get metrics
          const metrics = metricsCollector.getAllMetrics();
          
          // Verify all searches are counted
          expect(metrics.latency.count).toBe(searches.length);
          
          // Verify cache operations match
          const expectedHits = searches.filter(s => s.cacheHit).length;
          const expectedMisses = searches.filter(s => !s.cacheHit).length;
          expect(metrics.cache.hits).toBe(expectedHits);
          expect(metrics.cache.misses).toBe(expectedMisses);
          
          // Verify timestamp is recent
          const now = Date.now();
          const metricsTime = new Date(metrics.timestamp).getTime();
          expect(now - metricsTime).toBeLessThan(1000); // Within 1 second
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should log structured analytics with all required fields', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 1, max: 1000 }),
        (query, latency) => {
          // Capture console output
          const logs: string[] = [];
          const originalInfo = console.info;
          console.info = (message: string) => {
            logs.push(message);
          };
          
          try {
            // Log search
            logger.logSearch(query, {
              latency,
              operation: 'search',
            });
            
            // Verify log was created
            expect(logs.length).toBeGreaterThan(0);
            
            // Parse log
            const logEntry = JSON.parse(logs[0]);
            
            // Verify required fields
            expect(logEntry.timestamp).toBeDefined();
            expect(logEntry.level).toBe('INFO');
            expect(logEntry.message).toBe('Search operation');
            expect(logEntry.context.query).toBe(query);
            expect(logEntry.context.latency).toBe(latency);
            expect(logEntry.context.operation).toBe('search');
            expect(logEntry.context.requestId).toBeDefined();
            expect(logEntry.service).toBe('intelligent-supplement-search');
            
            return true;
          } finally {
            console.info = originalInfo;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
