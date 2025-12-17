
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { searchSupplements } from '@/lib/search-service';

// Schema for the search request
const QuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().min(1).max(20).default(5),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get('q');
  const rawLimit = searchParams.get('limit');

  const validation = QuerySchema.safeParse({ q: rawQuery, limit: rawLimit });

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const { q, limit } = validation.data;

  try {
    // Execute Search via Serverless Lambda (LanceDB)
    console.log(`[Search-API] Searching for "${q}" via Lambda`);
    const formattedResults = await searchSupplements(q, limit);

    return NextResponse.json(formattedResults);

  } catch (error) {
    console.error("❌ Search Error:", error);
    return NextResponse.json({ error: 'Internal Search Error' }, { status: 500 });
  }
}