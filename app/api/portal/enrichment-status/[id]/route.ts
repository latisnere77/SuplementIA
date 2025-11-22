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
    // Instead of querying DynamoDB directly (requires AWS credentials),
    // we call the enrich endpoint which already has the logic to check cache
    // and return immediately if cached
    const enrichUrl = `${request.nextUrl.origin}/api/portal/enrich`;
    
    const enrichResponse = await fetch(enrichUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Job-ID': jobId,
      },
      body: JSON.stringify({
        supplementName,
        maxStudies: 10,
        forceRefresh: false,
      }),
      // Short timeout - if it takes too long, it's still processing
      signal: AbortSignal.timeout(5000), // 5 seconds
    });

    if (enrichResponse.ok) {
      const data = await enrichResponse.json();
      
      // If we got data quickly, it was cached
      console.log(`✅ Enrichment completed for ${supplementName} - Job ${jobId}`);
      return NextResponse.json({
        success: true,
        status: 'completed',
        jobId,
        supplement: supplementName,
        data: data.data || data,
        metadata: data.metadata,
      });
    } else if (enrichResponse.status === 404) {
      // No data found yet
      console.log(`⏳ Still processing ${supplementName} - Job ${jobId}`);
      return NextResponse.json({
        success: true,
        status: 'processing',
        jobId,
        supplement: supplementName,
        message: 'Enrichment in progress',
      });
    } else {
      // Error
      const errorData = await enrichResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Enrich API returned ${enrichResponse.status}`);
    }
  } catch (error: any) {
    // If timeout or error, assume still processing
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.log(`⏳ Still processing ${supplementName} - Job ${jobId} (timeout)`);
      return NextResponse.json({
        success: true,
        status: 'processing',
        jobId,
        supplement: supplementName,
        message: 'Enrichment in progress',
      });
    }
    
    console.error(`❌ Enrichment status check error - Job ${jobId}:`, error);
    return NextResponse.json({
      success: false,
      status: 'error',
      jobId,
      error: error.message,
    }, { status: 500 });
  }
}
