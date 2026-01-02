import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    env: {
      ENRICHER_API_URL: process.env.ENRICHER_API_URL || 'NOT_SET',
      STUDIES_API_URL: process.env.STUDIES_API_URL || 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
      NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV || 'NOT_SET',
    },
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('API') || k.includes('URL')),
  });
}
