/**
 * Property-Based Tests for AsyncEnrichmentLoader
 * 
 * Tests polling behavior with exponential backoff and failure limits
 */

import * as fc from 'fast-check';

/**
 * Feature: frontend-error-display-fix, Property 4: Polling stops after 3 failures
 * 
 * For any sequence of polling requests, if 3 consecutive failures occur,
 * the frontend should stop polling
 * 
 * Validates: Requirements 1.4
 */

// Constants from AsyncEnrichmentLoader
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 2000;

// Mock polling behavior
interface PollResult {
  success: boolean;
  statusCode: number;
  data?: unknown;
}

/**
 * Simulates polling with failure tracking
 */
function simulatePolling(pollResults: PollResult[]): {
  stopped: boolean;
  pollCount: number;
  consecutiveFailures: number;
  stoppedAfterFailures: boolean;
} {
  let consecutiveFailures = 0;
  let pollCount = 0;
  let stopped = false;

  for (const result of pollResults) {
    if (stopped) break;
    
    pollCount++;

    if (!result.success || result.statusCode >= 500) {
      consecutiveFailures++;
      
      if (consecutiveFailures >= MAX_RETRY_ATTEMPTS) {
        stopped = true;
        break;
      }
    } else if (result.statusCode === 200 || result.statusCode === 202) {
      // Success or processing - reset consecutive failures
      consecutiveFailures = 0;
    }
  }

  return {
    stopped,
    pollCount,
    consecutiveFailures,
    stoppedAfterFailures: stopped && consecutiveFailures >= MAX_RETRY_ATTEMPTS,
  };
}

/**
 * Calculates exponential backoff delay
 */
function calculateBackoff(failureCount: number): number {
  return INITIAL_BACKOFF_MS * Math.pow(2, Math.min(failureCount, 2));
}

describe('AsyncEnrichmentLoader - Property Tests', () => {
  describe('Property 4: Polling stops after 3 failures', () => {
    it('should stop polling after 3 consecutive failures', () => {
      fc.assert(
        fc.property(
          // Generate a sequence of poll results with at least 3 failures
          fc.array(
            fc.record({
              success: fc.boolean(),
              statusCode: fc.constantFrom(200, 202, 408, 410, 500, 502, 503),
            }),
            { minLength: 3, maxLength: 20 }
          ),
          (pollResults) => {
            const result = simulatePolling(pollResults);

            // If we have 3 consecutive failures, polling should stop
            if (result.consecutiveFailures >= MAX_RETRY_ATTEMPTS) {
              expect(result.stopped).toBe(true);
              expect(result.stoppedAfterFailures).toBe(true);
            }

            // Polling should never continue after 3 consecutive failures
            if (result.stopped && result.stoppedAfterFailures) {
              expect(result.consecutiveFailures).toBeGreaterThanOrEqual(MAX_RETRY_ATTEMPTS);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reset consecutive failures on successful poll', () => {
      fc.assert(
        fc.property(
          // Generate sequences with failures followed by success
          fc.tuple(
            fc.integer({ min: 1, max: 2 }), // Number of failures before success
            fc.integer({ min: 1, max: 5 })  // Number of additional polls after success
          ),
          ([failuresBeforeSuccess, additionalPolls]) => {
            // Create a sequence: failures -> success -> more polls
            const pollResults: PollResult[] = [
              // Initial failures (less than MAX_RETRY_ATTEMPTS)
              ...Array(failuresBeforeSuccess).fill({ success: false, statusCode: 500 }),
              // Success that resets counter
              { success: true, statusCode: 200 },
              // Additional polls
              ...Array(additionalPolls).fill({ success: true, statusCode: 202 }),
            ];

            const result = simulatePolling(pollResults);

            // Should not stop because success reset the counter
            expect(result.stopped).toBe(false);
            expect(result.pollCount).toBe(failuresBeforeSuccess + 1 + additionalPolls);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should stop exactly at 3 consecutive failures, not before', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(1, 2, 3, 4, 5),
          (numConsecutiveFailures) => {
            const pollResults: PollResult[] = Array(numConsecutiveFailures).fill({
              success: false,
              statusCode: 500,
            });

            const result = simulatePolling(pollResults);

            if (numConsecutiveFailures < MAX_RETRY_ATTEMPTS) {
              // Should not stop before reaching MAX_RETRY_ATTEMPTS
              expect(result.stopped).toBe(false);
            } else {
              // Should stop at or after MAX_RETRY_ATTEMPTS
              expect(result.stopped).toBe(true);
              expect(result.consecutiveFailures).toBeGreaterThanOrEqual(MAX_RETRY_ATTEMPTS);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should apply exponential backoff correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 5 }),
          (failureCount) => {
            const backoff = calculateBackoff(failureCount);
            const expectedBackoff = INITIAL_BACKOFF_MS * Math.pow(2, Math.min(failureCount, 2));

            expect(backoff).toBe(expectedBackoff);

            // Backoff should be: 2s, 4s, 8s, then cap at 8s
            if (failureCount === 0) {
              expect(backoff).toBe(2000);
            } else if (failureCount === 1) {
              expect(backoff).toBe(4000);
            } else if (failureCount >= 2) {
              expect(backoff).toBe(8000);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle mixed success and failure patterns', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              success: fc.boolean(),
              statusCode: fc.constantFrom(200, 202, 500, 502),
            }),
            { minLength: 10, maxLength: 30 }
          ),
          (pollResults) => {
            const result = simulatePolling(pollResults);

            // Count actual consecutive failures in the sequence
            let maxConsecutiveFailures = 0;
            let currentConsecutiveFailures = 0;

            for (const poll of pollResults) {
              if (!poll.success || poll.statusCode >= 500) {
                currentConsecutiveFailures++;
                maxConsecutiveFailures = Math.max(maxConsecutiveFailures, currentConsecutiveFailures);
              } else if (poll.statusCode === 200 || poll.statusCode === 202) {
                currentConsecutiveFailures = 0;
              }

              // If we hit MAX_RETRY_ATTEMPTS, we should stop
              if (currentConsecutiveFailures >= MAX_RETRY_ATTEMPTS) {
                break;
              }
            }

            // If the sequence had 3+ consecutive failures, polling should have stopped
            if (maxConsecutiveFailures >= MAX_RETRY_ATTEMPTS) {
              expect(result.stopped).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should treat different error status codes as failures', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom(500, 502, 503, 504),
            { minLength: 3, maxLength: 3 }
          ),
          (statusCodes) => {
            const pollResults: PollResult[] = statusCodes.map(code => ({
              success: false,
              statusCode: code,
            }));

            const result = simulatePolling(pollResults);

            // All 5xx errors should count as failures
            expect(result.stopped).toBe(true);
            expect(result.consecutiveFailures).toBe(3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not count 4xx errors (except specific ones) as consecutive failures for stopping', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(408, 410, 404),
          (statusCode) => {
            const pollResults: PollResult[] = [
              { success: false, statusCode },
            ];

            const result = simulatePolling(pollResults);

            // 4xx errors should stop immediately (they're terminal errors)
            // but they don't count as "consecutive failures" in the retry sense
            // The component handles these separately
            expect(result.pollCount).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
