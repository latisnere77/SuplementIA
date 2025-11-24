/**
 * Search Analytics System
 * 
 * Tracks search patterns, failures, and user behavior to improve the system
 * Helps identify gaps in supplement mappings and normalization rules
 */

export interface SearchEvent {
  query: string;
  normalizedQuery: string;
  timestamp: string;
  success: boolean;
  hadMapping: boolean;
  usedFallback: boolean;
  suggestions?: string[];
  userAgent?: string;
  sessionId?: string;
}

export interface FailedSearch {
  query: string;
  normalizedQuery: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  suggestions: string[];
}

/**
 * In-memory storage for analytics (replace with database in production)
 */
class SearchAnalyticsStore {
  private events: SearchEvent[] = [];
  private failedSearches: Map<string, FailedSearch> = new Map();
  private readonly MAX_EVENTS = 1000; // Keep last 1000 events in memory

  /**
   * Log a successful search
   */
  logSuccess(query: string, normalizedQuery: string, hadMapping: boolean, usedFallback: boolean) {
    const event: SearchEvent = {
      query,
      normalizedQuery,
      timestamp: new Date().toISOString(),
      success: true,
      hadMapping,
      usedFallback,
    };

    this.addEvent(event);

    // Log to console for monitoring
    if (usedFallback) {
      console.log(`📊 [Analytics] Fallback used for: "${query}" → "${normalizedQuery}"`);
    }
  }

  /**
   * Log a failed search
   */
  logFailure(query: string, normalizedQuery: string, suggestions: string[] = []) {
    const event: SearchEvent = {
      query,
      normalizedQuery,
      timestamp: new Date().toISOString(),
      success: false,
      hadMapping: false,
      usedFallback: false,
      suggestions,
    };

    this.addEvent(event);

    // Update failed searches map
    const key = normalizedQuery.toLowerCase();
    const existing = this.failedSearches.get(key);

    if (existing) {
      existing.count++;
      existing.lastSeen = event.timestamp;
      if (suggestions.length > 0) {
        existing.suggestions = suggestions;
      }
    } else {
      this.failedSearches.set(key, {
        query,
        normalizedQuery,
        count: 1,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        suggestions,
      });
    }

    // Log to console for immediate visibility
    console.warn(`⚠️ [Analytics] Failed search: "${query}" → "${normalizedQuery}"`, {
      suggestions: suggestions.length > 0 ? suggestions : 'none',
    });
  }

  /**
   * Add event to store with size limit
   */
  private addEvent(event: SearchEvent) {
    this.events.push(event);

    // Keep only last MAX_EVENTS
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }
  }

  /**
   * Get top failed searches
   */
  getTopFailedSearches(limit = 10): FailedSearch[] {
    return Array.from(this.failedSearches.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get recent search events
   */
  getRecentEvents(limit = 50): SearchEvent[] {
    return this.events.slice(-limit).reverse();
  }

  /**
   * Get search statistics
   */
  getStatistics() {
    const total = this.events.length;
    const successful = this.events.filter(e => e.success).length;
    const failed = this.events.filter(e => !e.success).length;
    const usedFallback = this.events.filter(e => e.usedFallback).length;

    return {
      total,
      successful,
      failed,
      usedFallback,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      fallbackRate: total > 0 ? (usedFallback / total) * 100 : 0,
      uniqueFailedSearches: this.failedSearches.size,
    };
  }

  /**
   * Get searches that need mappings
   * Returns failed searches with high frequency
   */
  getSearchesNeedingMappings(minCount = 3): FailedSearch[] {
    return Array.from(this.failedSearches.values())
      .filter(fs => fs.count >= minCount)
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Clear all analytics data
   */
  clear() {
    this.events = [];
    this.failedSearches.clear();
  }

  /**
   * Export analytics data for analysis
   */
  exportData() {
    return {
      events: this.events,
      failedSearches: Array.from(this.failedSearches.values()),
      statistics: this.getStatistics(),
      exportedAt: new Date().toISOString(),
    };
  }
}

/**
 * Global analytics instance
 */
export const searchAnalytics = new SearchAnalyticsStore();

/**
 * Helper to log search with automatic success/failure detection
 */
export function logSearch(
  query: string,
  normalizedQuery: string,
  hadMapping: boolean,
  usedFallback: boolean,
  suggestions: string[] = []
) {
  if (hadMapping || usedFallback) {
    searchAnalytics.logSuccess(query, normalizedQuery, hadMapping, usedFallback);
  } else {
    searchAnalytics.logFailure(query, normalizedQuery, suggestions);
  }
}

/**
 * Generate analytics report
 */
export function generateAnalyticsReport(): string {
  const stats = searchAnalytics.getStatistics();
  const topFailed = searchAnalytics.getTopFailedSearches(10);
  const needMappings = searchAnalytics.getSearchesNeedingMappings(3);

  let report = '📊 SEARCH ANALYTICS REPORT\n';
  report += '='.repeat(80) + '\n\n';

  report += '📈 STATISTICS:\n';
  report += `  Total Searches: ${stats.total}\n`;
  report += `  Successful: ${stats.successful} (${stats.successRate.toFixed(1)}%)\n`;
  report += `  Failed: ${stats.failed}\n`;
  report += `  Used Fallback: ${stats.usedFallback} (${stats.fallbackRate.toFixed(1)}%)\n`;
  report += `  Unique Failed Searches: ${stats.uniqueFailedSearches}\n\n`;

  if (topFailed.length > 0) {
    report += '❌ TOP FAILED SEARCHES:\n';
    topFailed.forEach((fs, i) => {
      report += `  ${i + 1}. "${fs.query}" (${fs.count}x)\n`;
      report += `     Normalized: "${fs.normalizedQuery}"\n`;
      if (fs.suggestions.length > 0) {
        report += `     Suggestions: ${fs.suggestions.join(', ')}\n`;
      }
    });
    report += '\n';
  }

  if (needMappings.length > 0) {
    report += '🔧 SEARCHES NEEDING MAPPINGS (≥3 occurrences):\n';
    needMappings.forEach((fs, i) => {
      report += `  ${i + 1}. "${fs.normalizedQuery}" (${fs.count}x)\n`;
    });
    report += '\n';
  }

  report += '='.repeat(80) + '\n';

  return report;
}
