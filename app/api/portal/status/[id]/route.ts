/**
 * Portal Status API Route
 * Polls the job store for recommendation status (async enrichment)
 */

import { NextRequest, NextResponse } from 'next/server';
import { portalLogger } from '@/lib/portal/api-logger';
import { getJob, cleanupExpired } from '@/lib/portal/job-store';
import { logPortalSupplementOutcome } from '@/lib/portal/structured-logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normalizeLambdaRecommendation(recommendation: any): any {
  if (!recommendation?.data || recommendation.supplement) {
    return recommendation;
  }

  const data = recommendation.data;
  const metadata = recommendation.metadata || {};
  const supplementName = data.name || metadata.supplementId || 'Supplement';
  const safety = data.safety || {};
  const worksFor = Array.isArray(data.worksFor) ? data.worksFor : [];
  const limitedEvidence = Array.isArray(data.limitedEvidence) ? data.limitedEvidence : [];
  const products = Array.isArray(data.products)
    ? data.products
    : (Array.isArray(recommendation.products) ? recommendation.products : []);

  return {
    ...recommendation,
    recommendation_id: recommendation.recommendation_id || `rec_${metadata.requestId || supplementName}`,
    quiz_id: recommendation.quiz_id || metadata.requestId || `quiz_${supplementName}`,
    category: recommendation.category || supplementName,
    enriched: true,
    enrichmentSource: 'lambda_async',
    supplement: {
      name: supplementName,
      description: data.whatIsIt || data.description || '',
      dosage: data.dosage,
      worksFor,
      doesntWorkFor: Array.isArray(data.doesntWorkFor) ? data.doesntWorkFor : [],
      limitedEvidence,
      mechanisms: Array.isArray(data.mechanisms) ? data.mechanisms : [],
      safety,
      sideEffects: Array.isArray(safety.sideEffects) ? safety.sideEffects : [],
      contraindications: Array.isArray(safety.contraindications) ? safety.contraindications : [],
      interactions: Array.isArray(safety.interactions) ? safety.interactions : [],
      primaryUses: Array.isArray(data.primaryUses) ? data.primaryUses : [],
      keyStudies: Array.isArray(data.keyStudies) ? data.keyStudies : [],
      practicalRecommendations: Array.isArray(data.practicalRecommendations) ? data.practicalRecommendations : [],
      buyingGuidance: data.buyingGuidance,
      totalStudies: data.totalStudies,
      totalParticipants: worksFor.reduce((sum: number, item: any) => sum + (Number(item.totalParticipants) || 0), 0),
    },
    evidence_summary: {
      totalStudies: data.totalStudies || metadata.studiesUsed || 0,
      totalParticipants: worksFor.reduce((sum: number, item: any) => sum + (Number(item.totalParticipants) || 0), 0),
      efficacyPercentage: data.efficacyPercentage || 0,
      researchSpanYears: data.researchSpanYears || 0,
      ingredients: [{
        name: supplementName,
        grade: worksFor[0]?.evidenceGrade || worksFor[0]?.grade || limitedEvidence[0]?.evidenceGrade || 'C',
        studyCount: data.totalStudies || metadata.studiesUsed || 0,
        rctCount: worksFor.reduce((sum: number, item: any) => sum + (Number(item.rctCount) || 0), 0),
        description: data.whatIsIt || '',
      }],
      studies: metadata.studies || null,
    },
    evidence_by_benefit: Array.isArray(data.evidenceByBenefit) ? data.evidenceByBenefit : recommendation.evidence_by_benefit,
    products,
    synergies: recommendation.synergies || data.synergies || [],
    synergiesSource: recommendation.synergiesSource || data.synergiesSource,
    _enrichment_metadata: {
      ...metadata,
      source: 'lambda_async',
      normalizedAt: new Date().toISOString(),
    },
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
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

      logPortalSupplementOutcome({
        endpoint: '/api/portal/status/[id]',
        requestId,
        status: 'failed',
        finalStatusCode: 400,
        fallback: 'backend_service_error',
        errorCode: 'missing_job_id',
        elapsedTime: Date.now() - startTime,
      });

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
    await cleanupExpired();

    // Get job from DynamoDB
    const job = await getJob(jobId);

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

      logPortalSupplementOutcome({
        endpoint: '/api/portal/status/[id]',
        requestId,
        jobId,
        status: 'failed',
        finalStatusCode: 404,
        fallback: 'backend_service_error',
        errorCode: 'job_not_found',
        elapsedTime: Date.now() - startTime,
      });

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
    const response: any = {
      success: true,
      status: job.status,
      requestId,
      createdAt: job.createdAt,
    };

    if (job.recommendation) {
      response.recommendation = normalizeLambdaRecommendation(job.recommendation);
    }
    if (job.error) {
      response.error = job.error;
    }
    if (job.completedAt) {
      response.completedAt = job.completedAt;
    }

    portalLogger.logSuccess({
      requestId,
      jobId,
      endpoint: '/api/portal/status/[id]',
      method: 'GET',
      statusCode: 200,
      jobStatus: job.status,
    });

    logPortalSupplementOutcome({
      endpoint: '/api/portal/status/[id]',
      requestId,
      jobId,
      supplementName: response.recommendation?.supplement?.name || response.recommendation?.category,
      status: job.status === 'completed' ? 'completed' : job.status === 'failed' ? 'failed' : 'processing',
      finalStatusCode: 200,
      fallback: 'async_enrichment',
      errorCode: job.error,
      source: 'job-store',
      elapsedTime: Date.now() - startTime,
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

    logPortalSupplementOutcome({
      endpoint: '/api/portal/status/[id]',
      requestId,
      jobId,
      status: 'upstream_unavailable',
      finalStatusCode: 503,
      fallback: 'upstream_unavailable',
      errorCode: 'job_status_check_failed',
      elapsedTime: Date.now() - startTime,
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
