/**
 * Enrichment Status Endpoint
 * Allows frontend to poll for job completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { cleanupOldJobs, getJob } from '@/lib/portal/job-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const jobId = params.id;
  const searchParams = request.nextUrl.searchParams;
  const supplement = searchParams.get('supplement');
  
  // Clean up old jobs on each request
  cleanupOldJobs();
  
  console.log(`[enrichment-status] Checking status for job: ${jobId}, supplement: ${supplement}`);
  
  // Check if job exists in store
  const job = getJob(jobId);
  
  if (!job) {
    // Job not found - it might be a direct search (not async)
    // Try to fetch directly from recommend endpoint
    console.log(`[enrichment-status] Job not found in store, trying direct fetch`);
    
    if (!supplement) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job not found and no supplement provided for direct fetch',
        },
        { status: 404 }
      );
    }
    
    // Make synchronous request to recommend endpoint
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      
      const recommendResponse = await fetch(`${baseUrl}/api/portal/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Job-ID': jobId,
        },
        body: JSON.stringify({
          category: supplement,
          age: 35,
          gender: 'male',
          location: 'CDMX',
        }),
      });
      
      if (!recommendResponse.ok) {
        const errorData = await recommendResponse.json();
        return NextResponse.json(
          {
            success: false,
            status: 'failed',
            error: errorData.error || 'Recommendation failed',
            message: errorData.message,
          },
          { status: recommendResponse.status }
        );
      }
      
      const recommendData = await recommendResponse.json();
      
      if (recommendData.success && recommendData.recommendation) {
        // Store in cache for future polls
        const { storeJobResult } = await import('@/lib/portal/job-store');
        storeJobResult(jobId, 'completed', {
          recommendation: recommendData.recommendation,
        });
        
        return NextResponse.json({
          success: true,
          status: 'completed',
          recommendation: recommendData.recommendation,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            status: 'failed',
            error: recommendData.error || 'No recommendation generated',
          },
          { status: 500 }
        );
      }
    } catch (error: any) {
      console.error('[enrichment-status] Direct fetch error:', error);
      return NextResponse.json(
        {
          success: false,
          status: 'failed',
          error: error.message || 'Failed to fetch recommendation',
        },
        { status: 500 }
      );
    }
  }
  
  // Job found in store
  if (job.status === 'completed') {
    return NextResponse.json({
      success: true,
      status: 'completed',
      recommendation: job.recommendation,
      processingTime: job.completedAt ? job.completedAt - job.createdAt : undefined,
    });
  }
  
  if (job.status === 'failed') {
    return NextResponse.json(
      {
        success: false,
        status: 'failed',
        error: job.error || 'Job failed',
      },
      { status: 500 }
    );
  }
  
  // Still processing
  return NextResponse.json(
    {
      success: true,
      status: 'processing',
      message: 'Enrichment in progress',
      elapsedTime: Date.now() - job.createdAt,
    },
    { status: 202 } // 202 Accepted
  );
}
