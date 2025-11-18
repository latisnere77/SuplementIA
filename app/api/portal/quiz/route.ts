/**
 * Portal Quiz API Route
 * Submits quiz responses and triggers recommendation generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getMockRecommendation } from '@/lib/portal/mockData';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PORTAL_API_URL =
  process.env.PORTAL_API_URL ||
  'https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend';

// Check if we're in demo mode (only if API URL is explicitly disabled)
// Note: 'staging' in URL is OK - it's still a valid backend endpoint
// We have a default URL, so demo mode should only activate if explicitly disabled
const isDemoMode = process.env.PORTAL_API_URL === 'DISABLED' || process.env.PORTAL_API_URL === 'false';

/**
 * Helper: Detect altitude from location
 */
function detectAltitude(location: string): number {
  const altitudeMap: Record<string, number> = {
    CDMX: 2250,
    'Mexico City': 2250,
    'Ciudad de México': 2250,
    Bogotá: 2640,
    Bogota: 2640,
    Quito: 2850,
    'La Paz': 3640,
  };

  return altitudeMap[location] || 0;
}

/**
 * Helper: Detect climate from location
 */
function detectClimate(location: string): string {
  const tropicalLocations = [
    'CDMX',
    'Mexico City',
    'Ciudad de México',
    'Cancún',
    'Cancun',
    'Mérida',
    'Merida',
  ];
  return tropicalLocations.includes(location) ? 'tropical' : 'temperate';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { category, age, gender, location, sensitivities = [] } = body;

    // Validate required fields (category is minimum required for search-first approach)
    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: category',
        },
        { status: 400 }
      );
    }

    // Use defaults if not provided (search-first approach)
    const finalAge = age || 35;
    const finalGender = gender || 'male';
    const finalLocation = location || 'CDMX';

    // Generate quiz ID
    const quizId = `quiz_${Date.now()}_${randomUUID().substring(0, 8)}`;

    // Auto-detect altitude and climate
    const altitude = detectAltitude(finalLocation);
    const climate = detectClimate(finalLocation);

    // Note: Quiz data is sent to backend Lambda which can save it if needed
    // The frontend no longer accesses DynamoDB directly

    // DEMO MODE: Use mock data if backend is not configured
    if (isDemoMode) {
      console.log('🎭 Demo mode: Using mock recommendation data');
      const mockRecommendation = getMockRecommendation(category);
      
      return NextResponse.json(
        {
          success: true,
          quiz_id: quizId,
          recommendation: {
            ...mockRecommendation,
            quiz_id: quizId,
          },
          demo: true, // Flag to indicate this is demo data
        },
        { status: 200 }
      );
    }

    // PRODUCTION MODE: Call Lambda to generate recommendation
    console.log(`🔗 Calling backend API: ${PORTAL_API_URL}`);
    console.log(`📤 Request payload:`, {
      category,
      age: parseInt(finalAge.toString()),
      gender: finalGender,
      location: finalLocation,
      altitude,
      climate,
      quiz_id: quizId,
    });
    
    try {
      const recommendationResponse = await fetch(PORTAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          category,
          age: parseInt(finalAge.toString()),
          gender: finalGender,
          location: finalLocation,
          altitude,
          climate,
          sensitivities,
          quiz_id: quizId,
        }),
        signal: AbortSignal.timeout(15000), // 15s timeout (allows for cold start and network latency)
      });

      console.log(`📥 Backend response status: ${recommendationResponse.status}`);

      if (!recommendationResponse.ok) {
        const errorText = await recommendationResponse.text();
        console.error(`❌ Portal API error: ${recommendationResponse.status}`);
        console.error(`❌ Error response: ${errorText.substring(0, 500)}`);

        // Return error instead of falling back to mock
        return NextResponse.json(
          {
            success: false,
            error: 'Backend API error',
            message: `Backend returned ${recommendationResponse.status}: ${errorText.substring(0, 200)}`,
            status: recommendationResponse.status,
          },
          { status: recommendationResponse.status }
        );
      }

      const responseData = await recommendationResponse.json();
      console.log(`✅ Backend response received:`, {
        status: responseData.status,
        recommendationId: responseData.recommendation_id,
      });

      // ASYNC PATTERN: Backend returns 202 with recommendation_id for polling
      if (recommendationResponse.status === 202 && responseData.recommendation_id) {
        return NextResponse.json(
          {
            success: true,
            quiz_id: quizId,
            recommendation_id: responseData.recommendation_id,
            status: 'processing',
            message: responseData.message || 'Recomendación en proceso',
            statusUrl: responseData.statusUrl || `/api/portal/status/${responseData.recommendation_id}`,
            estimatedTime: responseData.estimatedTime || '60-120 segundos',
            pollInterval: responseData.pollInterval || '3 segundos',
          },
          { status: 202 }
        );
      }

      // LEGACY SYNC PATTERN: If backend returns recommendation directly (backward compatibility)
      if (responseData.recommendation) {
        // Ensure recommendation_id is set
        if (!responseData.recommendation.recommendation_id) {
          responseData.recommendation.recommendation_id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        return NextResponse.json(
          {
            success: true,
            quiz_id: quizId,
            recommendation: responseData.recommendation,
          },
          { status: 200 }
        );
      }

      // Invalid response
      console.error('❌ Backend response missing recommendation_id or recommendation field');
      console.error('Response:', JSON.stringify(responseData, null, 2));
      
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid backend response',
          message: 'Backend response does not contain recommendation_id or recommendation field',
          backendResponse: responseData,
        },
        { status: 500 }
      );
    } catch (apiError: any) {
      console.error('❌ API call failed:', apiError.name, apiError.message);
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
    console.error('❌ Portal quiz API error:', error);

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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

