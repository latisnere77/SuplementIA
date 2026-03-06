/**
 * Lexicon Generator
 *
 * Auto-generates SUPPLEMENT_LEXICON from SUPPLEMENTS_DATABASE,
 * expanding coverage from 10 hardcoded entries to all supplements.
 * Groups ES/EN pairs by base ID and merges all names + aliases into
 * a single terms Set for case-insensitive matching.
 */

import {
  SUPPLEMENTS_DATABASE,
  SupplementEntry,
} from '@/lib/portal/supplements-database';

export interface LexiconEntry {
  name: string;
  terms: Set<string>;
}

/**
 * Generates a supplement lexicon from SUPPLEMENTS_DATABASE.
 *
 * Groups entries by base ID (stripping -es/-en suffix), merges all names
 * and aliases into a single terms Set, and uses the Spanish name as the
 * display name (primary market is LatAm).
 *
 * @returns Record keyed by UPPER_SNAKE_CASE base ID
 */
export function generateLexicon(): Record<string, LexiconEntry> {
  // Group entries by base ID
  const groups = new Map<string, SupplementEntry[]>();

  for (const entry of SUPPLEMENTS_DATABASE) {
    const baseId = entry.id.replace(/-(es|en)$/, '');
    const existing = groups.get(baseId) || [];
    existing.push(entry);
    groups.set(baseId, existing);
  }

  const lexicon: Record<string, LexiconEntry> = {};

  for (const [baseId, entries] of groups) {
    const terms = new Set<string>();

    // Prefer Spanish name for display (primary market)
    let displayName = '';
    const esEntry = entries.find((e) => e.language === 'es');
    const enEntry = entries.find((e) => e.language === 'en');

    displayName = esEntry?.name || enEntry?.name || entries[0].name;

    // Add base ID as a search term (handles cases like "msm", "maca")
    terms.add(baseId.toLowerCase());

    // Merge all names and aliases from all language entries
    for (const entry of entries) {
      terms.add(entry.name.toLowerCase());
      for (const alias of entry.aliases) {
        terms.add(alias.toLowerCase());
      }
    }

    // Convert base ID to UPPER_SNAKE_CASE: "vitamin-d" -> "VITAMIN_D"
    const key = baseId.toUpperCase().replace(/-/g, '_');

    lexicon[key] = {
      name: displayName,
      terms,
    };
  }

  return lexicon;
}

/** Pre-generated lexicon for direct import */
export const GENERATED_LEXICON = generateLexicon();
