/**
 * Intelligent Content Enrichment API Route
 * ORCHESTRATES: studies-fetcher → content-enricher
 *
 * This route implements the intelligent system that:
 * 1. Fetches REAL PubMed studies using studies-fetcher Lambda
 * 2. Passes real studies to content-enricher Lambda
 * 3. Claude analyzes REAL data instead of guessing
 * 4. Returns high-quality, evidence-based supplement data
 *
 * NO MORE HARDCODING! This is fully dynamic and scales to any supplement.
 */

import { NextRequest, NextResponse } from 'next/server';

// Lambda endpoints
const STUDIES_API_URL = process.env.STUDIES_API_URL || 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';
const ENRICHER_API_URL = process.env.ENRICHER_API_URL || 'https://your-enricher-api-url.amazonaws.com/dev/enrich';

export interface EnrichRequest {
  supplementName: string;
  category?: string;
  forceRefresh?: boolean;
  // Study filters
  maxStudies?: number;
  rctOnly?: boolean;
  yearFrom?: number;
  yearTo?: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: EnrichRequest = await request.json();

    // Validate request
    if (!body.supplementName) {
      return NextResponse.json(
        { success: false, error: 'supplementName is required' },
        { status: 400 }
      );
    }

    const { supplementName, category, forceRefresh, maxStudies, rctOnly, yearFrom, yearTo } = body;

    console.log(
      JSON.stringify({
        event: 'ORCHESTRATION_START',
        supplementName,
        maxStudies: maxStudies || 20,
        rctOnly: rctOnly || false,
      })
    );

    // STEP 1: Fetch REAL PubMed studies
    console.log('📚 Fetching real PubMed studies...');

    const studiesResponse = await fetch(STUDIES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplementName,
        maxResults: maxStudies || 20, // Default: fetch 20 studies
        filters: {
          rctOnly: rctOnly || false, // Prioritize RCTs
          yearFrom: yearFrom || 2010, // Last 15 years
          yearTo: yearTo,
          humanStudiesOnly: true,
          studyTypes: [
            'randomized controlled trial',
            'meta-analysis',
            'systematic review',
          ],
        },
      }),
    });

    if (!studiesResponse.ok) {
      const error = await studiesResponse.text();
      console.error('Studies API error:', error);

      // FALLBACK: If studies fetch fails, still try to enrich without studies
      console.warn('⚠️  Studies fetch failed, enriching without real data...');
      return await enrichWithoutStudies(supplementName, category, forceRefresh);
    }

    const studiesData = await studiesResponse.json();

    if (!studiesData.success || !studiesData.data?.studies) {
      console.warn('⚠️  No studies found, enriching without real data...');
      return await enrichWithoutStudies(supplementName, category, forceRefresh);
    }

    const studies = studiesData.data.studies;

    console.log(
      JSON.stringify({
        event: 'STUDIES_FETCHED',
        supplementName,
        studiesFound: studies.length,
        studyTypes: studies.map((s: any) => s.studyType),
      })
    );

    // STEP 2: Pass real studies to content-enricher
    console.log(`🧠 Enriching with ${studies.length} REAL studies...`);

    const enrichResponse = await fetch(ENRICHER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplementId: supplementName,
        category: category || 'general',
        forceRefresh: forceRefresh || false,
        studies, // CRITICAL: Pass real PubMed studies to Claude
      }),
    });

    if (!enrichResponse.ok) {
      const error = await enrichResponse.text();
      console.error('Enricher API error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to enrich content',
          details: error,
        },
        { status: enrichResponse.status }
      );
    }

    const enrichData = await enrichResponse.json();

    const duration = Date.now() - startTime;

    console.log(
      JSON.stringify({
        event: 'ORCHESTRATION_SUCCESS',
        supplementName,
        duration,
        studiesUsed: studies.length,
        hasRealData: true,
      })
    );

    // Add metadata about the intelligent system
    return NextResponse.json({
      ...enrichData,
      metadata: {
        ...enrichData.metadata,
        orchestrationDuration: duration,
        studiesUsed: studies.length,
        hasRealData: true,
        intelligentSystem: true,
        studiesSource: 'PubMed',
      },
    });
  } catch (error: any) {
    console.error('Orchestration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        intelligentSystem: false,
      },
      { status: 500 }
    );
  }
}

/**
 * Fallback: Enrich without studies (when studies fetch fails)
 */
async function enrichWithoutStudies(
  supplementName: string,
  category?: string,
  forceRefresh?: boolean
) {
  console.warn('⚠️  Enriching without real studies (fallback mode)');

  const enrichResponse = await fetch(ENRICHER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      supplementId: supplementName,
      category: category || 'general',
      forceRefresh: forceRefresh || false,
      // No studies - Claude will use general knowledge
    }),
  });

  if (!enrichResponse.ok) {
    const error = await enrichResponse.text();
    console.error('Enricher API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to enrich content',
        details: error,
      },
      { status: enrichResponse.status }
    );
  }

  const enrichData = await enrichResponse.json();

  return NextResponse.json({
    ...enrichData,
    metadata: {
      ...enrichData.metadata,
      hasRealData: false,
      intelligentSystem: true,
      fallbackMode: true,
      warning: 'No PubMed studies available, using general knowledge',
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const supplementName = searchParams.get('supplementName');

  if (!supplementName) {
    return NextResponse.json(
      { success: false, error: 'supplementName is required' },
      { status: 400 }
    );
  }

  const category = searchParams.get('category') || 'general';
  const forceRefresh = searchParams.get('forceRefresh') === 'true';
  const maxStudies = parseInt(searchParams.get('maxStudies') || '20');
  const rctOnly = searchParams.get('rctOnly') === 'true';
  const yearFrom = searchParams.get('yearFrom') ? parseInt(searchParams.get('yearFrom')!) : 2010;

  // Forward to POST handler
  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        supplementName,
        category,
        forceRefresh,
        maxStudies,
        rctOnly,
        yearFrom,
      }),
    })
  );
}
