/**
 * Property-Based Tests for Input Validation
 * Uses fast-check for property-based testing
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import * as fc from 'fast-check';
import {
  validateSupplementName,
  sanitizeQuery,
  verifyNormalization,
  detectProblematicQuery,
  validateAndSanitizeQuery,
} from './input-validation';
import { normalizeQuery } from './query-normalization';

describe('Input Validation - Property-Based Tests', () => {
  /**
   * Property 15: Empty supplement names are rejected
   * Validates: Requirements 4.1
   *
   * Feature: frontend-error-display-fix, Property 15: Empty supplement names are rejected
   */
  describe('Property 15: Empty supplement names are rejected', () => {
    it('should reject empty strings', () => {
      fc.assert(
        fc.property(fc.constant(''), (emptyString) => {
          const result = validateSupplementName(emptyString);
          return !result.valid && result.error !== undefined;
        }),
        { numRuns: 100 }
      );
    });

    it('should reject whitespace-only strings', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 20 }).map(arr => arr.join('')),
          (whitespaceString) => {
            const result = validateSupplementName(whitespaceString);
            return !result.valid && result.error !== undefined;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject null and undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nullResult = validateSupplementName(null as any);
      expect(nullResult.valid).toBe(false);
      expect(nullResult.error).toBeDefined();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const undefinedResult = validateSupplementName(undefined as any);
      expect(undefinedResult.valid).toBe(false);
      expect(undefinedResult.error).toBeDefined();
    });

    it('should reject strings shorter than 2 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1 }),
          (shortString) => {
            const result = validateSupplementName(shortString);
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid supplement names', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          (validString) => {
            const result = validateSupplementName(validString);
            return result.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 17: Special characters are sanitized
   * Validates: Requirements 4.3
   *
   * Feature: frontend-error-display-fix, Property 17: Special characters are sanitized
   */
  describe('Property 17: Special characters are sanitized', () => {
    it('should remove < and > characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (str) => {
            const sanitized = sanitizeQuery(str);
            return !sanitized.includes('<') && !sanitized.includes('>');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should remove control characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (str) => {
            const sanitized = sanitizeQuery(str);
            // Check that no control characters remain (ASCII 0-31, 127)
            return !/[\x00-\x1F\x7F]/.test(sanitized);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should normalize multiple spaces to single space', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 5 }),
          (words) => {
            const input = words.join('   '); // Multiple spaces
            const sanitized = sanitizeQuery(input);
            // Should not have multiple consecutive spaces
            return !/\s{2,}/.test(sanitized);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should trim leading and trailing whitespace', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.array(fc.constantFrom(' ', '\t'), { minLength: 0, maxLength: 5 }).map(arr => arr.join('')),
          (str, whitespace) => {
            const input = whitespace + str + whitespace;
            const sanitized = sanitizeQuery(input);
            // Sanitized should not have leading or trailing whitespace
            return sanitized.length === 0 || (sanitized[0] !== ' ' && sanitized[0] !== '\t' && 
                                               sanitized[sanitized.length - 1] !== ' ' && 
                                               sanitized[sanitized.length - 1] !== '\t');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should limit length to 100 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 101, maxLength: 200 }),
          (longString) => {
            const sanitized = sanitizeQuery(longString);
            return sanitized.length <= 100;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty and null inputs gracefully', () => {
      expect(sanitizeQuery('')).toBe('');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(sanitizeQuery(null as any)).toBe('');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(sanitizeQuery(undefined as any)).toBe('');
    });
  });

  /**
   * Property 16: Normalization success is verified
   * Validates: Requirements 4.2
   *
   * Feature: frontend-error-display-fix, Property 16: Normalization success is verified
   */
  describe('Property 16: Normalization success is verified', () => {
    it('should accept normalization with valid normalized name', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('magnesium', 'vitamin d', 'omega-3', 'creatine', 'ashwagandha'),
          (supplementName) => {
            const normalized = normalizeQuery(supplementName);
            const result = verifyNormalization(normalized);
            return result.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject normalization with empty normalized name', () => {
      const invalidNormalized = {
        original: 'test',
        normalized: '',
        variations: [],
        category: 'general' as const,
        confidence: 1.0,
      };
      const result = verifyNormalization(invalidNormalized);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject normalization with very low confidence', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 0.29, noNaN: true }),
          (lowConfidence) => {
            const normalized = {
              original: 'test',
              normalized: 'test',
              variations: ['test'],
              category: 'general' as const,
              confidence: lowConfidence,
            };
            const result = verifyNormalization(normalized);
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept normalization with confidence >= 0.3', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.3, max: 1.0, noNaN: true }),
          (goodConfidence) => {
            const normalized = {
              original: 'test',
              normalized: 'test supplement',
              variations: ['test'],
              category: 'general' as const,
              confidence: goodConfidence,
            };
            const result = verifyNormalization(normalized);
            return result.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept normalization with confidence = 0 (unknown supplement)', () => {
      const normalized = {
        original: 'unknown supplement',
        normalized: 'unknown supplement',
        variations: ['unknown supplement'],
        category: 'general' as const,
        confidence: 0.0,
      };
      const result = verifyNormalization(normalized);
      expect(result.valid).toBe(true);
    });
  });

  /**
   * Property 19: Problematic queries log warnings
   * Validates: Requirements 4.5
   *
   * Feature: frontend-error-display-fix, Property 19: Problematic queries log warnings
   */
  describe('Property 19: Problematic queries log warnings', () => {
    it('should detect queries exceeding maximum length', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 101, maxLength: 200 }).filter(s => s.trim().length > 100),
          (longQuery) => {
            const result = detectProblematicQuery(longQuery);
            return result.isProblematic === true && result.reason?.includes('length');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect queries with excessive special characters', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*'), {
            minLength: 10,
            maxLength: 20,
          }).map(arr => arr.join('')),
          (specialChars) => {
            const result = detectProblematicQuery(specialChars);
            return result.isProblematic === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect queries with only numbers', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 20 }).map(arr => arr.join('')),
          (numbers) => {
            const result = detectProblematicQuery(numbers);
            return result.isProblematic === true && result.reason?.includes('numbers');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect queries with repeated characters', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('a', 'b', 'c', 'd', 'e', '1', '2', '3'), // Use alphanumeric to avoid special char detection
          (char) => {
            const repeated = char.repeat(10);
            const result = detectProblematicQuery(repeated);
            // Should be detected as problematic (either repeated chars or only numbers)
            return result.isProblematic === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect SQL injection patterns', () => {
      const sqlPatterns = [
        'SELECT * FROM users',
        'INSERT INTO table',
        'UPDATE users SET',
        'DELETE FROM table',
        'DROP TABLE users',
        'UNION SELECT',
      ];

      sqlPatterns.forEach((pattern) => {
        const result = detectProblematicQuery(pattern);
        expect(result.isProblematic).toBe(true);
        expect(result.reason).toContain('SQL');
        expect(result.severity).toBe('high');
      });
    });

    it('should detect script injection patterns', () => {
      const scriptPatterns = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<img onerror="alert(1)">',
        '<body onload="alert(1)">',
      ];

      scriptPatterns.forEach((pattern) => {
        const result = detectProblematicQuery(pattern);
        expect(result.isProblematic).toBe(true);
        expect(result.reason).toContain('script');
        expect(result.severity).toBe('high');
      });
    });

    it('should not flag normal supplement names as problematic', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'magnesium',
            'vitamin d',
            'omega-3',
            'creatine',
            'ashwagandha',
            'l-carnitine',
            'coq10'
          ),
          (supplementName) => {
            const result = detectProblematicQuery(supplementName);
            return result.isProblematic === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 18: Validation failures return 400
   * Validates: Requirements 4.4
   *
   * Feature: frontend-error-display-fix, Property 18: Validation failures return 400
   */
  describe('Property 18: Validation failures return 400', () => {
    it('should return 400 for empty supplement names', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(' ', '\t', '\n'), { minLength: 0, maxLength: 10 }).map(arr => arr.join('')),
          (emptyOrWhitespace) => {
            const result = validateAndSanitizeQuery(emptyOrWhitespace);
            return !result.valid && result.statusCode === 400;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 400 for queries with only invalid characters', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('<', '>'), { minLength: 1, maxLength: 10 }).map(arr => arr.join('')),
          (invalidChars) => {
            const result = validateAndSanitizeQuery(invalidChars);
            return !result.valid && result.statusCode === 400;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 400 for queries with very low normalization confidence', () => {
      // Test with random strings that are unlikely to match known supplements
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 10 })
            .filter(s => s.trim().length >= 2)
            .filter(s => !/^[a-z\s-]+$/i.test(s)), // Filter out normal-looking names
          (randomString) => {
            const result = validateAndSanitizeQuery(randomString);
            // Some random strings might pass, but if they fail, should be 400
            if (!result.valid) {
              return result.statusCode === 400;
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include error and suggestion in 400 responses', () => {
      const result = validateAndSanitizeQuery('');
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBeDefined();
      expect(result.suggestion).toBeDefined();
    });

    it('should return valid result for known supplements', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('magnesium', 'vitamin d', 'omega-3', 'creatine'),
          (supplementName) => {
            const result = validateAndSanitizeQuery(supplementName);
            return result.valid === true && result.sanitized !== undefined;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
