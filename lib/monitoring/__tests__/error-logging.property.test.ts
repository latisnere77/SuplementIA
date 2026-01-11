/**
 * Property Test: Error Logging with Context
 * Feature: intelligent-supplement-search, Property 28: Error logging with context
 * Validates: Requirements 8.2
 * 
 * Property: For any error that occurs, system should log complete context including query, stack trace, and timestamp
 */

import fc from 'fast-check';
import { logger } from '../cloudwatch-logger';
import { metricsCollector } from '../metrics-collector';

describe('Property 28: Error Logging with Context', () => {
  it('should log errors with complete context including message, stack, and timestamp', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // error message
        fc.string({ minLength: 1, maxLength: 50 }), // error name
        fc.string({ minLength: 1, maxLength: 100 }), // query
        fc.string({ minLength: 1, maxLength: 50 }), // operation
        (errorMessage, errorName, query, operation) => {
          // Capture console output
          const logs: string[] = [];
          const originalError = console.error;
          console.error = (message: string) => {
            logs.push(message);
          };
          
          try {
            // Create error
            const error = new Error(errorMessage);
            error.name = errorName;
            
            // Log error
            logger.logError(error, {
              query,
              operation,
            });
            
            // Verify log was created
            expect(logs.length).toBeGreaterThan(0);
            
            // Parse log
            const logEntry = JSON.parse(logs[0]);
            
            // Verify required fields
            expect(logEntry.timestamp).toBeDefined();
            expect(new Date(logEntry.timestamp).getTime()).toBeGreaterThan(0);
            expect(logEntry.level).toBe('ERROR');
            expect(logEntry.message).toBe(errorMessage);
            expect(logEntry.context.errorCode).toBe(errorName);
            expect(logEntry.context.errorMessage).toBe(errorMessage);
            expect(logEntry.context.errorStack).toBeDefined();
            expect(logEntry.context.query).toBe(query);
            expect(logEntry.context.operation).toBe(operation);
            expect(logEntry.context.requestId).toBeDefined();
            expect(logEntry.service).toBe('intelligent-supplement-search');
            
            return true;
          } finally {
            console.error = originalError;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should record error metrics when errors are logged', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            errorType: fc.constantFrom('NetworkError', 'ValidationError', 'DatabaseError', 'TimeoutError'),
            message: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (errors) => {
          // Reset metrics
          metricsCollector.reset();
          
          // Record some requests
          const totalRequests = errors.length + 5;
          for (let i = 0; i < totalRequests; i++) {
            metricsCollector.recordRequest();
          }
          
          // Record errors
          errors.forEach(error => {
            metricsCollector.recordError(error.errorType);
          });
          
          // Get error metrics
          const metrics = metricsCollector.getErrorMetrics();
          
          // Verify error count
          expect(metrics.totalErrors).toBe(errors.length);
          expect(metrics.totalRequests).toBe(totalRequests);
          
          // Verify error rate calculation
          const expectedErrorRate = (errors.length / totalRequests) * 100;
          expect(metrics.errorRate).toBeCloseTo(expectedErrorRate, 2);
          
          // Verify errors by type
          const errorCounts = errors.reduce((acc, error) => {
            acc[error.errorType] = (acc[error.errorType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          Object.entries(errorCounts).forEach(([type, count]) => {
            expect(metrics.errorsByType[type]).toBe(count);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include stack trace in error logs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (errorMessage) => {
          // Capture console output
          const logs: string[] = [];
          const originalError = console.error;
          console.error = (message: string) => {
            logs.push(message);
          };
          
          try {
            // Create error with stack trace
            const error = new Error(errorMessage);
            
            // Log error
            logger.error(errorMessage, {
              errorCode: error.name,
              errorMessage: error.message,
              errorStack: error.stack,
            });
            
            // Verify log was created
            expect(logs.length).toBeGreaterThan(0);
            
            // Parse log
            const logEntry = JSON.parse(logs[0]);
            
            // Verify stack trace is included
            expect(logEntry.context.errorStack).toBeDefined();
            expect(typeof logEntry.context.errorStack).toBe('string');
            expect(logEntry.context.errorStack.length).toBeGreaterThan(0);
            
            return true;
          } finally {
            console.error = originalError;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should log errors with request ID for traceability', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (errorMessage) => {
          // Capture console output
          const logs: string[] = [];
          const originalError = console.error;
          console.error = (message: string) => {
            logs.push(message);
          };
          
          try {
            // Generate request ID
            const requestId = logger.generateRequestId();
            
            // Log error with request ID
            logger.error(errorMessage, {
              requestId,
            });
            
            // Verify log was created
            expect(logs.length).toBeGreaterThan(0);
            
            // Parse log
            const logEntry = JSON.parse(logs[0]);
            
            // Verify request ID is included
            expect(logEntry.context.requestId).toBe(requestId);
            expect(logEntry.context.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
            
            return true;
          } finally {
            console.error = originalError;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
