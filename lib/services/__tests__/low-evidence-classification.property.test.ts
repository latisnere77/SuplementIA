/**
 * Property Test: Low Evidence Classification
 * 
 * Feature: intelligent-supplement-search, Property 27: Low evidence classification
 * Validates: Requirements 7.5
 * 
 * Property: For any supplement with < 5 PubMed studies, it should be marked as "low evidence" but remain searchable
 */

import fc from 'fast-check';

// Evidence classification thresholds
const LOW_EVIDENCE_THRESHOLD = 5;

/**
 * Classify supplement based on study count
 */
function classifyEvidence(studyCount: number): 'valid' | 'low-evidence' | 'invalid' {
  if (studyCount === 0) {
    return 'invalid';
  } else if (studyCount < LOW_EVIDENCE_THRESHOLD) {
    return 'low-evidence';
  } else {
    return 'valid';
  }
}

/**
 * Check if a supplement should be searchable
 */
function isSearchable(classification: 'valid' | 'low-evidence' | 'invalid'): boolean {
  // Low evidence supplements should remain searchable
  return classification === 'valid' || classification === 'low-evidence';
}

/**
 * Get evidence grade based on study count
 */
function getEvidenceGrade(studyCount: number): 'A' | 'B' | 'C' | 'D' {
  if (studyCount >= 100) return 'A';
  if (studyCount >= 20) return 'B';
  if (studyCount >= 5) return 'C';
  return 'D';
}

// Arbitrary: Generate study count
const studyCountArbitrary = fc.integer({ min: 0, max: 1000 });

// Arbitrary: Generate low evidence study count (1-4)
const lowEvidenceCountArbitrary = fc.integer({ min: 1, max: 4 });

describe('Property 27: Low Evidence Classification', () => {
  /**
   * Property 27a: Supplements with < 5 studies are marked as low evidence
   * 
   * For any supplement with 1-4 PubMed studies, it should be classified as "low-evidence"
   */
  it('should classify supplements with 1-4 studies as low evidence', () => {
    fc.assert(
      fc.property(
        lowEvidenceCountArbitrary,
        (studyCount) => {
          const classification = classifyEvidence(studyCount);
          return classification === 'low-evidence';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 27b: Low evidence supplements remain searchable
   * 
   * For any supplement classified as "low-evidence", it should be searchable
   */
  it('should keep low evidence supplements searchable', () => {
    fc.assert(
      fc.property(
        lowEvidenceCountArbitrary,
        (studyCount) => {
          const classification = classifyEvidence(studyCount);
          const searchable = isSearchable(classification);
          
          return classification === 'low-evidence' && searchable === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 27c: Zero studies are invalid, not low evidence
   * 
   * For any supplement with 0 studies, it should be "invalid", not "low-evidence"
   */
  it('should classify zero studies as invalid, not low evidence', () => {
    const classification = classifyEvidence(0);
    expect(classification).toBe('invalid');
  });

  /**
   * Property 27d: Five or more studies are valid, not low evidence
   * 
   * For any supplement with >= 5 studies, it should be "valid", not "low-evidence"
   */
  it('should classify 5+ studies as valid, not low evidence', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 1000 }),
        (studyCount) => {
          const classification = classifyEvidence(studyCount);
          return classification === 'valid';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 27e: Classification boundaries are correct
   * 
   * For any study count, classification should follow the correct boundaries:
   * - 0 studies: invalid
   * - 1-4 studies: low-evidence
   * - 5+ studies: valid
   */
  it('should respect classification boundaries', () => {
    fc.assert(
      fc.property(
        studyCountArbitrary,
        (studyCount) => {
          const classification = classifyEvidence(studyCount);
          
          if (studyCount === 0) {
            return classification === 'invalid';
          } else if (studyCount < 5) {
            return classification === 'low-evidence';
          } else {
            return classification === 'valid';
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 27f: Edge case - exactly 4 studies is low evidence
   * 
   * The boundary case of exactly 4 studies should be classified as low evidence
   */
  it('should classify exactly 4 studies as low evidence', () => {
    const classification = classifyEvidence(4);
    expect(classification).toBe('low-evidence');
  });

  /**
   * Property 27g: Edge case - exactly 5 studies is valid
   * 
   * The boundary case of exactly 5 studies should be classified as valid
   */
  it('should classify exactly 5 studies as valid', () => {
    const classification = classifyEvidence(5);
    expect(classification).toBe('valid');
  });

  /**
   * Property 27h: Low evidence supplements get grade D
   * 
   * For any supplement with < 5 studies, evidence grade should be D
   */
  it('should assign grade D to low evidence supplements', () => {
    fc.assert(
      fc.property(
        lowEvidenceCountArbitrary,
        (studyCount) => {
          const grade = getEvidenceGrade(studyCount);
          return grade === 'D';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 27i: Invalid supplements are not searchable
   * 
   * For any supplement with 0 studies (invalid), it should not be searchable
   */
  it('should not make invalid supplements searchable', () => {
    const classification = classifyEvidence(0);
    const searchable = isSearchable(classification);
    
    expect(classification).toBe('invalid');
    expect(searchable).toBe(false);
  });

  /**
   * Property 27j: All non-zero study counts are searchable
   * 
   * For any supplement with at least 1 study, it should be searchable
   * (either as "valid" or "low-evidence")
   */
  it('should make all non-zero study supplements searchable', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (studyCount) => {
          const classification = classifyEvidence(studyCount);
          const searchable = isSearchable(classification);
          
          return searchable === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 27k: Classification is monotonic
   * 
   * For any two study counts where count1 < count2,
   * the classification should not get worse (invalid < low-evidence < valid)
   */
  it('should have monotonic classification with study count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 0, max: 500 }),
        (count1, count2) => {
          if (count1 === count2) return true;
          
          const [lower, higher] = count1 < count2 ? [count1, count2] : [count2, count1];
          const class1 = classifyEvidence(lower);
          const class2 = classifyEvidence(higher);
          
          // Define ordering: invalid < low-evidence < valid
          const order = { 'invalid': 0, 'low-evidence': 1, 'valid': 2 };
          
          // Higher study count should have equal or better classification
          return order[class2] >= order[class1];
        }
      ),
      { numRuns: 100 }
    );
  });
});
