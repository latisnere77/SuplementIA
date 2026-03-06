/**
 * Exhaustive coverage tests: every supplement in SUPPLEMENTS_DATABASE
 * must be findable via the generated SUPPLEMENT_LEXICON.
 */
import { SUPPLEMENTS_DATABASE } from '@/lib/portal/supplements-database';
import { GENERATED_LEXICON } from '@/lib/services/lexicon-generator';

// Build a flat set of all terms across the entire lexicon for fast lookup
const ALL_TERMS = new Set<string>();
for (const entry of Object.values(GENERATED_LEXICON)) {
  for (const term of entry.terms) {
    ALL_TERMS.add(term);
  }
}

describe('Every database supplement name is in the lexicon', () => {
  const entries = SUPPLEMENTS_DATABASE.map((e) => [e.id, e.name] as const);

  test.each(entries)(
    '%s (%s) has its name in lexicon terms',
    (_id, name) => {
      expect(ALL_TERMS.has(name.toLowerCase())).toBe(true);
    }
  );
});

describe('Every alias is in the lexicon', () => {
  const aliasEntries: [string, string][] = [];
  for (const entry of SUPPLEMENTS_DATABASE) {
    for (const alias of entry.aliases) {
      aliasEntries.push([entry.id, alias]);
    }
  }

  test.each(aliasEntries)(
    '%s alias "%s" exists in lexicon terms',
    (_id, alias) => {
      expect(ALL_TERMS.has(alias.toLowerCase())).toBe(true);
    }
  );
});

describe('Regression: previously missing supplements', () => {
  const regressionTerms = [
    'manzanilla',
    'rhodiola',
    'ginkgo biloba',
    'spirulina',
    'espirulina',
    'colágeno',
  ];

  test.each(regressionTerms)('"%s" is present in lexicon terms', (term) => {
    expect(ALL_TERMS.has(term.toLowerCase())).toBe(true);
  });
});

describe('Lexicon integrity', () => {
  it('no empty terms Sets in any lexicon entry', () => {
    for (const [key, entry] of Object.entries(GENERATED_LEXICON)) {
      expect(entry.terms.size).toBeGreaterThan(0);
    }
  });

  it('all terms are lowercase', () => {
    for (const term of ALL_TERMS) {
      expect(term).toBe(term.toLowerCase());
    }
  });

  it('entry count >= 75', () => {
    expect(Object.keys(GENERATED_LEXICON).length).toBeGreaterThanOrEqual(75);
  });

  it('total unique terms > 300', () => {
    expect(ALL_TERMS.size).toBeGreaterThan(300);
  });
});
