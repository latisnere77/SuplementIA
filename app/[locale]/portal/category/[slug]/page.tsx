/**
 * Dynamic Category Page
 * 
 * Renders a curated list of supplements for a specific health category,
 * ordered by evidence level.
 */
import { getCategoryBySlug, getAllCategories } from '@/lib/knowledge-base';
import { SupplementEvidenceCard } from '@/components/portal/SupplementEvidenceCard';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { localizedPath, seoLocales, siteUrl } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';

// Tell Next.js about all possible category slugs to pre-render them
export async function generateStaticParams() {
  const categories = getAllCategories();

  return seoLocales.flatMap((locale) =>
    categories.map((category) => ({
      locale,
      slug: category.slug,
    }))
  );
}

interface CategoryPageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    return {};
  }

  const seoLocale = locale === 'en' ? 'en' : 'es';
  const t = await getTranslations({ locale: seoLocale });
  const path = `/portal/category/${category.slug}`;
  const categoryName = t(`portal.categories.${category.slug}.name`);
  const categoryDescription = t(`portal.categories.${category.slug}.desc`);
  const title = seoLocale === 'es'
    ? `Suplementos para ${categoryName.toLowerCase()} con evidencia cientifica`
    : `Evidence-based supplements for ${categoryName}`;
  const description = seoLocale === 'es'
    ? `${categoryDescription} Compara suplementos por nivel de evidencia, estudios y uso responsable en Mexico.`
    : `${categoryDescription} Compare supplements by evidence level, studies, and responsible use.`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: localizedPath(seoLocale, path),
      languages: {
        es: localizedPath('es', path),
        en: localizedPath('en', path),
        'x-default': localizedPath('es', path),
      },
    },
    openGraph: {
      type: 'article',
      locale: seoLocale === 'es' ? 'es_MX' : 'en_US',
      url: localizedPath(seoLocale, path),
      title,
      description,
      siteName: 'SuplementAI',
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { locale, slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const seoLocale = locale === 'en' ? 'en' : 'es';
  const t = await getTranslations({ locale: seoLocale });
  const categoryName = t(`portal.categories.${category.slug}.name`);
  const categoryDescription = t(`portal.categories.${category.slug}.desc`);
  const categoryPath = `/portal/category/${category.slug}`;
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: seoLocale === 'es'
        ? `Suplementos para ${categoryName.toLowerCase()}`
        : `Supplements for ${categoryName}`,
      description: categoryDescription,
      url: localizedPath(seoLocale, categoryPath),
      inLanguage: seoLocale === 'es' ? 'es-MX' : 'en',
      isPartOf: {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
      },
      about: category.supplements.map((supplement) => ({
        '@type': 'DietarySupplement',
        name: supplement.name,
        description: supplement.summary,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'SuplementAI',
          item: localizedPath(seoLocale),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: seoLocale === 'es' ? 'Categorias' : 'Categories',
          item: localizedPath(seoLocale, '/portal'),
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: categoryName,
          item: localizedPath(seoLocale, categoryPath),
        },
      ],
    },
  ];

  // Sort supplements by evidence grade (A -> F)
  const sortedSupplements = [...category.supplements].sort((a, b) => 
    a.evidenceGrade.localeCompare(b.evidenceGrade)
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <Link href={`/${seoLocale}/portal`} className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {seoLocale === 'es' ? 'Volver a Búsqueda' : 'Back to Search'}
      </Link>
      
      <h1 className="text-4xl font-bold text-gray-900 mb-2">{categoryName}</h1>
      <p className="text-lg text-gray-600 mb-8">{categoryDescription}</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
        {sortedSupplements.map(supplement => (
          <SupplementEvidenceCard 
            key={supplement.slug} 
            supplement={supplement}
            categorySlug={category.slug}
            locale={seoLocale}
          />
        ))}
      </div>
    </div>
  );
}
