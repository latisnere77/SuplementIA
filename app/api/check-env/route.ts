import { NextResponse } from 'next/server';

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

function getSafeHost(value: string | undefined) {
  if (!value) return 'undefined';

  try {
    return new URL(value).host;
  } catch {
    return 'invalid_url';
  }
}

export async function GET() {
  const searchApiUrl = process.env.SEARCH_API_URL;
  const nextPublicSearchApiUrl = process.env.NEXT_PUBLIC_SEARCH_API_URL;

  return NextResponse.json({
    NEXT_PUBLIC_USE_INTELLIGENT_SEARCH: process.env.NEXT_PUBLIC_USE_INTELLIGENT_SEARCH || 'undefined',
    isTrue: process.env.NEXT_PUBLIC_USE_INTELLIGENT_SEARCH === 'true',
    NODE_ENV: process.env.NODE_ENV,
    SEARCH_API_URL_CONFIGURED: hasValue(searchApiUrl),
    NEXT_PUBLIC_SEARCH_API_URL_CONFIGURED: hasValue(nextPublicSearchApiUrl),
    NEXT_PUBLIC_SEARCH_API_URL_HOST: getSafeHost(nextPublicSearchApiUrl),
  });
}
