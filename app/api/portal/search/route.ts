import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getWeaviateClient, WEAVIATE_CLASS_NAME } from '@/lib/weaviate-client';

// Schema for the search request
const QuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().min(1).max(20).default(5),
});

// Initialize Weaviate Client
const client = getWeaviateClient();

const CLASS_NAME = WEAVIATE_CLASS_NAME;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get('q');
  const rawLimit = searchParams.get('limit');

  const validation = QuerySchema.safeParse({ q: rawQuery, limit: rawLimit });

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const { q, limit } = validation.data;

  // Fallback to mock logic if Weaviate is not configured (e.g. locally without keys)
  if (!client) {
    console.warn("⚠️ Weaviate not configured. Returning mock data.");
    const MOCK_DATA = [
      {
        title: '[MOCK] Copper Peptides for Skin',
        abstract: 'Mock paper about copper peptides and collagen synthesis.',
        ingredients: ['Copper Peptides'],
        score: 0.99
      },
      {
        title: '[MOCK] Vitamin D and Immunity',
        abstract: 'Study on Vitamin D effects on immune system.',
        ingredients: ['Vitamin D'],
        score: 0.95
      },
    ];
    // Simple filter for mock
    const results = MOCK_DATA.filter(item =>
      item.title.toLowerCase().includes(q.toLowerCase()) ||
      item.ingredients.some(i => i.toLowerCase().includes(q.toLowerCase()))
    );
    return NextResponse.json(results);
  }

  try {
    // Execute Hybrid Search (Vector + BM25)
    // Alpha 0.75 leans towards vector search (semantic) but keeps keyword precision from BM25
    const result = await client.graphql
      .get()
      .withClassName(CLASS_NAME)
      .withFields('title abstract ingredients conditions year _additional { score distance }')
      .withHybrid({
        query: q,
        alpha: 0.75,
      })
      .withLimit(limit)
      .do();

    const hits = result.data.Get[CLASS_NAME];

    // Transform Weaviate response to a simplified API response
    const formattedResults = hits.map((hit: any) => ({
      title: hit.title,
      abstract: hit.abstract,
      ingredients: hit.ingredients,
      conditions: hit.conditions,
      year: hit.year,
      score: hit._additional?.score,
    }));

    return NextResponse.json(formattedResults);

  } catch (error) {
    console.error("❌ Hybrid Search Error:", error);
    return NextResponse.json({ error: 'Internal Search Error' }, { status: 500 });
  }
}