import type { Metadata } from 'next';
import PortalPageClient from './PortalPageClient';
import { localizedPath, siteUrl, type SeoLocale } from '@/lib/seo';

type PortalPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({ params }: PortalPageProps): Promise<Metadata> {
  const { locale } = await params;
  const seoLocale: SeoLocale = locale === 'en' ? 'en' : 'es';
  const title = seoLocale === 'es'
    ? 'Buscador de suplementos por evidencia y seguridad'
    : 'Evidence-Based Supplement Search by Goal and Safety';
  const description = seoLocale === 'es'
    ? 'Busca suplementos por objetivo de salud y compara evidencia, seguridad, interacciones y uso responsable en español.'
    : 'Search supplements by health goal and compare evidence, safety, interactions, and responsible-use guidance.';

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: localizedPath(seoLocale, '/portal'),
      languages: {
        es: localizedPath('es', '/portal'),
        en: localizedPath('en', '/portal'),
        'x-default': localizedPath('es', '/portal'),
      },
    },
    openGraph: {
      type: 'website',
      locale: seoLocale === 'es' ? 'es_MX' : 'en_US',
      url: localizedPath(seoLocale, '/portal'),
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

export default function PortalPage() {
  return <PortalPageClient />;
}
