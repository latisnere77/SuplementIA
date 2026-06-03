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

  it.each([
    ['magnesio', 'Magnesium'],
    ['vitamina d', 'Vitamin D'],
    ['berberina', 'Berberine'],
    ['melena de león', "Lion's Mane"],
    ['melena de leon', "Lion's Mane"],
    ['cardo mariano', 'Milk thistle'],
    ['cúrcuma', 'Turmeric'],
    ['curcuma', 'Turmeric'],
    ['coenzima q10', 'Coenzyme Q10'],
    ['sábila', 'Aloe Vera'],
    ['sabila', 'Aloe Vera'],
    ['té verde', 'Green tea extract'],
    ['te verde', 'Green tea extract'],
  ])('canonicalizes Spanish alias %s to %s without LLM expansion', async (term, canonical) => {
    await expect(expandAbbreviation(term)).resolves.toMatchObject({
      original: term,
      alternatives: [canonical],
      confidence: 0.95,
      source: 'heuristic',
    });
  });
});
