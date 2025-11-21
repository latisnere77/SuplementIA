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
import { expandAbbreviation, detectAbbreviation } from '@/lib/services/abbreviation-expander';

// Configure max duration for this route (Bedrock needs time)
export const maxDuration = 120; // 120 seconds for content enrichment
export const dynamic = 'force-dynamic'; // Disable static optimization

// Lambda endpoints
const STUDIES_API_URL = process.env.STUDIES_API_URL || 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';
const ENRICHER_API_URL = process.env.ENRICHER_API_URL || 'https://l7mve4qnytdpxfcyu46cyly5le0vdqgx.lambda-url.us-east-1.on.aws/';

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
        maxStudies: maxStudies || 10,
        rctOnly: rctOnly || false,
      })
    );

    // STEP 0: Intelligent abbreviation expansion & Spanish translation
    // - Expand abbreviations: "HMB" → "beta-hydroxy beta-methylbutyrate"
    // - Translate Spanish: "cúrcuma" → "turmeric"
    // This ensures better PubMed results (PubMed is in English)
    let searchTerm = supplementName;
    let expansionMetadata = null;

    // Common abbreviations fallback map (in case LLM fails)
    const COMMON_ABBREVIATIONS: Record<string, string> = {
      'cbd': 'cannabidiol',
      'hmb': 'beta-hydroxy beta-methylbutyrate',
      'bcaa': 'branched-chain amino acids',
      'nac': 'N-acetylcysteine',
      'epa': 'eicosapentaenoic acid',
      'dha': 'docosahexaenoic acid',
      'ala': 'alpha-linolenic acid',
      '5-htp': '5-hydroxytryptophan',
      'sam-e': 'S-adenosyl methionine',
      'dmae': 'dimethylaminoethanol',
      'copper peptides': 'copper tripeptide-1', // GHK-Cu
      'ghk-cu': 'copper tripeptide-1',
    };

    console.log(`🧠 Checking if term needs expansion/translation: "${supplementName}"`);

    // First check common abbreviations map
    const lowerTerm = supplementName.toLowerCase();
    if (COMMON_ABBREVIATIONS[lowerTerm]) {
      searchTerm = COMMON_ABBREVIATIONS[lowerTerm];
      expansionMetadata = {
        original: supplementName,
        expanded: searchTerm,
        alternatives: [searchTerm],
        confidence: 1.0,
        isAbbreviation: true,
      };
      console.log(`✨ Expanded via fallback map: "${supplementName}" → "${searchTerm}"`);
    } else {
      // Try LLM expansion
      try {
        const expansion = await expandAbbreviation(supplementName);

        // Use expanded term if LLM provided alternatives
        if (expansion.alternatives.length > 0 && expansion.source === 'llm') {
          searchTerm = expansion.alternatives[0]; // Use primary expanded/translated term
          expansionMetadata = {
            original: supplementName,
            expanded: searchTerm,
            alternatives: expansion.alternatives,
            confidence: expansion.confidence,
            isAbbreviation: expansion.isAbbreviation,
          };
          console.log(`✨ Transformed via LLM: "${supplementName}" → "${searchTerm}"`);
        } else {
          console.log(`✓ No transformation needed for "${supplementName}"`);
        }
      } catch (error: any) {
        console.warn(`⚠️  Expansion/translation failed: ${error.message}, using original term`);
      }
    }

    // STEP 1: Fetch REAL PubMed studies
    console.log(`📚 Fetching real PubMed studies for: ${searchTerm}...`);

    // STEP 1: Fetch REAL PubMed studies
    console.log(`📚 Fetching real PubMed studies for: ${searchTerm}...`);

    // Helper to fetch studies with specific filters
    const fetchStudies = async (term: string, filters: any) => {
      return fetch(STUDIES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplementName: term,
          maxResults: Math.min(maxStudies || 10, 10),
          filters,
        }),
      });
    };

    // Attempt 1: Strict filters (High quality evidence)
    let studiesResponse = await fetchStudies(searchTerm, {
      rctOnly: rctOnly || false,
      yearFrom: yearFrom || 2010,
      yearTo: yearTo,
      humanStudiesOnly: true,
      studyTypes: [
        'randomized controlled trial',
        'meta-analysis',
        'systematic review',
      ],
    });

    let studiesData = await studiesResponse.json().catch(() => ({ success: false }));
    let studies = studiesData.success ? studiesData.data?.studies || [] : [];

    // Attempt 2: Relaxed filters (If no strict studies found)
    if (studies.length === 0) {
      console.log(`⚠️ No studies found with strict filters. Retrying with relaxed filters...`);

      studiesResponse = await fetchStudies(searchTerm, {
        rctOnly: false,
        yearFrom: 2000, // Look back further
        yearTo: yearTo,
        humanStudiesOnly: true, // Still require human studies
        // Remove studyTypes restriction to include all types (clinical trials, reviews, etc.)
      });

      studiesData = await studiesResponse.json().catch(() => ({ success: false }));
      studies = studiesData.success ? studiesData.data?.studies || [] : [];
    }

    // Attempt 3: Ultra-relaxed filters (If still no studies)
    // Sometimes "humanStudiesOnly" filter in PubMed is imperfect or studies are very new
    if (studies.length === 0) {
      console.log(`⚠️ No studies found with relaxed filters. Retrying with ultra-relaxed filters...`);

      studiesResponse = await fetchStudies(searchTerm, {
        rctOnly: false,
        yearFrom: 1990,
        yearTo: yearTo,
        humanStudiesOnly: false, // Allow in-vitro/animal if that's all we have (better than nothing)
      });

      studiesData = await studiesResponse.json().catch(() => ({ success: false }));
      studies = studiesData.success ? studiesData.data?.studies || [] : [];
    }

    if (studies.length === 0) {
      console.error(`❌ No studies found for: ${supplementName} (after all attempts)`);

      // STRICT VALIDATION: DO NOT generate data without studies
      return NextResponse.json(
        {
          success: false,
          error: 'insufficient_data',
          message: `No encontramos estudios científicos para "${supplementName}".`,
          suggestion: 'Verifica la ortografía o intenta con un término más específico.',
          metadata: {
            hasRealData: false,
            studiesUsed: 0,
          },
        },
        { status: 404 }
      );
    }

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
        ...(expansionMetadata ? { expansion: expansionMetadata } : {}),
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
// ❌ REMOVED: enrichWithoutStudies function
// This function was generating fake data without real studies
// We now STRICTLY require real PubMed studies for all recommendations

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
