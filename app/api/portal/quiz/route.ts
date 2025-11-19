/**
 * Portal Quiz API Route
 * Submits quiz responses and triggers recommendation generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getMockRecommendation } from '@/lib/portal/mockData';
import { portalLogger } from '@/lib/portal/api-logger';
import { validateSupplementQuery, sanitizeQuery } from '@/lib/portal/query-validator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { PORTAL_API_URL } from '@/lib/portal/api-config';

// Quiz endpoint uses /portal/recommend path
const QUIZ_API_URL = `${PORTAL_API_URL}/portal/recommend`;

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
  const requestId = crypto.randomUUID();
  let quizId: string | undefined;
  
  try {
    const body = await request.json();

    const { category, age, gender, location, sensitivities = [] } = body;

    portalLogger.logRequest({
      requestId,
      endpoint: '/api/portal/quiz',
      method: 'POST',
      category,
      age,
      gender,
      location,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
    });

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

    // GUARDRAILS: Validate query content
    const validation = validateSupplementQuery(category);
    if (!validation.valid) {
      portalLogger.logError({
        requestId,
        error: 'Query validation failed',
        category,
        validationError: validation.error,
        severity: validation.severity,
      });

      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          suggestion: validation.suggestion,
          severity: validation.severity,
        },
        { status: 400 }
      );
    }

    // Sanitize category for safety
    const sanitizedCategory = sanitizeQuery(category);

    // Use defaults if not provided (search-first approach)
    const finalAge = age || 35;
    const finalGender = gender || 'male';
    const finalLocation = location || 'CDMX';

    // Generate quiz ID
    quizId = `quiz_${Date.now()}_${randomUUID().substring(0, 8)}`;

    // Auto-detect altitude and climate
    const altitude = detectAltitude(finalLocation);
    const climate = detectClimate(finalLocation);

    // Note: Quiz data is sent to backend Lambda which can save it if needed
    // The frontend no longer accesses DynamoDB directly

    // DEMO MODE: Use mock data if backend is not configured
    if (isDemoMode) {
      console.log('🎭 Demo mode: Using mock recommendation data');
      const mockRecommendation = getMockRecommendation(sanitizedCategory);

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
    const backendCallStart = Date.now();

    portalLogger.logBackendCall(QUIZ_API_URL, 'POST', {
      requestId,
      quizId,
      category: sanitizedCategory,
    });

    try {
      const recommendationResponse = await fetch(QUIZ_API_URL, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'SuplementIA-Portal-API/1.0',
          'X-Request-ID': requestId,
        },
        method: 'POST',
        body: JSON.stringify({
          category: sanitizedCategory,
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

      const backendResponseTime = Date.now() - backendCallStart;

      portalLogger.logBackendResponse(QUIZ_API_URL, recommendationResponse.status, backendResponseTime, {
        requestId,
        quizId,
        category: sanitizedCategory,
      });

      if (!recommendationResponse.ok) {
        const errorText = await recommendationResponse.text();
        let errorData: any;
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { raw: errorText.substring(0, 500) };
        }

        const error = new Error(`Backend API returned ${recommendationResponse.status}`);
        (error as any).statusCode = recommendationResponse.status;
        (error as any).response = errorData;

        portalLogger.logError(error, {
          requestId,
          quizId,
          endpoint: '/api/portal/quiz',
          method: 'POST',
          statusCode: recommendationResponse.status,
          backendUrl: QUIZ_API_URL,
          backendResponse: errorData,
        });

        // Return error instead of falling back to mock
        return NextResponse.json(
          {
            success: false,
            error: 'Backend API error',
            message: `Backend returned ${recommendationResponse.status}: ${errorData.message || errorText.substring(0, 200)}`,
            status: recommendationResponse.status,
            requestId,
            backendError: errorData,
          },
          { status: recommendationResponse.status }
        );
      }

      const responseData = await recommendationResponse.json();

      portalLogger.logSuccess({
        requestId,
        quizId,
        endpoint: '/api/portal/quiz',
        method: 'POST',
        statusCode: recommendationResponse.status,
        recommendationId: responseData.recommendation_id,
        status: responseData.status,
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
            requestId,
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
      portalLogger.logError(apiError, {
        requestId,
        quizId,
        endpoint: '/api/portal/quiz',
        method: 'POST',
        statusCode: 503,
        backendUrl: QUIZ_API_URL,
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
          backendUrl: QUIZ_API_URL,
        },
        { status: 503 } // Service Unavailable
      );
    }
  } catch (error: any) {
    portalLogger.logError(error, {
      requestId,
      quizId,
      endpoint: '/api/portal/quiz',
      method: 'POST',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

