/**
 * @jest-environment node
 */
import { buildCategorySeoContent, buildCategorySeoCopy } from './seo';

const unsafePattern = /sirve para|treats|cures|beneficio comprobado|clinical benefit/i;

describe('category page SEO', () => {
  it('builds targeted metadata for priority category pages', () => {
    expect(
      buildCategorySeoCopy({
        slug: 'sleep',
        categoryName: 'Sleep',
        categoryDescription: 'Supplements studied for sleep quality and duration.',
        locale: 'en',
      })
    ).toMatchObject({
      title: 'Sleep supplements compared: melatonin, magnesium, lavender',
    });

    expect(
      buildCategorySeoCopy({
        slug: 'sleep',
        categoryName: 'Sleep',
        categoryDescription: 'Supplements studied for sleep quality and duration.',
        locale: 'en',
      }).description
    ).toContain('sleep quality or timing issues');

    expect(
      buildCategorySeoCopy({
        slug: 'cholesterol-triglycerides',
        categoryName: 'Cholesterol and Triglycerides',
        categoryDescription: 'Options studied for lipid markers.',
        locale: 'en',
      })
    ).toMatchObject({
      title: 'Cholesterol and triglyceride supplements: psyllium and omega-3',
    });

    expect(
      buildCategorySeoCopy({
        slug: 'cholesterol-triglycerides',
        categoryName: 'Colesterol y Trigliceridos',
        categoryDescription: 'Opciones estudiadas para lípidos.',
        locale: 'es',
      }).description
    ).toContain('omega-3');

    expect(
      buildCategorySeoCopy({
        slug: 'heart-health',
        categoryName: 'Salud cardiovascular',
        categoryDescription: 'Opciones estudiadas para corazón.',
        locale: 'es',
      })
    ).toMatchObject({
      title: 'Suplementos cardiovasculares: omega-3, CoQ10 y seguridad',
    });
  });

  it('adds localized editorial content for priority category pages', () => {
    const sleepContent = buildCategorySeoContent('sleep', 'en');
    const lipidContent = buildCategorySeoContent('cholesterol-triglycerides', 'en');
    const heartContent = buildCategorySeoContent('heart-health', 'es');

    expect(sleepContent?.intro).toContain('sleep quality');
    expect(sleepContent?.faqs).toHaveLength(3);
    expect(lipidContent?.intro).toContain('psyllium fiber');
    expect(lipidContent?.priorityTopics?.map((topic) => topic.supplementSlug)).toEqual([
      'fiber-psyllium',
      'omega-3',
      'plant-sterols',
    ]);
    expect(lipidContent?.relatedLinks?.map((link) => link.href)).toEqual([
      '/portal/category/heart-health',
      '/portal/supplement/coenzyme-q10?benefit=heart-health',
      '/portal/supplement/omega-3?benefit=cholesterol-triglycerides',
      '/portal/supplement/garlic?benefit=cholesterol-triglycerides',
    ]);
    expect(heartContent?.intro).toContain('suplementos cardiovasculares');
    expect(heartContent?.priorityTopics?.map((topic) => topic.supplementSlug)).toEqual([
      'omega-3',
      'coenzyme-q10',
      'garlic',
    ]);
    expect(heartContent?.relatedLinks?.map((link) => link.href)).toEqual([
      '/portal/category/cholesterol-triglycerides',
      '/portal/supplement/fiber-psyllium?benefit=cholesterol-triglycerides',
      '/portal/supplement/omega-3?benefit=heart-health',
      '/portal/supplement/plant-sterols?benefit=cholesterol-triglycerides',
    ]);
    expect(heartContent?.supplementLinksHeading).toBe('Guías de suplementos cardiovasculares');
  });

  it('adds Spanish CTR intent for real Search Console category queries', () => {
    const lipidCopy = buildCategorySeoCopy({
      slug: 'cholesterol-triglycerides',
      categoryName: 'Colesterol y Trigliceridos',
      categoryDescription: 'Opciones estudiadas para lípidos.',
      locale: 'es',
    });
    const heartCopy = buildCategorySeoCopy({
      slug: 'heart-health',
      categoryName: 'Salud cardiovascular',
      categoryDescription: 'Opciones estudiadas para corazón.',
      locale: 'es',
    });
    const lipidContent = buildCategorySeoContent('cholesterol-triglycerides', 'es');
    const heartContent = buildCategorySeoContent('heart-health', 'es');

    expect(lipidCopy.title).toContain('triglicéridos');
    expect(lipidCopy.description).toContain('colesterol LDL');
    expect(lipidContent?.highlights[0]).toContain('suplementos triglicéridos');
    expect(lipidContent?.intro).toContain('omega 3 triglycerides');
    expect(lipidContent?.relatedLinks?.map((link) => link.href)).toContain(
      '/portal/supplement/omega-3?benefit=cholesterol-triglycerides'
    );
    expect(lipidContent?.faqs.map((faq) => faq.question)).toContain(
      '¿Qué significa buscar suplementos para triglicéridos?'
    );
    expect(lipidContent?.faqs.map((faq) => faq.question)).toContain(
      '¿Omega-3 es la primera opción cuando busco omega 3 triglycerides?'
    );
    expect(heartCopy.title).toContain('Suplementos cardiovasculares');
    expect(heartContent?.intro).toContain('suplemento cardiovascular');
    expect(heartContent?.relatedLinks?.map((link) => link.href)).toContain('/portal/supplement/omega-3?benefit=heart-health');
    expect(heartContent?.faqs.map((faq) => faq.question)).toContain(
      '¿Qué diferencia hay entre suplementos cardiovasculares y suplementos para triglicéridos?'
    );
  });

  it('does not add generic SEO content for non-priority categories', () => {
    expect(buildCategorySeoContent('gut-health', 'en')).toBeNull();
  });

  it('keeps priority category SEO copy free of unsafe clinical wording', () => {
    const serialized = JSON.stringify([
      buildCategorySeoContent('sleep', 'en'),
      buildCategorySeoContent('cholesterol-triglycerides', 'en'),
      buildCategorySeoContent('heart-health', 'es'),
    ]);

    expect(serialized).not.toMatch(unsafePattern);
    expect(serialized).not.toContain('"@type":"Product"');
  });
});
