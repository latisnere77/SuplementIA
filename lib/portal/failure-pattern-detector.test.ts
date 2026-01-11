/**
 * Property-Based Tests for Failure Pattern Detection
 * Feature: frontend-error-display-fix
 */

import * as fc from 'fast-check';
import {
  recordFailure,
  detectFailurePattern,
  getFailureCount,
  clearFailureRecords,
  getFailureThreshold,
  getFailureWindowMs,
} from './failure-pattern-detector';
import { logStructured } from './structured-logger';

// Mock the structured logger
jest.mock('./structured-logger', () => ({
  logStructured: jest.fn(),
}));

// Test configuration
const FC_CONFIG = {
  numRuns: 100,
  verbose: true,
};

describe('Failure Pattern Detection', () => {
  beforeEach(() => {
    // Clear failure records before each test
    clearFailureRecords();
    // Clear mock calls
    jest.clearAllMocks();
  });

  /**
   * Property 14: Repeated failures trigger alerts
   * Feature: frontend-error-display-fix, Property 14: Repeated failures trigger alerts
   * Validates: Requirements 3.5
   */
  describe('Property 14: Repeated failure alerts', () => {
    it('should generate an alert when a supplement has more than 5 failures in 1 minute', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // supplement name
          fc.integer({ min: 6, max: 20 }), // number of failures (> threshold)
          (supplementName, numFailures) => {
            // Clear any previous state
            clearFailureRecords();
            jest.clearAllMocks();

            const threshold = getFailureThreshold();
            
            // Record multiple failures for the same supplement
            for (let i = 0; i < numFailures; i++) {
              recordFailure(supplementName);
            }

            // Verify that an alert was generated
            // The alert should be logged when failures exceed threshold
            const mockLogStructured = logStructured as jest.MockedFunction<typeof logStructured>;
            
            // Check if REPEATED_FAILURE_ALERT was logged
            const alertCalls = mockLogStructured.mock.calls.filter(
              call => call[1] === 'REPEATED_FAILURE_ALERT'
            );

            // Alert should be triggered at least once
            expect(alertCalls.length).toBeGreaterThan(0);

            // Verify the alert contains the correct information
            const lastAlert = alertCalls[alertCalls.length - 1];
            expect(lastAlert[0]).toBe('error'); // Log level
            expect(lastAlert[1]).toBe('REPEATED_FAILURE_ALERT'); // Event type
            
            const alertData = lastAlert[2];
            expect(alertData).toBeDefined();
            expect(alertData?.supplementName).toBe(supplementName);
            expect(alertData?.failureCount).toBeGreaterThan(threshold);
            expect(alertData?.timeWindowSeconds).toBe(60); // 1 minute
            expect(alertData?.threshold).toBe(threshold);
          }
        ),
        FC_CONFIG
      );
    });

    it('should NOT generate an alert when failures are at or below threshold', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // supplement name
          fc.integer({ min: 1, max: 5 }), // number of failures (<= threshold)
          (supplementName, numFailures) => {
            // Clear any previous state
            clearFailureRecords();
            jest.clearAllMocks();

            // Record failures at or below threshold
            for (let i = 0; i < numFailures; i++) {
              recordFailure(supplementName);
            }

            // Verify that NO alert was generated
            const mockLogStructured = logStructured as jest.MockedFunction<typeof logStructured>;
            
            // Check if REPEATED_FAILURE_ALERT was logged
            const alertCalls = mockLogStructured.mock.calls.filter(
              call => call[1] === 'REPEATED_FAILURE_ALERT'
            );

            // No alert should be triggered
            expect(alertCalls.length).toBe(0);
          }
        ),
        FC_CONFIG
      );
    });

    it('should track failures separately for different supplements', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // supplement name 1
          fc.string({ minLength: 1, maxLength: 50 }), // supplement name 2
          fc.integer({ min: 6, max: 10 }), // failures for supplement 1
          fc.integer({ min: 1, max: 3 }), // failures for supplement 2
          (supplement1, supplement2, failures1, failures2) => {
            // Skip if supplements are the same
            if (supplement1 === supplement2) {
              return true;
            }

            // Clear any previous state
            clearFailureRecords();
            jest.clearAllMocks();

            // Record failures for supplement 1 (above threshold)
            for (let i = 0; i < failures1; i++) {
              recordFailure(supplement1);
            }

            // Record failures for supplement 2 (below threshold)
            for (let i = 0; i < failures2; i++) {
              recordFailure(supplement2);
            }

            // Verify failure counts are tracked separately
            expect(getFailureCount(supplement1)).toBe(failures1);
            expect(getFailureCount(supplement2)).toBe(failures2);

            // Verify alert was only generated for supplement 1
            const mockLogStructured = logStructured as jest.MockedFunction<typeof logStructured>;
            const alertCalls = mockLogStructured.mock.calls.filter(
              call => call[1] === 'REPEATED_FAILURE_ALERT'
            );

            // Should have alerts for supplement 1 only
            expect(alertCalls.length).toBeGreaterThan(0);
            
            // All alerts should be for supplement 1
            for (const call of alertCalls) {
              expect(call[2]?.supplementName).toBe(supplement1);
            }

            // No alerts should be for supplement 2
            const supplement2Alerts = alertCalls.filter(
              call => call[2]?.supplementName === supplement2
            );
            expect(supplement2Alerts.length).toBe(0);
          }
        ),
        FC_CONFIG
      );
    });

    it('should include required fields in alert log', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // supplement name
          (supplementName) => {
            // Clear any previous state
            clearFailureRecords();
            jest.clearAllMocks();

            const threshold = getFailureThreshold();
            
            // Record enough failures to trigger alert
            for (let i = 0; i < threshold + 2; i++) {
              recordFailure(supplementName);
            }

            // Verify alert was logged with required fields
            const mockLogStructured = logStructured as jest.MockedFunction<typeof logStructured>;
            const alertCalls = mockLogStructured.mock.calls.filter(
              call => call[1] === 'REPEATED_FAILURE_ALERT'
            );

            expect(alertCalls.length).toBeGreaterThan(0);

            const lastAlert = alertCalls[alertCalls.length - 1];
            const alertData = lastAlert[2];

            // Verify required fields are present
            expect(alertData?.supplementName).toBe(supplementName);
            expect(alertData?.failureCount).toBeDefined();
            expect(typeof alertData?.failureCount).toBe('number');
            expect(alertData?.failureCount).toBeGreaterThan(threshold);
            
            expect(alertData?.timeWindowSeconds).toBeDefined();
            expect(alertData?.timeWindowSeconds).toBe(60);
            
            expect(alertData?.firstFailureAt).toBeDefined();
            expect(typeof alertData?.firstFailureAt).toBe('string');
            
            expect(alertData?.lastFailureAt).toBeDefined();
            expect(typeof alertData?.lastFailureAt).toBe('string');
            
            expect(alertData?.threshold).toBe(threshold);
            expect(alertData?.message).toBeDefined();
            expect(typeof alertData?.message).toBe('string');
          }
        ),
        FC_CONFIG
      );
    });
  });

  describe('Failure count tracking', () => {
    it('should accurately count failures within the time window', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // supplement name
          fc.integer({ min: 1, max: 10 }), // number of failures
          (supplementName, numFailures) => {
            // Clear any previous state
            clearFailureRecords();

            // Record failures
            for (let i = 0; i < numFailures; i++) {
              recordFailure(supplementName);
            }

            // Verify count is accurate
            expect(getFailureCount(supplementName)).toBe(numFailures);
          }
        ),
        FC_CONFIG
      );
    });

    it('should return 0 for supplements with no failures', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // supplement name
          (supplementName) => {
            // Clear any previous state
            clearFailureRecords();

            // Don't record any failures
            
            // Verify count is 0
            expect(getFailureCount(supplementName)).toBe(0);
          }
        ),
        FC_CONFIG
      );
    });
  });

  describe('Failure pattern detection', () => {
    it('should detect pattern when failures exist within time window', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // supplement name
          fc.integer({ min: 1, max: 10 }), // number of failures
          (supplementName, numFailures) => {
            // Clear any previous state
            clearFailureRecords();

            // Record failures
            for (let i = 0; i < numFailures; i++) {
              recordFailure(supplementName);
            }

            // Detect pattern
            const pattern = detectFailurePattern(supplementName);

            // Pattern should be detected
            expect(pattern).toBeDefined();
            if (!pattern) return;

            expect(pattern.supplementName).toBe(supplementName);
            expect(pattern.failureCount).toBe(numFailures);
            expect(pattern.firstFailureAt).toBeDefined();
            expect(pattern.lastFailureAt).toBeDefined();
            expect(pattern.lastFailureAt).toBeGreaterThanOrEqual(pattern.firstFailureAt);
          }
        ),
        FC_CONFIG
      );
    });

    it('should return undefined when no failures exist for supplement', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // supplement name
          (supplementName) => {
            // Clear any previous state
            clearFailureRecords();

            // Don't record any failures
            
            // Detect pattern
            const pattern = detectFailurePattern(supplementName);

            // No pattern should be detected
            expect(pattern).toBeUndefined();
          }
        ),
        FC_CONFIG
      );
    });
  });

  describe('Time window expiration', () => {
    it('should not count failures outside the time window', () => {
      // This test verifies that old failures are cleaned up
      // We'll simulate this by checking that the cleanup works correctly

      const supplementName = 'TestSupplement';
      clearFailureRecords();

      // Record a failure
      recordFailure(supplementName);
      
      // Verify it's counted
      expect(getFailureCount(supplementName)).toBe(1);

      // Simulate time passing by checking count at a future time
      // (more than 1 minute in the future)
      const futureTime = Date.now() + getFailureWindowMs() + 1000;
      
      // Check count at future time
      const countAtFutureTime = getFailureCount(supplementName, futureTime);
      
      // Old failure should not be counted
      expect(countAtFutureTime).toBe(0);
    });

    it('should only count failures within the 1-minute window', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // supplement name
          fc.integer({ min: 2, max: 10 }), // number of failures
          (supplementName, numFailures) => {
            clearFailureRecords();

            const now = Date.now();
            
            // Record failures
            for (let i = 0; i < numFailures; i++) {
              recordFailure(supplementName);
            }

            // All failures should be counted at current time
            expect(getFailureCount(supplementName, now + 1000)).toBe(numFailures);

            // No failures should be counted after time window expires
            const afterWindow = now + getFailureWindowMs() + 1000;
            expect(getFailureCount(supplementName, afterWindow)).toBe(0);
          }
        ),
        FC_CONFIG
      );
    });
  });
});
