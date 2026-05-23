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
});
