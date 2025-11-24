/**
 * Enrichment Status API Route
 * Check if enrichment is complete for a given job by querying DynamoDB cache
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const jobId = params.id;
  const supplementName = request.nextUrl.searchParams.get('supplement');

  console.log(`🔍 Enrichment status check - Job ID: ${jobId}, Supplement: ${supplementName}`);

  if (!supplementName) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing supplement parameter',
      },
      { status: 400 }
    );
  }

  try {
    // IMPROVEMENT: Query DynamoDB directly instead of making internal HTTP request
    // This is much faster and more efficient
    const { getCachedEvidence } = await import('@/lib/services/dynamodb-cache');
    
    console.log(JSON.stringify({
      event: 'ENRICHMENT_STATUS_CHECK',
      jobId,
      supplement: supplementName,
      timestamp: new Date().toISOString(),
    }));
    
    const cached = await getCachedEvidence(supplementName);
    
    if (cached) {
      // Data is cached and ready
      console.log(JSON.stringify({
        event: 'ENRICHMENT_STATUS_COMPLETED',
        jobId,
        supplement: supplementName,
        studyQuality: cached.studyQuality,
        studyCount: cached.studyCount,
        timestamp: new Date().toISOString(),
      }));
      
      return NextResponse.json({
        success: true,
        status: 'completed',
        jobId,
        supplement: supplementName,
        data: cached.evidenceData,
        metadata: {
          generatedAt: cached.generatedAt,
          studyQuality: cached.studyQuality,
          studyCount: cached.studyCount,
          rctCount: cached.rctCount,
          metaAnalysisCount: cached.metaAnalysisCount,
        },
      });
    }
    
    // Not cached yet - still processing
    console.log(JSON.stringify({
      event: 'ENRICHMENT_STATUS_PROCESSING',
      jobId,
      supplement: supplementName,
      timestamp: new Date().toISOString(),
    }));
    
    return NextResponse.json({
      success: true,
      status: 'processing',
      jobId,
      supplement: supplementName,
      message: 'Enrichment in progress',
    });
  } catch (error: any) {
    console.error(JSON.stringify({
      event: 'ENRICHMENT_STATUS_ERROR',
      jobId,
      supplement: supplementName,
      error: error.message,
      timestamp: new Date().toISOString(),
    }));
    
    return NextResponse.json({
      success: false,
      status: 'error',
      jobId,
      error: error.message,
    }, { status: 500 });
  }
}
