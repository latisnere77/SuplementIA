/**
 * Studies API Route
 * Fetches real scientific studies from PubMed via Lambda
 */

import { NextRequest, NextResponse } from 'next/server';

const STUDIES_API_URL = process.env.STUDIES_API_URL || 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';

export interface StudyFilters {
  studyTypes?: ('randomized controlled trial' | 'meta-analysis' | 'systematic review' | 'clinical trial' | 'review')[];
  yearFrom?: number;
  yearTo?: number;
  humanStudiesOnly?: boolean;
  rctOnly?: boolean;
}

export interface StudySearchRequest {
  supplementName: string;
  maxResults?: number;
  filters?: StudyFilters;
}

export async function POST(request: NextRequest) {
  try {
    const body: StudySearchRequest = await request.json();

    // Validate request
    if (!body.supplementName) {
      return NextResponse.json(
        { success: false, error: 'supplementName is required' },
        { status: 400 }
      );
    }

    // Call Studies Fetcher Lambda
    const response = await fetch(STUDIES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplementName: body.supplementName,
        maxResults: body.maxResults || 10,
        filters: body.filters || {},
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Studies API error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch studies' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Studies route error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
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

  const maxResults = parseInt(searchParams.get('maxResults') || '10');
  const rctOnly = searchParams.get('rctOnly') === 'true';
  const yearFrom = searchParams.get('yearFrom') ? parseInt(searchParams.get('yearFrom')!) : undefined;

  try {
    const response = await fetch(STUDIES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplementName,
        maxResults,
        filters: {
          rctOnly,
          yearFrom,
          humanStudiesOnly: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Studies API error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch studies' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Studies route error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
