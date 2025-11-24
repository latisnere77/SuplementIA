/**
 * Intelligent Autocomplete with LLM + Fuse.js + PubMed Fallback
 *
 * Multi-stage approach:
 * 1. Try exact/fuzzy match in local DB (fast)
 * 2. If poor results, use LLM to understand and normalize query (intelligent)
 * 3. Search again with normalized term
 * 4. Fallback to PubMed for validation (comprehensive)
 */

import Fuse, { IFuseOptions } from 'fuse.js';
import type { SupplementEntry } from './supplements-database';
import { SUPPLEMENTS_DATABASE } from './supplements-database';
import { expandAbbreviation } from '../services/abbreviation-expander';

export type Language = 'en' | 'es';

// PubMed fallback configuration
const PUBMED_API_URL = process.env.STUDIES_API_URL || 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';
const FALLBACK_SCORE_THRESHOLD = 75; // Use PubMed if local score < 75% (increased from 60)
const PUBMED_CACHE_TTL = 3600000; // 1 hour cache
const PUBMED_MIN_RESULTS = 3; // Try PubMed if we have fewer than 3 good matches

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
 * - threshold: 0.4 = balanced matching (good for partial words)
 * - distance: 200 = increased for better multi-word matching
 * - keys: fields to search in (name, aliases, healthConditions)
 *
 * OPTIMIZED for real-time autocomplete:
 * - Threshold 0.4 = more lenient for partial typing ("col" → "Colágeno")
 * - High distance = better for multi-word queries ("col pep" → "Collagen Peptides")
 * - Token separator = split queries by spaces for individual word matching
 */
const fuseOptions: IFuseOptions<SupplementEntry> = {
  keys: [
    { name: 'name', weight: 0.5 },           // Name has high weight
    { name: 'aliases', weight: 0.4 },        // Aliases are critical for synonyms
    { name: 'healthConditions', weight: 0.1 } // Health conditions have lower weight
  ],
  threshold: 0.4,          // More lenient for better autocomplete UX (0.0 = perfect, 1.0 = anything)
  distance: 200,           // Longer distance for multi-word queries
  includeScore: true,      // Include score in results
  minMatchCharLength: 2,   // Minimum 2 characters to match
  ignoreLocation: true,    // Don't consider location in string (important for long text)
  findAllMatches: false,   // Only find best matches (faster)
  useExtendedSearch: false, // We handle multi-word matching manually with cross-language tokens
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

  const normalizedQuery = query.trim().toLowerCase();

  // FAST PATH: Optimized tokenized search (instant)
  const results = searchInDatabase(normalizedQuery, lang, limit * 2);

  // Sort by score (descending) and return top results
  results.sort((a, b) => b.score - a.score);

  // Only use PubMed fallback if absolutely no results AND query is complete enough
  // This happens AFTER user stops typing, not during autocomplete
  if (results.length === 0 && normalizedQuery.length >= 5 && !normalizedQuery.includes(' ')) {
    // Check PubMed asynchronously (won't block autocomplete)
    checkPubMedExists(normalizedQuery).then(exists => {
      if (exists) {
        console.log(`[Autocomplete] Found in PubMed: ${normalizedQuery}`);
      }
    }).catch(() => {});
  }

  return results.slice(0, limit);
}

/**
 * Common supplement term translations (Spanish ↔ English)
 * Used for cross-language token matching in autocomplete
 */
const CROSS_LANGUAGE_TOKENS: Record<string, string[]> = {
  // Spanish → English equivalents
  'colageno': ['collagen'],
  'colágeno': ['collagen'],
  'peptidos': ['peptides', 'hydrolyzed'],
  'péptidos': ['peptides', 'hydrolyzed'],
  'magnesio': ['magnesium'],
  'hierro': ['iron'],
  'zinc': ['zinc'],
  'cobre': ['copper'],
  'vitamina': ['vitamin'],
  'acido': ['acid'],
  'ácido': ['acid'],
  'omega': ['omega'],
  'aceite': ['oil'],
  // English → Spanish equivalents
  'collagen': ['colageno', 'colágeno'],
  'peptides': ['peptidos', 'péptidos'],
  'hydrolyzed': ['hidrolizado', 'peptidos'],
  'magnesium': ['magnesio'],
  'iron': ['hierro'],
  'copper': ['cobre'],
  'vitamin': ['vitamina'],
  'acid': ['acido', 'ácido'],
  'oil': ['aceite'],
};

