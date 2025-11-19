/**
 * Portal Recommendation API Route
 * Gets recommendation details by ID
 * 
 * This route proxies requests to the backend Lambda which has access to DynamoDB.
 * The frontend should NOT access DynamoDB directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMockRecommendation } from '@/lib/portal/mockData';
import { portalLogger } from '@/lib/portal/api-logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { PORTAL_API_URL } from '@/lib/portal/api-config';

// Check if we're in demo mode (only if API URL is explicitly disabled)
const isDemoMode = process.env.PORTAL_API_URL === 'DISABLED' || process.env.PORTAL_API_URL === 'false';

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
      endpoint: '/api/portal/recommendation/[id]',
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
          endpoint: '/api/portal/recommendation/[id]',
          method: 'GET',
          statusCode: 400,
        }
      );
      
      return NextResponse.json(
        {
          success: false,
          error: 'Recommendation ID is required',
          requestId,
        },
        { status: 400 }
      );
    }

    // DEMO MODE: Only if explicitly disabled
    // Note: recommendationId starting with 'mock_' is legacy and should not happen
    // The backend NEVER generates IDs starting with 'mock_', so this is just for backward compatibility
    if (isDemoMode) {
      console.log('🎭 Demo mode: Using mock recommendation data (isDemoMode=true)');
      // Extract category from ID or use default
      const category = recommendationId.includes('muscle') ? 'muscle-gain' : 
                       recommendationId.includes('cognitive') ? 'cognitive' :
                       recommendationId.includes('sleep') ? 'sleep' : 'muscle-gain';
      
      const mockRecommendation = getMockRecommendation(category);
      mockRecommendation.recommendation_id = recommendationId;
      
      return NextResponse.json(
        {
          success: true,
          recommendation: mockRecommendation,
          demo: true,
        },
        { status: 200 }
      );
    }
    
    // Legacy check: If ID starts with 'mock_', it's from old mock data
    // This should not happen with the new backend, but we handle it gracefully
    if (recommendationId.startsWith('mock_')) {
      console.warn('⚠️  Legacy mock ID detected:', recommendationId);
      console.warn('⚠️  This should not happen with the new backend');
      console.warn('⚠️  Returning 404 instead of mock data');
      
      return NextResponse.json(
        {
          success: false,
          error: 'Legacy mock recommendation',
          message: 'This recommendation ID is from legacy mock data. Please generate a new recommendation.',
          recommendationId,
        },
        { status: 404 }
      );
    }

    // PRODUCTION MODE: Get recommendation from backend Lambda
    // The backend Lambda has access to DynamoDB, so we proxy the request
    const statusUrl = `${PORTAL_API_URL}/portal/status/${recommendationId}`;
    const backendCallStart = Date.now();
    
    portalLogger.logBackendCall(statusUrl, 'GET', {
      requestId,
      recommendationId,
    });
    
    try {
      // Log the exact URL being called for debugging
      console.log(`🔗 [DEBUG] Calling backend URL: ${statusUrl}`);
      console.log(`🔗 [DEBUG] PORTAL_API_URL env: ${process.env.PORTAL_API_URL || 'using default'}`);
      
      const statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SuplementIA-Portal-API/1.0',
          'X-Request-ID': requestId,
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      });
      
      console.log(`📥 [DEBUG] Backend response status: ${statusResponse.status}`);
      console.log(`📥 [DEBUG] Backend response headers:`, Object.fromEntries(statusResponse.headers.entries()));

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

        const error = new Error(`Backend API returned ${statusResponse.status}`);
        (error as any).statusCode = statusResponse.status;
        (error as any).response = errorData;

        portalLogger.logError(error, {
          requestId,
          recommendationId,
          endpoint: '/api/portal/recommendation/[id]',
          method: 'GET',
          statusCode: statusResponse.status,
          backendUrl: statusUrl,
          backendResponse: errorData,
        });

        // If 404, the recommendation doesn't exist
        if (statusResponse.status === 404) {
          return NextResponse.json(
            {
              success: false,
              error: 'Recommendation not found',
              message: `No recommendation found with ID: ${recommendationId}`,
              recommendationId,
              requestId,
            },
            { status: 404 }
          );
        }

        // Other errors
        return NextResponse.json(
          {
            success: false,
            error: 'Backend API error',
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
        endpoint: '/api/portal/recommendation/[id]',
        method: 'GET',
        statusCode: 200,
        recommendationStatus: statusData.status,
        hasRecommendation: !!statusData.recommendation,
      });

      // The backend returns the recommendation in the status response when status is 'completed'
      if (statusData.status === 'completed' && statusData.recommendation) {
        return NextResponse.json(
          {
            success: true,
            recommendation: statusData.recommendation,
            requestId,
          },
          { status: 200 }
        );
      }

      // If status is 'processing' or 'failed', return the status
      return NextResponse.json(
        {
          success: true,
          status: statusData.status,
          progress: statusData.progress,
          progressMessage: statusData.progressMessage,
          recommendation: statusData.recommendation || null,
          requestId,
        },
        { status: 200 }
      );
    } catch (apiError: any) {
      portalLogger.logError(apiError, {
        requestId,
        recommendationId,
        endpoint: '/api/portal/recommendation/[id]',
        method: 'GET',
        statusCode: 503,
        backendUrl: statusUrl,
        errorType: apiError.name,
      });
      
      // Return error instead of falling back to mock
      return NextResponse.json(
        {
          success: false,
          error: 'Backend API call failed',
          message: apiError.message,
          errorType: apiError.name,
          requestId,
          backendUrl: statusUrl,
        },
        { status: 503 } // Service Unavailable
      );
    }
  } catch (error: any) {
    portalLogger.logError(error, {
      requestId,
      recommendationId,
      endpoint: '/api/portal/recommendation/[id]',
      method: 'GET',
      statusCode: 500,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
        requestId,
        errorType: error.name,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

