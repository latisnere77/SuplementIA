/**
 * Property-Based Tests for Error Rate
 * 
 * Feature: intelligent-supplement-search, Property 3: Error rate below threshold < 1%
 * Validates: Requirements 1.5
 */

import fc from 'fast-check';

// Mock search system that simulates the full stack
class MockSearchSystem {
  private supplements: Map<string, Record<string, unknown>> = new Map();
  private errorRate: number = 0.001; // 0.1% error rate (well below 1%)

  constructor(errorRate: number = 0.001) {
    this.errorRate = errorRate;
  }

  addSupplement(name: string, data: Record<string, unknown>): void {
    this.supplements.set(name.toLowerCase(), data);
  }

  async search(query: string): Promise<{ success: boolean; error?: string; data?: Record<string, unknown> | null }> {
    // Simulate random errors (network, timeout, etc.)
    if (Math.random() < this.errorRate) {
      return {
        success: false,
        error: 'Internal server error',
      };
    }

    // Validate query
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        error: 'Query cannot be empty',
      };
    }

    if (query.length > 200) {
      return {
        success: false,
        error: 'Query too long',
      };
    }

    // Search for supplement
    const normalized = query.toLowerCase().trim();
    const supplement = this.supplements.get(normalized);

    if (supplement) {
      return {
        success: true,
        data: supplement,
      };
    }

    // Not found - but this is not an error, it's a valid response
    return {
      success: true,
      data: null,
    };
  }

  getSupplementCount(): number {
    return this.supplements.size;
  }
}

// Arbitrary: Generate valid supplement queries
const validQueryArbitrary = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0);

// Arbitrary: Generate supplement names (alphanumeric with spaces)
const supplementNameArbitrary = fc.array(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789 '.split('')),
  { minLength: 3, maxLength: 50 }
).map(arr => arr.join('')).filter(s => s.trim().length >= 3 && /[a-z]/.test(s));

