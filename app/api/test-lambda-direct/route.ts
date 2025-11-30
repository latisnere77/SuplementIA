import { NextResponse } from 'next/server';

export async function GET() {
  const searchApiUrl = process.env.SEARCH_API_URL ||
    process.env.NEXT_PUBLIC_SEARCH_API_URL ||
    'https://staging-search-api.execute-api.us-east-1.amazonaws.com/search';

  try {
    const response = await fetch(`${searchApiUrl}?q=vitamin%20c`, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SuplementIA-Frontend/1.0',
      },
    });

    const data = await response.json();

    return NextResponse.json({
      searchApiUrl,
      status: response.status,
      ok: response.ok,
      data,
      envVars: {
        SEARCH_API_URL: process.env.SEARCH_API_URL || 'undefined',
        NEXT_PUBLIC_SEARCH_API_URL: process.env.NEXT_PUBLIC_SEARCH_API_URL || 'undefined',
      },
    });
  } catch (error) {
    return NextResponse.json({
      searchApiUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
      envVars: {
        SEARCH_API_URL: process.env.SEARCH_API_URL || 'undefined',
        NEXT_PUBLIC_SEARCH_API_URL: process.env.NEXT_PUBLIC_SEARCH_API_URL || 'undefined',
      },
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
