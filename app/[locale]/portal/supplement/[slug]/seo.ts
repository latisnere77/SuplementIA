import type { Metadata } from 'next';
import { getCanonicalSupplementQuery, getAllCategories } from '@/lib/knowledge-base';
import { getLocalizedSupplementName } from '@/lib/i18n/supplement-names';
import { getUniqueSupplements, localizedPath, seoLocales, siteUrl, type SeoLocale } from '@/lib/seo';

export type SupplementSeoData = {
  slug: string;
  canonicalName: string;
  localizedName: string;
  summary: string;
  categories: string[];
};

const forbiddenClinicalWording = [
  'sirve para',
  'treats',
  'cures',
  'beneficio comprobado',
  'clinical benefit',
];

export function sanitizeSupplementSeoText(value: string) {
  return forbiddenClinicalWording.reduce(
    (text, phrase) => text.replace(new RegExp(phrase, 'gi'), ''),
    value
  ).replace(/\s+/g, ' ').trim();
}

export function getSupplementSeoData(slug: string, locale: SeoLocale): SupplementSeoData | null {
  const supplement = getUniqueSupplements().find(item => item.slug === slug);

  if (!supplement) {
    return null;
  }

  const canonicalName = getCanonicalSupplementQuery(slug, supplement.name);
  const localizedName = getLocalizedSupplementName(canonicalName, locale);
  const categoryNames = getAllCategories()
    .filter(category => category.supplements.some(item => item.slug === slug))
    .map(category => category.name);

  return {
    slug,
    canonicalName,
    localizedName,
    summary: supplement.summary,
    categories: categoryNames,
  };
}

export function buildSupplementTitle(data: SupplementSeoData, locale: SeoLocale) {
  const targetedTitles: Partial<Record<string, Record<SeoLocale, string>>> = {
    'fiber-psyllium': {
      es: 'Psyllium fiber: evidencia para LDL, digestión y seguridad',
      en: 'Psyllium fiber: evidence for LDL cholesterol, digestion, and safety',
    },
    'coenzyme-q10': {
      es: 'Coenzima Q10: evidencia cardiovascular, migraña y seguridad',
      en: 'Coenzyme Q10: heart health, migraine evidence, and safety',
    },
    'hydrolyzed-collagen': {
      es: 'Colágeno hidrolizado: evidencia para articulaciones, piel y seguridad',
      en: 'Hydrolyzed collagen: evidence for joints, skin, and safety',
    },
    'rhodiola-rosea': {
      es: 'Rhodiola rosea: evidencia para fatiga, estrés y seguridad',
      en: 'Rhodiola rosea: evidence for fatigue, stress, and safety',
    },
    lavender: {
      es: 'Lavanda: evidencia para sueño, calma y seguridad',
      en: 'Lavender: evidence for sleep, calm, and safety',
    },
  };

  const targetedTitle = targetedTitles[data.slug]?.[locale];

  if (targetedTitle) {
    return targetedTitle;
  }

  return locale === 'es'
    ? `${data.localizedName}: evidencia, estudios y seguridad`
    : `${data.localizedName}: evidence, studies, and safety`;
}

