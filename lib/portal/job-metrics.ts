/**
 * Job Metrics Collector
 * Tracks metrics for async enrichment jobs and job store operations
 * Provides observability for job lifecycle, store health, and endpoint performance
 */

export interface JobMetrics {
  // Job lifecycle counts
  jobsCreated: number;
  jobsCompleted: number;
  jobsFailed: number;
  jobsTimedOut: number;
  
  // Store operations
  storeSize: number;
  cleanupOperations: number;
  evictions: number;
  
  // Error tracking
  errorsByStatusCode: Record<number, number>;
  
  // Latency tracking
  latencies: number[];
}

export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  count: number;
}

export interface JobMetricsSummary {
  jobs: {
    created: number;
    completed: number;
    failed: number;
    timedOut: number;
    successRate: number; // percentage
  };
  store: {
    currentSize: number;
    cleanupOperations: number;
    evictions: number;
  };
  errors: {
    total: number;
    byStatusCode: Record<number, number>;
  };
  latency: LatencyMetrics;
  timestamp: string;
}

class JobMetricsCollector {
  private metrics: JobMetrics = {
    jobsCreated: 0,
    jobsCompleted: 0,
    jobsFailed: 0,
    jobsTimedOut: 0,
    storeSize: 0,
    cleanupOperations: 0,
    evictions: 0,
    errorsByStatusCode: {},
    latencies: [],
  };

  /**
   * Record job creation
   */
  recordJobCreated(): void {
    this.metrics.jobsCreated++;
  }

  /**
   * Record job completion
   */
  recordJobCompleted(): void {
    this.metrics.jobsCompleted++;
  }

  /**
   * Record job failure
   */
  recordJobFailed(): void {
    this.metrics.jobsFailed++;
  }

  /**
   * Record job timeout
   */
  recordJobTimedOut(): void {
    this.metrics.jobsTimedOut++;
  }

  /**
   * Update current store size
   */
  updateStoreSize(size: number): void {
    this.metrics.storeSize = size;
  }

  /**
   * Record cleanup operation
   */
  recordCleanup(_removedCount: number): void {
    this.metrics.cleanupOperations++;
  }

  /**
   * Record eviction operation
   */
  recordEviction(evictedCount: number): void {
    this.metrics.evictions += evictedCount;
  }

  /**
   * Record error by status code
   */
  recordError(statusCode: number): void {
    this.metrics.errorsByStatusCode[statusCode] = 
      (this.metrics.errorsByStatusCode[statusCode] || 0) + 1;
  }

  /**
   * Record endpoint latency
   */
  recordLatency(latencyMs: number): void {
    this.metrics.latencies.push(latencyMs);
    
    // Keep only last 10000 measurements to prevent memory issues
    if (this.metrics.latencies.length > 10000) {
      this.metrics.latencies = this.metrics.latencies.slice(-10000);
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Get latency metrics (P50, P95, P99)
   */
  getLatencyMetrics(): LatencyMetrics {
    if (this.metrics.latencies.length === 0) {
      return {
        p50: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0,
        avg: 0,
        count: 0,
      };
    }

    const sorted = [...this.metrics.latencies].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);

    return {
      p50: this.calculatePercentile(sorted, 50),
      p95: this.calculatePercentile(sorted, 95),
      p99: this.calculatePercentile(sorted, 99),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      count: sorted.length,
    };
  }

  /**
   * Get comprehensive metrics summary
   */
  getMetricsSummary(): JobMetricsSummary {
    const totalJobs = this.metrics.jobsCompleted + this.metrics.jobsFailed + this.metrics.jobsTimedOut;
    const successRate = totalJobs > 0 
      ? (this.metrics.jobsCompleted / totalJobs) * 100 
      : 0;

    const totalErrors = Object.values(this.metrics.errorsByStatusCode)
      .reduce((sum, count) => sum + count, 0);

    return {
      jobs: {
        created: this.metrics.jobsCreated,
        completed: this.metrics.jobsCompleted,
        failed: this.metrics.jobsFailed,
        timedOut: this.metrics.jobsTimedOut,
        successRate,
      },
      store: {
        currentSize: this.metrics.storeSize,
        cleanupOperations: this.metrics.cleanupOperations,
        evictions: this.metrics.evictions,
      },
      errors: {
        total: totalErrors,
        byStatusCode: { ...this.metrics.errorsByStatusCode },
      },
      latency: this.getLatencyMetrics(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Export metrics in structured format for monitoring dashboard
   */
  exportMetrics(): JobMetricsSummary {
    return this.getMetricsSummary();
  }

  /**
   * Reset all metrics (for testing or periodic reset)
   */
  reset(): void {
    this.metrics = {
      jobsCreated: 0,
      jobsCompleted: 0,
      jobsFailed: 0,
      jobsTimedOut: 0,
      storeSize: 0,
      cleanupOperations: 0,
      evictions: 0,
      errorsByStatusCode: {},
      latencies: [],
    };
  }

  /**
   * Get raw metrics (for testing)
   */
  getRawMetrics(): JobMetrics {
    return { ...this.metrics };
  }
}

// Export singleton instance
export const jobMetrics = new JobMetricsCollector();
