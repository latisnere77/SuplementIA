/**
 * Async Content Enrichment API Route
 * Starts enrichment in background and returns immediately with Job ID
 * Frontend polls /api/portal/status/[jobId] to check completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { createJob, createRetryJob, hasExceededRetryLimit } from '@/lib/portal/job-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 10; // Quick response - actual processing happens in background

// Reserved for future use when direct enrichment is needed
// const ENRICHER_API_URL = process.env.ENRICHER_API_URL || 'https://l7mve4qnytdpxfcyu46cyly5le0vdqgx.lambda-url.us-east-1.on.aws/';

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

    // Check if this is a retry attempt
    const previousJobId = request.headers.get('X-Previous-Job-ID');
    const isRetry = !!previousJobId;
    
    let jobId: string;
    let retryCount = 0;
    
    if (isRetry) {
      // Check if previous job exceeded retry limit (max 5 retries)
      if (hasExceededRetryLimit(previousJobId, 5)) {
        console.warn(
          JSON.stringify({
            event: 'RETRY_LIMIT_EXCEEDED',
            requestId,
            correlationId,
            previousJobId,
            timestamp: new Date().toISOString(),
          })
        );
        
        return NextResponse.json(
          {
            success: false,
            error: 'too_many_retries',
            message: 'Demasiados intentos de reintento.',
            suggestion: 'Por favor, espera unos minutos antes de intentar de nuevo.',
            requestId,
            correlationId,
          },
          { status: 429 } // 429 Too Many Requests
        );
      }
      
      // Create new job for retry with incremented retry count
      const retryResult = createRetryJob(previousJobId);
      jobId = retryResult.newJobId;
      retryCount = retryResult.retryCount;
      
      console.log(
        JSON.stringify({
          event: 'RETRY_ATTEMPT',
          requestId,
          correlationId,
          previousJobId,
          newJobId: jobId,
          retryCount,
          supplementName,
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      // New request - generate job ID and create job
      jobId = request.headers.get('X-Job-ID') || body.jobId || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      createJob(jobId);
    }

    console.log(`🚀 [Job ${jobId}] Starting async enrichment for: "${supplementName}" (Retry: ${isRetry}, Count: ${retryCount})`);

    // Start enrichment in background (fire and forget)
    // The Lambda will process and save to cache
    // Frontend will poll /api/portal/status/[jobId] to check completion
    
    // Fire and forget - no need to await
    void fetch('/api/portal/enrich', {
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
      message: isRetry ? `Reintentando enriquecimiento (intento ${retryCount})` : 'Enrichment started in background',
      pollUrl: `/api/portal/enrichment-status/${jobId}?supplement=${encodeURIComponent(supplementName)}`,
      pollInterval: 2000, // Poll every 2 seconds
      isRetry,
      retryCount,
      previousJobId: isRetry ? previousJobId : undefined,
    }, { status: 202 }); // 202 Accepted

  } catch (error: unknown) {
    console.error('❌ Async enrichment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        requestId,
        correlationId,
      },
      { status: 500 }
    );
  }
}
