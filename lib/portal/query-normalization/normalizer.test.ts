/**
 * Unit Tests - Query Normalizer
 * Tests normalization, fuzzy matching, and variation generation
 */

import {
  normalizeQuery,
  normalizeQueries,
  hasNormalization,
  getAllSupportedSupplements,
  type NormalizedQuery,
} from './normalizer';

describe('Query Normalizer', () => {
  // ========== CARNITINA TESTS ==========
  describe('Carnitina Normalization', () => {
    it('normalizes "carnitina" to "L-Carnitine"', () => {
      const result = normalizeQuery('carnitina');
      expect(result.normalized).toBe('L-Carnitine');
      expect(result.category).toBe('amino_acid');
      expect(result.confidence).toBe(1.0);
    });

    it('normalizes "carnitine" (English) to "L-Carnitine"', () => {
      const result = normalizeQuery('carnitine');
      expect(result.normalized).toBe('L-Carnitine');
      expect(result.confidence).toBe(1.0);
    });

    it('normalizes "l-carnitina" to "L-Carnitine"', () => {
      const result = normalizeQuery('l-carnitina');
      expect(result.normalized).toBe('L-Carnitine');
    });

    it('normalizes "levocarnitina" to "L-Carnitine"', () => {
      const result = normalizeQuery('levocarnitina');
      expect(result.normalized).toBe('L-Carnitine');
    });

    it('handles typo "carnita" → "L-Carnitine"', () => {
      const result = normalizeQuery('carnita');
      expect(result.normalized).toBe('L-Carnitine');
      expect(result.confidence).toBe(1.0); // Exact match in map
    });

    it('handles "karnitina" (k/c confusion)', () => {
      const result = normalizeQuery('karnitina');
      expect(result.normalized).toBe('L-Carnitine');
    });
  });

  describe('Acetyl-L-Carnitine Normalization', () => {
    it('normalizes "acetil carnitina" to "Acetyl-L-Carnitine"', () => {
      const result = normalizeQuery('acetil carnitina');
      expect(result.normalized).toBe('Acetyl-L-Carnitine');
      expect(result.category).toBe('amino_acid');
    });

    it('normalizes "alcar" (abbreviation) to "Acetyl-L-Carnitine"', () => {
      const result = normalizeQuery('alcar');
      expect(result.normalized).toBe('Acetyl-L-Carnitine');
    });

    it('normalizes "acetyl-l-carnitine" to canonical form', () => {
      const result = normalizeQuery('acetyl-l-carnitine');
      expect(result.normalized).toBe('Acetyl-L-Carnitine');
    });
  });

  // ========== VARIATIONS TESTS ==========
  describe('Search Variations', () => {
    it('generates multiple variations for L-Carnitine', () => {
      const result = normalizeQuery('carnitina');
      expect(result.variations).toContain('L-Carnitine');
      expect(result.variations).toContain('Levocarnitine');
      expect(result.variations).toContain('Acetyl-L-Carnitine');
      expect(result.variations.length).toBeGreaterThan(3);
    });

    it('includes boolean query for PubMed', () => {
      const result = normalizeQuery('carnitina');
      const booleanQuery = result.variations.find(v =>
        v.includes('(') && v.includes('OR')
      );
      expect(booleanQuery).toBeDefined();
      expect(booleanQuery).toContain('L-Carnitine');
    });

    it('generates variations for Magnesium', () => {
      const result = normalizeQuery('magnesio');
      expect(result.normalized).toBe('Magnesium');
      expect(result.variations).toContain('Magnesium');
      expect(result.variations).toContain('Magnesium supplementation');
    });
  });

  // ========== FUZZY MATCHING TESTS ==========
  describe('Fuzzy Matching', () => {
    it('matches "carnita" (1 char missing) to "carnitina"', () => {
      const result = normalizeQuery('carnita');
      expect(result.normalized).toBe('L-Carnitine');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('matches "magenesio" (typo) to "magnesio"', () => {
      const result = normalizeQuery('magenesio');
      expect(result.normalized).toBe('Magnesium');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('does not match completely different words', () => {
      const result = normalizeQuery('xyz123');
      expect(result.normalized).toBe('xyz123'); // Returns original
      expect(result.confidence).toBe(0.0);
    });

    it('confidence decreases with edit distance', () => {
      const result1 = normalizeQuery('carnitin'); // distance 1
      const result2 = normalizeQuery('carniti'); // distance 2 (assuming fuzzy match works)

      if (result1.confidence > 0 && result2.confidence > 0) {
        // If both matched, result1 should have higher confidence
        expect(result1.confidence).toBeGreaterThanOrEqual(result2.confidence);
      }
    });
  });

  // ========== OTHER SUPPLEMENTS ==========
  describe('Other Supplements', () => {
    it('keeps short acronyms scoped to exact known entities', () => {
      expect(normalizeQuery('CBD').normalized).toBe('CBD');
      expect(normalizeQuery('cbd').normalized).toBe('CBD');
      expect(normalizeQuery('Cannabidiol').normalized).toBe('CBD');
      expect(normalizeQuery('NAD').normalized).toBe('NAD+');
      expect(normalizeQuery('nad').normalized).toBe('NAD+');
      expect(normalizeQuery('NAD+').normalized).toBe('NAD+');
    });

    it('does not fuzzy-match unknown short acronyms into unrelated entities', () => {
      const result = normalizeQuery('CBG');

      expect(result.normalized).toBe('CBG');
      expect(result.confidence).toBe(0.0);
    });

    it('normalizes Omega-3 variations', () => {
      expect(normalizeQuery('omega 3').normalized).toBe('Omega-3');
      expect(normalizeQuery('omega-3').normalized).toBe('Omega-3');
      expect(normalizeQuery('fish oil').normalized).toBe('Omega-3');
      expect(normalizeQuery('aceite de pescado').normalized).toBe('Omega-3');
    });

    it('normalizes Vitamin D variations', () => {
      expect(normalizeQuery('vitamina d').normalized).toBe('Vitamin D');
      expect(normalizeQuery('vitamin d3').normalized).toBe('Vitamin D3');
      expect(normalizeQuery('d3').normalized).toBe('Vitamin D3');
      expect(normalizeQuery('vit d').normalized).toBe('Vitamin D');
    });

    it('normalizes Magnesium forms', () => {
      expect(normalizeQuery('magnesio citrato').normalized).toBe('Magnesium Citrate');
      expect(normalizeQuery('magnesium glycinate').normalized).toBe('Magnesium Glycinate');
    });

    it('normalizes herbs', () => {
      expect(normalizeQuery('ashwagandha').normalized).toBe('Ashwagandha');
      expect(normalizeQuery('ashwaganda').normalized).toBe('Ashwagandha');
      expect(normalizeQuery('tepezcohuite').normalized).toBe('Mimosa tenuiflora');
      expect(normalizeQuery('tepescohuite').normalized).toBe('Mimosa tenuiflora');
      expect(normalizeQuery('Mimosa hostilis').normalized).toBe('Mimosa tenuiflora');
      expect(normalizeQuery('curcuma').normalized).toBe('Turmeric');
      expect(normalizeQuery('turmeric').normalized).toBe('Turmeric');
      expect(normalizeQuery('equinacea').normalized).toBe('Echinacea');
      expect(normalizeQuery('equinácea').normalized).toBe('Echinacea');
      expect(normalizeQuery('echinacea').normalized).toBe('Echinacea');
    });

    it('uses controlled botanical variations for tepezcohuite', () => {
      const result = normalizeQuery('tepezcohuite');

      expect(result.category).toBe('herb');
      expect(result.variations).toEqual(expect.arrayContaining([
        'Mimosa tenuiflora',
        'Mimosa hostilis',
        'tepezcohuite',
        'tepescohuite',
        'Mimosa tenuiflora cortex',
      ]));
      expect(result.variations).not.toContain('burns');
    });
  });

  // ========== CATEGORY TESTS ==========
  describe('Category Detection', () => {
    it('categorizes carnitina as amino_acid', () => {
      const result = normalizeQuery('carnitina');
      expect(result.category).toBe('amino_acid');
    });

    it('categorizes magnesio as mineral', () => {
      const result = normalizeQuery('magnesio');
      expect(result.category).toBe('mineral');
    });

    it('categorizes omega-3 as fatty_acid', () => {
      const result = normalizeQuery('omega 3');
      expect(result.category).toBe('fatty_acid');
    });

    it('categorizes vitamina d as vitamin', () => {
      const result = normalizeQuery('vitamina d');
      expect(result.category).toBe('vitamin');
    });

    it('categorizes ashwagandha as herb', () => {
      const result = normalizeQuery('ashwagandha');
      expect(result.category).toBe('herb');
    });

    it('categorizes unknown supplements as general', () => {
      const result = normalizeQuery('xyz123');
      expect(result.category).toBe('general');
    });
  });

  // ========== CASE INSENSITIVITY ==========
  describe('Case Insensitivity', () => {
    it('handles UPPERCASE queries', () => {
      expect(normalizeQuery('CARNITINA').normalized).toBe('L-Carnitine');
      expect(normalizeQuery('MAGNESIO').normalized).toBe('Magnesium');
    });

    it('handles MiXeD CaSe queries', () => {
      expect(normalizeQuery('CaRnItInA').normalized).toBe('L-Carnitine');
      expect(normalizeQuery('OmEgA 3').normalized).toBe('Omega-3');
    });
  });

  // ========== EDGE CASES ==========
  describe('Edge Cases', () => {
    it('handles empty strings', () => {
      const result = normalizeQuery('');
      expect(result.original).toBe('');
      expect(result.normalized).toBe('');
      expect(result.confidence).toBe(0.0);
    });

    it('handles whitespace', () => {
      const result = normalizeQuery('   carnitina   ');
      expect(result.normalized).toBe('L-Carnitine');
      expect(result.confidence).toBe(1.0);
    });

    it('handles single characters', () => {
      const result = normalizeQuery('a');
      expect(result.normalized).toBe('a');
      expect(result.confidence).toBe(0.0);
    });

    it('preserves original query', () => {
      const original = 'CaRnItInA  ';
      const result = normalizeQuery(original);
      expect(result.original).toBe(original);
    });
  });

  // ========== BATCH OPERATIONS ==========
  describe('Batch Normalization', () => {
    it('normalizes multiple queries', () => {
      const queries = ['carnitina', 'magnesio', 'omega 3'];
      const results = normalizeQueries(queries);

      expect(results).toHaveLength(3);
      expect(results[0].normalized).toBe('L-Carnitine');
      expect(results[1].normalized).toBe('Magnesium');
      expect(results[2].normalized).toBe('Omega-3');
    });

    it('handles empty array', () => {
      const results = normalizeQueries([]);
      expect(results).toHaveLength(0);
    });
  });

  // ========== UTILITY FUNCTIONS ==========
  describe('Utility Functions', () => {
    it('hasNormalization returns true for known supplements', () => {
      expect(hasNormalization('carnitina')).toBe(true);
      expect(hasNormalization('magnesio')).toBe(true);
      expect(hasNormalization('omega 3')).toBe(true);
    });

    it('hasNormalization returns false for unknown supplements', () => {
      expect(hasNormalization('xyz123')).toBe(false);
      expect(hasNormalization('unknown supplement')).toBe(false);
    });

    it('getAllSupportedSupplements returns unique canonical names', () => {
      const supplements = getAllSupportedSupplements();

      expect(supplements).toContain('L-Carnitine');
      expect(supplements).toContain('Magnesium');
      expect(supplements).toContain('Omega-3');
      expect(supplements).toContain('Vitamin D');

      // Should be unique
      const uniqueSet = new Set(supplements);
      expect(supplements.length).toBe(uniqueSet.size);

      // Should be sorted
      const sorted = [...supplements].sort();
      expect(supplements).toEqual(sorted);
    });
  });

  // ========== PERFORMANCE TESTS ==========
  describe('Performance', () => {
    it('normalizes query in < 5ms', () => {
      const start = performance.now();
      normalizeQuery('carnitina');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5); // Should be < 1ms, but allow 5ms margin
    });

    it('handles batch normalization efficiently', () => {
      const queries = Array(100).fill('carnitina');
      const start = performance.now();
      normalizeQueries(queries);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // 100 queries in < 50ms
    });
  });
});
