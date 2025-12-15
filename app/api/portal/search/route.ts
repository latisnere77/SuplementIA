import { NextResponse } from 'next/server';
import { z } from 'zod';
import weaviate from 'weaviate-ts-client';

// Schema for the search request
const QuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().min(1).max(20).default(5),
});

// Environment variables
const scheme = process.env.WEAVIATE_SCHEME || 'https';
const host = process.env.WEAVIATE_HOST || '';
const apiKey = process.env.WEAVIATE_API_KEY || '';
const cohereKey = process.env.COHERE_API_KEY || '';

// Initialize Weaviate Client
// Note: In a real production app, this should be a singleton in a lib/ folder.
const client = (host && apiKey && cohereKey)
  ? weaviate.client({
    scheme: scheme,
    host: host,
    apiKey: { apiKey: apiKey },
    headers: { 'X-Cohere-Api-Key': cohereKey },
  })
  : null;

const CLASS_NAME = 'SupplementPaper'; // Must match the schema created in the PoC

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