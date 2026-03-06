// app/[locale]/portal/supplement/[slug]/page.tsx
// Server component wrapper — exports generateMetadata for SEO
// Client logic is in SupplementDetailClient.tsx
import type { Metadata } from 'next';
import SupplementDetailClient from './SupplementDetailClient';

type Props = {
  params: { locale: string; slug: string };
  searchParams: { benefit?: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = params.slug;
  const locale = params.locale;
  const isEs = locale === 'es';

  const supplementDisplay = slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const title = isEs
    ? `${supplementDisplay} — Evidencia Científica | SuplementIA`
    : `${supplementDisplay} — Scientific Evidence | SuplementIA`;

  const description = isEs
    ? `Efectividad, dosis y calidad de evidencia científica para ${supplementDisplay}.`
    : `Effectiveness, dosage, and scientific evidence quality for ${supplementDisplay}.`;

  // https://suplementia.com is the production domain (confirm before go-live)
  const baseUrl = 'https://suplementia.com';
  const canonicalUrl = `${baseUrl}/${locale}/portal/supplement/${encodeURIComponent(slug)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'SuplementIA',
      locale,
    },
    alternates: { canonical: canonicalUrl },
  };
}

export default function SupplementDetailPage(_props: Props) {
  return <SupplementDetailClient />;
}
