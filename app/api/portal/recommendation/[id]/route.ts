/**
 * Polling endpoint for async recommendations
 * GET /api/portal/recommendation/[id]
 *
 * Returns the status and data of an async recommendation
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const recommendationId = context.params.id;

  if (!recommendationId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing recommendation ID',
      },
      { status: 400 }
    );
  }

  console.log(`🔍 Polling for recommendation: ${recommendationId}`);

  // Retrieve from in-memory cache
  const cacheKey = `recommendation:${recommendationId}`;
  const cache = (global as any).__recommendationCache as Map<string, any> | undefined;

  if (!cache || !cache.has(cacheKey)) {
    // Not found - may have been too long ago (lambda cold start)
    // Try localStorage cache as fallback
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          return NextResponse.json({
            success: true,
            ...data,
          });
        } catch (error) {
          console.error(`Failed to parse cached recommendation:`, error);
        }
      }
    }

    return NextResponse.json(
      {
        success: false,
        status: 'not_found',
        message: 'Recommendation not found. It may have expired or never existed.',
      },
      { status: 404 }
    );
  }

  const data = cache.get(cacheKey);

  if (data.status === 'completed') {
    console.log(`✅ Recommendation ${recommendationId} is complete`);
    return NextResponse.json({
      success: true,
      status: 'completed',
      recommendation: data.recommendation,
    });
  }

  if (data.status === 'error') {
    console.log(`❌ Recommendation ${recommendationId} failed: ${data.error}`);
    return NextResponse.json({
      success: false,
      status: 'error',
      error: data.error,
      message: 'Failed to generate recommendation',
    }, { status: 500 });
  }

  // Still processing
  console.log(`⏳ Recommendation ${recommendationId} still processing`);
  return NextResponse.json({
    success: true,
    status: 'processing',
    message: 'Recommendation is still being generated. Please poll again.',
  }, { status: 202 });
}
