/**
 * Simplified Content Enrichment API Route (v2)
 * Minimal implementation without complex dependencies
 * 
 * This is a simplified version created to avoid TDZ issues in the original enrich endpoint.
 * Once we identify the root cause, we can merge improvements back.
 */

import { NextRequest, NextResponse } from 'next/server';
import { expandAbbreviation } from '@/lib/services/abbreviation-expander';
import {
  formatLiteratureProfileMessage,
  isHumanClinicalEvidenceArticle,
  searchPubMedLiteratureProfile,
  type PubMedLiteratureProfile,
} from '@/lib/services/pubmed-literature-profile';
import { logPortalSupplementOutcome, logStructured } from '@/lib/portal/structured-logger';

export const runtime = 'nodejs';
export const maxDuration = 180; // Increased to 180s for complex supplements with many studies
export const dynamic = 'force-dynamic';

// Simple UUID generator
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isLikelyScientificName(term: string): boolean {
  const words = term.trim().split(/\s+/);

  if (words.length !== 2) {
    return false;
  }

  return words.every((word) => /^[a-z][a-z-]{2,}$/i.test(word));
}

function isTransientUpstreamStatus(status: number): boolean {
  return [401, 403, 408, 429, 502, 503, 504].includes(status);
}

function logEnrichOutcome(data: {
  requestId: string;
  supplementName?: string;
  originalQuery?: string;
  normalizedQuery?: string;
  status: 'completed' | 'processing' | 'failed' | 'insufficient_data' | 'upstream_unavailable';
  finalStatusCode: number;
  fallback?: 'local_catalog_fallback' | 'async_enrichment' | 'insufficient_data' | 'upstream_unavailable' | 'backend_service_error' | 'none';
  errorCode?: string;
  upstreamStatus?: number;
  source?: string;
  startTime: number;
}) {
  logPortalSupplementOutcome({
    endpoint: '/api/portal/enrich-v2',
    requestId: data.requestId,
    supplementName: data.supplementName,
    originalQuery: data.originalQuery,
    normalizedQuery: data.normalizedQuery,
    status: data.status,
    finalStatusCode: data.finalStatusCode,
    fallback: data.fallback,
    errorCode: data.errorCode,
    upstreamStatus: data.upstreamStatus,
    source: data.source,
    elapsedTime: Date.now() - data.startTime,
  });
}

function upstreamUnavailableResponse(
  supplementName: string,
  requestId: string,
  status: number,
  details?: string,
  startTime = Date.now(),
  normalizedQuery?: string
) {
  logEnrichOutcome({
    requestId,
    supplementName,
    originalQuery: supplementName,
    normalizedQuery: normalizedQuery || supplementName,
    status: 'upstream_unavailable',
    finalStatusCode: 503,
    fallback: 'upstream_unavailable',
    errorCode: 'upstream_unavailable',
    upstreamStatus: status,
    source: 'studies-fetcher',
    startTime,
  });

  return NextResponse.json(
    {
      success: false,
      error: 'upstream_unavailable',
      message: `No pudimos consultar temporalmente la base de estudios para "${supplementName}". Intenta de nuevo en unos minutos.`,
      details: details?.slice(0, 500) || `Studies service returned ${status}`,
      statusCode: status,
      requestId,
    },
    { status: 503 }
  );
}

