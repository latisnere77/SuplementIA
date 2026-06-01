/**
 * @jest-environment node
 */
import {
  buildSupplementDescription,
  buildSupplementSeoContent,
  buildSupplementStructuredData,
  buildSupplementTitle,
  generateSupplementMetadata,
  generateSupplementStaticParams,
  getSupplementSeoData,
  sanitizeSupplementSeoText,
} from './seo';

const unsafePattern = /sirve para|treats|cures|beneficio comprobado|clinical benefit/i;

describe('supplement page SEO', () => {
  it('generates static params for known supplement slugs and locales', async () => {
    const params = generateSupplementStaticParams();

    expect(params).toEqual(
      expect.arrayContaining([
        { locale: 'es', slug: 'magnesium' },
        { locale: 'en', slug: 'magnesium' },
      ])
    );
  });

  it('generates canonical and hreflang metadata for supplement pages', async () => {
    const metadata = generateSupplementMetadata('es', 'magnesium');

    expect(metadata.title).toBe('Magnesio: evidencia, estudios y seguridad');
    expect(metadata.description).toContain('Magnesio');
    expect(metadata.alternates?.canonical).toBe('https://suplementai.com/es/portal/supplement/magnesium');
    expect(metadata.alternates?.languages).toMatchObject({
      es: 'https://suplementai.com/es/portal/supplement/magnesium',
      en: 'https://suplementai.com/en/portal/supplement/magnesium',
      'x-default': 'https://suplementai.com/es/portal/supplement/magnesium',
    });
    expect(JSON.stringify(metadata)).not.toMatch(unsafePattern);
  });

  it('targets Search Console opportunity supplements with specific metadata', () => {
    const psyllium = getSupplementSeoData('fiber-psyllium', 'en');
    const coq10 = getSupplementSeoData('coenzyme-q10', 'es');
    const lavender = getSupplementSeoData('lavender', 'en');
    const bacopa = getSupplementSeoData('bacopa-monnieri', 'es');
    const vitaminD = getSupplementSeoData('vitamin-d', 'es');
    const theanine = getSupplementSeoData('l-theanine', 'en');
    const omega3 = getSupplementSeoData('omega-3', 'es');

    expect(psyllium).not.toBeNull();
    expect(coq10).not.toBeNull();
    expect(lavender).not.toBeNull();
    expect(bacopa).not.toBeNull();
    expect(vitaminD).not.toBeNull();
    expect(theanine).not.toBeNull();
    expect(omega3).not.toBeNull();
    expect(buildSupplementTitle(psyllium!, 'es')).toContain('Psyllium para colesterol LDL');
    expect(buildSupplementDescription(psyllium!, 'es')).toContain('fibra soluble');
    expect(buildSupplementTitle(coq10!, 'es')).toContain('Coenzima Q10 cardiovascular');
    expect(buildSupplementDescription(coq10!, 'es')).toContain('estatinas');
    expect(buildSupplementTitle(omega3!, 'es')).toContain('Omega-3 para triglicéridos');
    expect(buildSupplementTitle(lavender!, 'en')).toContain('Lavender');
    expect(buildSupplementTitle(bacopa!, 'es')).toContain('Bacopa monnieri');
    expect(buildSupplementDescription(vitaminD!, 'es')).toContain('deficiencia');
    expect(buildSupplementTitle(theanine!, 'en')).toContain('L-theanine');
  });

  it('adds localized editorial content for emerging Spanish query supplements', () => {
    const bacopa = buildSupplementSeoContent('bacopa-monnieri', 'es');
    const vitaminD = buildSupplementSeoContent('vitamin-d', 'es');
    const theanine = buildSupplementSeoContent('l-theanine', 'es');

    expect(bacopa?.intro).toContain('Bacopa monnieri');
    expect(vitaminD?.intro).toContain('suplemento de vitamina d');
    expect(theanine?.faqs[0].question).toContain('theanine');
    expect(bacopa?.faqs).toHaveLength(3);
    expect(JSON.stringify([bacopa, vitaminD, theanine])).not.toMatch(unsafePattern);
  });

  it('adds cardiometabolic cluster content and internal links for P2 pages', () => {
    const psyllium = buildSupplementSeoContent('fiber-psyllium', 'es');
    const omega3 = buildSupplementSeoContent('omega-3', 'es');
    const coq10 = buildSupplementSeoContent('coenzyme-q10', 'es');

    expect(psyllium?.intro).toContain('psyllium colesterol');
    expect(psyllium?.relatedLinks?.map((link) => link.href)).toEqual([
      '/portal/category/cholesterol-triglycerides',
      '/portal/supplement/omega-3?benefit=cholesterol-triglycerides',
      '/portal/supplement/plant-sterols?benefit=cholesterol-triglycerides',
    ]);
    expect(omega3?.intro).toContain('omega 3 triglicéridos');
    expect(omega3?.relatedLinks?.map((link) => link.href)).toContain('/portal/category/heart-health');
    expect(coq10?.faqHeading).toContain('coenzima Q10 cardiovascular');
    expect(coq10?.relatedLinks?.map((link) => link.href)).toContain('/portal/category/cholesterol-triglycerides');
    expect(JSON.stringify([psyllium, omega3, coq10])).not.toMatch(unsafePattern);
  });

  it('builds prudent structured data without clinical claim wording', () => {
    const data = getSupplementSeoData('magnesium', 'en');

    expect(data).not.toBeNull();
    const structuredData = buildSupplementStructuredData(data!, 'en');
    const serialized = JSON.stringify(structuredData);

    expect(structuredData[0]).toMatchObject({
      '@type': 'MedicalWebPage',
      url: 'https://suplementai.com/en/portal/supplement/magnesium',
      about: {
        '@type': 'Thing',
        name: 'Magnesium',
      },
    });
    expect(structuredData[1]).toMatchObject({
      '@type': 'BreadcrumbList',
    });
    expect(serialized).not.toMatch(unsafePattern);
  });

  it('sanitizes unsafe wording from title and description helpers', () => {
    const data = getSupplementSeoData('magnesium', 'en');

    expect(data).not.toBeNull();
    expect(buildSupplementTitle(data!, 'en')).not.toMatch(unsafePattern);
    expect(buildSupplementDescription(data!, 'en')).not.toMatch(unsafePattern);
    expect(sanitizeSupplementSeoText('This treats disease and cures symptoms')).not.toMatch(unsafePattern);
  });
});
