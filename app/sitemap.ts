import type { MetadataRoute } from 'next';
import { getAllCategories } from '@/lib/knowledge-base';
import { getUniqueSupplements, localizedPath, seoLocales, siteUrl } from '@/lib/seo';

const now = new Date();

function localizedAlternates(path = '') {
  return {
    languages: {
      es: localizedPath('es', path),
      en: localizedPath('en', path),
      'x-default': localizedPath('es', path),
    },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
      alternates: localizedAlternates(),
    },
  ];

  for (const locale of seoLocales) {
    routes.push(
      {
        url: localizedPath(locale),
        lastModified: now,
        changeFrequency: 'daily',
        priority: locale === 'es' ? 1 : 0.9,
        alternates: localizedAlternates(),
      },
      {
        url: localizedPath(locale, '/portal'),
        lastModified: now,
        changeFrequency: 'daily',
        priority: locale === 'es' ? 0.95 : 0.85,
        alternates: localizedAlternates('/portal'),
      },
      {
        url: localizedPath(locale, '/portal/subscription'),
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.45,
        alternates: localizedAlternates('/portal/subscription'),
      },
    );

    for (const category of getAllCategories()) {
      routes.push({
        url: localizedPath(locale, `/portal/category/${category.slug}`),
        lastModified: now,
        changeFrequency: 'weekly',
        priority: locale === 'es' ? 0.85 : 0.75,
        alternates: localizedAlternates(`/portal/category/${category.slug}`),
      });
    }

    for (const supplement of getUniqueSupplements()) {
      routes.push({
        url: localizedPath(locale, `/portal/supplement/${supplement.slug}`),
        lastModified: now,
        changeFrequency: 'weekly',
        priority: locale === 'es' ? 0.8 : 0.7,
        alternates: localizedAlternates(`/portal/supplement/${supplement.slug}`),
      });
    }
  }

  return routes;
}
