/**
 * Test Mappings API
 * 
 * Interactive endpoint to test the fast lookup system
 * Usage: GET /api/portal/test-mappings?query=reishi
 */

import { NextRequest, NextResponse } from 'next/server';
import { fastLookup, canServeInstantly, getOptimizedEnrichmentParams } from '@/lib/portal/fast-lookup-service';
import { normalizeQuery } from '@/lib/portal/query-normalization';

export const dynamic = 'force-dynamic';

/**
 * GET /api/portal/test-mappings?query=reishi
 * 
 * Tests the fast lookup system for a given query
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    
    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing query parameter',
          usage: 'GET /api/portal/test-mappings?query=reishi',
        },
        { status: 400 }
      );
    }
    
    // Step 1: Normalize query
    const startNormalize = Date.now();
    const normalized = normalizeQuery(query);
    const normalizeTime = Date.now() - startNormalize;
    
    // Step 2: Fast lookup
    const startLookup = Date.now();
    const lookupResult = await fastLookup(query);
    const lookupTime = Date.now() - startLookup;
    
    // Step 3: Check if instant response available
    const instant = canServeInstantly(query);
    
    // Step 4: Get optimized enrichment params
    const enrichParams = getOptimizedEnrichmentParams(query);
    
    return NextResponse.json({
      success: true,
      query: {
        original: query,
        normalized: normalized.normalized,
        confidence: normalized.confidence,
        corrections: normalized.corrections,
      },
      lookup: {
        cached: lookupResult.cached,
        instant: instant,
        normalizedName: lookupResult.normalizedName,
        scientificName: lookupResult.scientificName,
        commonNames: lookupResult.commonNames,
        category: lookupResult.category,
        popularity: lookupResult.popularity,
      },
      pubmed: {
        optimizedQuery: lookupResult.pubmedQuery || enrichParams.pubmedQuery,
        filters: lookupResult.pubmedFilters || {
          yearFrom: enrichParams.yearFrom,
          rctOnly: enrichParams.rctOnly,
          maxStudies: enrichParams.maxStudies,
        },
      },
      performance: {
        normalizeTime: `${normalizeTime}ms`,
        lookupTime: `${lookupTime}ms`,
        totalTime: `${normalizeTime + lookupTime}ms`,
        estimatedSavings: lookupResult.cached 
          ? '~30-60 seconds saved (no PubMed search needed)'
          : 'Will use optimized PubMed query (faster than generic search)',
      },
      recommendation: lookupResult.cached
        ? '✅ Instant response available! Use cached data or optimized query.'
        : '⚠️ No mapping found. Will perform full PubMed search with optimized parameters.',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
