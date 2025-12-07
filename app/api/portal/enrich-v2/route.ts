/**
 * Simplified Content Enrichment API Route (v2)
 * Minimal implementation without complex dependencies
 * 
 * This is a simplified version created to avoid TDZ issues in the original enrich endpoint.
 * Once we identify the root cause, we can merge improvements back.
 */

import { NextRequest, NextResponse } from 'next/server';
import { expandAbbreviation } from '@/lib/services/abbreviation-expander';

export const runtime = 'nodejs';
export const maxDuration = 180; // Increased to 180s for complex supplements with many studies
export const dynamic = 'force-dynamic';

// Simple UUID generator
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    const studiesUrl = process.env.STUDIES_API_URL || 
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
      throw new Error(`Studies fetch failed: ${studiesResponse.status}`);
    }
    
    const studiesData = await studiesResponse.json();
    
    // Lambda returns { success: true, data: { studies: [...] } }
    const studies = studiesData.data?.studies || studiesData.studies || [];
    console.log(`[enrich-v2] Found ${studies.length} studies`);
    
    // Check if we have studies
    if (studies.length === 0) {
      console.log(`[enrich-v2] No studies found for: ${supplementName}`);
      return NextResponse.json(
        {
          success: false,
          error: 'insufficient_data',
          message: `No encontramos estudios científicos para "${supplementName}".`,
          suggestion: 'Verifica la ortografía o intenta con un término más específico.',
          requestId,
        },
        { status: 404 }
      );
    }
    
    // Step 2: Enrich with Claude via content-enricher Lambda
    const enricherUrl = process.env.ENRICHER_API_URL ||
      'https://l7mve4qnytdpxfcyu46cyly5le0vdqgx.lambda-url.us-east-1.on.aws/';
    
    console.log(`[enrich-v2] Enriching with Claude via: ${enricherUrl}`);
    
    const enrichResponse = await fetch(enricherUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({
        supplementId: supplementName,
        category: category || 'general',
        forceRefresh: forceRefresh || false, // Let enricher use cache - it can focus on benefitQuery even with cached data
        studies: studies.slice(0, 8), // Increased to 8 studies for richer evidence (5+ items per section)
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
    
    return NextResponse.json({
      success: true,
      ...enrichedData,
      metadata: {
        ...enrichedData.metadata,
        requestId,
        duration,
        studiesCount: studies.length,
        version: 'v2-simplified',
      },
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[enrich-v2] Error after ${duration}ms:`, error);
    
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