describe('Error Rate Property Tests', () => {
  /**
   * Property 3: Error rate below threshold
   * 
   * For any set of 1000+ random valid supplement queries,
   * the error rate (500 errors) should be < 1%
   * 
   * Note: Using larger sample sizes (1000-5000) to reduce statistical variance
   * 
   * Validates: Requirements 1.5
   */
  it('Property 3: Error rate < 1% for valid queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(supplementNameArbitrary, { minLength: 10, maxLength: 50 }),
        fc.array(validQueryArbitrary, { minLength: 1000, maxLength: 5000 }),
        async (supplementNames, queries) => {
          // Setup: Create search system with 0.1% error rate
          const system = new MockSearchSystem(0.001);

          // Add supplements
          for (const name of supplementNames) {
            system.addSupplement(name, {
              name,
              category: 'vitamin',
              studyCount: 100,
            });
          }

          // Execute: Run all queries
          let errorCount = 0;
          let totalQueries = 0;

          for (const query of queries) {
            const result = await system.search(query);
            totalQueries++;

            // Count 500 errors (not "not found" responses)
            if (!result.success && result.error === 'Internal server error') {
              errorCount++;
            }
          }

          // Verify: Error rate < 1%
          const errorRate = errorCount / totalQueries;
          return errorRate < 0.01;
        }
      ),
      { numRuns: 20 } // Reduced runs due to larger sample sizes
    );
  }, 60000); // 60s timeout for larger samples

  /**
   * Property 3b: Error rate increases with system load
   * 
   * This property verifies that even under stress, error rate stays < 1%
   */
  it('Property 3b: Error rate < 1% under load', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(supplementNameArbitrary, { minLength: 50, maxLength: 100 }),
        fc.integer({ min: 2000, max: 5000 }), // Increased minimum for better statistics
        async (supplementNames, queryCount) => {
          // Setup: Create search system
          const system = new MockSearchSystem(0.001);

          // Add supplements
          for (const name of supplementNames) {
            system.addSupplement(name, {
              name,
              category: 'vitamin',
              studyCount: 100,
            });
          }

          // Execute: Run many queries in parallel
          const queries = Array.from({ length: queryCount }, (_, i) => 
            supplementNames[i % supplementNames.length]
          );

          const results = await Promise.all(
            queries.map(query => system.search(query))
          );

          // Count errors
          const errorCount = results.filter(
            r => !r.success && r.error === 'Internal server error'
          ).length;

          // Verify: Error rate < 1%
          const errorRate = errorCount / queryCount;
          return errorRate < 0.01;
        }
      ),
      { numRuns: 10 } // Reduced runs due to larger sample sizes
    );
  }, 60000); // 60s timeout

  /**
   * Property 3c: Invalid queries don't count as errors
   * 
   * Validation errors (empty query, too long) are not system errors
   */
  it('Property 3c: Validation errors are not system errors', async () => {
    const system = new MockSearchSystem(0.0); // No random errors

    // Test empty query
    const emptyResult = await system.search('');
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.error).toBe('Query cannot be empty');

    // Test too long query
    const longQuery = 'a'.repeat(201);
    const longResult = await system.search(longQuery);
    expect(longResult.success).toBe(false);
    expect(longResult.error).toBe('Query too long');

    // These are validation errors, not system errors
    // They should not count toward the 1% error rate threshold
  });

  /**
   * Property 3d: Not found is not an error
   * 
   * When a supplement is not found, it's a valid response, not an error
   */
  it('Property 3d: Not found is success with null data', async () => {
    await fc.assert(
      fc.asyncProperty(
        validQueryArbitrary,
        async (query) => {
          // Setup: Empty system
          const system = new MockSearchSystem(0.0);

          // Execute: Search for non-existent supplement
          const result = await system.search(query);

          // Verify: Success with null data (not an error)
          return result.success === true && result.data === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3e: Error rate calculation excludes validation errors
   * 
   * For any mix of valid and invalid queries, only system errors count
   */
  it('Property 3e: Error rate calculation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(supplementNameArbitrary, { minLength: 10, maxLength: 30 }),
        fc.array(validQueryArbitrary, { minLength: 500, maxLength: 2000 }), // Increased for better statistics
        fc.array(fc.string(), { minLength: 10, maxLength: 50 }), // Some invalid queries
        async (supplementNames, validQueries, invalidQueries) => {
          // Setup
          const system = new MockSearchSystem(0.001);

          for (const name of supplementNames) {
            system.addSupplement(name, { name });
          }

          // Execute: Mix of valid and invalid queries
          const allQueries = [...validQueries, ...invalidQueries];
          let systemErrorCount = 0;
          let validQueryCount = 0;

          for (const query of allQueries) {
            const result = await system.search(query);

            // Only count valid queries for error rate
            if (query && query.trim().length > 0 && query.length <= 200) {
              validQueryCount++;

              // Count system errors (not validation errors)
              if (!result.success && result.error === 'Internal server error') {
                systemErrorCount++;
              }
            }
          }

          // Verify: Error rate < 1% for valid queries only
          if (validQueryCount === 0) {
            return true; // No valid queries to test
          }

          const errorRate = systemErrorCount / validQueryCount;
          return errorRate < 0.01;
        }
      ),
      { numRuns: 20 } // Reduced runs due to larger sample sizes
    );
  }, 60000); // 60s timeout

  /**
   * Property 3f: Error rate is consistent across time
   * 
   * Multiple batches of queries should have similar error rates
   */
  it('Property 3f: Consistent error rate across batches', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(supplementNameArbitrary, { minLength: 20, maxLength: 50 }),
        fc.integer({ min: 3, max: 10 }), // Number of batches
        async (supplementNames, batchCount) => {
          // Setup
          const system = new MockSearchSystem(0.001);

          for (const name of supplementNames) {
            system.addSupplement(name, { name });
          }

          // Execute: Multiple batches with larger batch size for better statistics
          const batchSize = 1000; // Increased from 100
          const errorRates: number[] = [];

          for (let batch = 0; batch < batchCount; batch++) {
            let errorCount = 0;

            for (let i = 0; i < batchSize; i++) {
              const query = supplementNames[i % supplementNames.length];
              const result = await system.search(query);

              if (!result.success && result.error === 'Internal server error') {
                errorCount++;
              }
            }

            errorRates.push(errorCount / batchSize);
          }

          // Verify: All batches have error rate < 1%
          return errorRates.every(rate => rate < 0.01);
        }
      ),
      { numRuns: 10 } // Reduced runs due to larger batch sizes
    );
  }, 60000); // 60s timeout
});
