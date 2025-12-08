/**
 * Dynamic Category Page
 * 
 * Renders a curated list of supplements for a specific health category,
 * ordered by evidence level.
 */
import { getCategoryBySlug } from '@/lib/knowledge-base';
import { SupplementEvidenceCard } from '@/components/portal/SupplementEvidenceCard';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface CategoryPageProps {
  params: {
    slug: string;
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  // Sort supplements by evidence grade (A -> F)
  const sortedSupplements = [...category.supplements].sort((a, b) => 
    a.evidenceGrade.localeCompare(b.evidenceGrade)
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/portal/search" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver a Búsqueda
      </Link>
      
      <h1 className="text-4xl font-bold text-gray-900 mb-2">{category.name}</h1>
      <p className="text-lg text-gray-600 mb-8">{category.description}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedSupplements.map(supplement => (
          <SupplementEvidenceCard 
            key={supplement.slug} 
            supplement={supplement}
            categorySlug={category.slug}
          />
        ))}
      </div>
    </div>
  );
}
