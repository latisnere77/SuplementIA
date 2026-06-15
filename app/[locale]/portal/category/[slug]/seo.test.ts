/**
 * @jest-environment node
 */
import { buildCategorySeoContent, buildCategorySeoCopy } from './seo';

const unsafePattern = /sirve para|treats|cures|beneficio comprobado|clinical benefit/i;
const commonDeficienciesUnsafePattern =
  /\bcura\b|\btrata\b|garantiza|sirve para|beneficio comprobado|clinically proven|\btreats\b|\bcures\b/i;
const energyUnsafePattern =
  /\bcura\b|\btrata\b|garantiza|sirve para|beneficio comprobado|clinically proven|\btreats\b|\bcures\b/i;
const integratedClusterUnsafePattern =
  /\bcura\b|\btrata\b|garantiza|sirve para|beneficio comprobado|clinically proven|\btreats\b|\bcures\b/i;
const integratedClusterCases = [
  {
    slug: 'anxiety',
    esTitle: 'Suplementos para estrés y calma: ashwagandha, teanina y manzanilla',
    enTitle: 'Stress and calm supplements: ashwagandha, theanine, chamomile',
    priorityTopics: [
      'ashwagandha',
      'l-theanine',
      'chamomile'
    ],
    relatedLinks: [
      '/portal/category/sleep',
      '/portal/category/energy',
      '/portal/supplement/ashwagandha?benefit=anxiety',
      '/portal/supplement/l-theanine?benefit=anxiety'
    ],
    faqCount: 4
  },
  {
    slug: 'muscle-gain',
    esTitle: 'Suplementos para músculo y fuerza: proteína, creatina y beta-alanina',
    enTitle: 'Muscle and strength supplements: protein, creatine, beta-alanine',
    priorityTopics: [
      'whey-protein',
      'creatine',
      'beta-alanine'
    ],
    relatedLinks: [
      '/portal/category/sports-performance',
      '/portal/category/energy',
      '/portal/supplement/creatine?benefit=muscle-gain',
      '/portal/supplement/whey-protein?benefit=muscle-gain'
    ],
    faqCount: 4
  },
  {
    slug: 'cognitive-function',
    esTitle: 'Suplementos para memoria y concentración: omega-3, bacopa y ginkgo',
    enTitle: 'Memory and focus supplements: omega-3, bacopa, and ginkgo',
    priorityTopics: [
      'omega-3',
      'bacopa-monnieri',
      'ginkgo-biloba'
    ],
    relatedLinks: [
      '/portal/category/energy',
      '/portal/category/common-deficiencies',
      '/portal/supplement/bacopa-monnieri?benefit=cognitive-function',
      '/portal/supplement/ginkgo-biloba?benefit=cognitive-function'
    ],
    faqCount: 4
  },
  {
    slug: 'joint-bone-health',
    esTitle: 'Suplementos para articulaciones y huesos: vitamina D, glucosamina y colágeno',
    enTitle: 'Joint and bone supplements: vitamin D, glucosamine, collagen',
    priorityTopics: [
      'vitamin-d',
      'glucosamine',
      'hydrolyzed-collagen'
    ],
    relatedLinks: [
      '/portal/category/common-deficiencies',
      '/portal/category/sports-performance',
      '/portal/supplement/vitamin-d?benefit=joint-bone-health',
      '/portal/supplement/glucosamine?benefit=joint-bone-health'
    ],
    faqCount: 4
  },
  {
    slug: 'skin-hair-health',
    esTitle: 'Suplementos para piel y cabello: colágeno, biotina y vitamina C',
    enTitle: 'Skin and hair supplements: collagen, biotin, and vitamin C',
    priorityTopics: [
      'collagen',
      'biotin',
      'vitamin-c'
    ],
    relatedLinks: [
      '/portal/category/common-deficiencies',
      '/portal/category/joint-bone-health',
      '/portal/supplement/collagen?benefit=skin-hair-health',
      '/portal/supplement/biotin?benefit=skin-hair-health'
    ],
    faqCount: 4
  },
  {
    slug: 'immunity',
    esTitle: 'Suplementos para inmunidad: vitamina C, zinc y equinácea',
    enTitle: 'Immune support supplements: vitamin C, zinc, and echinacea',
    priorityTopics: [
      'vitamin-c',
      'zinc',
      'echinacea'
    ],
    relatedLinks: [
      '/portal/category/common-deficiencies',
      '/portal/category/sleep',
      '/portal/supplement/vitamin-c?benefit=immunity',
      '/portal/supplement/zinc?benefit=immunity'
    ],
    faqCount: 4
  },
  {
    slug: 'mens-health',
    esTitle: 'Suplementos para salud masculina: próstata, zinc y vitalidad',
    enTitle: 'Men’s health supplements: prostate context, zinc, and vitality',
    priorityTopics: [
      'saw-palmetto',
      'zinc',
      'vitamin-d'
    ],
    relatedLinks: [
      '/portal/category/common-deficiencies',
      '/portal/category/heart-health',
      '/portal/supplement/saw-palmetto?benefit=mens-health',
      '/portal/supplement/zinc?benefit=mens-health'
    ],
    faqCount: 4
  },
  {
    slug: 'womens-health',
    esTitle: 'Suplementos para salud femenina: folato, hierro y calcio',
    enTitle: 'Women’s health supplements: folate, iron, and calcium',
    priorityTopics: [
      'folic-acid',
      'iron',
      'calcium'
    ],
    relatedLinks: [
      '/portal/category/common-deficiencies',
      '/portal/category/joint-bone-health',
      '/portal/supplement/folic-acid?benefit=womens-health',
      '/portal/supplement/iron?benefit=womens-health'
    ],
    faqCount: 4
  },
  {
    slug: 'blood-sugar',
    esTitle: 'Suplementos para glucosa: berberina, psyllium y canela',
    enTitle: 'Blood sugar supplements: berberine, psyllium, and cinnamon',
    priorityTopics: [
      'berberine',
      'fiber-psyllium',
      'cinnamon'
    ],
    relatedLinks: [
      '/portal/category/common-deficiencies',
      '/portal/category/heart-health',
      '/portal/supplement/berberine?benefit=blood-sugar',
      '/portal/supplement/fiber-psyllium?benefit=blood-sugar'
    ],
    faqCount: 4
  },
  {
    slug: 'inflammation',
    esTitle: 'Suplementos para inflamación: curcumina, omega-3 y boswellia',
    enTitle: 'Inflammation supplements: curcumin, omega-3, and boswellia',
    priorityTopics: [
      'curcumin',
      'omega-3',
      'boswellia-serrata'
    ],
    relatedLinks: [
      '/portal/category/joint-bone-health',
      '/portal/category/heart-health',
      '/portal/supplement/curcumin?benefit=inflammation',
      '/portal/supplement/omega-3?benefit=inflammation'
    ],
    faqCount: 4
  },
  {
    slug: 'sports-performance',
    esTitle: 'Suplementos para rendimiento deportivo: creatina y cafeína',
    enTitle: 'Sports performance supplements: creatine and caffeine',
    priorityTopics: [
      'creatine',
      'caffeine',
      'beta-alanine'
    ],
    relatedLinks: [
      '/portal/category/muscle-gain',
      '/portal/category/energy',
      '/portal/supplement/creatine?benefit=sports-performance',
      '/portal/supplement/caffeine?benefit=sports-performance'
    ],
    faqCount: 4
  },
  {
    slug: 'hormonal-health',
    esTitle: 'Suplementos para salud hormonal: inositol, vitamina D y zinc',
    enTitle: 'Hormonal health supplements: inositol, vitamin D, and zinc',
    priorityTopics: [
      'inositol',
      'vitamin-d',
      'zinc'
    ],
    relatedLinks: [
      '/portal/category/womens-health',
      '/portal/category/blood-sugar',
      '/portal/supplement/inositol?benefit=hormonal-health',
      '/portal/supplement/vitamin-d?benefit=hormonal-health'
    ],
    faqCount: 4
  },
  {
    slug: 'migraine-headache',
    esTitle: 'Suplementos en contexto de migraña: magnesio, B2 y CoQ10',
    enTitle: 'Migraine context supplements: magnesium, B2, and CoQ10',
    priorityTopics: [
      'magnesium',
      'riboflavin',
      'coenzyme-q10'
    ],
    relatedLinks: [
      '/portal/category/sleep',
      '/portal/category/common-deficiencies',
      '/portal/supplement/magnesium?benefit=migraine-headache',
      '/portal/supplement/riboflavin?benefit=migraine-headache'
    ],
    faqCount: 4
  }
] as const;

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

  it.each(integratedClusterCases)('adds curated SEO content for $slug', (cluster) => {
    const copyEs = buildCategorySeoCopy({
      slug: cluster.slug,
      categoryName: cluster.slug,
      categoryDescription: 'Cluster description.',
      locale: 'es',
    });
    const copyEn = buildCategorySeoCopy({
      slug: cluster.slug,
      categoryName: cluster.slug,
      categoryDescription: 'Cluster description.',
      locale: 'en',
    });
    const contentEs = buildCategorySeoContent(cluster.slug, 'es');
    const contentEn = buildCategorySeoContent(cluster.slug, 'en');

    expect(copyEs.title).toBe(cluster.esTitle);
    expect(copyEn.title).toBe(cluster.enTitle);
    expect(copyEs.title).not.toContain('evidencia científica');
    expect(copyEn.title).not.toContain('Evidence-based supplements');
    expect(contentEs).not.toBeNull();
    expect(contentEn).not.toBeNull();
    expect(contentEs?.priorityTopics?.map((topic) => topic.supplementSlug)).toEqual(cluster.priorityTopics);
    expect(contentEn?.priorityTopics?.map((topic) => topic.supplementSlug)).toEqual(cluster.priorityTopics);
    expect(contentEs?.relatedLinks?.map((link) => link.href)).toEqual(cluster.relatedLinks);
    expect(contentEn?.relatedLinks?.map((link) => link.href)).toEqual(cluster.relatedLinks);
    expect(contentEs?.faqs).toHaveLength(cluster.faqCount);
    expect(contentEn?.faqs).toHaveLength(cluster.faqCount);

    const serialized = JSON.stringify([copyEs, copyEn, contentEs, contentEn]);
    expect(serialized).not.toMatch(integratedClusterUnsafePattern);
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
    ]);

    expect(serialized).not.toMatch(unsafePattern);
    expect(serialized).not.toContain('"@type":"Product"');
  });
});
