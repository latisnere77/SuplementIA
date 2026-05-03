export type EvidenceGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

const GRADE_ORDER: Record<EvidenceGrade, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
};

export function normalizeEvidenceGrade(value: unknown, fallback: EvidenceGrade = 'C'): EvidenceGrade {
  if (typeof value !== 'string') {
    return fallback;
  }

  const grade = value.trim().toUpperCase().charAt(0);
  return isEvidenceGrade(grade) ? grade : fallback;
}

export function isEvidenceGrade(value: unknown): value is EvidenceGrade {
  return value === 'A' || value === 'B' || value === 'C' || value === 'D' || value === 'E' || value === 'F';
}

export function isStrongEvidenceGrade(value: unknown): boolean {
  const grade = normalizeEvidenceGrade(value);
  return grade === 'A' || grade === 'B';
}

export function compareEvidenceGrades(a: unknown, b: unknown): number {
  return GRADE_ORDER[normalizeEvidenceGrade(a)] - GRADE_ORDER[normalizeEvidenceGrade(b)];
}

