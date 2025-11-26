/**
 * Integration Tests for Retry Logic
 * 
 * Tests the complete retry flow including job creation, retry tracking, and limit enforcement
 */

import { 
  createJob, 
  createRetryJob, 
  hasExceededRetryLimit, 
  getJob,
  clearStore 
} from './job-store';

describe('Retry Logic - Integration Tests', () => {
  beforeEach(() => {
    // Clear store before each test
    clearStore();
  });

  describe('Retry job creation', () => {
    it('should create a new job with incremented retry count', () => {
      // Create initial job
      const initialJobId = 'job_initial_123';
      createJob(initialJobId);
      
      const initialJob = getJob(initialJobId);
      expect(initialJob).toBeDefined();
      expect(initialJob?.retryCount).toBe(0);
      
      // Create retry job
      const { newJobId, retryCount } = createRetryJob(initialJobId);
      
      // Verify new job ID is different
      expect(newJobId).not.toBe(initialJobId);
      expect(newJobId).toMatch(/^job_\d+_[a-z0-9]+$/);
      
      // Verify retry count incremented
      expect(retryCount).toBe(1);
      
      // Verify new job exists in store
      const newJob = getJob(newJobId);
      expect(newJob).toBeDefined();
      expect(newJob?.retryCount).toBe(1);
      expect(newJob?.status).toBe('processing');
    });

    it('should handle multiple sequential retries', () => {
      // Create initial job
      let currentJobId = 'job_initial_456';
      createJob(currentJobId);
      
      const jobIds: string[] = [currentJobId];
      const retryCounts: number[] = [0];
      
      // Perform 5 retries
      for (let i = 0; i < 5; i++) {
        const { newJobId, retryCount } = createRetryJob(currentJobId);
        jobIds.push(newJobId);
        retryCounts.push(retryCount);
        currentJobId = newJobId;
      }
      
      // Verify all job IDs are unique
      const uniqueIds = new Set(jobIds);
      expect(uniqueIds.size).toBe(6); // Initial + 5 retries
      
      // Verify retry counts increment correctly
      expect(retryCounts).toEqual([0, 1, 2, 3, 4, 5]);
      
      // Verify all jobs exist in store with correct retry counts
      for (let i = 0; i < jobIds.length; i++) {
        const job = getJob(jobIds[i]);
        expect(job).toBeDefined();
        expect(job?.retryCount).toBe(retryCounts[i]);
      }
    });

    it('should create retry job even if previous job does not exist', () => {
      // Try to create retry from non-existent job
      const nonExistentJobId = 'job_nonexistent_789';
      const { newJobId, retryCount } = createRetryJob(nonExistentJobId);
      
      // Should still create new job with retry count 1
      expect(newJobId).toBeDefined();
      expect(newJobId).not.toBe(nonExistentJobId);
      expect(retryCount).toBe(1);
      
      // Verify new job exists
      const newJob = getJob(newJobId);
      expect(newJob).toBeDefined();
      expect(newJob?.retryCount).toBe(1);
    });
  });

  describe('Retry limit enforcement', () => {
    it('should not exceed retry limit of 5', () => {
      // Create initial job
      let currentJobId = 'job_limit_test_123';
      createJob(currentJobId);
      
      // Perform 5 retries (should be allowed)
      for (let i = 0; i < 5; i++) {
        expect(hasExceededRetryLimit(currentJobId, 5)).toBe(false);
        const { newJobId } = createRetryJob(currentJobId);
        currentJobId = newJobId;
      }
      
      // After 5 retries, retry count is 5, which equals the limit (not exceeding)
      expect(hasExceededRetryLimit(currentJobId, 5)).toBe(false);
      
      // One more retry would make retry count 6, which exceeds limit
      const { newJobId: sixthRetryJobId } = createRetryJob(currentJobId);
      expect(hasExceededRetryLimit(sixthRetryJobId, 5)).toBe(true);
    });

    it('should return false for non-existent jobs', () => {
      const nonExistentJobId = 'job_nonexistent_456';
      expect(hasExceededRetryLimit(nonExistentJobId, 5)).toBe(false);
    });

    it('should correctly check different retry limits', () => {
      // Create job with retry count 3
      const jobId = 'job_custom_limit_789';
      createJob(jobId, 3);
      
      // Should not exceed limit of 5
      expect(hasExceededRetryLimit(jobId, 5)).toBe(false);
      
      // Should exceed limit of 2
      expect(hasExceededRetryLimit(jobId, 2)).toBe(true);
      
      // Should not exceed limit of 3 (equal to count)
      expect(hasExceededRetryLimit(jobId, 3)).toBe(false);
    });

    it('should handle edge case of retry count exactly at limit', () => {
      // Create job with retry count exactly at limit
      const jobId = 'job_edge_case_101';
      createJob(jobId, 5);
      
      // Should not exceed when equal to limit
      expect(hasExceededRetryLimit(jobId, 5)).toBe(false);
      
      // Create one more retry
      const { newJobId } = createRetryJob(jobId);
      
      // Now should exceed limit
      expect(hasExceededRetryLimit(newJobId, 5)).toBe(true);
    });
  });

  describe('Retry job state management', () => {
    it('should preserve job metadata across retries', () => {
      // Create initial job
      const initialJobId = 'job_metadata_123';
      createJob(initialJobId);
      
      const initialJob = getJob(initialJobId);
      expect(initialJob).toBeDefined();
      
      // Store initial timestamps
      const initialCreatedAt = initialJob!.createdAt;
      const initialExpiresAt = initialJob!.expiresAt;
      
      // Wait a bit to ensure timestamps differ
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      return delay(10).then(() => {
        // Create retry job
        const { newJobId } = createRetryJob(initialJobId);
        
        const newJob = getJob(newJobId);
        expect(newJob).toBeDefined();
        
        // New job should have different timestamps
        expect(newJob!.createdAt).toBeGreaterThan(initialCreatedAt);
        expect(newJob!.expiresAt).toBeGreaterThan(initialExpiresAt);
        
        // Both jobs should exist in store
        expect(getJob(initialJobId)).toBeDefined();
        expect(getJob(newJobId)).toBeDefined();
      });
    });

    it('should maintain separate state for each retry attempt', () => {
      // Create initial job
      let currentJobId = 'job_separate_state_456';
      createJob(currentJobId);
      
      const jobStates: Array<{ jobId: string; retryCount: number; createdAt: number }> = [];
      
      // Capture initial state
      const initialJob = getJob(currentJobId);
      jobStates.push({
        jobId: currentJobId,
        retryCount: initialJob!.retryCount || 0,
        createdAt: initialJob!.createdAt,
      });
      
      // Create 3 retries
      for (let i = 0; i < 3; i++) {
        const { newJobId, retryCount } = createRetryJob(currentJobId);
        const newJob = getJob(newJobId);
        
        jobStates.push({
          jobId: newJobId,
          retryCount,
          createdAt: newJob!.createdAt,
        });
        
        currentJobId = newJobId;
      }
      
      // Verify all states are different
      for (let i = 0; i < jobStates.length; i++) {
        for (let j = i + 1; j < jobStates.length; j++) {
          // Different job IDs
          expect(jobStates[i].jobId).not.toBe(jobStates[j].jobId);
          
          // Different retry counts
          expect(jobStates[i].retryCount).not.toBe(jobStates[j].retryCount);
          
          // Different creation times (later jobs created after earlier ones)
          expect(jobStates[j].createdAt).toBeGreaterThanOrEqual(jobStates[i].createdAt);
        }
      }
    });
  });

  describe('Retry chain tracking', () => {
    it('should allow tracking the chain of retries', () => {
      // Create initial job
      const initialJobId = 'job_chain_123';
      createJob(initialJobId);
      
      // Build retry chain
      const chain: Array<{ jobId: string; retryCount: number }> = [
        { jobId: initialJobId, retryCount: 0 }
      ];
      
      let currentJobId = initialJobId;
      for (let i = 0; i < 3; i++) {
        const { newJobId, retryCount } = createRetryJob(currentJobId);
        chain.push({ jobId: newJobId, retryCount });
        currentJobId = newJobId;
      }
      
      // Verify chain integrity
      expect(chain.length).toBe(4); // Initial + 3 retries
      
      // Verify retry counts are sequential
      for (let i = 0; i < chain.length; i++) {
        expect(chain[i].retryCount).toBe(i);
      }
      
      // Verify all jobs in chain exist
      for (const link of chain) {
        const job = getJob(link.jobId);
        expect(job).toBeDefined();
        expect(job?.retryCount).toBe(link.retryCount);
      }
    });
  });
});
