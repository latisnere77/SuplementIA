/**
 * Fuzzy Autocomplete with Fuse.js
 * Replaces hardcoded suggestions with fuzzy search over supplements database
 */

import Fuse, { IFuseOptions } from 'fuse.js';
import type { SupplementEntry } from './supplements-database';
import { SUPPLEMENTS_DATABASE } from './supplements-database';

export type Language = 'en' | 'es';

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
 * Get fuzzy autocomplete suggestions
 *
 * @param query - User's search query
 * @param lang - Language (en or es)
 * @param limit - Maximum number of suggestions to return
 * @returns Array of suggestions with scores
 *
 * @example
 * ```typescript
 * // Typo tolerance
 * getSuggestions('ashwaghanda', 'en', 5); // Returns "Ashwagandha"
 *
 * // Partial match
 * getSuggestions('vitam', 'es', 5); // Returns vitamins
 *
 * // Health condition
 * getSuggestions('sueño', 'es', 5); // Returns sleep-related supplements
 * ```
 */
export function getSuggestions(
  query: string,
  lang: Language = 'en',
  limit: number = 5
): AutocompleteSuggestion[] {
  if (!query || query.trim().length < 2) {
    return [];
  }

  // Get Fuse instance for language
  const fuse = fuseInstances[lang];

  // Perform fuzzy search
  const results = fuse.search(query, { limit });

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

  return suggestions.slice(0, limit);
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
