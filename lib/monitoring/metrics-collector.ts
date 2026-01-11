/**
 * Metrics Collector
 * Collects and tracks metrics for CloudWatch
 * Tracks latency (P50, P95, P99), cache hit rate, error rate, search patterns
 */

export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  count: number;
}

export interface CacheMetrics {
  hitRate: number;
  hits: number;
  misses: number;
  daxHits: number;
  redisHits: number;
  postgresHits: number;
}

export interface ErrorMetrics {
  errorRate: number;
  totalErrors: number;
  totalRequests: number;
  errorsByType: Record<string, number>;
}

export interface SearchPattern {
  query: string;
  count: number;
  avgLatency: number;
  lastSearched: Date;
}

class MetricsCollector {
  private latencies: number[] = [];
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private daxHits: number = 0;
  private redisHits: number = 0;
  private postgresHits: number = 0;
  private errors: number = 0;
  private requests: number = 0;
  private errorsByType: Map<string, number> = new Map();
  private searchPatterns: Map<string, SearchPattern> = new Map();
  private startTime: number = Date.now();

  /**
   * Record latency measurement
   */
  recordLatency(latencyMs: number): void {
    this.latencies.push(latencyMs);
    
    // Keep only last 10000 measurements to prevent memory issues
    if (this.latencies.length > 10000) {
      this.latencies = this.latencies.slice(-10000);
    }
  }

  /**
   * Record cache hit
   */
  recordCacheHit(source: 'dax' | 'redis' | 'postgres'): void {
    this.cacheHits++;
    
    switch (source) {
      case 'dax':
        this.daxHits++;
        break;
      case 'redis':
        this.redisHits++;
        break;
      case 'postgres':
        this.postgresHits++;
        break;
    }
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Record error
   */
  recordError(errorType: string): void {
    this.errors++;
    this.errorsByType.set(
      errorType,
      (this.errorsByType.get(errorType) || 0) + 1
    );
  }

  /**
   * Record request
   */
  recordRequest(): void {
    this.requests++;
  }

  /**
   * Record search pattern
   */
  recordSearchPattern(query: string, latency: number): void {
    const existing = this.searchPatterns.get(query);
    
    if (existing) {
      const newCount = existing.count + 1;
      const newAvgLatency = 
        (existing.avgLatency * existing.count + latency) / newCount;
      
      this.searchPatterns.set(query, {
        query,
        count: newCount,
        avgLatency: newAvgLatency,
        lastSearched: new Date(),
      });
    } else {
      this.searchPatterns.set(query, {
        query,
        count: 1,
        avgLatency: latency,
        lastSearched: new Date(),
      });
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
    if (this.latencies.length === 0) {
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

    const sorted = [...this.latencies].sort((a, b) => a - b);
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
   * Get cache metrics
   */
  getCacheMetrics(): CacheMetrics {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;

    return {
      hitRate,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      daxHits: this.daxHits,
      redisHits: this.redisHits,
      postgresHits: this.postgresHits,
    };
  }

  /**
   * Get error metrics
   */
  getErrorMetrics(): ErrorMetrics {
    const errorRate = this.requests > 0 ? (this.errors / this.requests) * 100 : 0;

    return {
      errorRate,
      totalErrors: this.errors,
      totalRequests: this.requests,
      errorsByType: Object.fromEntries(this.errorsByType),
    };
  }

  /**
   * Get top search patterns
   */
  getTopSearchPatterns(limit: number = 10): SearchPattern[] {
    return Array.from(this.searchPatterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    return {
      latency: this.getLatencyMetrics(),
      cache: this.getCacheMetrics(),
      errors: this.getErrorMetrics(),
      topSearches: this.getTopSearchPatterns(),
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset metrics (for testing or periodic reset)
   */
  reset(): void {
    this.latencies = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.daxHits = 0;
    this.redisHits = 0;
    this.postgresHits = 0;
    this.errors = 0;
    this.requests = 0;
    this.errorsByType.clear();
    this.searchPatterns.clear();
    this.startTime = Date.now();
  }

  /**
   * Export metrics for CloudWatch
   */
  exportForCloudWatch() {
    const metrics = this.getAllMetrics();
    
    return {
      namespace: 'IntelligentSupplementSearch',
      metrics: [
        {
          name: 'Latency_P50',
          value: metrics.latency.p50,
          unit: 'Milliseconds',
        },
        {
          name: 'Latency_P95',
          value: metrics.latency.p95,
          unit: 'Milliseconds',
        },
        {
          name: 'Latency_P99',
          value: metrics.latency.p99,
          unit: 'Milliseconds',
        },
        {
          name: 'CacheHitRate',
          value: metrics.cache.hitRate,
          unit: 'Percent',
        },
        {
          name: 'ErrorRate',
          value: metrics.errors.errorRate,
          unit: 'Percent',
        },
        {
          name: 'RequestCount',
          value: metrics.errors.totalRequests,
          unit: 'Count',
        },
      ],
      timestamp: metrics.timestamp,
    };
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();
