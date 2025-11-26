/**
 * Tests for Job Metrics Collector
 */

import { jobMetrics } from './job-metrics';

describe('JobMetricsCollector', () => {
  beforeEach(() => {
    // Reset metrics before each test
    jobMetrics.reset();
  });

  describe('Job Lifecycle Tracking', () => {
    it('should track job creation', () => {
      jobMetrics.recordJobCreated();
      jobMetrics.recordJobCreated();
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.jobs.created).toBe(2);
    });

    it('should track job completion', () => {
      jobMetrics.recordJobCompleted();
      jobMetrics.recordJobCompleted();
      jobMetrics.recordJobCompleted();
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.jobs.completed).toBe(3);
    });

    it('should track job failure', () => {
      jobMetrics.recordJobFailed();
      jobMetrics.recordJobFailed();
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.jobs.failed).toBe(2);
    });

    it('should track job timeout', () => {
      jobMetrics.recordJobTimedOut();
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.jobs.timedOut).toBe(1);
    });

    it('should calculate success rate correctly', () => {
      jobMetrics.recordJobCompleted();
      jobMetrics.recordJobCompleted();
      jobMetrics.recordJobCompleted();
      jobMetrics.recordJobFailed();
      jobMetrics.recordJobTimedOut();
      
      const summary = jobMetrics.getMetricsSummary();
      // 3 completed out of 5 total = 60%
      expect(summary.jobs.successRate).toBe(60);
    });

    it('should handle zero jobs for success rate', () => {
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.jobs.successRate).toBe(0);
    });
  });

  describe('Store Operations Tracking', () => {
    it('should update store size', () => {
      jobMetrics.updateStoreSize(50);
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.store.currentSize).toBe(50);
    });

    it('should track cleanup operations', () => {
      jobMetrics.recordCleanup(5);
      jobMetrics.recordCleanup(3);
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.store.cleanupOperations).toBe(2);
    });

    it('should track evictions', () => {
      jobMetrics.recordEviction(2);
      jobMetrics.recordEviction(3);
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.store.evictions).toBe(5);
    });
  });

  describe('Error Tracking', () => {
    it('should track errors by status code', () => {
      jobMetrics.recordError(404);
      jobMetrics.recordError(404);
      jobMetrics.recordError(500);
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.errors.total).toBe(3);
      expect(summary.errors.byStatusCode[404]).toBe(2);
      expect(summary.errors.byStatusCode[500]).toBe(1);
    });

    it('should handle multiple different status codes', () => {
      jobMetrics.recordError(400);
      jobMetrics.recordError(404);
      jobMetrics.recordError(408);
      jobMetrics.recordError(410);
      jobMetrics.recordError(500);
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.errors.total).toBe(5);
      expect(Object.keys(summary.errors.byStatusCode).length).toBe(5);
    });
  });

  describe('Latency Tracking', () => {
    it('should track latency measurements', () => {
      jobMetrics.recordLatency(50);
      jobMetrics.recordLatency(100);
      jobMetrics.recordLatency(150);
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.latency.count).toBe(3);
    });

    it('should calculate P50 correctly', () => {
      // Add 100 measurements
      for (let i = 1; i <= 100; i++) {
        jobMetrics.recordLatency(i);
      }
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.latency.p50).toBe(50);
    });

    it('should calculate P95 correctly', () => {
      // Add 100 measurements
      for (let i = 1; i <= 100; i++) {
        jobMetrics.recordLatency(i);
      }
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.latency.p95).toBe(95);
    });

    it('should calculate P99 correctly', () => {
      // Add 100 measurements
      for (let i = 1; i <= 100; i++) {
        jobMetrics.recordLatency(i);
      }
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.latency.p99).toBe(99);
    });

    it('should calculate min, max, and avg correctly', () => {
      jobMetrics.recordLatency(10);
      jobMetrics.recordLatency(50);
      jobMetrics.recordLatency(100);
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.latency.min).toBe(10);
      expect(summary.latency.max).toBe(100);
      expect(summary.latency.avg).toBe(53.333333333333336); // (10 + 50 + 100) / 3
    });

    it('should handle empty latency array', () => {
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.latency.p50).toBe(0);
      expect(summary.latency.p95).toBe(0);
      expect(summary.latency.p99).toBe(0);
      expect(summary.latency.count).toBe(0);
    });

    it('should limit latency array to 10000 measurements', () => {
      // Add 15000 measurements
      for (let i = 0; i < 15000; i++) {
        jobMetrics.recordLatency(i);
      }
      
      const raw = jobMetrics.getRawMetrics();
      expect(raw.latencies.length).toBe(10000);
    });
  });

  describe('Metrics Export', () => {
    it('should export metrics in correct format', () => {
      jobMetrics.recordJobCreated();
      jobMetrics.recordJobCompleted();
      jobMetrics.updateStoreSize(10);
      jobMetrics.recordError(404);
      jobMetrics.recordLatency(50);
      
      const exported = jobMetrics.exportMetrics();
      
      expect(exported).toHaveProperty('jobs');
      expect(exported).toHaveProperty('store');
      expect(exported).toHaveProperty('errors');
      expect(exported).toHaveProperty('latency');
      expect(exported).toHaveProperty('timestamp');
      
      expect(typeof exported.timestamp).toBe('string');
    });

    it('should include all job metrics', () => {
      jobMetrics.recordJobCreated();
      jobMetrics.recordJobCompleted();
      jobMetrics.recordJobFailed();
      jobMetrics.recordJobTimedOut();
      
      const exported = jobMetrics.exportMetrics();
      
      expect(exported.jobs.created).toBe(1);
      expect(exported.jobs.completed).toBe(1);
      expect(exported.jobs.failed).toBe(1);
      expect(exported.jobs.timedOut).toBe(1);
      expect(exported.jobs.successRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all metrics', () => {
      jobMetrics.recordJobCreated();
      jobMetrics.recordJobCompleted();
      jobMetrics.recordError(404);
      jobMetrics.recordLatency(50);
      jobMetrics.updateStoreSize(10);
      
      jobMetrics.reset();
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.jobs.created).toBe(0);
      expect(summary.jobs.completed).toBe(0);
      expect(summary.store.currentSize).toBe(0);
      expect(summary.errors.total).toBe(0);
      expect(summary.latency.count).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should track a complete job lifecycle', () => {
      // Job created
      jobMetrics.recordJobCreated();
      jobMetrics.updateStoreSize(1);
      
      // Job processing (multiple status checks)
      jobMetrics.recordLatency(45);
      jobMetrics.recordLatency(50);
      jobMetrics.recordLatency(48);
      
      // Job completed
      jobMetrics.recordJobCompleted();
      jobMetrics.recordLatency(52);
      
      // Cleanup
      jobMetrics.recordCleanup(1);
      jobMetrics.updateStoreSize(0);
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.jobs.created).toBe(1);
      expect(summary.jobs.completed).toBe(1);
      expect(summary.jobs.successRate).toBe(100);
      expect(summary.store.cleanupOperations).toBe(1);
      expect(summary.latency.count).toBe(4);
    });

    it('should track multiple concurrent jobs', () => {
      // Create 5 jobs
      for (let i = 0; i < 5; i++) {
        jobMetrics.recordJobCreated();
      }
      jobMetrics.updateStoreSize(5);
      
      // 3 complete successfully
      for (let i = 0; i < 3; i++) {
        jobMetrics.recordJobCompleted();
        jobMetrics.recordLatency(50 + i * 10);
      }
      
      // 1 fails
      jobMetrics.recordJobFailed();
      jobMetrics.recordError(500);
      jobMetrics.recordLatency(120);
      
      // 1 times out
      jobMetrics.recordJobTimedOut();
      jobMetrics.recordError(408);
      jobMetrics.recordLatency(2000);
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.jobs.created).toBe(5);
      expect(summary.jobs.completed).toBe(3);
      expect(summary.jobs.failed).toBe(1);
      expect(summary.jobs.timedOut).toBe(1);
      expect(summary.jobs.successRate).toBe(60); // 3/5 = 60%
      expect(summary.errors.total).toBe(2);
    });

    it('should track store evictions under load', () => {
      // Simulate store filling up
      for (let i = 0; i < 1000; i++) {
        jobMetrics.recordJobCreated();
      }
      jobMetrics.updateStoreSize(1000);
      
      // New job triggers eviction
      jobMetrics.recordJobCreated();
      jobMetrics.recordEviction(1);
      jobMetrics.updateStoreSize(1000);
      
      const summary = jobMetrics.getMetricsSummary();
      expect(summary.jobs.created).toBe(1001);
      expect(summary.store.evictions).toBe(1);
      expect(summary.store.currentSize).toBe(1000);
    });
  });
});
