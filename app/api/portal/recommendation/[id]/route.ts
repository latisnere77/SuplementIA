/**
 * Portal Recommendation API Route
 * Gets recommendation details by ID
 * 
 * This route proxies requests to the backend Lambda which has access to DynamoDB.
 * The frontend should NOT access DynamoDB directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMockRecommendation } from '@/lib/portal/mockData';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PORTAL_API_URL =
  process.env.PORTAL_API_URL ||
  'https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging';

// Check if we're in demo mode (only if API URL is explicitly disabled)
const isDemoMode = process.env.PORTAL_API_URL === 'DISABLED' || process.env.PORTAL_API_URL === 'false';

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
          error: 'Recommendation ID is required',
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
    console.log(`🔍 Looking up recommendation: ${recommendationId} via backend API`);
    console.log(`🔍 Backend URL: ${PORTAL_API_URL}`);
    
    try {
      // Call backend status endpoint which returns the full recommendation when ready
      const statusUrl = `${PORTAL_API_URL}/portal/status/${recommendationId}`;
      console.log(`🔗 Calling backend: ${statusUrl}`);

      const statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      console.log(`📥 Backend response status: ${statusResponse.status}`);

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error(`❌ Backend API error: ${statusResponse.status}`);
        console.error(`❌ Error response: ${errorText.substring(0, 500)}`);

        // If 404, the recommendation doesn't exist
        if (statusResponse.status === 404) {
          return NextResponse.json(
            {
              success: false,
              error: 'Recommendation not found',
              message: `No recommendation found with ID: ${recommendationId}`,
              recommendationId,
            },
            { status: 404 }
          );
        }

        // Other errors
        return NextResponse.json(
          {
            success: false,
            error: 'Backend API error',
            message: `Backend returned ${statusResponse.status}: ${errorText.substring(0, 200)}`,
            status: statusResponse.status,
          },
          { status: statusResponse.status }
        );
      }

      const statusData = await statusResponse.json();
      console.log(`✅ Backend response received:`, {
        status: statusData.status,
        hasRecommendation: !!statusData.recommendation,
      });

      // The backend returns the recommendation in the status response when status is 'completed'
      if (statusData.status === 'completed' && statusData.recommendation) {
        return NextResponse.json(
          {
            success: true,
            recommendation: statusData.recommendation,
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
        },
        { status: 200 }
      );
    } catch (apiError: any) {
      console.error('❌ Backend API call failed:', apiError.name, apiError.message);
      console.error('Stack:', apiError.stack);
      
      // Return error instead of falling back to mock
      return NextResponse.json(
        {
          success: false,
          error: 'Backend API call failed',
          message: apiError.message,
          errorType: apiError.name,
        },
        { status: 503 } // Service Unavailable
      );
    }
  } catch (error: any) {
    console.error('❌ Portal recommendation API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
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

