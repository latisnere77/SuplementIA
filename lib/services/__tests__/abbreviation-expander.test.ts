import { expandAbbreviation } from '../abbreviation-expander';

describe('expandAbbreviation controlled aliases', () => {
  it('canonicalizes gotu kola to Centella asiatica', async () => {
    await expect(expandAbbreviation('gotu kola')).resolves.toMatchObject({
      original: 'gotu kola',
      alternatives: ['Centella asiatica'],
      confidence: 0.95,
      source: 'heuristic',
    });
  });

  it('canonicalizes tepezcohuite variants to Mimosa tenuiflora without LLM expansion', async () => {
    for (const term of ['tepezcohuite', 'tepescohuite', 'Mimosa hostilis']) {
      await expect(expandAbbreviation(term)).resolves.toMatchObject({
        original: term,
        alternatives: ['Mimosa tenuiflora'],
        confidence: 0.95,
        source: 'heuristic',
      });
    }
  });
});
