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
  return locale === 'es'
    ? `${data.localizedName}: evidencia, estudios y seguridad`
    : `${data.localizedName}: evidence, studies, and safety`;
}

export function buildSupplementDescription(data: SupplementSeoData, locale: SeoLocale) {
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
