export interface PmidValidationResult {
  validPmids: string[];
  invalidPmids: string[];
}

export function isValidPmid(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9][0-9]{0,9}$/.test(value);
}

export function validatePmids(values: unknown[]): PmidValidationResult {
  const validPmids: string[] = [];
  const invalidPmids: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (!isValidPmid(value)) {
      invalidPmids.push(String(value));
      continue;
    }

    if (!seen.has(value)) {
      seen.add(value);
      validPmids.push(value);
    }
  }

  return { validPmids, invalidPmids };
}

