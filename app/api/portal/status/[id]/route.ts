/**
 * Portal Status API Route
 * Polls the job store for recommendation status (async enrichment)
 */

import { NextRequest, NextResponse } from 'next/server';
import { portalLogger } from '@/lib/portal/api-logger';
import { getJob, cleanupExpired } from '@/lib/portal/job-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  let jobId: string | undefined;

  try {
    const { id } = await params;
    jobId = id;

    portalLogger.logRequest({
      requestId,
      endpoint: '/api/portal/status/[id]',
      method: 'GET',
      jobId,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
    });

    if (!jobId) {
      portalLogger.logError(
        new Error('Missing job ID'),
        {
          requestId,
          endpoint: '/api/portal/status/[id]',
          method: 'GET',
          statusCode: 400,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Missing job_id',
          requestId,
        },
        { status: 400 }
      );
    }

    // Clean up expired jobs periodically
    cleanupExpired();

    // Get job from local store
    const job = getJob(jobId);

    if (!job) {
      portalLogger.logError(
        new Error('Job not found'),
        {
          requestId,
          jobId,
          endpoint: '/api/portal/status/[id]',
          method: 'GET',
          statusCode: 404,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Job not found',
          message: 'Job may have expired or never existed',
          requestId,
        },
        { status: 404 }
      );
    }

    // Return job status
    const response = {
      success: true,
      status: job.status,
      requestId,
      ...(job.recommendation && { recommendation: job.recommendation }),
      ...(job.error && { error: job.error }),
      ...(job.completedAt && { completedAt: job.completedAt }),
      createdAt: job.createdAt,
    };

    portalLogger.logSuccess({
      requestId,
      jobId,
      endpoint: '/api/portal/status/[id]',
      method: 'GET',
      statusCode: 200,
      jobStatus: job.status,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    portalLogger.logError(error, {
      requestId,
      jobId,
      endpoint: '/api/portal/status/[id]',
      method: 'GET',
      statusCode: 503,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Job status check failed',
        message: error.message,
        errorType: error.name,
        requestId,
      },
      { status: 503 } // Service Unavailable
    );
  }
}

