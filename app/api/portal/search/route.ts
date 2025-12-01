import { NextResponse } from 'next/server';
import { z } from 'zod';

// This is a mock search implementation.
// In a real application, this would be a call to a search service (e.g., Elasticsearch, Algolia, or a database).

const MOCK_DATA = [
  { id: '1', name: 'Copper Peptides', slug: 'copper-peptides' },
  { id: '2', name: 'Vitamin C', slug: 'vitamin-c' },
  { id: '3', name: 'Vitamin D', slug: 'vitamin-d' },
  { id: '4', name: 'Omega-3', slug: 'omega-3' },
  { id: '5', name: 'Magnesium', slug: 'magnesium' },
  { id: '6', name: 'Creatine', slug: 'creatine' },
];

const QuerySchema = z.object({
  q: z.string().min(1),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  const validation = QuerySchema.safeParse({ q: query });

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  const searchTerm = validation.data.q.toLowerCase();

  const results = MOCK_DATA.filter(item =>
    item.name.toLowerCase().includes(searchTerm)
  ).map(item => ({ ...item, score: Math.random() }));

  return NextResponse.json(results);
}