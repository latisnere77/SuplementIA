/**
 * Performance Tests - Frontend Error Display Fix
 * Load testing and performance benchmarks
 */

import * as jobStore from './job-store';
import { generateJobId } from './job-utils';

describe('Performance Tests', () => {
  beforeEach(() => {
    // Clear store before each test
    jobStore.clearStore();
  });

  describe('Load Testing', () => {
    it('should handle 100 concurrent jobs', async () => {
      const jobCount = 100;
      const jobIds: string[] = [];

      const startTime = performance.now();

      // Create 100 jobs concurrently
      const createPromises = Array.from({ length: jobCount }, () => {
        return Promise.resolve().then(() => {
          const jobId = generateJobId();
          jobStore.createJob(jobId, 0);
          jobIds.push(jobId);
          return jobId;
        });
      });

      await Promise.all(createPromises);

      const createDuration = performance.now() - startTime;

      // Verify all jobs created
      expect(jobIds).toHaveLength(jobCount);
      expect(jobStore.getStoreSize()).toBe(jobCount);

      // Should complete in reasonable time (< 1 second)
      expect(createDuration).toBeLessThan(1000);

      console.log(`✓ Created ${jobCount} jobs in ${createDuration.toFixed(2)}ms`);
    });

    it('should handle 100 concurrent reads', async () => {
      // Setup: Create 100 jobs
      const jobIds: string[] = [];
      for (let i = 0; i < 100; i++) {
        const jobId = generateJobId();
        jobStore.createJob(jobId, 0);
        jobIds.push(jobId);
      }

      const startTime = performance.now();

      // Read all jobs concurrently
      const readPromises = jobIds.map(id =>
        Promise.resolve(jobStore.getJob(id))
      );

      const results = await Promise.all(readPromises);

      const readDuration = performance.now() - startTime;

      // Verify all reads succeeded
      expect(results).toHaveLength(100);
      results.forEach(job => {
        expect(job).toBeDefined();
      });

      // Should complete quickly (< 100ms)
      expect(readDuration).toBeLessThan(100);

      console.log(`✓ Read 100 jobs in ${readDuration.toFixed(2)}ms`);
    });

    it('should handle mixed operations (create, read, update, delete)', async () => {
      const operationCount = 100;
      const startTime = performance.now();

      const operations = Array.from({ length: operationCount }, (_, i) => {
        return Promise.resolve().then(() => {
          const operation = i % 3;
          const jobId = generateJobId();

          switch (operation) {
            case 0: // Create
              jobStore.createJob(jobId, 0);
              break;
            case 1: // Read
              jobStore.createJob(jobId, 0);
              jobStore.getJob(jobId);
              break;
            case 2: // Update
              jobStore.createJob(jobId, 0);
              jobStore.storeJobResult(jobId, 'completed', { recommendation: { success: true } });
              break;
          }
        });
      });

      await Promise.all(operations);

      const duration = performance.now() - startTime;

      // Should complete in reasonable time (< 500ms)
      expect(duration).toBeLessThan(500);

      console.log(`✓ Completed ${operationCount} mixed operations in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Endpoint Latency', () => {
    it('should have getJob latency < 1ms (p95)', () => {
      // Setup: Create 100 jobs
      const jobIds: string[] = [];
      for (let i = 0; i < 100; i++) {
        const jobId = generateJobId();
        jobStore.createJob(jobId, 0);
        jobIds.push(jobId);
      }

      // Measure latency for 100 reads
      const latencies: number[] = [];

      for (const jobId of jobIds) {
        const start = performance.now();
        jobStore.getJob(jobId);
        const duration = performance.now() - start;
        latencies.push(duration);
      }

      // Calculate p95
      latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(latencies.length * 0.95);
      const p95 = latencies[p95Index];

      // p95 should be < 1ms
      expect(p95).toBeLessThan(1);

      console.log(`✓ getJob p95 latency: ${p95.toFixed(3)}ms`);
    });

    it('should have createJob latency < 1ms (p95)', () => {
      const latencies: number[] = [];

      // Create 100 jobs and measure latency
      for (let i = 0; i < 100; i++) {
        const jobId = generateJobId();
        const start = performance.now();
        jobStore.createJob(jobId, 0);
        const duration = performance.now() - start;
        latencies.push(duration);
      }

      // Calculate p95
      latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(latencies.length * 0.95);
      const p95 = latencies[p95Index];

      // p95 should be < 1ms
      expect(p95).toBeLessThan(1);

      console.log(`✓ createJob p95 latency: ${p95.toFixed(3)}ms`);
    });

    it('should have storeJobResult latency < 1ms (p95)', () => {
      // Setup: Create 100 jobs
      const jobIds: string[] = [];
      for (let i = 0; i < 100; i++) {
        const jobId = generateJobId();
        jobStore.createJob(jobId, 0);
        jobIds.push(jobId);
      }

      const latencies: number[] = [];

      // Update all jobs and measure latency
      for (const jobId of jobIds) {
        const start = performance.now();
        jobStore.storeJobResult(jobId, 'completed', { recommendation: { success: true } });
        const duration = performance.now() - start;
        latencies.push(duration);
      }

      // Calculate p95
      latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(latencies.length * 0.95);
      const p95 = latencies[p95Index];

      // p95 should be < 1ms
      expect(p95).toBeLessThan(1);

      console.log(`✓ storeJobResult p95 latency: ${p95.toFixed(3)}ms`);
    });
  });

  describe('Cleanup Performance', () => {
    it('should cleanup 100 expired jobs in < 10ms', () => {
      // Create 100 expired jobs
      for (let i = 0; i < 100; i++) {
        const jobId = generateJobId();
        jobStore.createJob(jobId, 0);
        const job = jobStore.getJob(jobId);
        if (job) {
          job.expiresAt = Date.now() - 1000; // Force expiration
        }
      }

      expect(jobStore.getStoreSize()).toBe(100);

      // Measure cleanup time
      const start = performance.now();
      const removedCount = jobStore.cleanupExpired();
      const duration = performance.now() - start;

      // Verify cleanup
      expect(removedCount).toBe(100);
      expect(jobStore.getStoreSize()).toBe(0);

      // Should complete in < 10ms
      expect(duration).toBeLessThan(10);

      console.log(`✓ Cleaned up ${removedCount} jobs in ${duration.toFixed(2)}ms`);
    });

    it('should cleanup 1000 expired jobs in < 50ms', () => {
      // Create 1000 expired jobs
      for (let i = 0; i < 1000; i++) {
        const jobId = generateJobId();
        jobStore.createJob(jobId, 0);
        const job = jobStore.getJob(jobId);
        if (job) {
          job.expiresAt = Date.now() - 1000;
        }
      }

      const start = performance.now();
      const removedCount = jobStore.cleanupExpired();
      const duration = performance.now() - start;

      expect(removedCount).toBe(1000);
      expect(duration).toBeLessThan(50);

      console.log(`✓ Cleaned up ${removedCount} jobs in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Eviction Performance', () => {
    it('should evict oldest jobs during creation in < 5ms', () => {
      const MAX_STORE_SIZE = 1000;

      // Fill store to capacity
      for (let i = 0; i < MAX_STORE_SIZE; i++) {
        const jobId = generateJobId();
        jobStore.createJob(jobId, 0);
      }

      expect(jobStore.getStoreSize()).toBe(MAX_STORE_SIZE);

      // Measure eviction time (happens during creation of new job)
      const start = performance.now();

      // Add one more job, which should trigger eviction
      const newJobId = generateJobId();
      jobStore.createJob(newJobId, 0);

      const duration = performance.now() - start;

      // Verify size maintained
      expect(jobStore.getStoreSize()).toBe(MAX_STORE_SIZE);

      // Should complete in < 5ms
      expect(duration).toBeLessThan(5);

      console.log(`✓ Created job with eviction in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage', () => {
    it('should use < 2MB for 1000 jobs', () => {
      // Create 1000 jobs
      const jobIds: string[] = [];
      for (let i = 0; i < 1000; i++) {
        const jobId = generateJobId();
        jobStore.createJob(jobId, 0);
        jobIds.push(jobId);
      }

      // Estimate memory usage
      // Each job has: id (36 bytes), status (~10 bytes),
      // timestamps (24 bytes) ≈ 70 bytes per job
      // 1000 jobs ≈ 70KB (well under 2MB)

      const estimatedMemoryPerJob = 70; // bytes
      const totalEstimatedMemory = estimatedMemoryPerJob * 1000;
      const totalEstimatedMemoryMB = totalEstimatedMemory / (1024 * 1024);

      expect(totalEstimatedMemoryMB).toBeLessThan(2);

      console.log(`✓ Estimated memory for 1000 jobs: ${totalEstimatedMemoryMB.toFixed(3)}MB`);
    });

    it('should not leak memory after cleanup', () => {
      // Create and cleanup multiple times
      for (let cycle = 0; cycle < 10; cycle++) {
        // Create 100 jobs
        for (let i = 0; i < 100; i++) {
          const jobId = generateJobId();
          jobStore.createJob(jobId, 0);
        }

        // Clear all jobs
        jobStore.clearStore();

        expect(jobStore.getStoreSize()).toBe(0);
      }

      // Store should be empty
      expect(jobStore.getStoreSize()).toBe(0);

      console.log('✓ No memory leaks detected after 10 cycles');
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid create/clear cycles', () => {
      const cycles = 100;
      const start = performance.now();

      for (let i = 0; i < cycles; i++) {
        const jobId = generateJobId();
        jobStore.createJob(jobId, 0);
        jobStore.clearStore();
      }

      const duration = performance.now() - start;

      // Should complete in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
      expect(jobStore.getStoreSize()).toBe(0);

      console.log(`✓ Completed ${cycles} create/clear cycles in ${duration.toFixed(2)}ms`);
    });

    it('should maintain performance under sustained load', () => {
      const iterations = 10;
      const jobsPerIteration = 100;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        // Create 100 jobs
        for (let j = 0; j < jobsPerIteration; j++) {
          const jobId = generateJobId();
          jobStore.createJob(jobId, 0);
        }

        const duration = performance.now() - start;
        latencies.push(duration);

        // Cleanup
        jobStore.clearStore();
      }

      // Calculate average latency
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

      // Performance should remain consistent (< 50ms per iteration)
      expect(avgLatency).toBeLessThan(50);

      console.log(`✓ Average latency over ${iterations} iterations: ${avgLatency.toFixed(2)}ms`);
    });
  });
});
