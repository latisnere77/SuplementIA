/**
 * Dynamic Category Page
 * 
 * Renders a curated list of supplements for a specific health category,
 * ordered by evidence level.
 */
import { getCategoryBySlug, getAllCategories, getLocalizedCategorySupplements } from '@/lib/knowledge-base';
import { SupplementEvidenceCard } from '@/components/portal/SupplementEvidenceCard';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { localizedPath, seoLocales, siteUrl } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';
import { buildCategorySeoContent, buildCategorySeoCopy } from './seo';

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
  const { title, description } = buildCategorySeoCopy({
    slug: category.slug,
    categoryName,
    categoryDescription,
    locale: seoLocale,
  });

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
  const seoContent = buildCategorySeoContent(category.slug, seoLocale);
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
      about: getLocalizedCategorySupplements(category, seoLocale).map((supplement) => ({
        '@type': 'Thing',
        name: supplement.name,
        description: supplement.summary,
      })),
      hasPart: seoContent?.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
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
          item: localizedPath(seoLocale, '/portal'),
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
  const sortedSupplements = getLocalizedCategorySupplements(category, seoLocale).sort((a, b) =>
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

      {seoContent && (
        <section className="mb-10 space-y-6" aria-labelledby="category-guide-heading">
          <div>
            <h2 id="category-guide-heading" className="text-2xl font-semibold text-gray-900 mb-3">
              {seoLocale === 'es' ? 'Guía de evidencia' : 'Evidence guide'}
            </h2>
            <p className="text-base leading-7 text-gray-700">{seoContent.intro}</p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {seoLocale === 'es' ? 'Cómo interpretar esta categoría' : 'How to interpret this category'}
            </h3>
            <ul className="space-y-2 text-sm leading-6 text-gray-700">
              {seoContent.highlights.map((highlight) => (
                <li key={highlight} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gray-500" aria-hidden="true" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>

          {seoContent.priorityTopics && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {seoLocale === 'es' ? 'Comparaciones prioritarias' : 'Priority comparisons'}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {seoContent.priorityTopics.map((topic) => (
                  <Link
                    key={topic.supplementSlug}
                    href={`/${seoLocale}/portal/supplement/${topic.supplementSlug}?benefit=${category.slug}`}
                    className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400 hover:shadow-sm"
                  >
                    <span className="block text-base font-semibold text-gray-900">{topic.title}</span>
                    <span className="mt-2 block text-sm leading-6 text-gray-700">{topic.description}</span>
                    <span className="mt-3 block text-sm font-medium text-blue-700">{topic.searchLabel}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {seoContent.relatedLinks && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {seoLocale === 'es' ? 'Siguiente lectura recomendada' : 'Recommended next reading'}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {seoContent.relatedLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={`/${seoLocale}${link.href}`}
                    className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400 hover:shadow-sm"
                  >
                    <span className="block text-base font-semibold text-gray-900">{link.title}</span>
                    <span className="mt-2 block text-sm leading-6 text-gray-700">{link.description}</span>
                    <span className="mt-3 block text-sm font-medium text-blue-700">{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
      
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {seoLocale === 'es' ? 'Suplementos comparados' : 'Compared supplements'}
      </h2>
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

      {seoContent && (
        <section className="mt-10 space-y-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {seoLocale === 'es' ? 'Guías de suplementos' : 'Supplement guides'}
            </h2>
            <div className="flex flex-wrap gap-2">
              {sortedSupplements.map((supplement) => (
                <Link
                  key={supplement.slug}
                  href={`/${seoLocale}/portal/supplement/${supplement.slug}?benefit=${category.slug}`}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 hover:text-gray-950"
                >
                  {supplement.name}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {seoLocale === 'es' ? 'Preguntas frecuentes' : 'Frequently asked questions'}
            </h2>
            <div className="space-y-3">
              {seoContent.faqs.map((faq) => (
                <details key={faq.question} className="rounded-lg border border-gray-200 bg-white p-4">
                  <summary className="cursor-pointer text-base font-semibold text-gray-900">{faq.question}</summary>
                  <p className="mt-3 text-sm leading-6 text-gray-700">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
