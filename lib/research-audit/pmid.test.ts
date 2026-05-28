import { isValidPmid, validatePmids } from './pmid';

describe('PMID validation', () => {
  it('accepts numeric PubMed IDs without leading zeroes', () => {
    expect(isValidPmid('40919293')).toBe(true);
    expect(isValidPmid('1')).toBe(true);
  });

  it('rejects non-numeric or malformed IDs', () => {
    expect(isValidPmid('PMID 40919293')).toBe(false);
    expect(isValidPmid('0123')).toBe(false);
    expect(isValidPmid('abc')).toBe(false);
  });

  it('deduplicates valid IDs and reports invalid values', () => {
    const result = validatePmids(['40919293', '40919293', 'abc', '0123']);

    expect(result.validPmids).toEqual(['40919293']);
    expect(result.invalidPmids).toEqual(['abc', '0123']);
  });
});
