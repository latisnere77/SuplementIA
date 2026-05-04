import { getAllCategories } from '@/lib/knowledge-base';

export const siteUrl = 'https://suplementai.com';

export const seoLocales = ['es', 'en'] as const;

export type SeoLocale = (typeof seoLocales)[number];

export const defaultSeoLocale: SeoLocale = 'es';

export const localeAlternates = {
  es: `${siteUrl}/es`,
  en: `${siteUrl}/en`,
  'x-default': `${siteUrl}/es`,
};

export const mexicanSeoKeywords = [
  'suplementos basados en evidencia',
  'suplementos con evidencia cientifica',
  'suplementos para dormir',
  'suplementos para ansiedad',
  'suplementos para energia',
  'suplementos para inflamacion',
  'suplementos para colesterol',
  'suplementos para memoria',
  'magnesio para dormir',
  'omega 3 para trigliceridos',
  'vitamina d para sistema inmune',
  'creatina para rendimiento',
  'berberina para glucosa',
  'probioticos para salud digestiva',
  'ashwagandha para estres',
  'suplementos para controlar glucosa',
  'suplementos para colesterol y trigliceridos',
  'suplementos para inflamacion',
  'suplementos para rendimiento deportivo',
  'suplementos para salud hormonal',
  'suplementos para migraña',
  'deficiencia de vitamina d',
  'deficiencia de hierro',
  'Mexico',
];

export const globalSeo = {
  es: {
    title: 'SuplementAI | Suplementos con evidencia cientifica en Mexico',
    description:
      'Encuentra suplementos con respaldo cientifico para dormir mejor, energia, ansiedad, digestion, memoria y salud general. Informacion clara para Mexico en espanol.',
  },
  en: {
    title: 'SuplementAI | Evidence-Based Supplement Guidance',
    description:
      'Find evidence-based supplement guidance for sleep, energy, anxiety, digestion, memory, performance, and overall health.',
  },
} satisfies Record<SeoLocale, { title: string; description: string }>;

export function localizedPath(locale: SeoLocale, path = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl}/${locale}${normalizedPath === '/' ? '' : normalizedPath}`;
}

export function getUniqueSupplements() {
  const supplements = new Map<string, { name: string; slug: string; summary: string }>();

  for (const category of getAllCategories()) {
    for (const supplement of category.supplements) {
      if (!supplements.has(supplement.slug)) {
        supplements.set(supplement.slug, {
          name: supplement.name,
          slug: supplement.slug,
          summary: supplement.summary,
        });
      }
    }
  }

  return [...supplements.values()];
}

export function buildStructuredData(locale: SeoLocale) {
  const inLanguage = locale === 'es' ? 'es-MX' : 'en';

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'SuplementAI',
      url: siteUrl,
      logo: `${siteUrl}/icon.svg`,
      areaServed: {
        '@type': 'Country',
        name: 'Mexico',
      },
      sameAs: [],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      name: 'SuplementAI',
      url: siteUrl,
      inLanguage,
      publisher: {
        '@id': `${siteUrl}/#organization`,
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${localizedPath(locale, '/portal/results')}?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ];
}
