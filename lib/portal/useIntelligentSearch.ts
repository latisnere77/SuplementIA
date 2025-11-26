/**
 * useIntelligentSearch Hook
 * 
 * React hook for intelligent supplement search with vector similarity.
 * Provides automatic fallback to legacy normalizer.
 * 
 * Features:
 * - Vector similarity search
 * - Multi-tier caching (DynamoDB + Redis + Postgres)
 * - Automatic discovery queue for unknown supplements
 * - Fallback to legacy normalizer
 * - Loading and error states
 * 
 * @example
 * ```tsx
 * const { search, result, loading, error } = useIntelligentSearch();
 * 
 * const handleSearch = async () => {
 *   await search('Equinácea');
 * };
 * ```
 */

import { useState, useCallback } from 'react';

// Feature flag - can be controlled via environment variable
const USE_INTELLIGENT_SEARCH = 
  process.env.NEXT_PUBLIC_USE_INTELLIGENT_SEARCH === 'true' ||
  process.env.NEXT_PUBLIC_ENABLE_VECTOR_SEARCH === 'true';

export interface SupplementResult {
  id: string;
  name: string;
  scientificName?: string;
  commonNames?: string[];
  metadata?: Record<string, unknown>;
  similarity?: number;
}

export interface SearchResult {
  success: boolean;
  supplement?: SupplementResult;
  similarity?: number;
  source?: 'dynamodb' | 'redis' | 'postgres' | 'discovery' | 'fallback';
  cacheHit?: boolean;
  latency?: number;
  message?: string;
  warning?: string;
  addedToDiscovery?: boolean;
}

export interface UseIntelligentSearchReturn {
  search: (query: string) => Promise<SearchResult>;
  result: SearchResult | null;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Hook for intelligent supplement search
 */
export function useIntelligentSearch(): UseIntelligentSearchReturn {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string): Promise<SearchResult> => {
    // Reset state
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Validate query
      if (!query || query.trim().length < 2) {
        throw new Error('Query too short (minimum 2 characters)');
      }

      if (query.length > 200) {
        throw new Error('Query too long (maximum 200 characters)');
      }

      const trimmedQuery = query.trim();

      // Call search API
      const endpoint = USE_INTELLIGENT_SEARCH 
        ? `/api/portal/search?q=${encodeURIComponent(trimmedQuery)}`
        : `/api/portal/search?q=${encodeURIComponent(trimmedQuery)}&fallback=true`;

      console.log(`[useIntelligentSearch] Searching: "${trimmedQuery}" (intelligent: ${USE_INTELLIGENT_SEARCH})`);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: SearchResult = await response.json();

      // Handle success
      if (response.ok && data.success) {
        console.log(`[useIntelligentSearch] Found: ${data.supplement?.name} (source: ${data.source})`);
        setResult(data);
        return data;
      }

      // Handle not found (404)
      if (response.status === 404) {
        console.log(`[useIntelligentSearch] Not found: ${trimmedQuery}`);
        setResult(data);
        return data;
      }

      // Handle service unavailable (503)
      if (response.status === 503) {
        throw new Error('Search service temporarily unavailable. Please try again.');
      }

      // Handle other errors
      throw new Error(data.message || 'Search failed');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useIntelligentSearch] Error:', errorMessage);
      setError(errorMessage);
      
      // Return error result
      const errorResult: SearchResult = {
        success: false,
        message: errorMessage,
      };
      setResult(errorResult);
      return errorResult;

    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    search,
    result,
    loading,
    error,
    reset,
  };
}

/**
 * Direct search function (without hook)
 * Useful for one-off searches or server-side usage
 */
export async function intelligentSearch(query: string): Promise<SearchResult> {
  try {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || trimmedQuery.length < 2) {
      return {
        success: false,
        message: 'Query too short (minimum 2 characters)',
      };
    }

    const endpoint = `/api/portal/search?q=${encodeURIComponent(trimmedQuery)}`;
    const response = await fetch(endpoint);
    const data: SearchResult = await response.json();

    return data;

  } catch (error) {
    console.error('[intelligentSearch] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Search failed',
    };
  }
}

/**
 * Check if intelligent search is enabled
 */
export function isIntelligentSearchEnabled(): boolean {
  return USE_INTELLIGENT_SEARCH;
}
