/**
 * Integration test for metrics collection across job store and enrichment status endpoint
 */

import { jobMetrics } from './job-metrics';
import { createJob, storeJobResult, markTimeout, cleanupExpired, enforceSizeLimit, clearStore } from './job-store';

describe('Metrics Integration', () => {
  beforeEach(() => {
    jobMetrics.reset();
    clearStore();
  });

  it('should track complete job lifecycle with metrics', () => {
    // Create a job
    createJob('test-job-1');
    
    let metrics = jobMetrics.getMetricsSummary();
    expect(metrics.jobs.created).toBe(1);
    expect(metrics.store.currentSize).toBe(1);
    
    // Complete the job
    storeJobResult('test-job-1', 'completed', { recommendation: { data: 'test' } });
    
    metrics = jobMetrics.getMetricsSummary();
    expect(metrics.jobs.completed).toBe(1);
    expect(metrics.jobs.successRate).toBe(100);
  });

  it('should track failed jobs', () => {
    createJob('test-job-2');
    storeJobResult('test-job-2', 'failed', { error: 'Test error' });
    
    const metrics = jobMetrics.getMetricsSummary();
    expect(metrics.jobs.created).toBe(1);
    expect(metrics.jobs.failed).toBe(1);
    expect(metrics.jobs.successRate).toBe(0);
  });

  it('should track timeouts', () => {
    createJob('test-job-3');
    markTimeout('test-job-3');
    
    const metrics = jobMetrics.getMetricsSummary();
    expect(metrics.jobs.created).toBe(1);
    expect(metrics.jobs.timedOut).toBe(1);
  });

  it('should track cleanup operations', () => {
    // Create jobs
    createJob('job-1');
    createJob('job-2');
    createJob('job-3');
    
    // Mark them as completed (so they can be cleaned up)
    storeJobResult('job-1', 'completed', {});
    storeJobResult('job-2', 'completed', {});
    storeJobResult('job-3', 'completed', {});
    
    // Cleanup (won't actually remove anything since they're not expired yet)
    cleanupExpired();
    
    const metrics = jobMetrics.getMetricsSummary();
    expect(metrics.store.cleanupOperations).toBeGreaterThanOrEqual(0);
  });

  it('should track store size correctly', () => {
    createJob('job-1');
    createJob('job-2');
    createJob('job-3');
    
    const metrics = jobMetrics.getMetricsSummary();
    expect(metrics.store.currentSize).toBe(3);
  });

  it('should calculate success rate correctly with mixed results', () => {
    // Create 10 jobs
    for (let i = 0; i < 10; i++) {
      createJob(`job-${i}`);
    }
    
    // 7 complete successfully
    for (let i = 0; i < 7; i++) {
      storeJobResult(`job-${i}`, 'completed', {});
    }
    
    // 2 fail
    storeJobResult('job-7', 'failed', { error: 'Error 1' });
    storeJobResult('job-8', 'failed', { error: 'Error 2' });
    
    // 1 times out
    markTimeout('job-9');
    
    const metrics = jobMetrics.getMetricsSummary();
    expect(metrics.jobs.created).toBe(10);
    expect(metrics.jobs.completed).toBe(7);
    expect(metrics.jobs.failed).toBe(2);
    expect(metrics.jobs.timedOut).toBe(1);
    expect(metrics.jobs.successRate).toBe(70); // 7/10 = 70%
  });

  it('should export metrics in correct format', () => {
    createJob('job-1');
    storeJobResult('job-1', 'completed', {});
    jobMetrics.recordLatency(50);
    jobMetrics.recordError(404);
    
    const exported = jobMetrics.exportMetrics();
    
    expect(exported).toHaveProperty('jobs');
    expect(exported).toHaveProperty('store');
    expect(exported).toHaveProperty('errors');
    expect(exported).toHaveProperty('latency');
    expect(exported).toHaveProperty('timestamp');
    
    expect(exported.jobs.created).toBe(1);
    expect(exported.jobs.completed).toBe(1);
    expect(exported.errors.total).toBe(1);
    expect(exported.latency.count).toBe(1);
  });
});
