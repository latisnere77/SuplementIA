/**
 * Search Analytics Service
 * Tracks search queries, failures, and suggestion acceptance
 *
 * Purpose:
 * - Monitor which searches fail (404)
 * - Track suggestion acceptance rate
 * - Identify popular searches
 * - Alert on patterns of failures
 *
 * Design:
 * - Asynchronous (non-blocking)
 * - Batching (sends every 100 events)
 * - Client-side only (no server dependencies)
 * - Privacy-focused (no PII)
 */

export interface SearchEvent {
  /** Search query */
  query: string;
  /** Normalized query (if normalization was used) */
  normalizedQuery?: string;
  /** Timestamp */
  timestamp: number;
  /** Search was successful */
  success: boolean;
  /** Number of studies found */
  studiesFound: number;
  /** Suggestions offered to user */
  suggestionsOffered: string[];
  /** User accepted a suggestion */
  userAcceptedSuggestion?: boolean;
  /** Which suggestion was accepted */
  acceptedSuggestion?: string;
  /** Error type (if failed) */
  errorType?: 'insufficient_data' | 'backend_error' | 'timeout' | 'validation_error';
  /** Request ID (for tracing) */
  requestId?: string;
}

export interface AnalyticsBatch {
  events: SearchEvent[];
  batchId: string;
  timestamp: number;
  userAgent: string;
}

class SearchAnalyticsService {
  private buffer: SearchEvent[] = [];
  private readonly BATCH_SIZE = 100;
  private readonly ENDPOINT = '/api/portal/analytics';
  private readonly FLUSH_INTERVAL = 60000; // 1 minute
  private flushTimer: NodeJS.Timeout | null = null;
  private enabled: boolean = true;

  constructor() {
    // Auto-flush every minute
    if (typeof window !== 'undefined') {
      this.flushTimer = setInterval(() => this.flush(), this.FLUSH_INTERVAL);

      // Flush on page unload
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  /**
   * Log a search event
   */
  async logSearch(event: SearchEvent): Promise<void> {
    if (!this.enabled) return;

    // Add to buffer
    this.buffer.push(event);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Search event:', {
        query: event.query,
        success: event.success,
        studiesFound: event.studiesFound,
      });
    }

