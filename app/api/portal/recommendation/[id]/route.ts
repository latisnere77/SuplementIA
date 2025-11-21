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

    // IMPORTANT: Our new intelligent system returns recommendations synchronously
    // This polling endpoint is only needed for the old async AnkoSoft backend
    // Since we replaced that backend, we should gracefully handle recommendation lookups

    // For now, return a friendly message that the recommendation was already delivered
    // The frontend should NOT be polling when using the new system
    console.warn('⚠️  Polling endpoint called - this should not happen with new sync system');
    console.warn('⚠️  Recommendation ID:', recommendationId);
    console.warn('⚠️  This indicates the frontend is expecting async behavior');

    // Check if this is from the old backend pattern (we don't have the recommendation)
    // In this case, gracefully fail with helpful message
    return NextResponse.json(
      {
        success: false,
        error: 'Recommendation already delivered',
        message: 'The new intelligent system returns recommendations synchronously. Check the original quiz response for the recommendation data.',
        recommendationId,
        requestId,
        diagnostic: {
          note: 'If you are seeing this, the quiz should have already returned the complete recommendation in the initial response (status 200)',
          migrationNote: 'The old async pattern (status 202 + polling) has been replaced with synchronous responses',
        },
      },
      { status: 410 } // Gone - indicates resource no longer available at this endpoint
    );

    /*
     * ALL OLD CODE BELOW IS DISABLED
     * The old AnkoSoft backend is no longer used.
     * Our new system returns recommendations synchronously.
     * This polling pattern is obsolete.
     */
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

