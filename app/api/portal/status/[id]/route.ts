/**
 * Portal Status API Route
 * Polls the backend for recommendation status
 */

import { NextRequest, NextResponse } from 'next/server';
import { portalLogger } from '@/lib/portal/api-logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { PORTAL_API_URL } from '@/lib/portal/api-config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  let recommendationId: string | undefined;
  
  try {
    const { id } = await params;
    recommendationId = id;

    portalLogger.logRequest({
      requestId,
      endpoint: '/api/portal/status/[id]',
      method: 'GET',
      recommendationId,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
    });

    if (!recommendationId) {
      portalLogger.logError(
        new Error('Missing recommendation ID'),
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
          error: 'Missing recommendation_id',
          requestId,
        },
        { status: 400 }
      );
    }

    // Call backend status endpoint
    const statusUrl = `${PORTAL_API_URL}/portal/status/${recommendationId}`;
    const backendCallStart = Date.now();
    
    portalLogger.logBackendCall(statusUrl, 'GET', {
      requestId,
      recommendationId,
    });

    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SuplementIA-Portal-API/1.0',
        'X-Request-ID': requestId,
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const backendResponseTime = Date.now() - backendCallStart;
    
    portalLogger.logBackendResponse(statusUrl, statusResponse.status, backendResponseTime, {
      requestId,
      recommendationId,
      headers: Object.fromEntries(statusResponse.headers.entries()),
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      let errorData: any;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText.substring(0, 500) };
      }

      const error = new Error(`Backend status API returned ${statusResponse.status}`);
      (error as any).statusCode = statusResponse.status;
      (error as any).response = errorData;

      portalLogger.logError(error, {
        requestId,
        recommendationId,
        endpoint: '/api/portal/status/[id]',
        method: 'GET',
        statusCode: statusResponse.status,
        backendUrl: statusUrl,
        backendResponse: errorData,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Backend status API error',
          message: `Backend returned ${statusResponse.status}: ${errorData.message || errorText.substring(0, 200)}`,
          status: statusResponse.status,
          requestId,
          backendError: errorData,
        },
        { status: statusResponse.status }
      );
    }

    const statusData = await statusResponse.json();
    
    portalLogger.logSuccess({
      requestId,
      recommendationId,
      endpoint: '/api/portal/status/[id]',
      method: 'GET',
      statusCode: 200,
      recommendationStatus: statusData.status,
      progress: statusData.progress,
    });

    return NextResponse.json({ ...statusData, requestId }, { status: 200 });
  } catch (error: any) {
    portalLogger.logError(error, {
      requestId,
      recommendationId,
      endpoint: '/api/portal/status/[id]',
      method: 'GET',
      statusCode: 503,
    });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Status API call failed',
        message: error.message,
        errorType: error.name,
        requestId,
      },
      { status: 503 } // Service Unavailable
    );
  }
}