    // Flush if batch size reached
    if (this.buffer.length >= this.BATCH_SIZE) {
      await this.flush();
    }
  }

  /**
   * Log a successful search
   * Supports two signatures for backwards compatibility:
   * - logSuccess(query, normalizedQuery, hadMapping, usedFallback) - legacy
   * - logSuccess(query, { normalizedQuery, studiesFound, requestId }) - new
   */
  logSuccess(
    query: string,
    optionsOrNormalizedQuery?: string | { normalizedQuery?: string; studiesFound?: number; requestId?: string },
    _hadMapping?: boolean,
    _usedFallback?: boolean
  ): void {
    // Handle legacy signature: (query, normalizedQuery, hadMapping, usedFallback)
    if (typeof optionsOrNormalizedQuery === 'string' || optionsOrNormalizedQuery === undefined) {
      this.logSearch({
        query,
        normalizedQuery: optionsOrNormalizedQuery,
        timestamp: Date.now(),
        success: true,
        studiesFound: 0,
        suggestionsOffered: [],
      });
      return;
    }

    // Handle new signature: (query, options)
    const options = optionsOrNormalizedQuery;
    this.logSearch({
      query,
      normalizedQuery: options.normalizedQuery,
      timestamp: Date.now(),
      success: true,
      studiesFound: options.studiesFound || 0,
      suggestionsOffered: [],
      requestId: options.requestId,
    });
  }

  /**
   * Log a failed search
   * Supports two signatures for backwards compatibility:
   * - logFailure(query, normalizedQuery, suggestions) - legacy
   * - logFailure(query, { normalizedQuery, errorType, suggestionsOffered, requestId }) - new
   */
  logFailure(
    query: string,
    optionsOrNormalizedQuery?: string | {
      normalizedQuery?: string;
      errorType?: SearchEvent['errorType'];
      suggestionsOffered?: string[];
      requestId?: string;
    },
    suggestions?: string[]
  ): void {
    // Handle legacy signature: (query, normalizedQuery, suggestions)
    if (typeof optionsOrNormalizedQuery === 'string' || optionsOrNormalizedQuery === undefined) {
      this.logSearch({
        query,
        normalizedQuery: optionsOrNormalizedQuery,
        timestamp: Date.now(),
        success: false,
        studiesFound: 0,
        suggestionsOffered: suggestions || [],
        errorType: 'insufficient_data',
      });
      return;
    }

    // Handle new signature: (query, options)
    const options = optionsOrNormalizedQuery;
    this.logSearch({
      query,
      normalizedQuery: options.normalizedQuery,
      timestamp: Date.now(),
      success: false,
      studiesFound: 0,
      suggestionsOffered: options.suggestionsOffered || [],
      errorType: options.errorType || 'insufficient_data',
      requestId: options.requestId,
    });
  }

  /**
   * Log suggestion acceptance
   */
  async logSuggestionAccepted(
    originalQuery: string,
    acceptedSuggestion: string,
    requestId?: string
  ): Promise<void> {
    // Find the original event in buffer
    const originalEvent = this.buffer.find(e => e.query === originalQuery);
    if (originalEvent) {
      originalEvent.userAcceptedSuggestion = true;
      originalEvent.acceptedSuggestion = acceptedSuggestion;
    } else {
      // Create new event
      await this.logSearch({
        query: originalQuery,
        timestamp: Date.now(),
        success: false,
        studiesFound: 0,
        suggestionsOffered: [acceptedSuggestion],
        userAcceptedSuggestion: true,
        acceptedSuggestion,
        requestId,
      });
    }
  }

  /**
   * Flush buffer to backend
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch: AnalyticsBatch = {
      events: [...this.buffer],
      batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };

    // Clear buffer immediately
    this.buffer = [];

    try {
      // Send to backend (non-blocking)
      const response = await fetch(this.ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        console.warn('[Analytics] Failed to send batch:', response.status);
      } else if (process.env.NODE_ENV === 'development') {
        console.log('[Analytics] Batch sent successfully:', {
          events: batch.events.length,
          batchId: batch.batchId,
        });
      }
    } catch (error) {
      console.warn('[Analytics] Failed to send analytics:', error);
      // Don't throw - analytics is non-critical
    }
  }

  /**
   * Get buffered events (for debugging)
   */
  getBuffer(): SearchEvent[] {
    return [...this.buffer];
  }

  /**
   * Clear buffer
   */
  clearBuffer(): void {
    this.buffer = [];
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get analytics summary from buffer
   */
  getSummary(): {
    totalSearches: number;
    successRate: number;
    failureRate: number;
    topFailures: Array<{ query: string; count: number }>;
    suggestionAcceptanceRate: number;
  } {
    const total = this.buffer.length;
    if (total === 0) {
      return {
        totalSearches: 0,
        successRate: 0,
        failureRate: 0,
        topFailures: [],
        suggestionAcceptanceRate: 0,
      };
    }

    const successful = this.buffer.filter(e => e.success).length;
    const failed = total - successful;

    // Count failures by query
    const failureCounts = new Map<string, number>();
    this.buffer.filter(e => !e.success).forEach(e => {
      failureCounts.set(e.query, (failureCounts.get(e.query) || 0) + 1);
    });

    const topFailures = Array.from(failureCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Suggestion acceptance rate
    const withSuggestions = this.buffer.filter(e => e.suggestionsOffered.length > 0).length;
    const accepted = this.buffer.filter(e => e.userAcceptedSuggestion).length;
    const suggestionAcceptanceRate = withSuggestions > 0 ? accepted / withSuggestions : 0;

    return {
      totalSearches: total,
      successRate: successful / total,
      failureRate: failed / total,
      topFailures,
      suggestionAcceptanceRate,
    };
  }

  /**
   * Cleanup (call on unmount)
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush(); // Final flush
  }
}

// Singleton instance
export const searchAnalytics = new SearchAnalyticsService();

// Auto-cleanup on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('unload', () => searchAnalytics.destroy());
}
