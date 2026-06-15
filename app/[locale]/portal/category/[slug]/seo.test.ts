/**
 * @jest-environment node
 */
import { buildCategorySeoContent, buildCategorySeoCopy } from './seo';

const unsafePattern = /sirve para|treats|cures|beneficio comprobado|clinical benefit/i;
const commonDeficienciesUnsafePattern =
  /\bcura\b|\btrata\b|garantiza|sirve para|beneficio comprobado|clinically proven|\btreats\b|\bcures\b/i;
const energyUnsafePattern =
  /\bcura\b|\btrata\b|garantiza|sirve para|beneficio comprobado|clinically proven|\btreats\b|\bcures\b/i;
const immunityUnsafePattern =
  /\bcura\b|\btrata\b|garantiza|sirve para|beneficio comprobado|clinically proven|\btreats\b|\bcures\b/i;

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

  it('adds curated SEO content for common deficiencies', () => {
    const commonCopyEs = buildCategorySeoCopy({
      slug: 'common-deficiencies',
      categoryName: 'Deficiencias Comunes',
      categoryDescription: 'Vitaminas y minerales con deficiencias frecuentes.',
      locale: 'es',
    });
    const commonCopyEn = buildCategorySeoCopy({
      slug: 'common-deficiencies',
      categoryName: 'Common Deficiencies',
      categoryDescription: 'Vitamins and minerals with common deficiencies.',
      locale: 'en',
    });
    const commonContentEs = buildCategorySeoContent('common-deficiencies', 'es');
    const commonContentEn = buildCategorySeoContent('common-deficiencies', 'en');

    expect(commonCopyEs.title).toBe('Deficiencias comunes: vitamina D, hierro, B12, folato y zinc');
    expect(commonCopyEs.description).toContain('qué se evalúa con análisis');
    expect(commonCopyEs.title).not.toContain('evidencia científica');
    expect(commonCopyEn.title).toBe('Common deficiencies: vitamin D, iron, B12, folate, and zinc');
    expect(commonCopyEn.description).toContain('what labs assess');
    expect(commonCopyEn.title).not.toContain('Evidence-based supplements');

    expect(commonContentEs).not.toBeNull();
    expect(commonContentEn).not.toBeNull();
    expect(commonContentEs?.priorityTopics?.map((topic) => topic.supplementSlug)).toEqual([
      'vitamin-d',
      'iron',
      'vitamin-b12',
    ]);
    expect(commonContentEn?.priorityTopics?.map((topic) => topic.supplementSlug)).toEqual([
      'vitamin-d',
      'iron',
      'vitamin-b12',
    ]);
    expect(commonContentEs?.relatedLinks?.map((link) => link.href)).toEqual([
      '/portal/supplement/folic-acid?benefit=common-deficiencies',
      '/portal/supplement/zinc?benefit=common-deficiencies',
      '/portal/category/energy',
    ]);
    expect(commonContentEn?.relatedLinks?.map((link) => link.href)).toEqual([
      '/portal/supplement/folic-acid?benefit=common-deficiencies',
      '/portal/supplement/zinc?benefit=common-deficiencies',
      '/portal/category/energy',
    ]);
    expect(commonContentEs?.faqs).toHaveLength(4);
    expect(commonContentEn?.faqs).toHaveLength(4);

    const serialized = JSON.stringify([commonCopyEs, commonCopyEn, commonContentEs, commonContentEn]);
    expect(serialized).not.toMatch(commonDeficienciesUnsafePattern);
  });

  it('adds curated SEO content for energy and fatigue', () => {
    const energyCopyEs = buildCategorySeoCopy({
      slug: 'energy',
      categoryName: 'Energía',
      categoryDescription: 'Suplementos estudiados para energía y fatiga.',
      locale: 'es',
    });
    const energyCopyEn = buildCategorySeoCopy({
      slug: 'energy',
      categoryName: 'Energy',
      categoryDescription: 'Supplements studied for energy and fatigue.',
      locale: 'en',
    });
    const energyContentEs = buildCategorySeoContent('energy', 'es');
    const energyContentEn = buildCategorySeoContent('energy', 'en');

    expect(energyCopyEs.title).toBe('Suplementos para energía y fatiga: cafeína, rhodiola y B12');
    expect(energyCopyEs.description).toContain('sueño');
    expect(energyCopyEs.title).not.toContain('evidencia científica');
    expect(energyCopyEn.title).toBe('Energy and fatigue supplements: caffeine, rhodiola, B12');
    expect(energyCopyEn.description).toContain('fatigue context');
    expect(energyCopyEn.title).not.toContain('Evidence-based supplements');

    expect(energyContentEs).not.toBeNull();
    expect(energyContentEn).not.toBeNull();
    expect(energyContentEs?.priorityTopics?.map((topic) => topic.supplementSlug)).toEqual([
      'caffeine',
      'rhodiola-rosea',
      'creatine',
    ]);
    expect(energyContentEn?.priorityTopics?.map((topic) => topic.supplementSlug)).toEqual([
      'caffeine',
      'rhodiola-rosea',
      'creatine',
    ]);
    expect(energyContentEs?.relatedLinks?.map((link) => link.href)).toEqual([
      '/portal/category/common-deficiencies',
      '/portal/category/sleep',
      '/portal/supplement/caffeine?benefit=energy',
      '/portal/supplement/rhodiola-rosea?benefit=energy',
    ]);
    expect(energyContentEn?.relatedLinks?.map((link) => link.href)).toEqual([
      '/portal/category/common-deficiencies',
      '/portal/category/sleep',
      '/portal/supplement/caffeine?benefit=energy',
      '/portal/supplement/rhodiola-rosea?benefit=energy',
    ]);
    expect(energyContentEs?.faqs).toHaveLength(4);
    expect(energyContentEn?.faqs).toHaveLength(4);
    expect(energyContentEs?.faqs.map((faq) => faq.question)).toContain(
      '¿Cuándo conviene revisar B12, hierro o vitamina D?'
    );
    expect(energyContentEn?.faqs.map((faq) => faq.question)).toContain(
      'When should B12, iron, or vitamin D be reviewed?'
    );

    const serialized = JSON.stringify([energyCopyEs, energyCopyEn, energyContentEs, energyContentEn]);
    expect(serialized).not.toMatch(energyUnsafePattern);
    expect(serialized).not.toContain('"@type":"Product"');
  });

  it('adds curated SEO content for immunity', () => {
    const immunityCopyEs = buildCategorySeoCopy({
      slug: 'immunity',
      categoryName: 'Inmunidad',
      categoryDescription: 'Suplementos estudiados para apoyo inmunitario.',
      locale: 'es',
    });
    const immunityCopyEn = buildCategorySeoCopy({
      slug: 'immunity',
      categoryName: 'Immunity',
      categoryDescription: 'Supplements studied for immune support.',
      locale: 'en',
    });
    const immunityContentEs = buildCategorySeoContent('immunity', 'es');
    const immunityContentEn = buildCategorySeoContent('immunity', 'en');

    expect(immunityCopyEs.title).toBe('Suplementos para inmunidad: vitamina C, zinc y equinácea');
    expect(immunityCopyEs.description).toContain('uso responsable');
    expect(immunityCopyEs.title).not.toContain('evidencia científica');
    expect(immunityCopyEn.title).toBe('Immune support supplements: vitamin C, zinc, and echinacea');
    expect(immunityCopyEn.description).toContain('responsible use');
    expect(immunityCopyEn.title).not.toContain('Evidence-based supplements');

    expect(immunityContentEs).not.toBeNull();
    expect(immunityContentEn).not.toBeNull();
    expect(immunityContentEs?.priorityTopics?.map((topic) => topic.supplementSlug)).toEqual([
      'vitamin-c',
      'zinc',
      'echinacea',
    ]);
    expect(immunityContentEn?.priorityTopics?.map((topic) => topic.supplementSlug)).toEqual([
      'vitamin-c',
      'zinc',
      'echinacea',
    ]);
    expect(immunityContentEs?.relatedLinks?.map((link) => link.href)).toEqual([
      '/portal/category/common-deficiencies',
      '/portal/category/sleep',
      '/portal/supplement/vitamin-c?benefit=immunity',
      '/portal/supplement/zinc?benefit=immunity',
    ]);
    expect(immunityContentEn?.relatedLinks?.map((link) => link.href)).toEqual([
      '/portal/category/common-deficiencies',
      '/portal/category/sleep',
      '/portal/supplement/vitamin-c?benefit=immunity',
      '/portal/supplement/zinc?benefit=immunity',
    ]);
    expect(immunityContentEs?.faqs).toHaveLength(4);
    expect(immunityContentEn?.faqs).toHaveLength(4);
    expect(immunityContentEs?.faqs.map((faq) => faq.question)).toContain(
      '¿Equinácea es adecuada para todos?'
    );
    expect(immunityContentEn?.faqs.map((faq) => faq.question)).toContain(
      'Is echinacea appropriate for everyone?'
    );

    const serialized = JSON.stringify([immunityCopyEs, immunityCopyEn, immunityContentEs, immunityContentEn]);
    expect(serialized).not.toMatch(immunityUnsafePattern);
    expect(serialized).not.toContain('"@type":"Product"');
  });

  it('does not add generic SEO content for non-priority categories', () => {
    expect(buildCategorySeoContent('gut-health', 'en')).toBeNull();
  });

  it('keeps priority category SEO copy free of unsafe clinical wording', () => {
    const serialized = JSON.stringify([
      buildCategorySeoContent('sleep', 'en'),
      buildCategorySeoContent('cholesterol-triglycerides', 'en'),
      buildCategorySeoContent('heart-health', 'es'),
      buildCategorySeoContent('energy', 'es'),
      buildCategorySeoContent('immunity', 'es'),
    ]);

    expect(serialized).not.toMatch(unsafePattern);
    expect(serialized).not.toContain('"@type":"Product"');
  });
});
