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

function buildCategorySeoCopy({
  slug,
  categoryName,
  categoryDescription,
  locale,
}: {
  slug: string;
  categoryName: string;
  categoryDescription: string;
  locale: 'es' | 'en';
}) {
  const targetedCopy: Record<string, Record<'es' | 'en', { title: string; description: string }>> = {
    'cholesterol-triglycerides': {
      es: {
        title: 'Suplementos para colesterol y triglicéridos: evidencia y seguridad',
        description:
          'Compara suplementos estudiados para colesterol y triglicéridos, incluyendo evidencia, seguridad y uso responsable en México.',
      },
      en: {
        title: 'Supplements for cholesterol and triglycerides: evidence and safety',
        description:
          'Compare supplements studied for cholesterol and triglycerides, including evidence level, safety context, and responsible use.',
      },
    },
    sleep: {
      es: {
        title: 'Suplementos para dormir: evidencia, dosis y seguridad',
        description:
          'Compara suplementos para sueño como melatonina, magnesio y L-teanina por evidencia, seguridad y uso responsable.',
      },
      en: {
        title: 'Supplements for sleep: evidence, dosage, and safety',
        description:
          'Compare sleep supplements such as melatonin, magnesium, and L-theanine by evidence level, safety context, and responsible use.',
      },
    },
    'heart-health': {
      es: {
        title: 'Suplementos para salud cardiovascular: evidencia y seguridad',
        description:
          'Revisa suplementos estudiados para salud cardiovascular con enfoque en evidencia, seguridad y contexto de uso responsable.',
      },
      en: {
        title: 'Supplements for heart health: evidence and safety',
        description:
          'Review supplements studied for heart health with evidence level, safety context, and responsible-use guidance.',
      },
    },
  };

  const targeted = targetedCopy[slug]?.[locale];

  if (targeted) {
    return targeted;
  }

  return locale === 'es'
    ? {
      title: `Suplementos para ${categoryName.toLowerCase()} con evidencia científica`,
      description: `${categoryDescription} Compara suplementos por nivel de evidencia, estudios y uso responsable en México.`,
    }
    : {
      title: `Evidence-based supplements for ${categoryName}`,
      description: `${categoryDescription} Compare supplements by evidence level, studies, and responsible use.`,
    };
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
