/**
 * Async Content Enrichment API Route
 * Starts enrichment in background and returns immediately with Job ID
 * Frontend polls /api/portal/status/[jobId] to check completion
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 10; // Quick response - actual processing happens in background

const ENRICHER_API_URL = process.env.ENRICHER_API_URL || 'https://l7mve4qnytdpxfcyu46cyly5le0vdqgx.lambda-url.us-east-1.on.aws/';

export interface EnrichAsyncRequest {
  supplementName: string;
  category?: string;
  forceRefresh?: boolean;
  jobId?: string;
  maxStudies?: number;
  rctOnly?: boolean;
  yearFrom?: number;
  yearTo?: number;
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const correlationId = request.headers.get('X-Request-ID') || requestId;

  try {
    const body: EnrichAsyncRequest = await request.json();
    const supplementName = body.supplementName;
    
    if (!supplementName) {
      return NextResponse.json(
        { success: false, error: 'supplementName is required' },
        { status: 400 }
      );
    }

    const jobId = request.headers.get('X-Job-ID') || body.jobId || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🚀 [Job ${jobId}] Starting async enrichment for: "${supplementName}"`);

    // Start enrichment in background (fire and forget)
    // The Lambda will process and save to cache
    // Frontend will poll /api/portal/status/[jobId] to check completion
    
    const enrichmentPromise = fetch('/api/portal/enrich', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': correlationId,
        'X-Job-ID': jobId,
      },
      body: JSON.stringify(body),
    }).catch((error) => {
      console.error(`❌ [Job ${jobId}] Background enrichment error:`, error);
    });

    // Don't await - let it run in background
    // Return immediately with Job ID
    
    console.log(`✅ [Job ${jobId}] Async enrichment started, returning Job ID`);

    return NextResponse.json({
      success: true,
      status: 'processing',
      jobId,
      supplementName,
      message: 'Enrichment started in background',
      pollUrl: `/api/portal/enrichment-status/${jobId}?supplement=${encodeURIComponent(supplementName)}`,
      pollInterval: 2000, // Poll every 2 seconds
    }, { status: 202 }); // 202 Accepted

  } catch (error: any) {
    console.error('❌ Async enrichment error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        requestId,
        correlationId,
      },
      { status: 500 }
    );
  }
}
