/**
 * Property Test: Search Prioritization
 * 
 * Feature: intelligent-supplement-search, Property 23: Search prioritization
 * Validates: Requirements 7.1
 * 
 * Property: For any supplement searched > 10 times, it should be marked for priority indexing
 */

import fc from 'fast-check';
import { shouldPrioritize } from '../discovery-queue';

describe('Property 23: Search Prioritization', () => {
  it('should prioritize supplements with search count > 10', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 11, max: 10000 }), // Search counts > 10
        (searchCount) => {
          const result = shouldPrioritize(searchCount);
          return result === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not prioritize supplements with search count <= 10', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }), // Search counts <= 10
        (searchCount) => {
          const result = shouldPrioritize(searchCount);
          return result === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge case of exactly 10 searches', () => {
    const result = shouldPrioritize(10);
    expect(result).toBe(false);
  });

  it('should handle edge case of exactly 11 searches', () => {
    const result = shouldPrioritize(11);
    expect(result).toBe(true);
  });

  it('should handle zero searches', () => {
    const result = shouldPrioritize(0);
    expect(result).toBe(false);
  });

  it('should handle very large search counts', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000, max: Number.MAX_SAFE_INTEGER }), // Very large counts
        (searchCount) => {
          const result = shouldPrioritize(searchCount);
          return result === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
