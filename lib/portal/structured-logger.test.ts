/**
 * Property-Based Tests for Structured Logging
 * Using fast-check for property-based testing
 */

import * as fc from 'fast-check';
import {
  logStructured,
  logEnrichmentError,
  logDirectFetchFailure,
  logMissingJob,
  logJobExpired,
  logJobCompleted,
  logJobFailed,
  logJobTimeout,
  logJobProcessing,
  logStoreMaintenance,
  logValidationFailure,
  logProblematicQuery,
  logRetryAttempt,
  logRetryLimitExceeded,
  logPortalSupplementOutcome,
} from './structured-logger';

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

let logOutput: string[] = [];
let errorOutput: string[] = [];
let warnOutput: string[] = [];

beforeEach(() => {
  logOutput = [];
  errorOutput = [];
  warnOutput = [];
  
  console.log = jest.fn((msg: string) => {
    logOutput.push(msg);
  });
  
  console.error = jest.fn((msg: string) => {
    errorOutput.push(msg);
  });
  
  console.warn = jest.fn((msg: string) => {
    warnOutput.push(msg);
  });
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe('Structured Logger Property Tests', () => {
  /**
   * Property 12: Direct fetch failure logs sanitized response summary
   * Validates: Requirements 3.3
   * 
   * For any direct fetch failure, the system should log enough response
   * context for diagnosis without storing full upstream payloads.
   */
  describe('Property 12: Direct fetch failure logs sanitized response summary', () => {
    it('should log all response fields for any direct fetch failure', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // jobId
          fc.string({ minLength: 1, maxLength: 100 }), // supplementName
          fc.integer({ min: 400, max: 599 }), // HTTP status code
          fc.string({ minLength: 1, maxLength: 50 }), // statusText
          fc.oneof(
            fc.constant(undefined),
            fc.record({
              error: fc.string(),
              message: fc.string(),
              details: fc.anything(),
            })
          ), // response body
          fc.option(fc.string(), { nil: undefined }), // error message
          (jobId, supplementName, status, statusText, body, error) => {
            // Clear previous output
            errorOutput = [];
            
            // Call logDirectFetchFailure
            logDirectFetchFailure(
              jobId,
              supplementName,
              {
                status,
                statusText,
                body,
                error,
              }
            );
            
            // Should have logged exactly one error
            expect(errorOutput).toHaveLength(1);
            
            // Parse the logged JSON
            const logEntry = JSON.parse(errorOutput[0]);
            
            // Verify all required fields are present
            expect(logEntry).toHaveProperty('timestamp');
            expect(logEntry).toHaveProperty('level', 'error');
            expect(logEntry).toHaveProperty('event', 'DIRECT_FETCH_FAILURE');
            expect(logEntry).toHaveProperty('jobId', jobId);
            expect(logEntry).toHaveProperty('supplementName', supplementName);
            expect(logEntry).toHaveProperty('statusCode', status);
            expect(logEntry).toHaveProperty('statusText', statusText);
            
            // Verify response body is included as a sanitized summary
            if (body !== undefined) {
              expect(logEntry).toHaveProperty('responseBody');
              expect(logEntry.responseBody).toHaveProperty('type', 'object');
              expect(logEntry.responseBody).toHaveProperty('keys');
              expect(logEntry.responseBody.keys.length).toBeLessThanOrEqual(20);
            }
            
            // Verify error message is included if provided
            if (error !== undefined) {
              expect(logEntry).toHaveProperty('error', error);
            }
            
            // Verify timestamp is valid ISO 8601
            expect(() => new Date(logEntry.timestamp)).not.toThrow();
            expect(new Date(logEntry.timestamp).toISOString()).toBe(logEntry.timestamp);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should include additional data when provided', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // jobId
          fc.string({ minLength: 1, maxLength: 100 }), // supplementName
          fc.integer({ min: 400, max: 599 }), // status
          fc.string(), // statusText
          fc.string(), // correlationId
          fc.string(), // requestId
          fc.integer({ min: 0, max: 120000 }), // duration
          (jobId, supplementName, status, statusText, correlationId, requestId, duration) => {
            errorOutput = [];
            
            logDirectFetchFailure(
              jobId,
              supplementName,
              { status, statusText },
              { correlationId, requestId, duration }
            );
            
            const logEntry = JSON.parse(errorOutput[0]);
            
            // Verify additional data is included
            expect(logEntry).toHaveProperty('correlationId', correlationId);
            expect(logEntry).toHaveProperty('requestId', requestId);
            expect(logEntry).toHaveProperty('duration', duration);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should truncate large upstream response strings', () => {
      const longBody = 'x'.repeat(1000);

      logDirectFetchFailure('job-1', 'Psyllium', {
        status: 503,
        statusText: 'Service Unavailable',
        body: longBody,
        error: 'upstream_unavailable',
      });

      const logEntry = JSON.parse(errorOutput[0]);

      expect(logEntry.responseBody).toHaveLength(514);
      expect(logEntry.responseBody).toContain('[truncated]');
      expect(logEntry.responseBody.length).toBeLessThan(longBody.length);
    });
  });

  describe('Portal supplement outcome logs', () => {
    it('logs upstream_unavailable as a controlled warning event', () => {
      logPortalSupplementOutcome({
        endpoint: '/api/portal/quiz',
        requestId: 'req-1',
        jobId: 'job-1',
        supplementName: 'Psyllium',
        normalizedQuery: 'Psyllium',
        status: 'upstream_unavailable',
        finalStatusCode: 503,
        fallback: 'upstream_unavailable',
        errorCode: 'upstream_unavailable',
        upstreamStatus: 403,
        elapsedTime: 250,
      });

      expect(warnOutput).toHaveLength(1);
      const logEntry = JSON.parse(warnOutput[0]);

      expect(logEntry).toMatchObject({
        level: 'warn',
        event: 'PORTAL_SUPPLEMENT_OUTCOME',
        endpoint: '/api/portal/quiz',
        supplementName: 'Psyllium',
        status: 'upstream_unavailable',
        finalStatusCode: 503,
        fallback: 'upstream_unavailable',
        errorCode: 'upstream_unavailable',
        upstreamStatus: 403,
      });
    });

    it('logs unexpected 500 outcomes as errors with diagnostic context', () => {
      logPortalSupplementOutcome({
        endpoint: '/api/portal/recommend',
        requestId: 'req-2',
        supplementName: 'Creatine',
        originalQuery: 'creatina',
        normalizedQuery: 'Creatine',
        status: 'failed',
        finalStatusCode: 500,
        fallback: 'backend_service_error',
        errorCode: 'recommendation_generation_failed',
        elapsedTime: 1200,
      });

      expect(errorOutput).toHaveLength(1);
      const logEntry = JSON.parse(errorOutput[0]);

      expect(logEntry).toMatchObject({
        level: 'error',
        event: 'PORTAL_SUPPLEMENT_OUTCOME',
        endpoint: '/api/portal/recommend',
        supplementName: 'Creatine',
        originalQuery: 'creatina',
        normalizedQuery: 'Creatine',
        status: 'failed',
        finalStatusCode: 500,
        fallback: 'backend_service_error',
        errorCode: 'recommendation_generation_failed',
      });
      expect(logEntry.responseBody).toBeUndefined();
      expect(logEntry.body).toBeUndefined();
    });

    it('logs local catalog fallback as a completed info event', () => {
      logPortalSupplementOutcome({
        endpoint: '/api/portal/quiz',
        requestId: 'req-3',
        jobId: 'job-3',
        supplementName: 'Magnesium',
        status: 'completed',
        finalStatusCode: 200,
        fallback: 'local_catalog_fallback',
        source: 'local_catalog_fallback',
        elapsedTime: 20,
      });

      expect(logOutput).toHaveLength(1);
      const logEntry = JSON.parse(logOutput[0]);

      expect(logEntry).toMatchObject({
        level: 'info',
        event: 'PORTAL_SUPPLEMENT_OUTCOME',
        endpoint: '/api/portal/quiz',
        supplementName: 'Magnesium',
        status: 'completed',
        finalStatusCode: 200,
        fallback: 'local_catalog_fallback',
      });
    });
  });
  
  /**
   * Property: Enrichment errors include all required fields
   * Validates: Requirements 3.1
   */
  describe('Property: Enrichment errors include all required fields', () => {
    it('should log jobId, supplementName, error type and stack trace', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // jobId
          fc.string({ minLength: 1, maxLength: 100 }), // supplementName
          fc.string({ minLength: 1, maxLength: 200 }), // error message
          (jobId, supplementName, errorMessage) => {
            errorOutput = [];
            
            const error = new Error(errorMessage);
            logEnrichmentError(jobId, supplementName, error);
            
            expect(errorOutput).toHaveLength(1);
            const logEntry = JSON.parse(errorOutput[0]);
            
            // Verify required fields
            expect(logEntry).toHaveProperty('timestamp');
            expect(logEntry).toHaveProperty('level', 'error');
            expect(logEntry).toHaveProperty('event', 'ENRICHMENT_ERROR');
            expect(logEntry).toHaveProperty('jobId', jobId);
            expect(logEntry).toHaveProperty('supplementName', supplementName);
            expect(logEntry).toHaveProperty('error', errorMessage);
            expect(logEntry).toHaveProperty('stack');
            expect(typeof logEntry.stack).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle string errors without stack traces', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          (jobId, supplementName, errorMessage) => {
            errorOutput = [];
            
            logEnrichmentError(jobId, supplementName, errorMessage);
            
            const logEntry = JSON.parse(errorOutput[0]);
            
            expect(logEntry).toHaveProperty('error', errorMessage);
            expect(logEntry.stack).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Property: Missing job logs include time delta when available
   * Validates: Requirements 3.2
   */
  describe('Property: Missing job logs include time delta', () => {
    it('should log time since creation when available', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          fc.option(fc.integer({ min: 0, max: 300000 }), { nil: undefined }),
          (jobId, supplementName, timeSinceCreation) => {
            warnOutput = [];
            
            logMissingJob(jobId, supplementName, timeSinceCreation);
            
            expect(warnOutput).toHaveLength(1);
            const logEntry = JSON.parse(warnOutput[0]);
            
            expect(logEntry).toHaveProperty('level', 'warn');
            expect(logEntry).toHaveProperty('event', 'JOB_NOT_FOUND');
            expect(logEntry).toHaveProperty('jobId', jobId);
            
            if (supplementName !== undefined) {
              expect(logEntry).toHaveProperty('supplementName', supplementName);
            }
            
            if (timeSinceCreation !== undefined) {
              expect(logEntry).toHaveProperty('timeSinceCreation', timeSinceCreation);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Property: All log entries have consistent structure
   */
  describe('Property: All log entries have consistent structure', () => {
    it('should always include timestamp, level, and event', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('error', 'warn', 'info', 'debug'),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.record({
            jobId: fc.option(fc.string(), { nil: undefined }),
            supplementName: fc.option(fc.string(), { nil: undefined }),
            correlationId: fc.option(fc.string(), { nil: undefined }),
          }),
          (level, event, data) => {
            logOutput = [];
            errorOutput = [];
            warnOutput = [];
            
            logStructured(level as any, event, data);
            
            // Get the appropriate output array
            const output = level === 'error' ? errorOutput : level === 'warn' ? warnOutput : logOutput;
            
            expect(output).toHaveLength(1);
            const logEntry = JSON.parse(output[0]);
            
            // Verify core structure
            expect(logEntry).toHaveProperty('timestamp');
            expect(logEntry).toHaveProperty('level', level);
            expect(logEntry).toHaveProperty('event', event);
            
            // Verify timestamp is valid
            expect(() => new Date(logEntry.timestamp)).not.toThrow();
            
            // Verify data fields are included
            if (data.jobId !== undefined) {
              expect(logEntry).toHaveProperty('jobId', data.jobId);
            }
            if (data.supplementName !== undefined) {
              expect(logEntry).toHaveProperty('supplementName', data.supplementName);
            }
            if (data.correlationId !== undefined) {
              expect(logEntry).toHaveProperty('correlationId', data.correlationId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Property: Problematic queries always log warnings
   * Validates: Requirements 4.5
   */
  describe('Property: Problematic queries log warnings', () => {
    it('should log warning for any problematic query', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          (supplementName, reason) => {
            warnOutput = [];
            
            logProblematicQuery(supplementName, reason);
            
            expect(warnOutput).toHaveLength(1);
            const logEntry = JSON.parse(warnOutput[0]);
            
            expect(logEntry).toHaveProperty('level', 'warn');
            expect(logEntry).toHaveProperty('event', 'PROBLEMATIC_QUERY');
            expect(logEntry).toHaveProperty('supplementName', supplementName);
            expect(logEntry).toHaveProperty('reason', reason);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
