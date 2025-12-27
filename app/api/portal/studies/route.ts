/**
 * Studies API Route - Uses Lambda Function URL for vector search
 * Account: 643942183354 (SuplementAI)
 *
 * This endpoint searches for supplement studies using LanceDB vector search.
 * The Lambda Function URL has AuthType: NONE, so no AWS signature is needed.
 */

import { NextRequest, NextResponse } from 'next/server';

// Lambda Function URL for search (AuthType: NONE - no credentials needed)
const VECTOR_SEARCH_API_URL = process.env.SEARCH_API_URL ||
  'https://ogmnjgz664uws4h4t522agsmj40gbpyr.lambda-url.us-east-1.on.aws/';

export interface StudySearchRequest {
  supplementName: string;
  maxResults?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: StudySearchRequest = await request.json();

    if (!body.supplementName) {
      return NextResponse.json(
        { success: false, error: 'supplementName is required' },
        { status: 400 }
      );
    }

    // Build URL with query parameters
    const searchUrl = `${VECTOR_SEARCH_API_URL}?q=${encodeURIComponent(body.supplementName)}&top_k=${body.maxResults || 10}`;

    console.log(`[Studies API] Searching for: ${body.supplementName}`);

    // Simple fetch - no AWS signature needed for Function URL with AuthType: NONE
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Vector Search API error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch studies from vector search' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Determine where the array of studies is located
    let studiesList = [];
    if (Array.isArray(data)) {
      studiesList = data;
    } else if (Array.isArray(data.results)) {
      studiesList = data.results;
    } else if (Array.isArray(data.data)) {
      studiesList = data.data;
    } else if (data.supplement) {
      // Check if studies are nested inside the supplement object
      if (Array.isArray(data.supplement.studies)) {
        studiesList = data.supplement.studies;
      } else if (Array.isArray(data.supplement.evidence)) {
        studiesList = data.supplement.evidence;
      } else if (Array.isArray(data.supplement.relatedStudies)) {
        studiesList = data.supplement.relatedStudies;
      } else if (Array.isArray(data.supplement.references)) {
        studiesList = data.supplement.references;
      } else {
        // No studies array found, but we have supplement data
        // Return the supplement info so frontend can show it
        const supplement = data.supplement;
        const pubmedQuery = supplement.metadata?.pubmed_query || supplement.name;
        const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(pubmedQuery)}`;

        // Create a synthetic study entry with PubMed link
        studiesList = [{
          title: `${supplement.name} - Evidence Grade: ${supplement.metadata?.evidence_grade || 'N/A'}`,
          summary: `Scientific Name: ${supplement.scientificName || 'N/A'}. Common Names: ${(supplement.commonNames || []).join(', ')}. Approximately ${supplement.metadata?.study_count || 'many'} studies available on PubMed.`,
          url: pubmedUrl
        }];
      }
    } else {
      console.error('Unexpected Lambda response format:', JSON.stringify(data));
      return NextResponse.json({
        success: false,
        error: `Unexpected Lambda response format. Received keys: ${Object.keys(data).join(', ')}`
      }, { status: 502 });
    }

    // Adapt the response to match the format expected by the frontend
    return NextResponse.json({ success: true, studies: studiesList });

  } catch (error: any) {
    console.error('Studies route error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
