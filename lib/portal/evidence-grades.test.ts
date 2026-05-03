import {
  compareEvidenceGrades,
  isStrongEvidenceGrade,
  normalizeEvidenceGrade,
} from './evidence-grades';

describe('evidence grade helpers', () => {
  it('normalizes explicit evidence grades without inventing stronger evidence', () => {
    expect(normalizeEvidenceGrade('a')).toBe('A');
    expect(normalizeEvidenceGrade('B evidence')).toBe('B');
    expect(normalizeEvidenceGrade(undefined)).toBe('C');
    expect(normalizeEvidenceGrade('unknown')).toBe('C');
  });

  it('only treats grade A and B as strong evidence for worksFor', () => {
    expect(isStrongEvidenceGrade('A')).toBe(true);
    expect(isStrongEvidenceGrade('b')).toBe(true);
    expect(isStrongEvidenceGrade('C')).toBe(false);
    expect(isStrongEvidenceGrade(undefined)).toBe(false);
  });

  it('sorts evidence grades from A to F', () => {
    expect(['C', 'A', 'F', 'B', 'D'].sort(compareEvidenceGrades)).toEqual(['A', 'B', 'C', 'D', 'F']);
  });
});

