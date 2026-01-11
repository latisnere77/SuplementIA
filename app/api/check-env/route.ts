import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_USE_INTELLIGENT_SEARCH: process.env.NEXT_PUBLIC_USE_INTELLIGENT_SEARCH || 'undefined',
    isTrue: process.env.NEXT_PUBLIC_USE_INTELLIGENT_SEARCH === 'true',
    NODE_ENV: process.env.NODE_ENV,
    SEARCH_API_URL: process.env.SEARCH_API_URL || 'undefined',
    NEXT_PUBLIC_SEARCH_API_URL: process.env.NEXT_PUBLIC_SEARCH_API_URL || 'undefined',
  });
}
