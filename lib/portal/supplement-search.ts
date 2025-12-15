/**
 * Supplement Search Module (LEGO piece)
 * 
 * Handles supplement search with intelligent fallback.
 * Small, focused, testable module.
 */

import { normalizeQuery } from './query-normalization/normalizer';

export interface SearchResult {
  found: boolean;
  supplementName: string;
  normalizedName?: string;
  similarity?: number;
  source: 'legacy' | 'none';
  error?: string;
}

/**
 * Search for supplement using legacy normalization
 * 
 * @param query - User's search query
 * @returns Search result with supplement name
 */
export async function searchSupplement(query: string): Promise<SearchResult> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return {
      found: false,
      supplementName: query,
      source: 'none',
      error: 'Empty query',
    };
  }

  // Use legacy normalizer
  try {
    const normalized = normalizeQuery(trimmedQuery);

    if (normalized.confidence > 0) {
      return {
        found: true,
        supplementName: normalized.normalized,
        normalizedName: normalized.normalized,
        similarity: normalized.confidence,
        source: 'legacy',
      };
    }
  } catch (error) {
    console.error('[Search] Legacy normalizer failed:', error);
    return {
      found: false,
      supplementName: trimmedQuery,
      source: 'none',
      error: 'An unexpected error occurred during search.',
    };
  }

  // Not found in local database?
  // PERMISSIVE FALLBACK: Allow the query to proceed to the intelligent backend
  // This enables "Global/Holistic" search for any ingredient (e.g. "Cobre", "Sábila")
  // that might be known by the LLM/Weaviate but not in our static list.
  return {
    found: true,
    supplementName: trimmedQuery,
    normalizedName: trimmedQuery,
    similarity: 0.5,
    source: 'legacy',
  };
}

/**
 * Check if supplement exists (quick validation)
 */
export async function supplementExists(query: string): Promise<boolean> {
  const result = await searchSupplement(query);
  return result.found;
}
