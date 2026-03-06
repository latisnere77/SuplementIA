// app/sitemap.ts
// Auto-generated sitemap from SUPPLEMENTS_DATABASE
// Production base URL: https://suplementia.com (confirm before go-live)
import { MetadataRoute } from 'next';
import { SUPPLEMENTS_DATABASE } from '@/lib/portal/supplements-database';

const BASE_URL = 'https://suplementia.com';
const LOCALES = ['es', 'en'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  // Derive unique base slugs by stripping -es/-en suffix
  // Example: "ashwagandha-es" → "ashwagandha", "vitamin-c" → "vitamin-c"
  const slugs = [
    ...new Set(SUPPLEMENTS_DATABASE.map((e) => e.id.replace(/-(?:es|en)$/, ''))),
  ];

  const supplementUrls: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    slugs.map((slug) => ({
      url: `${BASE_URL}/${locale}/portal/results?q=${encodeURIComponent(slug)}`,
      lastModified: new Date('2026-03-06'),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  );

  const indexUrls: MetadataRoute.Sitemap = LOCALES.map((locale) => ({
    url: `${BASE_URL}/${locale}/portal`,
    lastModified: new Date('2026-03-06'),
    changeFrequency: 'weekly' as const,
    priority: 1.0,
  }));

  return [...indexUrls, ...supplementUrls];
}
