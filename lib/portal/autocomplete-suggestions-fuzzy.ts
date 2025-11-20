/**
 * Fuzzy Autocomplete with Fuse.js + PubMed Fallback
 * Hybrid approach: Fast local search with PubMed validation for unknown supplements
 */

import Fuse, { IFuseOptions } from 'fuse.js';
import type { SupplementEntry } from './supplements-database';
import { SUPPLEMENTS_DATABASE } from './supplements-database';

export type Language = 'en' | 'es';

// PubMed fallback configuration
const PUBMED_API_URL = process.env.STUDIES_API_URL || 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';
const FALLBACK_SCORE_THRESHOLD = 60; // Use PubMed if local score < 60%
const PUBMED_CACHE_TTL = 3600000; // 1 hour cache

// In-memory cache for PubMed lookups
interface CacheEntry {
  exists: boolean;
  timestamp: number;
  studyCount?: number;
}

const pubmedCache = new Map<string, CacheEntry>();

export interface AutocompleteSuggestion {
  text: string;
  type: 'supplement' | 'condition' | 'category';
  score: number;
  category?: string;
  healthConditions?: string[];
}

/**
 * Fuse.js configuration for fuzzy search
 * - threshold: 0.4 = moderate tolerance to typos (0 = exact match, 1 = match anything)
 * - distance: 100 = how far to search for a match
 * - keys: fields to search in (name, aliases, healthConditions)
 */
const fuseOptions: IFuseOptions<SupplementEntry> = {
  keys: [
    { name: 'name', weight: 0.5 },           // Name has highest weight
    { name: 'aliases', weight: 0.3 },        // Aliases are important for typos
    { name: 'healthConditions', weight: 0.2 } // Health conditions have lower weight
  ],
  threshold: 0.4,         // 0.4 = moderate typo tolerance
  distance: 100,          // Distance for fuzzy matching
  includeScore: true,     // Include score in results
  minMatchCharLength: 2,  // Minimum 2 characters to match
  ignoreLocation: true,   // Don't consider location in string
};

// Create Fuse instances for each language (cached)
const fuseInstances: Record<Language, Fuse<SupplementEntry>> = {
  en: new Fuse(
    SUPPLEMENTS_DATABASE.filter(entry => entry.language === 'en'),
    fuseOptions
  ),
  es: new Fuse(
    SUPPLEMENTS_DATABASE.filter(entry => entry.language === 'es'),
    fuseOptions
  ),
};

/**
 * Check if a supplement exists in PubMed (with caching)
 *
 * @param query - Supplement name to check
 * @returns Promise<boolean> - true if supplement has studies in PubMed
 */
async function checkPubMedExists(query: string): Promise<boolean> {
  const cacheKey = query.toLowerCase().trim();

  // Check cache first
  const cached = pubmedCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < PUBMED_CACHE_TTL) {
    return cached.exists;
  }

  try {
    // Quick PubMed search (max 1 result to check existence)
    const response = await fetch(PUBMED_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: query,
        maxResults: 1,
      }),
      signal: AbortSignal.timeout(5000), // 5s timeout (PubMed can be slow)
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const exists = data.success && data.data?.totalFound > 0;

    // Cache the result
    pubmedCache.set(cacheKey, {
      exists,
      timestamp: Date.now(),
      studyCount: data.data?.totalFound || 0,
    });

    return exists;
  } catch (error) {
    // On error, don't cache and return false
    console.warn('PubMed fallback failed:', error);
    return false;
  }
}

/**
 * Get fuzzy autocomplete suggestions with PubMed fallback
 *
 * @param query - User's search query
 * @param lang - Language (en or es)
 * @param limit - Maximum number of suggestions to return
 * @returns Promise<Array> of suggestions with scores
 *
 * @example
 * ```typescript
 * // Typo tolerance (from local DB)
 * await getSuggestions('ashwaghanda', 'en', 5); // Returns "Ashwagandha"
 *
 * // PubMed fallback for unknown supplements
 * await getSuggestions('aloe vera', 'en', 5); // Checks PubMed, returns "Aloe Vera"
 *
 * // Partial match (from local DB)
 * await getSuggestions('vitam', 'es', 5); // Returns vitamins
 * ```
 */
