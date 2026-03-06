import { generateLexicon, GENERATED_LEXICON } from './lexicon-generator';
import { SUPPLEMENTS_DATABASE } from '@/lib/portal/supplements-database';

describe('generateLexicon', () => {
  const lexicon = generateLexicon();

  it('returns a Record with keys for all unique supplement base IDs', () => {
    // 153 entries with -es/-en suffix -> should produce 90 unique base IDs
    const baseIds = new Set(
      SUPPLEMENTS_DATABASE.map((entry) => entry.id.replace(/-(es|en)$/, ''))
    );
    expect(Object.keys(lexicon).length).toBe(baseIds.size);
  });

  it('each lexicon entry has a name and a non-empty terms Set', () => {
    let entriesWithMultipleTerms = 0;
    for (const [key, entry] of Object.entries(lexicon)) {
      expect(entry.name).toBeTruthy();
      expect(entry.terms).toBeInstanceOf(Set);
      expect(entry.terms.size).toBeGreaterThanOrEqual(1);
      if (entry.terms.size >= 2) entriesWithMultipleTerms++;
    }
    // The vast majority of entries should have 2+ terms
    expect(entriesWithMultipleTerms).toBeGreaterThanOrEqual(
      Object.keys(lexicon).length - 2
    );
  });

  it('"manzanilla" appears in the terms of a lexicon entry', () => {
    const allTerms = new Set<string>();
    for (const entry of Object.values(lexicon)) {
      for (const term of entry.terms) {
        allTerms.add(term);
      }
    }
    expect(allTerms.has('manzanilla')).toBe(true);
  });

  it('lexicon entry count >= 75', () => {
    expect(Object.keys(lexicon).length).toBeGreaterThanOrEqual(75);
  });

  it('all Spanish aliases and English aliases are merged into each supplement terms Set', () => {
    // Check ashwagandha: ES has aliases like 'ginseng indio', EN should have 'indian ginseng'
    const ashKey = Object.keys(lexicon).find((k) => k === 'ASHWAGANDHA');
    expect(ashKey).toBeDefined();
    const ash = lexicon[ashKey!];
    // ES aliases
    expect(ash.terms.has('ginseng indio')).toBe(true);
    // EN name or alias
    expect(ash.terms.has('ashwagandha')).toBe(true);
  });

  it('terms are lowercased for case-insensitive matching', () => {
    for (const entry of Object.values(lexicon)) {
      for (const term of entry.terms) {
        expect(term).toBe(term.toLowerCase());
      }
    }
  });

  it('GENERATED_LEXICON is the same as calling generateLexicon()', () => {
    expect(Object.keys(GENERATED_LEXICON).length).toBe(
      Object.keys(lexicon).length
    );
  });
});
