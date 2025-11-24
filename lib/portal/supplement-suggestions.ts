/**
 * Intelligent Supplement Suggestions System
 * 
 * Provides fuzzy search and smart suggestions when exact matches aren't found
 * Helps users find what they're looking for even with typos or variations
 */

import Fuse from 'fuse.js';
import { SUPPLEMENT_MAPPINGS, SupplementMapping } from './supplement-mappings';

export interface SupplementSuggestion {
  name: string;
  displayName: string;
  confidence: number;
  mapping: SupplementMapping;
  reason: 'exact' | 'fuzzy' | 'alias' | 'scientific';
}

export interface SuggestionResult {
  found: boolean;
  exactMatch: boolean;
  suggestions: SupplementSuggestion[];
  query: string;
}

/**
 * Configure fuzzy search with optimal settings
 */
function createFuseInstance() {
  const allSupplements = Object.values(SUPPLEMENT_MAPPINGS);
  
  return new Fuse(allSupplements, {
    keys: [
      { name: 'normalizedName', weight: 2.0 },      // Highest priority
      { name: 'commonNames', weight: 1.5 },         // High priority
      { name: 'scientificName', weight: 1.0 },      // Medium priority
    ],
    threshold: 0.4,           // 60% similarity minimum
    distance: 100,            // Maximum distance for fuzzy matching
    includeScore: true,
    minMatchCharLength: 3,    // Minimum 3 characters to match
    ignoreLocation: true,     // Search anywhere in the string
  });
}

/**
 * Find supplement suggestions for a query
 * Returns exact matches first, then fuzzy matches
 */
export function suggestSupplementCorrection(query: string): SuggestionResult {
  if (!query || query.trim().length < 2) {
    return {
      found: false,
      exactMatch: false,
      suggestions: [],
      query,
    };
  }

  const normalizedQuery = query.trim().toLowerCase();
  const allSupplements = Object.values(SUPPLEMENT_MAPPINGS);
  
  // 1. Check for exact match (case-insensitive)
  const exactMatch = allSupplements.find(
    s => s.normalizedName.toLowerCase() === normalizedQuery
  );
  
  if (exactMatch) {
    return {
      found: true,
      exactMatch: true,
      suggestions: [{
        name: exactMatch.normalizedName,
        displayName: exactMatch.normalizedName,
        confidence: 1.0,
        mapping: exactMatch,
        reason: 'exact',
      }],
      query,
    };
  }
  
  // 2. Check for alias match
  const aliasMatch = allSupplements.find(s =>
    s.commonNames.some(alias => alias.toLowerCase() === normalizedQuery)
  );
  
  if (aliasMatch) {
    return {
      found: true,
      exactMatch: true,
      suggestions: [{
        name: aliasMatch.normalizedName,
        displayName: aliasMatch.normalizedName,
        confidence: 0.95,
        mapping: aliasMatch,
        reason: 'alias',
      }],
      query,
    };
  }
  
  // 3. Fuzzy search for similar matches
  const fuse = createFuseInstance();
  const results = fuse.search(query);
  
  if (results.length === 0) {
    return {
      found: false,
      exactMatch: false,
      suggestions: [],
      query,
    };
  }
  
  // Convert results to suggestions
  const suggestions: SupplementSuggestion[] = results
    .slice(0, 5) // Top 5 suggestions
    .map(result => ({
      name: result.item.normalizedName,
      displayName: result.item.normalizedName,
      confidence: 1 - (result.score || 0),
      mapping: result.item,
      reason: 'fuzzy' as const,
    }))
    .filter(s => s.confidence >= 0.5); // Only show if >50% confidence
  
  return {
    found: suggestions.length > 0,
    exactMatch: false,
    suggestions,
    query,
  };
}

/**
 * Get popular supplements by category
 * Useful for showing alternatives or recommendations
 */
export function getPopularSupplementsByCategory(
  category: SupplementMapping['category'],
  limit = 5
): SupplementMapping[] {
  return Object.values(SUPPLEMENT_MAPPINGS)
    .filter(s => s.category === category && s.popularity === 'high')
    .slice(0, limit);
}

/**
 * Get related supplements based on category and use case
 */
export function getRelatedSupplements(
  supplement: SupplementMapping,
  limit = 3
): SupplementMapping[] {
  return Object.values(SUPPLEMENT_MAPPINGS)
    .filter(s => 
      s.normalizedName !== supplement.normalizedName &&
      s.category === supplement.category &&
      s.popularity !== 'low'
    )
    .slice(0, limit);
}

/**
 * Check if a query is likely a typo or misspelling
 */
export function isLikelyTypo(query: string): boolean {
  const suggestions = suggestSupplementCorrection(query);
  
  // If we have high-confidence suggestions, it's likely a typo
  return !suggestions.exactMatch && 
         suggestions.suggestions.length > 0 &&
         suggestions.suggestions[0].confidence > 0.8;
}

/**
 * Get the best suggestion for a query
 * Returns null if no good suggestion exists
 */
export function getBestSuggestion(query: string): SupplementSuggestion | null {
  const result = suggestSupplementCorrection(query);
  
  if (!result.found || result.suggestions.length === 0) {
    return null;
  }
  
  const best = result.suggestions[0];
  
  // Only return if confidence is high enough
  return best.confidence >= 0.6 ? best : null;
}

/**
 * Get multiple intelligent suggestions for a query
 * Returns array of suggestions with scores
 * 
 * @param query - The search query
 * @param limit - Maximum number of suggestions to return (default: 6)
 * @returns Array of supplement suggestions
 */
export function getSuggestions(query: string, limit = 6): SupplementSuggestion[] {
  const result = suggestSupplementCorrection(query);
  return result.suggestions.slice(0, limit);
}
