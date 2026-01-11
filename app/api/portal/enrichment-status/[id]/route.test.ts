/**
 * Property-Based Tests for Enrichment Status Endpoint
 * Tests correctness properties for job status polling
 * 
 * @jest-environment node
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { createJob, storeJobResult, clearStore, getJob } from '@/lib/portal/job-store';

// Mock NextRequest helper
function createMockRequest(jobId: string, supplement?: string, correlationId?: string): NextRequest {
  const url = new URL(`http://localhost:3000/api/portal/enrichment-status/${jobId}`);
  if (supplement) {
    url.searchParams.set('supplement', supplement);
  }
  
  const headers = new Headers();
  if (correlationId) {
    headers.set('X-Correlation-ID', correlationId);
  }
  
  return new NextRequest(url, { headers });
}

describe('Enrichment Status Endpoint - Property Tests', () => {
  beforeEach(() => {
    clearStore();
  });

  describe('Property 2: Expired jobs return 410 Gone', () => {
    /**
     * Feature: frontend-error-display-fix, Property 2: Expired jobs return 410 Gone
     * Validates: Requirements 1.2
     * 
     * For any job that has exceeded its expiration time, the system should return 
     * HTTP 410 (Gone) with a message indicating the process took too long
     */
    it('should return 410 Gone for any expired job', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),                                    // jobId
          fc.string({ minLength: 1, maxLength: 50 }),  // supplement name
          fc.option(fc.uuid(), { nil: undefined }),     // optional correlationId
          async (jobId, supplementName, correlationId) => {
            // Create a job and mark it as completed (which has 5 min expiration)
            createJob(jobId);
            storeJobResult(jobId, 'completed', {
              recommendation: { test: 'data' },
            });
            
            // Manually expire the job by setting expiresAt to the past
            const job = getJob(jobId);
            if (job) {
              job.expiresAt = Date.now() - 1000; // Expired 1 second ago
            }
            
            // Make request
            const request = createMockRequest(jobId, supplementName, correlationId);
            const response = await GET(request, { params: { id: jobId } });
            
            // Verify 410 status
            expect(response.status).toBe(410);
            
            // Verify response structure
            const data = await response.json();
            expect(data.success).toBe(false);
            expect(data.status).toBe('job_expired');
            expect(data.error).toBe('job_expired');
            expect(data.message).toBeTruthy();
            expect(data.suggestion).toBeTruthy();
            
            // Verify correlation ID is included if provided
            if (correlationId) {
              expect(data.correlationId).toBe(correlationId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: Error logging includes required fields', () => {
    /**
     * Feature: frontend-error-display-fix, Property 10: Error logging includes required fields
     * Validates: Requirements 3.1
     * 
     * For any error in enrichment-status, the system should log jobId, supplement name, 
     * error type, and stack trace
     */
    it('should log all required fields for any error', async () => {
      const originalConsoleError = console.error;
      const logs: string[] = [];
      console.error = (message: string) => {
        logs.push(message);
      };

      try {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),                                    // jobId
            fc.string({ minLength: 1, maxLength: 50 }),  // supplement name
            fc.string({ minLength: 5, maxLength: 100 }), // error message
            fc.option(fc.uuid(), { nil: undefined }),     // optional correlationId
            async (jobId, supplementName, errorMessage, correlationId) => {
              logs.length = 0; // Clear logs
              
              // Create a failed job
              createJob(jobId);
              storeJobResult(jobId, 'failed', {
                error: errorMessage,
              });
              
              // Make request
              const request = createMockRequest(jobId, supplementName, correlationId);
              await GET(request, { params: { id: jobId } });
              
              // Find the error log entry
              const errorLog = logs.find(log => {
                try {
                  const parsed = JSON.parse(log);
                  return parsed.level === 'error' && parsed.event === 'JOB_FAILED';
                } catch {
                  return false;
                }
              });
              
              expect(errorLog).toBeTruthy();
              
              if (errorLog) {
                const parsed = JSON.parse(errorLog);
                
                // Verify all required fields are present
                expect(parsed.jobId).toBe(jobId);
                expect(parsed.supplementName).toBe(supplementName);
                expect(parsed.error).toBe(errorMessage);
                expect(parsed.elapsedTime).toBeGreaterThanOrEqual(0);
                expect(parsed.timestamp).toBeTruthy();
                
                // Verify correlation ID if provided
                if (correlationId) {
                  expect(parsed.correlationId).toBe(correlationId);
                }
              }
            }
          ),
          { numRuns: 100 }
        );
      } finally {
        console.error = originalConsoleError;
      }
    });
  });

  describe('Property 11: Missing job logs time delta', () => {
    /**
     * Feature: frontend-error-display-fix, Property 11: Missing job logs time delta
     * Validates: Requirements 3.2
     * 
     * For any job not found in the store, the system should log how much time has 
     * passed since job creation (if known)
     */
    it('should log time delta for any missing job that previously existed', async () => {
      const originalConsoleWarn = console.warn;
      const logs: string[] = [];
      console.warn = (message: string) => {
        logs.push(message);
      };

      try {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),                                    // jobId
            fc.string({ minLength: 1, maxLength: 50 }),  // supplement name
            fc.option(fc.uuid(), { nil: undefined }),     // optional correlationId
            async (jobId, supplementName, correlationId) => {
              logs.length = 0; // Clear logs
              
              // Create a job, then manually expire it so it gets cleaned up
              createJob(jobId);
              const job = getJob(jobId);
              if (job) {
                job.expiresAt = Date.now() - 1000; // Expired
              }
              
              // Make request (job should be detected as expired)
              const request = createMockRequest(jobId, supplementName, correlationId);
              await GET(request, { params: { id: jobId } });
              
              // Find the warning log entry for expired job
              const warnLog = logs.find(log => {
                try {
                  const parsed = JSON.parse(log);
                  return parsed.level === 'warn' && 
                         (parsed.event === 'JOB_EXPIRED' || parsed.event === 'JOB_EXPIRED_IN_STORE');
                } catch {
                  return false;
                }
              });
              
              expect(warnLog).toBeTruthy();
              
              if (warnLog) {
                const parsed = JSON.parse(warnLog);
                
                // Verify time delta is logged
                expect(parsed.elapsedTime).toBeDefined();
                expect(typeof parsed.elapsedTime).toBe('number');
                expect(parsed.elapsedTime).toBeGreaterThanOrEqual(0);
                
                // Verify other required fields
                expect(parsed.jobId).toBe(jobId);
                expect(parsed.timestamp).toBeTruthy();
              }
            }
          ),
          { numRuns: 100 }
        );
      } finally {
        console.warn = originalConsoleWarn;
      }
    });
  });

  describe('Property 13: Polling requests include correlation ID', () => {
    /**
     * Feature: frontend-error-display-fix, Property 13: Polling requests include correlation ID
     * Validates: Requirements 3.4
     * 
     * For any polling request from the frontend, the request should include a 
     * correlation ID header for tracking
     */
    it('should include correlation ID in response for any request that provides it', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),                                    // jobId
          fc.string({ minLength: 1, maxLength: 50 }),  // supplement name
          fc.uuid(),                                    // correlationId (always provided)
          fc.constantFrom('processing', 'completed', 'failed', 'timeout'), // job status
          async (jobId, supplementName, correlationId, status) => {
            // Create a job with the specified status
            createJob(jobId);
            
            if (status === 'completed') {
              storeJobResult(jobId, 'completed', {
                recommendation: { test: 'data' },
              });
            } else if (status === 'failed') {
              storeJobResult(jobId, 'failed', {
                error: 'Test error',
              });
            }
            // 'processing' and 'timeout' use the default created job
            
            // Make request with correlation ID
            const request = createMockRequest(jobId, supplementName, correlationId);
            const response = await GET(request, { params: { id: jobId } });
            
            // Verify correlation ID is in response
            const data = await response.json();
            expect(data.correlationId).toBe(correlationId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle requests without correlation ID gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),                                    // jobId
          fc.string({ minLength: 1, maxLength: 50 }),  // supplement name
          async (jobId, supplementName) => {
            // Create a processing job
            createJob(jobId);
            
            // Make request WITHOUT correlation ID
            const request = createMockRequest(jobId, supplementName, undefined);
            const response = await GET(request, { params: { id: jobId } });
            
            // Should still work, just without correlation ID in response
            expect(response.status).toBe(202); // Processing
            const data = await response.json();
            expect(data.success).toBe(true);
            // correlationId should be undefined or not present
            expect(data.correlationId).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