export function buildSupplementDescription(data: SupplementSeoData, locale: SeoLocale) {
  const targetedDescriptions: Partial<Record<string, Record<SeoLocale, string>>> = {
    'fiber-psyllium': {
      es: 'Revisa psyllium fiber para colesterol LDL, triglicéridos, digestión, tolerancia y uso responsable junto con dieta y laboratorios.',
      en: 'Review psyllium fiber for LDL cholesterol, triglycerides, digestion, tolerance, and responsible use alongside diet and lab follow-up.',
    },
    'coenzyme-q10': {
      es: 'Consulta evidencia prudente sobre coenzima Q10 en salud cardiovascular, migraña, energía celular, seguridad e interacciones.',
      en: 'Review careful evidence for coenzyme Q10 in heart health, migraine, cellular energy, safety, and interactions.',
    },
    'hydrolyzed-collagen': {
      es: 'Compara evidencia de colágeno hidrolizado para articulaciones, piel, tejidos conectivos, seguridad y expectativas realistas.',
      en: 'Compare hydrolyzed collagen evidence for joints, skin, connective tissue, safety, and realistic expectations.',
    },
    'rhodiola-rosea': {
      es: 'Revisa rhodiola rosea para fatiga, estrés, rendimiento mental, seguridad y diferencias entre extractos estudiados.',
      en: 'Review rhodiola rosea for fatigue, stress, mental performance, safety, and differences between studied extracts.',
    },
    lavender: {
      es: 'Consulta evidencia de lavanda para sueño, ansiedad leve, formas de uso, seguridad y precauciones con sedantes.',
      en: 'Review lavender evidence for sleep, mild anxiety, forms of use, safety, and precautions with sedatives.',
    },
  };

  const targetedDescription = targetedDescriptions[data.slug]?.[locale];

  if (targetedDescription) {
    return sanitizeSupplementSeoText(targetedDescription);
  }

  const description = locale === 'es'
    ? `Consulta un resumen prudente sobre ${data.localizedName}, tipos de evidencia publicada, seguridad y contexto de uso responsable. Incluye analisis dinamico de literatura cuando esta disponible.`
    : `Review a careful summary for ${data.localizedName}, published evidence types, safety context, and responsible use. Includes dynamic literature analysis when available.`;

  return sanitizeSupplementSeoText(description);
}

export function localizedSupplementAlternates(path: string) {
  return {
    es: localizedPath('es', path),
    en: localizedPath('en', path),
    'x-default': localizedPath('es', path),
  };
}

export function buildSupplementStructuredData(data: SupplementSeoData, locale: SeoLocale) {
  const path = `/portal/supplement/${data.slug}`;
  const pageUrl = localizedPath(locale, path);
  const inLanguage = locale === 'es' ? 'es-MX' : 'en';
  const pageName = buildSupplementTitle(data, locale);
  const description = buildSupplementDescription(data, locale);

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'MedicalWebPage',
      '@id': `${pageUrl}#webpage`,
      name: pageName,
      description,
      url: pageUrl,
      inLanguage,
      isPartOf: {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
      },
      about: {
        '@type': 'Thing',
        name: data.localizedName,
        alternateName: data.canonicalName === data.localizedName ? undefined : data.canonicalName,
        description: sanitizeSupplementSeoText(data.summary),
      },
      audience: {
        '@type': 'Audience',
        audienceType: locale === 'es' ? 'Personas investigando suplementos' : 'People researching supplements',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'SuplementAI',
          item: localizedPath(locale, '/portal'),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Portal',
          item: localizedPath(locale, '/portal'),
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: data.localizedName,
          item: pageUrl,
        },
      ],
    },
  ];
}

export function generateSupplementStaticParams() {
  return seoLocales.flatMap((locale) =>
    getUniqueSupplements().map((supplement) => ({
      locale,
      slug: supplement.slug,
    }))
  );
}

export function generateSupplementMetadata(locale: string, slug: string): Metadata {
  const seoLocale: SeoLocale = locale === 'en' ? 'en' : 'es';
  const data = getSupplementSeoData(slug, seoLocale);

  if (!data) {
    return {};
  }

  const path = `/portal/supplement/${slug}`;
  const title = buildSupplementTitle(data, seoLocale);
  const description = buildSupplementDescription(data, seoLocale);

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: localizedPath(seoLocale, path),
      languages: localizedSupplementAlternates(path),
    },
    openGraph: {
      type: 'article',
      locale: seoLocale === 'es' ? 'es_MX' : 'en_US',
      url: localizedPath(seoLocale, path),
      title,
      description,
      siteName: 'SuplementAI',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: ['/icon.svg'],
    },
  };
}