/**
 * Search in local database with Fuse.js + intelligent token matching
 * Instant performance for real-time autocomplete
 */
function searchInDatabase(
  query: string,
  lang: Language,
  limit: number
): AutocompleteSuggestion[] {
  const fuse = fuseInstances[lang];
  const lowerQuery = query.toLowerCase();

  // Tokenize query for multi-word matching
  const queryTokens = lowerQuery.split(/\s+/).filter(t => t.length > 0);

  // Search with Fuse.js (handles fuzzy matching)
  const results = fuse.search(lowerQuery, { limit: limit * 3 });

  const suggestions: AutocompleteSuggestion[] = results.map(result => {
    const item = result.item;
    let score = result.score !== undefined ? (1 - result.score) * 100 : 50;

    const normalizedName = item.name.toLowerCase();
    const allAliases = [normalizedName, ...item.aliases.map(a => a.toLowerCase())];

    // BONUS 1: Prefix matching (+20 points)
    // "col" matches "Colágeno"
    if (allAliases.some(alias => alias.startsWith(lowerQuery))) {
      score = Math.min(100, score + 20);
    }

    // BONUS 2: Exact match (+30 points)
    if (allAliases.some(alias => alias === lowerQuery)) {
      score = 100;
    }

    // BONUS 3: Multi-word token matching with cross-language support (+25 points)
    // "peptidos de colageno" matches "collagen peptides" without hardcoding
    if (queryTokens.length > 1) {
      let matchedTokenCount = 0;

      for (const queryToken of queryTokens) {
        // Skip common words (de, of, the, etc.)
        if (['de', 'del', 'la', 'el', 'of', 'the'].includes(queryToken)) {
          continue;
        }

        // Check direct match in aliases
        const directMatch = allAliases.some(alias => alias.includes(queryToken));

        // Check cross-language match (e.g., "peptidos" → "peptides")
        const translations = CROSS_LANGUAGE_TOKENS[queryToken] || [];
        const crossLangMatch = translations.some(translation =>
          allAliases.some(alias => alias.includes(translation))
        );

        if (directMatch || crossLangMatch) {
          matchedTokenCount++;
        }
      }

      // Only count tokens that aren't filler words
      const significantTokens = queryTokens.filter(t =>
        !['de', 'del', 'la', 'el', 'of', 'the'].includes(t)
      ).length;

      if (significantTokens > 0) {
        const tokenMatchBonus = (matchedTokenCount / significantTokens) * 25;
        score = Math.min(100, score + tokenMatchBonus);
      }
    }

    // BONUS 4: Partial word matching in aliases (+10 points)
    // "peptid" matches "peptides" in aliases
    if (item.aliases.some(alias => alias.toLowerCase().includes(lowerQuery))) {
      score = Math.min(100, score + 10);
    }

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

  return suggestions;
}

/**
 * Deduplicate suggestions by text (keep highest score)
 */
function deduplicateSuggestions(suggestions: AutocompleteSuggestion[]): AutocompleteSuggestion[] {
  const seen = new Map<string, AutocompleteSuggestion>();

  for (const suggestion of suggestions) {
    const key = suggestion.text.toLowerCase();
    const existing = seen.get(key);

    if (!existing || suggestion.score > existing.score) {
      seen.set(key, suggestion);
    }
  }

  const unique = Array.from(seen.values());
  unique.sort((a, b) => b.score - a.score);
  return unique;
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
