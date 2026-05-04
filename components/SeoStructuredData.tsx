import { buildStructuredData, type SeoLocale } from '@/lib/seo';

export default function SeoStructuredData({ locale }: { locale: string }) {
  const seoLocale: SeoLocale = locale === 'en' ? 'en' : 'es';

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(buildStructuredData(seoLocale)).replace(/</g, '\\u003c'),
      }}
    />
  );
}
