/**
 * API Route for Health Categories
 * 
 * Fetches curated supplement data for a specific health category from the knowledge base.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCategoryBySlug } from '@/lib/knowledge-base';

interface CategoryApiProps {
  params: {
    slug: string;
  };
}

export async function GET(request: NextRequest, { params }: CategoryApiProps) {
  try {
    const { slug } = params;
    
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Category slug is required' }, { status: 400 });
    }

    const category = getCategoryBySlug(slug);

    if (!category) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }
    
    // Sort supplements by evidence grade (A -> F) for consistent ordering
    const sortedSupplements = [...category.supplements].sort((a, b) => 
      a.evidenceGrade.localeCompare(b.evidenceGrade)
    );

    return NextResponse.json({
      success: true,
      category: {
        ...category,
        supplements: sortedSupplements,
      },
    });

  } catch (error: any) {
    console.error(`Error fetching category data for slug: ${params.slug}`, error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
