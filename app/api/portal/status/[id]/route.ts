/**
 * Portal Status API Route
 * Polls the backend for recommendation status
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PORTAL_API_URL =
  process.env.PORTAL_API_URL ||
  'https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recommendationId = id;

    if (!recommendationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing recommendation_id',
        },
        { status: 400 }
      );
    }

    // Call backend status endpoint
    const statusUrl = `${PORTAL_API_URL}/portal/status/${recommendationId}`;
    console.log(`🔍 Checking status: ${statusUrl}`);

    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error(`❌ Status API error: ${statusResponse.status}`);
      console.error(`❌ Error response: ${errorText.substring(0, 500)}`);

      return NextResponse.json(
        {
          success: false,
          error: 'Backend status API error',
          message: `Backend returned ${statusResponse.status}: ${errorText.substring(0, 200)}`,
          status: statusResponse.status,
        },
        { status: statusResponse.status }
      );
    }

    const statusData = await statusResponse.json();
    console.log(`✅ Status response received:`, {
      status: statusData.status,
      progress: statusData.progress,
    });

    return NextResponse.json(statusData, { status: 200 });
  } catch (error: any) {
    console.error('❌ Status API call failed:', error.name, error.message);
    console.error('Stack:', error.stack);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Status API call failed',
        message: error.message,
        errorType: error.name,
      },
      { status: 503 } // Service Unavailable
    );
  }
}

