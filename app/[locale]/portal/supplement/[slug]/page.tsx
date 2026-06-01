import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SupplementDetailClient from './SupplementDetailClient';
import { type SeoLocale } from '@/lib/seo';
import {
  generateSupplementMetadata,
  generateSupplementStaticParams,
  buildSupplementStructuredData,
  buildSupplementSeoContent,
  getSupplementSeoData,
} from './seo';

type SupplementPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return generateSupplementStaticParams();
}

export async function generateMetadata({ params }: SupplementPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  return generateSupplementMetadata(locale, slug);
}

export default async function SupplementPage({ params }: SupplementPageProps) {
  const { locale, slug } = await params;
  const seoLocale: SeoLocale = locale === 'en' ? 'en' : 'es';
  const data = getSupplementSeoData(slug, seoLocale);

  if (!data) {
    notFound();
  }

  const structuredData = buildSupplementStructuredData(data, seoLocale);
  const seoContent = buildSupplementSeoContent(slug, seoLocale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <SupplementDetailClient slug={slug} locale={seoLocale} seoContent={seoContent} />
    </>
  );
}
