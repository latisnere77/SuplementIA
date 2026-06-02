import { globalSeo } from './seo';

describe('global SEO metadata', () => {
  it('uses CTR-oriented brand metadata without unsafe medical claims', () => {
    expect(globalSeo.es).toMatchObject({
      title: 'SuplementAI | Buscador de suplementos con evidencia',
    });
    expect(globalSeo.es.description).toContain('evidencia');
    expect(globalSeo.es.description).toContain('seguridad');

    expect(globalSeo.en).toMatchObject({
      title: 'SuplementAI | Evidence-Based Supplement Search',
    });
    expect(globalSeo.en.description).toContain('evidence');
    expect(globalSeo.en.description).toContain('safety');

    expect(JSON.stringify(globalSeo)).not.toMatch(/treats|cures|clinical benefit|beneficio comprobado/i);
  });
});
