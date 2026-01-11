/**
 * Async Content Enrichment API Route
 * Starts enrichment in background and returns immediately with Job ID
 * Frontend polls /api/portal/status/[jobId] to check completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { createJob, createRetryJob, hasExceededRetryLimit } from '@/lib/portal/job-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30; // Increased to allow Lambda invocation

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
      if (await hasExceededRetryLimit(previousJobId, 5)) {
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
      const retryResult = await createRetryJob(previousJobId);
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
      await createJob(jobId);
    }

    console.log(`🚀 [Job ${jobId}] Starting async enrichment for: "${supplementName}" (Retry: ${isRetry}, Count: ${retryCount})`);

    // Invoke quiz-orchestrator Lambda via HTTP URL asynchronously
    try {
      const quizUrl = process.env.NEXT_PUBLIC_QUIZ_API_URL;
      if (!quizUrl) {
        throw new Error('NEXT_PUBLIC_QUIZ_API_URL environment variable not configured');
      }

      // Quiz-orchestrator expects JSON payload (not httpMethod/body wrapper)
      const payload = {
        category: supplementName,
        age: 35,
        gender: 'male',
        location: 'CDMX',
        jobId,
        forceRefresh: body.forceRefresh || false,
      };

      console.log(`🚀 [Job ${jobId}] Invoking quiz-orchestrator at ${quizUrl}`);

      // Fire and forget - don't await the fetch
      fetch(quizUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Job-ID': jobId,
          'X-Request-ID': correlationId,
        },
        body: JSON.stringify(payload),
      }).then(
        (response) => {
          if (!response.ok) {
            console.error(`⚠️ [Job ${jobId}] Quiz API returned status: ${response.status}`);
          } else {
            console.log(`✅ [Job ${jobId}] Quiz API invocation successful`);
          }
        }
      ).catch((error) => {
        console.error(`❌ [Job ${jobId}] Quiz API invocation failed:`, error);
      });

      console.log(`✅ [Job ${jobId}] Async invocation queued`);
    } catch (error: unknown) {
      console.error(`❌ [Job ${jobId}] Failed to queue invocation:`, error);
      const { storeJobResult } = await import('@/lib/portal/job-store');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await storeJobResult(jobId, 'failed', { error: `Failed to invoke quiz: ${errorMessage}` });
    }

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
