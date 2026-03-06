// app/robots.ts
// Serves /robots.txt — directs crawlers to sitemap
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://suplementia.com/sitemap.xml',
  };
}
