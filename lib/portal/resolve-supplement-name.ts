/**
 * Spanish-to-English supplement name resolver
 *
 * Uses SUPPLEMENTS_DATABASE to map Spanish supplement names (and aliases)
 * to their English equivalents. This is needed because Lambda expects
 * English names for PubMed search and content enrichment.
 *
 * Pure in-memory lookup - no async, no API calls.
 * Maps are built once at module load time (~153 entries = negligible).
 */

import { SUPPLEMENTS_DATABASE } from './supplements-database';

// Build lookup map once at module load
const nameToEnglish = new Map<string, string>();

for (const entry of SUPPLEMENTS_DATABASE) {
  if (entry.language === 'es') {
    // Find EN pair: strip "-es", append "-en"
    const baseId = entry.id.replace(/-es$/, '');
    const enEntry = SUPPLEMENTS_DATABASE.find(e => e.id === `${baseId}-en`);
    const englishName = enEntry?.name ?? entry.name; // fallback to original if no EN pair

    // Map Spanish name and all aliases to English name
    nameToEnglish.set(entry.name.toLowerCase(), englishName);
    for (const alias of entry.aliases) {
      nameToEnglish.set(alias.toLowerCase(), englishName);
    }
  }

  // Also map English names/aliases to themselves (for passthrough)
  if (entry.language === 'en') {
    nameToEnglish.set(entry.name.toLowerCase(), entry.name);
    for (const alias of entry.aliases) {
      nameToEnglish.set(alias.toLowerCase(), entry.name);
    }
  }
}

/**
 * Resolve a supplement query to its English name.
 *
 * - Spanish names/aliases resolve to their English pair name
 * - English names/aliases resolve to themselves
 * - Unknown queries pass through unchanged
 *
 * @param query - Supplement name or alias (any case)
 * @returns English name, or original query if not found
 */
export function resolveToEnglishName(query: string): string {
  return nameToEnglish.get(query.toLowerCase()) ?? query;
}
