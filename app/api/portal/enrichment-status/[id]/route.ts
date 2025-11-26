/**
 * Enrichment Status Endpoint
 * Allows frontend to poll for job completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpired, enforceSizeLimit, getJob, isExpired, getJobAge } from '@/lib/portal/job-store';
import { formatErrorResponse } from '@/lib/portal/error-responses';
import {
  logStructured,
  logJobExpired,
  logMissingJob,
  logJobCompleted,
  logJobFailed,
  logJobTimeout,
  logJobProcessing,
  logStoreMaintenance,
} from '@/lib/portal/structured-logger';
import { recordFailure } from '@/lib/portal/failure-pattern-detector';
import { jobMetrics } from '@/lib/portal/job-metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  
  const jobId = params.id;
  const searchParams = request.nextUrl.searchParams;
  const supplement = searchParams.get('supplement');
  
  // Extract correlation ID from header
  const correlationId = request.headers.get('X-Correlation-ID') || undefined;
  
  logStructured('info', 'ENRICHMENT_STATUS_CHECK', {
    jobId,
    supplementName: supplement || undefined,
    correlationId,
  });
  
  // Check if job exists in store BEFORE cleanup
  const job = getJob(jobId);
  
  // Check if job has expired (whether in store or not)
  if (job && isExpired(jobId)) {
    const jobAge = getJobAge(jobId);
    
    logJobExpired(
      jobId,
      supplement || undefined,
      jobAge,
      job.status,
      { correlationId }
    );
    
    const { response, statusCode } = formatErrorResponse('JOB_EXPIRED', {
      correlationId,
      details: {
        jobId,
        supplementName: supplement || undefined,
        elapsedTime: jobAge,
      },
    });
    
    // Record error and latency
    jobMetrics.recordError(statusCode);
    jobMetrics.recordLatency(Date.now() - startTime);
    
    return NextResponse.json(response, { status: statusCode });
  }
  
  if (!job) {
    // Job not found - it never existed
    logMissingJob(
      jobId,
      supplement || undefined,
      undefined, // No time delta since job never existed
      { correlationId }
    );
    
    const { response, statusCode } = formatErrorResponse('JOB_NOT_FOUND', {
      correlationId,
      details: {
        jobId,
        supplementName: supplement || undefined,
      },
    });
    
    // Record error and latency
    jobMetrics.recordError(statusCode);
    jobMetrics.recordLatency(Date.now() - startTime);
    
    return NextResponse.json(response, { status: statusCode });
  }
  
  // Clean up expired jobs and enforce size limit (after handling current request)
  const cleanedCount = cleanupExpired();
  const evictedCount = enforceSizeLimit();
  
  if (cleanedCount > 0 || evictedCount > 0) {
    logStoreMaintenance(cleanedCount, evictedCount, { correlationId });
  }
  
  // Job found in store and not expired
  if (job.status === 'completed') {
    const processingTime = job.completedAt ? job.completedAt - job.createdAt : undefined;
    
    logJobCompleted(
      jobId,
      supplement || undefined,
      processingTime,
      { correlationId }
    );
    
    // Record latency (no error for successful completion)
    jobMetrics.recordLatency(Date.now() - startTime);
    
    return NextResponse.json({
      success: true,
      status: 'completed',
      jobId,
      supplementName: supplement || undefined,
      recommendation: job.recommendation,
      processingTime,
      requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      correlationId,
    });
  }
  
  if (job.status === 'failed') {
    const elapsedTime = Date.now() - job.createdAt;
    
    logJobFailed(
      jobId,
      supplement || undefined,
      job.error,
      elapsedTime,
      { correlationId }
    );
    
    // Record failure for pattern detection
    if (supplement) {
      recordFailure(supplement);
    }
    
    const { response, statusCode } = formatErrorResponse('ENRICHMENT_FAILED', {
      correlationId,
      details: {
        jobId,
        supplementName: supplement || undefined,
        error: job.error,
        elapsedTime,
      },
    });
    
    // Record error and latency
    jobMetrics.recordError(statusCode);
    jobMetrics.recordLatency(Date.now() - startTime);
    
    return NextResponse.json(response, { status: statusCode });
  }
  
  if (job.status === 'timeout') {
    const elapsedTime = Date.now() - job.createdAt;
    
    logJobTimeout(
      jobId,
      supplement || undefined,
      elapsedTime,
      { correlationId }
    );
    
    // Record failure for pattern detection
    if (supplement) {
      recordFailure(supplement);
    }
    
    const { response, statusCode } = formatErrorResponse('JOB_TIMEOUT', {
      correlationId,
      details: {
        jobId,
        supplementName: supplement || undefined,
        elapsedTime,
      },
    });
    
    // Record error and latency
    jobMetrics.recordError(statusCode);
    jobMetrics.recordLatency(Date.now() - startTime);
    
    return NextResponse.json(response, { status: statusCode });
  }
  
  // Still processing
  const elapsedTime = Date.now() - job.createdAt;
  
  logJobProcessing(
    jobId,
    supplement || undefined,
    elapsedTime,
    { correlationId }
  );
  
  // Record latency (no error for processing status)
  jobMetrics.recordLatency(Date.now() - startTime);
  
  return NextResponse.json(
    {
      success: true,
      status: 'processing',
      jobId,
      supplementName: supplement || undefined,
      message: 'Enrichment in progress',
      elapsedTime,
      requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      correlationId,
    },
    { status: 202 } // 202 Accepted
  );
}
