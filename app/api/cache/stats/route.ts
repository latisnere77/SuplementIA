/**
 * Cache Stats API
 * Returns cache statistics for monitoring
 */

import { NextResponse } from 'next/server';
import { studiesCache, enrichmentCache, translationCache } from '@/lib/cache/simple-cache';
import { globalRateLimiter } from '@/lib/resilience/rate-limiter';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stats = {
    timestamp: new Date().toISOString(),
    caches: {
      studies: studiesCache.getStats(),
      enrichment: enrichmentCache.getStats(),
      translation: translationCache.getStats(),
    },
    rateLimiter: globalRateLimiter.getStats(),
  };

  return NextResponse.json(stats);
}
