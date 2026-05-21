/**
 * @jest-environment node
 */
import {
  buildSupplementDescription,
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

  it('builds prudent structured data without clinical claim wording', () => {
    const data = getSupplementSeoData('magnesium', 'en');

    expect(data).not.toBeNull();
    const structuredData = buildSupplementStructuredData(data!, 'en');
    const serialized = JSON.stringify(structuredData);

    expect(structuredData[0]).toMatchObject({
      '@type': 'MedicalWebPage',
      url: 'https://suplementai.com/en/portal/supplement/magnesium',
      about: {
        '@type': 'DietarySupplement',
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