async function buildLiteratureProfile(supplementName: string): Promise<PubMedLiteratureProfile | null> {
  try {
    return await searchPubMedLiteratureProfile(supplementName, {
      maxArticles: 8,
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    console.warn(`[enrich-v2] PubMed literature profile unavailable for ${supplementName}:`, error);
    logStructured('warn', 'STUDIES_FETCHER_FAILURE', {
      endpoint: 'pubmed-literature-profile',
      supplementName,
      error: error instanceof Error ? error.message : String(error),
      fallback: 'insufficient_data_profile_unavailable',
    });
    return null;
  }
}

async function insufficientDataResponse(
  supplementName: string,
  requestId: string,
  startTime = Date.now(),
  normalizedQuery?: string
) {
  const literatureProfile = await buildLiteratureProfile(supplementName);

  logEnrichOutcome({
    requestId,
    supplementName,
    originalQuery: supplementName,
    normalizedQuery: normalizedQuery || supplementName,
    status: 'insufficient_data',
    finalStatusCode: 404,
    fallback: 'insufficient_data',
    errorCode: 'insufficient_data',
    source: literatureProfile ? 'pubmed-literature-profile' : 'studies-fetcher',
    startTime,
  });

  return NextResponse.json(
    {
      success: false,
      error: 'insufficient_data',
      message: formatLiteratureProfileMessage(supplementName, literatureProfile),
      suggestion: 'Verifica la ortografía, intenta con una forma o extracto específico, o explora un tema clínico o componente específico.',
      requestId,
      metadata: {
        literatureProfile,
      },
    },
    { status: 404 }
  );
}

function getPublicationTypes(study: any): string[] {
  const rawTypes = study?.publicationTypes || study?.publication_types || study?.publicationType || study?.type;

  if (Array.isArray(rawTypes)) {
    return rawTypes.map(String);
  }

  if (typeof rawTypes === 'string') {
    return rawTypes
      .split(/[;,|]/)
      .map((type) => type.trim())
      .filter(Boolean);
  }

  return [];
}

function getStudyText(study: any, field: 'title' | 'abstract'): string {
  const value = study?.[field] || study?.article?.[field] || study?.metadata?.[field] || '';
  return typeof value === 'string' ? value : '';
}

function filterHumanClinicalStudies(studies: any[]): any[] {
  return studies.filter((study) =>
    isHumanClinicalEvidenceArticle({
      title: getStudyText(study, 'title'),
      abstract: getStudyText(study, 'abstract'),
      publicationTypes: getPublicationTypes(study),
    })
  );
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { supplementName, benefitQuery, maxStudies = 10, category, forceRefresh = false } = body;

    console.log(`[enrich-v2] Request ${requestId}: ${supplementName}`, {
      benefitQuery: benefitQuery || 'none',
      hasbenefitQuery: !!benefitQuery,
    });
    
    // Validate input
    if (!supplementName) {
      return NextResponse.json(
        { success: false, error: 'supplementName is required' },
        { status: 400 }
      );
    }
    
    // Step 0: Try LLM expansion for unknown terms (optional, non-blocking)
    let searchTerm = supplementName;
    try {
      const expansion = await expandAbbreviation(supplementName);
      if (expansion.alternatives.length > 0 && expansion.source !== 'none') {
        searchTerm = expansion.alternatives[0];
        console.log(`[enrich-v2] Expanded "${supplementName}" → "${searchTerm}" (Source: ${expansion.source})`);
      }
    } catch (error: any) {
      // Expansion failed - continue with original term, but log the detailed error
      console.error(`[enrich-v2] CRITICAL: Abbreviation expansion failed instantly for term: ${supplementName}. This is likely an environment configuration issue.`, {
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
      });
      console.log(`[enrich-v2] Proceeding with original term due to expansion failure: ${supplementName}`);
    }
    
    // Step 1: Fetch studies from Lambda
    const studiesUrl = process.env.NEXT_PUBLIC_STUDIES_API_URL || process.env.STUDIES_API_URL ||
      'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';
    
    console.log(`[enrich-v2] Fetching studies from: ${studiesUrl}`);
    
    const studiesResponse = await fetch(studiesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({
        supplementName: searchTerm, // Use expanded term if available
        ...(benefitQuery && { benefitQuery }), // Only include if provided
        maxResults: benefitQuery ? Math.min(maxStudies, 30) : Math.min(maxStudies, 10), // More results for benefit searches to catch older studies
        rctOnly: false,
        yearFrom: 2010,
        humanStudiesOnly: true,
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });
    
    if (!studiesResponse.ok) {
      const errorText = await studiesResponse.text();
      console.error(`[enrich-v2] Studies fetch failed: ${studiesResponse.status}`, errorText);

      if (
        isLikelyScientificName(supplementName) &&
        [403, 404, 422, 500].includes(studiesResponse.status)
      ) {
        console.warn(`[enrich-v2] Treating scientific-name studies failure as insufficient data: ${supplementName}`);
        return insufficientDataResponse(supplementName, requestId, startTime, searchTerm);
      }

      if (isTransientUpstreamStatus(studiesResponse.status)) {
        console.warn(`[enrich-v2] Treating studies fetch ${studiesResponse.status} as upstream unavailable for ${supplementName}`);
        return upstreamUnavailableResponse(supplementName, requestId, studiesResponse.status, errorText, startTime, searchTerm);
      }

      throw new Error(`Studies fetch failed: ${studiesResponse.status}`);
    }
    
    const studiesData = await studiesResponse.json();
    
    // Lambda returns { success: true, data: { studies: [...] } }
    const studies = studiesData.data?.studies || studiesData.studies || [];
    console.log(`[enrich-v2] Found ${studies.length} studies`);
    
    // Check if we have studies
    if (studies.length === 0) {
      console.log(`[enrich-v2] No studies found for: ${supplementName}`);
      return insufficientDataResponse(supplementName, requestId, startTime, searchTerm);
    }

    const humanClinicalStudies = filterHumanClinicalStudies(studies);
    if (humanClinicalStudies.length === 0) {
      console.log(`[enrich-v2] Studies found for ${supplementName}, but none passed local human-clinical evidence screening`);
      return insufficientDataResponse(supplementName, requestId, startTime, searchTerm);
    }
    
    // Step 2: Enrich with Claude via content-enricher Lambda
    const enricherUrl = process.env.NEXT_PUBLIC_ENRICHER_API_URL || process.env.ENRICHER_API_URL ||
      'https://l7mve4qnytdpxfcyu46cyly5le0vdqgx.lambda-url.us-east-1.on.aws/';
    
    console.log(`[enrich-v2] Enriching with Claude via: ${enricherUrl}`);
    
    const enrichResponse = await fetch(enricherUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({
        supplementId: benefitQuery ? `${supplementName}-${benefitQuery}` : supplementName, // Unique cache key for benefit queries
        category: category || 'general',
        forceRefresh: benefitQuery ? true : (forceRefresh || false), // Force refresh for benefit queries to avoid English cached data
        studies: humanClinicalStudies.slice(0, 8), // Only human clinical evidence can drive benefit claims
        benefitQuery: benefitQuery || undefined, // Pass benefitQuery to enricher for focused analysis
      }),
      signal: AbortSignal.timeout(150000), // 150s timeout for Claude (complex supplements can take longer)
    });
    
    if (!enrichResponse.ok) {
      const errorText = await enrichResponse.text();
      console.error(`[enrich-v2] Enrichment failed: ${enrichResponse.status}`, errorText);
      throw new Error(`Enrichment failed: ${enrichResponse.status}`);
    }
    
    const enrichedData = await enrichResponse.json();
    const duration = Date.now() - startTime;
    
    console.log(`[enrich-v2] Success in ${duration}ms`);
    logEnrichOutcome({
      requestId,
      supplementName,
      originalQuery: supplementName,
      normalizedQuery: searchTerm,
      status: 'completed',
      finalStatusCode: 200,
      fallback: 'none',
      source: 'enrich-v2',
      startTime,
    });
    
    return NextResponse.json({
      success: true,
      ...enrichedData,
      metadata: {
        ...enrichedData.metadata,
        requestId,
        duration,
        studiesCount: studies.length,
        humanClinicalStudiesCount: humanClinicalStudies.length,
        version: 'v2-simplified',
      },
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[enrich-v2] Error after ${duration}ms:`, error);
    logEnrichOutcome({
      requestId,
      status: 'failed',
      finalStatusCode: 500,
      fallback: 'backend_service_error',
      errorCode: error.message || 'Internal server error',
      startTime,
    });
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        requestId,
        duration,
      },
      { status: 500 }
    );
  }
}

// Support GET requests for testing
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const supplementName = searchParams.get('supplementName');
  
  if (!supplementName) {
    return NextResponse.json(
      { success: false, error: 'supplementName query parameter required' },
      { status: 400 }
    );
  }
  
  const category = searchParams.get('category') || 'general';
  const maxStudies = parseInt(searchParams.get('maxStudies') || '10');
  
  // Forward to POST handler
  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        supplementName,
        category,
        maxStudies,
      }),
    })
  );
}
