/**
 * Fast Lookup Service
 * 
 * Provides instant supplement information using pre-calculated mappings.
 * Falls back to full enrichment if no mapping exists.
 * 
 * Performance:
 * - With mapping: < 100ms (instant)
 * - Without mapping: 30-60s (full PubMed search)
 * 
 * Usage:
 * ```typescript
 * const result = await fastLookup('reishi');
 * if (result.cached) {
 *   // Instant response!
 * } else {
 *   // Fallback to full enrichment
 * }
 * ```
 */

import { normalizeQuery } from './query-normalization';
import { getSupplementMapping, hasMapping, getOptimizedPubMedQuery } from './supplement-mappings';

export interface FastLookupResult {
  // Status
  success: boolean;
  cached: boolean; // true = instant response, false = needs full enrichment
  
  // Data
  normalizedName: string;
  scientificName?: string;
  commonNames: string[];
  
  // PubMed optimization hints
  pubmedQuery?: string;
  pubmedFilters?: {
    yearFrom?: number;
    rctOnly?: boolean;
    maxStudies?: number;
  };
  
  // Pre-calculated data (if available)
  cachedData?: {
    lastUpdated: string;
    studyCount: number;
    evidenceGrade: 'A' | 'B' | 'C' | 'D';
    primaryUses: string[];
    safetyProfile: 'safe' | 'caution' | 'unsafe';
  };
  
  // Metadata
  category?: string;
  popularity?: 'high' | 'medium' | 'low';
  
  // Performance metrics
  lookupTime: number; // milliseconds
}

/**
 * Fast lookup for supplement information
 * 
 * @param query - User's search query (can be in Spanish, with typos, etc.)
 * @returns FastLookupResult with instant data or enrichment hints
 */
export async function fastLookup(query: string): Promise<FastLookupResult> {
  const startTime = Date.now();
  
  // Step 1: Normalize query (Spanish→English, typo correction)
  const normalized = normalizeQuery(query);
  const normalizedName = normalized.normalized;
  
  // Step 2: Check if we have a pre-calculated mapping
  const mapping = getSupplementMapping(normalizedName);
  
  if (mapping) {
    // ✅ CACHE HIT - Instant response!
    return {
      success: true,
      cached: true,
      normalizedName: mapping.normalizedName,
      scientificName: mapping.scientificName,
      commonNames: mapping.commonNames,
      pubmedQuery: mapping.pubmedQuery,
      pubmedFilters: mapping.pubmedFilters,
      cachedData: mapping.cachedData,
      category: mapping.category,
      popularity: mapping.popularity,
      lookupTime: Date.now() - startTime,
    };
  }
  
  // ❌ CACHE MISS - Need full enrichment
  // But we can still provide optimization hints
  return {
    success: true,
    cached: false,
    normalizedName,
    commonNames: [normalizedName],
    pubmedQuery: getOptimizedPubMedQuery(normalizedName),
    pubmedFilters: {
      yearFrom: 2010,
      rctOnly: false,
      maxStudies: 10,
    },
    lookupTime: Date.now() - startTime,
  };
}

/**
 * Check if a query can be served instantly (has mapping)
 * 
 * @param query - User's search query
 * @returns true if instant response available, false if needs full enrichment
 */
export function canServeInstantly(query: string): boolean {
  const normalized = normalizeQuery(query);
  return hasMapping(normalized.normalized);
}

/**
 * Get optimized enrichment parameters for a query
 * Uses mapping hints if available, falls back to defaults
 * 
 * @param query - User's search query
 * @returns Optimized parameters for enrichment API
 */
export function getOptimizedEnrichmentParams(query: string): {
  supplementName: string;
  pubmedQuery?: string;
  yearFrom?: number;
  rctOnly?: boolean;
  maxStudies?: number;
} {
  const normalized = normalizeQuery(query);
  const mapping = getSupplementMapping(normalized.normalized);
  
  if (mapping) {
    return {
      supplementName: mapping.normalizedName,
      pubmedQuery: mapping.pubmedQuery,
      yearFrom: mapping.pubmedFilters?.yearFrom || 2010,
      rctOnly: mapping.pubmedFilters?.rctOnly || false,
      maxStudies: mapping.pubmedFilters?.maxStudies || 10,
    };
  }
  
  // Fallback to defaults
  return {
    supplementName: normalized.normalized,
    yearFrom: 2010,
    rctOnly: false,
    maxStudies: 10,
  };
}

/**
 * Batch lookup for multiple supplements
 * Useful for autocomplete or multi-supplement queries
 * 
 * @param queries - Array of user queries
 * @returns Array of lookup results
 */
export async function batchFastLookup(queries: string[]): Promise<FastLookupResult[]> {
  const results = await Promise.all(
    queries.map(query => fastLookup(query))
  );
  
  return results;
}

/**
 * Get cache statistics
 * Useful for monitoring and optimization
 */
export function getCacheStats(): {
  totalMappings: number;
  highPriority: number;
  byCategory: Record<string, number>;
  cacheHitRate?: number; // Would need to track hits/misses in production
} {
  const { SUPPLEMENT_MAPPINGS } = require('./supplement-mappings');
  const mappings = Object.values(SUPPLEMENT_MAPPINGS);
  
  const stats = {
    totalMappings: mappings.length,
    highPriority: mappings.filter((m: any) => m.popularity === 'high').length,
    byCategory: {} as Record<string, number>,
  };
  
  // Count by category
  mappings.forEach((m: any) => {
    stats.byCategory[m.category] = (stats.byCategory[m.category] || 0) + 1;
  });
  
  return stats;
}
