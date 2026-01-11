/**
 * Integration Tests - Frontend Error Display Fix
 * End-to-end tests for complete workflows
 */

import * as jobStore from './job-store';
import { generateJobId } from './job-utils';

describe('Integration Tests - Job Lifecycle', () => {
  beforeEach(() => {
    // Clear store before each test
    jobStore.clearStore();
  });

  describe('Successful Polling Flow', () => {
    it('should complete full flow: create → poll → complete', () => {
      // 1. Create job
      const jobId = generateJobId();
      jobStore.createJob(jobId, 0);

      // Verify job created
      let job = jobStore.getJob(jobId);
      expect(job).toBeDefined();
      expect(job?.status).toBe('processing');

      // 2. Simulate polling (job still processing)
      job = jobStore.getJob(jobId);
      expect(job?.status).toBe('processing');
      expect(jobStore.isExpired(jobId)).toBe(false);

      // 3. Complete job
      jobStore.storeJobResult(jobId, 'completed', { recommendation: { success: true, data: 'test-data' } });

      // 4. Poll completed job
      job = jobStore.getJob(jobId);
      expect(job?.status).toBe('completed');
      expect(job?.recommendation).toEqual({ success: true, data: 'test-data' });

      // 5. Verify job is retained for 5 minutes
      expect(jobStore.isExpired(jobId)).toBe(false);
    });

    it('should handle multiple concurrent jobs', () => {
      const jobIds: string[] = [];
      const jobCount = 5;

      // Create 5 concurrent jobs
      for (let i = 0; i < jobCount; i++) {
        const jobId = generateJobId();
        jobStore.createJob(jobId, 0);
        jobIds.push(jobId);
      }

      // Verify all jobs exist
      expect(jobIds).toHaveLength(jobCount);
      jobIds.forEach(id => {
        const job = jobStore.getJob(id);
        expect(job).toBeDefined();
        expect(job?.status).toBe('processing');
      });

      // Complete jobs in random order
      jobStore.storeJobResult(jobIds[2], 'completed', { recommendation: { success: true } });
      jobStore.storeJobResult(jobIds[0], 'completed', { recommendation: { success: true } });
      jobStore.storeJobResult(jobIds[4], 'completed', { recommendation: { success: true } });
      jobStore.storeJobResult(jobIds[1], 'failed', { error: 'Test error' });
      jobStore.storeJobResult(jobIds[3], 'completed', { recommendation: { success: true } });

      // Verify final states
      expect(jobStore.getJob(jobIds[0])?.status).toBe('completed');
      expect(jobStore.getJob(jobIds[1])?.status).toBe('failed');
      expect(jobStore.getJob(jobIds[2])?.status).toBe('completed');
      expect(jobStore.getJob(jobIds[3])?.status).toBe('completed');
      expect(jobStore.getJob(jobIds[4])?.status).toBe('completed');
    });
  });

  describe('Timeout Flow', () => {
    it('should complete flow: create → poll → timeout → verify 408', () => {
      // 1. Create job
      const jobId = generateJobId();
      jobStore.createJob(jobId, 0);

      // 2. Simulate timeout (mark as timeout)
      jobStore.markTimeout(jobId);

      // 3. Verify job status
      const job = jobStore.getJob(jobId);
      expect(job?.status).toBe('timeout');

      // 4. Verify timeout is treated as expired
      expect(job?.expiresAt).toBeDefined();
    });

    it('should cleanup timed-out jobs', () => {
      const jobId = generateJobId();
      jobStore.createJob(jobId, 0);

      // Mark as timeout
      jobStore.markTimeout(jobId);

      // Force expiration by manipulating time
      const job = jobStore.getJob(jobId);
      if (job) {
        job.expiresAt = Date.now() - 1000; // Expired 1 second ago
      }

      // Run cleanup
      const removedCount = jobStore.cleanupExpired();

      // Verify job was removed
      expect(removedCount).toBeGreaterThan(0);
      expect(jobStore.getJob(jobId)).toBeUndefined();
    });
  });

  describe('Expiration Flow', () => {
    it('should complete flow: create → wait → poll → verify 410', () => {
      // 1. Create job
      const jobId = generateJobId();
      jobStore.createJob(jobId, 0);

      // 2. Force expiration
      const job = jobStore.getJob(jobId);
      if (job) {
        job.expiresAt = Date.now() - 1000; // Expired 1 second ago
      }

      // 3. Check if expired
      expect(jobStore.isExpired(jobId)).toBe(true);

      // 4. Verify job still exists (not cleaned up yet)
      expect(jobStore.getJob(jobId)).toBeDefined();

      // 5. Run cleanup
      jobStore.cleanupExpired();

      // 6. Verify job was removed
      expect(jobStore.getJob(jobId)).toBeUndefined();
    });

    it('should distinguish between never existed (404) and expired (410)', () => {
      const existingJobId = generateJobId();
      const neverExistedJobId = generateJobId();

      // Create and expire one job
      jobStore.createJob(existingJobId, 0);
      const job = jobStore.getJob(existingJobId);
      if (job) {
        job.expiresAt = Date.now() - 1000;
      }

      // Check states
      expect(jobStore.isExpired(existingJobId)).toBe(true); // 410 Gone
      expect(jobStore.getJob(neverExistedJobId)).toBeUndefined(); // 404 Not Found
    });
  });

  describe('Retry Flow', () => {
    it('should complete flow: timeout → retry with new ID → success', () => {
      // 1. Create initial job
      const jobId1 = generateJobId();
      jobStore.createJob(jobId1, 0);

      // 2. Timeout
      jobStore.markTimeout(jobId1);
      expect(jobStore.getJob(jobId1)?.status).toBe('timeout');

      // 3. Create retry job
      const { newJobId: jobId2, retryCount } = jobStore.createRetryJob(jobId1);
      expect(jobId2).not.toBe(jobId1); // New ID
      expect(retryCount).toBe(1);

      // 4. Verify new job
      const retryJob = jobStore.getJob(jobId2);
      expect(retryJob?.status).toBe('processing');
      expect(retryJob?.retryCount).toBe(1);

      // 5. Complete retry
      jobStore.storeJobResult(jobId2, 'completed', { recommendation: { success: true } });

      expect(jobStore.getJob(jobId2)?.status).toBe('completed');
    });

    it('should enforce retry limit (max 5 retries)', () => {
      let currentJobId = generateJobId();

      // Create initial job
      jobStore.createJob(currentJobId, 0);

      // Retry 5 times
      for (let i = 1; i <= 5; i++) {
        const { newJobId, retryCount } = jobStore.createRetryJob(currentJobId);
        expect(retryCount).toBe(i);
        currentJobId = newJobId;
      }

      // Check if exceeded limit (should be false because limit is 5, not > 5)
      expect(jobStore.hasExceededRetryLimit(currentJobId, 5)).toBe(false);

      // One more retry would exceed
      const { newJobId: finalJobId } = jobStore.createRetryJob(currentJobId);
      expect(jobStore.hasExceededRetryLimit(finalJobId, 5)).toBe(true);
    });
  });

  describe('Store Cleanup During Active Polling', () => {
    it('should cleanup expired jobs without affecting active jobs', () => {
      // Create mix of active and expired jobs
      const activeJobIds: string[] = [];
      const expiredJobIds: string[] = [];

      // Create 3 active jobs
      for (let i = 0; i < 3; i++) {
        const jobId = generateJobId();
        jobStore.createJob(jobId, 0);
        activeJobIds.push(jobId);
      }

      // Create 3 expired jobs
      for (let i = 0; i < 3; i++) {
        const jobId = generateJobId();
        jobStore.createJob(jobId, 0);
        const job = jobStore.getJob(jobId);
        if (job) {
          job.expiresAt = Date.now() - 1000; // Force expiration
        }
        expiredJobIds.push(jobId);
      }

      // Verify all jobs exist
      expect(jobStore.getStoreSize()).toBe(6);

      // Run cleanup
      const removedCount = jobStore.cleanupExpired();

      // Verify only expired jobs were removed
      expect(removedCount).toBe(3);
      expect(jobStore.getStoreSize()).toBe(3);

      // Verify active jobs still exist
      activeJobIds.forEach(id => {
        expect(jobStore.getJob(id)).toBeDefined();
      });

      // Verify expired jobs were removed
      expiredJobIds.forEach(id => {
        expect(jobStore.getJob(id)).toBeUndefined();
      });
    });

    it('should handle cleanup during concurrent polling', async () => {
      const jobIds: string[] = [];

      // Create 10 jobs
      for (let i = 0; i < 10; i++) {
        const jobId = generateJobId();
        jobStore.createJob(jobId, 0);
        jobIds.push(jobId);
      }

      // Simulate concurrent polling (access jobs)
      const pollPromises = jobIds.map(async (id) => {
        return jobStore.getJob(id);
      });

      // Run cleanup concurrently
      const cleanupPromise = Promise.resolve(jobStore.cleanupExpired());

      // Wait for all operations
      const [pollResults, cleanupResult] = await Promise.all([
        Promise.all(pollPromises),
        cleanupPromise,
      ]);

      // Verify all polls succeeded
      expect(pollResults).toHaveLength(10);
      pollResults.forEach(job => {
        expect(job).toBeDefined();
      });

      // Cleanup should not remove active jobs
      expect(cleanupResult).toBe(0);
    });
  });

  describe('LRU Eviction During Active Polling', () => {
    it('should evict oldest jobs when store is full', () => {
      const MAX_STORE_SIZE = 1000;

      // Fill store to capacity
      const jobIds: string[] = [];
      for (let i = 0; i < MAX_STORE_SIZE; i++) {
        const jobId = generateJobId();
        jobStore.createJob(jobId, 0);
        jobIds.push(jobId);
      }

      expect(jobStore.getStoreSize()).toBe(MAX_STORE_SIZE);

      // Wait to ensure access time is distinct from creation time
      const startWait = Date.now();
      while (Date.now() - startWait < 2) { }

      // Access first 10 jobs to make them recently used
      for (let i = 0; i < 10; i++) {
        jobStore.getJob(jobIds[i]);
      }

      // Add one more job (should trigger eviction)
      const newJobId = generateJobId();
      jobStore.createJob(newJobId, 0);

      // Store should enforce size limit
      jobStore.enforceSizeLimit();

      expect(jobStore.getStoreSize()).toBeLessThanOrEqual(MAX_STORE_SIZE);

      // New job should exist
      expect(jobStore.getJob(newJobId)).toBeDefined();

      // Recently accessed jobs should still exist
      for (let i = 0; i < 10; i++) {
        expect(jobStore.getJob(jobIds[i])).toBeDefined();
      }
    });
  });

  describe('Error Recovery', () => {
    it('should recover from failed jobs and allow retry', () => {
      // 1. Create job
      const jobId1 = generateJobId();
      jobStore.createJob(jobId1, 0);

      // 2. Fail job
      jobStore.storeJobResult(jobId1, 'failed', { error: 'Network error' });

      expect(jobStore.getJob(jobId1)?.status).toBe('failed');

      // 3. Create retry job
      const { newJobId: jobId2 } = jobStore.createRetryJob(jobId1);

      // 4. Complete retry successfully
      jobStore.storeJobResult(jobId2, 'completed', { recommendation: { success: true } });

      expect(jobStore.getJob(jobId2)?.status).toBe('completed');
    });
  });
});
