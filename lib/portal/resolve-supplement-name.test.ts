/**
 * Tests for Spanish-to-English supplement name resolver
 * @jest-environment node
 */

import { resolveToEnglishName } from './resolve-supplement-name';
import { SUPPLEMENTS_DATABASE } from './supplements-database';

describe('resolveToEnglishName', () => {
  it('resolves Spanish name "Manzanilla" to English "Chamomile"', () => {
    expect(resolveToEnglishName('Manzanilla')).toBe('Chamomile');
  });

  it('returns same name for supplements identical in both languages (Ashwagandha)', () => {
    expect(resolveToEnglishName('Ashwagandha')).toBe('Ashwagandha');
  });

  it('resolves "Colageno" to "Collagen"', () => {
    expect(resolveToEnglishName('Colágeno')).toBe('Collagen');
  });

  it('passes through unknown queries unchanged', () => {
    expect(resolveToEnglishName('xyz_unknown')).toBe('xyz_unknown');
  });

  it('is case-insensitive', () => {
    expect(resolveToEnglishName('manzanilla')).toBe('Chamomile');
    expect(resolveToEnglishName('MANZANILLA')).toBe('Chamomile');
  });

  it('matches aliases (e.g., "camomila" resolves to "Chamomile")', () => {
    expect(resolveToEnglishName('camomila')).toBe('Chamomile');
  });

  it('resolves English names to themselves', () => {
    expect(resolveToEnglishName('Chamomile')).toBe('Chamomile');
    expect(resolveToEnglishName('Vitamin D')).toBe('Vitamin D');
  });

  it('resolves Spanish vitamin names to English', () => {
    expect(resolveToEnglishName('Vitamina D')).toBe('Vitamin D');
    expect(resolveToEnglishName('Vitamina C')).toBe('Vitamin C');
    expect(resolveToEnglishName('Vitamina E')).toBe('Vitamin E');
    expect(resolveToEnglishName('Vitamina A')).toBe('Vitamin A');
  });

  it('resolves Spanish mineral names to English', () => {
    expect(resolveToEnglishName('Magnesio')).toBe('Magnesium');
    expect(resolveToEnglishName('Selenio')).toBe('Selenium');
    expect(resolveToEnglishName('Potasio')).toBe('Potassium');
  });
});

describe('SUPPLEMENTS_DATABASE integrity', () => {
  it('has no duplicate IDs', () => {
    const ids = SUPPLEMENTS_DATABASE.map(e => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
