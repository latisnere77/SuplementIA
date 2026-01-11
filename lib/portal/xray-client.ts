/**
 * X-Ray Tracing Client
 * Unified tracing for frontend (Performance API) and backend (AWS X-Ray)
 */

export type TraceStage =
  | 'search-start'
  | 'query-normalized'
  | 'suggestions-generated'
  | 'api-request-start'
  | 'api-request-complete'
  | 'results-rendered';

export interface TraceMetadata {
  query?: string;
  normalized?: string;
  variations?: string[];
  studiesFound?: number;
  suggestionOffered?: string;
  [key: string]: any;
}

/**
 * Trace a search event
 * Frontend: Uses Performance API
 * Backend: Uses AWS X-Ray (placeholder for future)
 */
export function traceSearch(
  query: string,
  stage: TraceStage,
  metadata?: TraceMetadata
): void {
  // Frontend tracing with Performance API
  if (typeof window !== 'undefined' && window.performance) {
    const markName = `${stage}-${query.substring(0, 20)}`;

    try {
      performance.mark(markName);

      // Store metadata in sessionStorage for debugging
      if (metadata) {
        const storageKey = `trace_${markName}`;
        sessionStorage.setItem(storageKey, JSON.stringify({
          timestamp: Date.now(),
          stage,
          query,
          ...metadata
        }));
      }

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Trace] ${stage}:`, {
          query,
          ...metadata
        });
      }
    } catch (error) {
      // Silently fail - tracing is non-critical
      console.warn('[Trace] Failed to record trace:', error);
    }
  }

  // Backend tracing with AWS X-Ray (for future Lambda integration)
  // Note: Actual X-Ray integration will be in Lambda functions
  if (typeof window === 'undefined') {
    // Server-side: Just log for now
    console.log(`[ServerTrace] ${stage}:`, {
      query,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Get all traces for a query (debugging tool)
 */
export function getQueryTraces(query: string): Array<{
  stage: string;
  timestamp: number;
  metadata: any;
}> {
  if (typeof window === 'undefined') return [];

  const traces: Array<any> = [];
  const querySubstring = query.substring(0, 20);

  // Search sessionStorage for all traces matching this query
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith('trace_') && key.includes(querySubstring)) {
      try {
        const data = sessionStorage.getItem(key);
        if (data) {
          traces.push(JSON.parse(data));
        }
      } catch (error) {
        console.warn('[Trace] Failed to parse trace:', error);
      }
    }
  }

  return traces.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Clear old traces (cleanup)
 */
export function clearOldTraces(olderThanMs: number = 3600000): void {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  const keysToRemove: string[] = [];

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith('trace_')) {
      try {
        const data = sessionStorage.getItem(key);
        if (data) {
          const trace = JSON.parse(data);
          if (now - trace.timestamp > olderThanMs) {
            keysToRemove.push(key);
          }
        }
      } catch (error) {
        // Remove corrupted traces
        if (key) keysToRemove.push(key);
      }
    }
  }

  keysToRemove.forEach(key => sessionStorage.removeItem(key));

  if (keysToRemove.length > 0) {
    console.log(`[Trace] Cleaned up ${keysToRemove.length} old traces`);
  }
}

/**
 * Measure duration between two stages
 */
export function measureTraceDuration(
  startStage: TraceStage,
  endStage: TraceStage,
  query: string
): number | null {
  if (typeof window === 'undefined') return null;

  try {
    const querySubstring = query.substring(0, 20);
    const startMark = `${startStage}-${querySubstring}`;
    const endMark = `${endStage}-${querySubstring}`;

    const measureName = `${startStage}-to-${endStage}`;
    performance.measure(measureName, startMark, endMark);

    const measures = performance.getEntriesByName(measureName);
    if (measures.length > 0) {
      return measures[measures.length - 1].duration;
    }
  } catch (error) {
    // Marks don't exist or other error
    console.warn('[Trace] Failed to measure duration:', error);
  }

  return null;
}

/**
 * Export traces for analysis (debugging)
 */
export function exportTraces(): string {
  if (typeof window === 'undefined') return '[]';

  const traces: any[] = [];

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith('trace_')) {
      try {
        const data = sessionStorage.getItem(key);
        if (data) {
          traces.push(JSON.parse(data));
        }
      } catch (error) {
        // Skip corrupted traces
      }
    }
  }

  return JSON.stringify(traces.sort((a, b) => a.timestamp - b.timestamp), null, 2);
}

// Auto-cleanup on module load
if (typeof window !== 'undefined') {
  // Clear traces older than 1 hour on load
  clearOldTraces(3600000);
}
