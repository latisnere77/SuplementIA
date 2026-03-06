// app/[locale]/portal/results/page.tsx
// Server component wrapper — exports generateMetadata for SEO
// Client logic is in ResultsClient.tsx
import type { Metadata } from 'next';
import ResultsClient from './ResultsClient';

type Props = {
  params: { locale: string };
  searchParams: { q?: string; benefit?: string };
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const q = searchParams.q ?? '';
  const locale = params.locale;
  const isEs = locale === 'es';

  const supplementDisplay = q
    ? q.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '';

  const title = q
    ? (isEs
        ? `${supplementDisplay} — Evidencia Científica | SuplementIA`
        : `${supplementDisplay} — Scientific Evidence | SuplementIA`)
    : (isEs ? 'Resultados | SuplementIA' : 'Results | SuplementIA');

  const description = q
    ? (isEs
        ? `Efectividad, dosis y calidad de evidencia científica para ${supplementDisplay}.`
        : `Effectiveness, dosage, and scientific evidence quality for ${supplementDisplay}.`)
    : (isEs ? 'Resultados de búsqueda de suplementos' : 'Supplement search results');

  // https://suplementia.com is the production domain (confirm before go-live)
  const baseUrl = 'https://suplementia.com';
  const canonicalUrl = q
    ? `${baseUrl}/${locale}/portal/results?q=${encodeURIComponent(q)}`
    : `${baseUrl}/${locale}/portal/results`;

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

export default function ResultsPage(_props: Props) {
  return <ResultsClient />;
}
