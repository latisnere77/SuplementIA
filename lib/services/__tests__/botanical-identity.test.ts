import {
  canonicalizeBotanicalTerm,
  findBotanicalIdentity,
  getBotanicalPubMedQueryPhrases,
} from '../botanical-identity';

describe('botanical identity', () => {
  it('canonicalizes Mimosa tenuiflora aliases to the same controlled entity', () => {
    for (const term of ['Mimosa tenuiflora', 'Mimosa hostilis', 'tepezcohuite', 'tepescohuite']) {
      expect(canonicalizeBotanicalTerm(term)).toBe('Mimosa tenuiflora');
    }
  });

  it('keeps unknown botanicals outside the controlled identity registry', () => {
    expect(findBotanicalIdentity('Piper auritum')).toBeNull();
    expect(canonicalizeBotanicalTerm('Fadogia agrestis')).toBeNull();
    expect(canonicalizeBotanicalTerm('hoja de aguacate')).toBeNull();
    expect(canonicalizeBotanicalTerm('Centella asiatica')).toBeNull();
    expect(canonicalizeBotanicalTerm('Ashwagandha')).toBeNull();
  });

  it('builds controlled PubMed phrases without standalone clinical claim terms', () => {
    const phrases = getBotanicalPubMedQueryPhrases('tepezcohuite');

    expect(phrases).toEqual(expect.arrayContaining([
      'tepezcohuite',
      'Mimosa tenuiflora',
      'Mimosa hostilis',
      'tepescohuite',
      'Mimosa tenuiflora bark',
      'Mimosa tenuiflora cortex',
      'Mimosae tenuiflorae cortex',
      'Mimosa tenuiflora extract',
      'Mimosa tenuiflora hydrogel',
      'Mimosa tenuiflora MTC-2G',
    ]));
    expect(phrases).not.toContain('burns');
    expect(phrases).not.toContain('wound healing');
  });
});