export async function getSuggestions(
  query: string,
  lang: Language = 'en',
  limit: number = 5
): Promise<AutocompleteSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const normalizedQuery = query.trim();

  // Get Fuse instance for language
  const fuse = fuseInstances[lang];

  // Perform fuzzy search in local database
  const results = fuse.search(normalizedQuery, { limit });

  // Transform results to AutocompleteSuggestion format
  const suggestions: AutocompleteSuggestion[] = results.map(result => {
    const item = result.item;
    const score = result.score !== undefined ? (1 - result.score) * 100 : 50;

    // Determine type
    let type: 'supplement' | 'condition' | 'category';
    if (item.category === 'condition') {
      type = 'condition';
    } else if (item.category === 'herb' || item.category === 'vitamin' || item.category === 'mineral') {
      type = 'category';
    } else {
      type = 'supplement';
    }

    return {
      text: item.name,
      type,
      score,
      category: item.category,
      healthConditions: item.healthConditions,
    };
  });

  // Sort by score (descending)
  suggestions.sort((a, b) => b.score - a.score);

  // Check if we should use PubMed fallback
  const bestScore = suggestions[0]?.score || 0;
  const shouldUseFallback = suggestions.length === 0 || bestScore < FALLBACK_SCORE_THRESHOLD;

  if (shouldUseFallback && normalizedQuery.length >= 3) {
    // Try PubMed fallback for supplements not in local database
    const existsInPubMed = await checkPubMedExists(normalizedQuery);

    if (existsInPubMed) {
      // Add as a validated supplement from PubMed
      const pubmedSuggestion: AutocompleteSuggestion = {
        text: capitalizeWords(normalizedQuery),
        type: 'supplement',
        score: 85, // Good score but not perfect (since it's not in our curated DB)
        category: 'other',
        healthConditions: [],
      };

      // Insert at appropriate position based on score
      suggestions.push(pubmedSuggestion);
      suggestions.sort((a, b) => b.score - a.score);
    }
  }

  return suggestions.slice(0, limit);
}

/**
 * Synchronous version of getSuggestions (for backwards compatibility)
 * Only searches local database without PubMed fallback
 */
export function getSuggestionsSync(
  query: string,
  lang: Language = 'en',
  limit: number = 5
): AutocompleteSuggestion[] {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const fuse = fuseInstances[lang];
  const results = fuse.search(query, { limit });

  const suggestions: AutocompleteSuggestion[] = results.map(result => {
    const item = result.item;
    const score = result.score !== undefined ? (1 - result.score) * 100 : 50;

    let type: 'supplement' | 'condition' | 'category';
    if (item.category === 'condition') {
      type = 'condition';
    } else if (item.category === 'herb' || item.category === 'vitamin' || item.category === 'mineral') {
      type = 'category';
    } else {
      type = 'supplement';
    }

    return {
      text: item.name,
      type,
      score,
      category: item.category,
      healthConditions: item.healthConditions,
    };
  });

  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, limit);
}

/**
 * Helper: Capitalize first letter of each word
 */
function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get popular searches for a language
 * Returns most common supplement queries
 */
export function getPopularSearches(lang: Language = 'en', limit: number = 6): string[] {
  const popular = lang === 'es'
    ? [
        'Ashwagandha',
        'Vitamina D',
        'Omega-3',
        'Magnesio',
        'Melatonina',
        'Creatina',
      ]
    : [
        'Ashwagandha',
        'Vitamin D',
        'Omega-3',
        'Magnesium',
        'Melatonin',
        'Creatine',
      ];

  return popular.slice(0, limit);
}
