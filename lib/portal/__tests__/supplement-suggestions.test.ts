/**
 * Tests for Supplement Suggestions System
 */

import {
  suggestSupplementCorrection,
  getBestSuggestion,
  isLikelyTypo,
  getPopularSupplementsByCategory,
} from '../supplement-suggestions';

describe('Supplement Suggestions System', () => {
  describe('suggestSupplementCorrection', () => {
    it('should find exact matches', () => {
      const result = suggestSupplementCorrection('Ashwagandha');
      
      expect(result.found).toBe(true);
      expect(result.exactMatch).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0].confidence).toBe(1.0);
    });

    it('should find matches with typos', () => {
      const result = suggestSupplementCorrection('Ashwaganda'); // Missing 'h'
      
      expect(result.found).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0].name).toContain('Ashwagandha');
    });

    it('should find matches in different languages', () => {
      const result = suggestSupplementCorrection('Vitamina D');
      
      expect(result.found).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should return empty for very short queries', () => {
      const result = suggestSupplementCorrection('a');
      
      expect(result.found).toBe(false);
      expect(result.suggestions.length).toBe(0);
    });

    it('should handle case insensitivity', () => {
      const result1 = suggestSupplementCorrection('MAGNESIUM');
      const result2 = suggestSupplementCorrection('magnesium');
      const result3 = suggestSupplementCorrection('Magnesium');
      
      expect(result1.found).toBe(true);
      expect(result2.found).toBe(true);
      expect(result3.found).toBe(true);
    });

    it('should find aliases', () => {
      const result = suggestSupplementCorrection('Reishi');
      
      expect(result.found).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('getBestSuggestion', () => {
    it('should return best suggestion for typos', () => {
      const suggestion = getBestSuggestion('Ashwaganda');
      
      expect(suggestion).not.toBeNull();
      expect(suggestion?.name).toContain('Ashwagandha');
      expect(suggestion?.confidence).toBeGreaterThan(0.6);
    });

    it('should return null for very poor matches', () => {
      const suggestion = getBestSuggestion('xyz123');
      
      expect(suggestion).toBeNull();
    });

    it('should return exact match with high confidence', () => {
      const suggestion = getBestSuggestion('Magnesium');
      
      expect(suggestion).not.toBeNull();
      expect(suggestion?.confidence).toBeGreaterThan(0.9);
    });
  });

  describe('isLikelyTypo', () => {
    it('should detect likely typos', () => {
      expect(isLikelyTypo('Ashwaganda')).toBe(true);
      expect(isLikelyTypo('Magnezium')).toBe(true);
    });

    it('should not flag exact matches as typos', () => {
      expect(isLikelyTypo('Ashwagandha')).toBe(false);
      expect(isLikelyTypo('Magnesium')).toBe(false);
    });

    it('should not flag completely unknown terms as typos', () => {
      expect(isLikelyTypo('xyz123abc')).toBe(false);
    });
  });

  describe('getPopularSupplementsByCategory', () => {
    it('should return popular herbs', () => {
      const herbs = getPopularSupplementsByCategory('herb', 3);
      
      expect(herbs.length).toBeGreaterThan(0);
      expect(herbs.length).toBeLessThanOrEqual(3);
      expect(herbs.every(h => h.category === 'herb')).toBe(true);
      expect(herbs.every(h => h.popularity === 'high')).toBe(true);
    });

    it('should return popular vitamins', () => {
      const vitamins = getPopularSupplementsByCategory('vitamin', 5);
      
      expect(vitamins.length).toBeGreaterThan(0);
      expect(vitamins.every(v => v.category === 'vitamin')).toBe(true);
    });

    it('should respect limit parameter', () => {
      const supplements = getPopularSupplementsByCategory('mineral', 2);
      
      expect(supplements.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      const result = suggestSupplementCorrection('');
      
      expect(result.found).toBe(false);
      expect(result.suggestions.length).toBe(0);
    });

    it('should handle special characters', () => {
      const result = suggestSupplementCorrection('L-Carnitine');
      
      expect(result.found).toBe(true);
    });

    it('should handle numbers', () => {
      const result = suggestSupplementCorrection('Vitamin B12');
      
      expect(result.found).toBe(true);
    });

    it('should handle multiple words', () => {
      const result = suggestSupplementCorrection('Fish Oil');
      
      expect(result.found).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should return results quickly', () => {
      const start = Date.now();
      suggestSupplementCorrection('Ashwagandha');
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Should be < 100ms
    });

    it('should handle multiple searches efficiently', () => {
      const queries = ['Ashwagandha', 'Magnesium', 'Omega-3', 'Vitamin D', 'Zinc'];
      
      const start = Date.now();
      queries.forEach(q => suggestSupplementCorrection(q));
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(500); // All 5 searches < 500ms
    });
  });
});
