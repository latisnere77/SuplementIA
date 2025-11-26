/**
 * Portal Quiz API Route
 * Submits quiz responses and triggers recommendation generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getMockRecommendation } from '@/lib/portal/mockData';
import { portalLogger } from '@/lib/portal/api-logger';
import { validateSupplementQuery, sanitizeQuery } from '@/lib/portal/query-validator';
import { createJob, storeJobResult } from '@/lib/portal/job-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes to allow for recommend endpoint processing

// Check if we're in demo mode (only if API URL is explicitly disabled)
const isDemoMode = process.env.PORTAL_API_URL === 'DISABLED' || process.env.PORTAL_API_URL === 'false';

/**
 * Get the base URL for internal API calls
 * Auto-detects production URL from Vercel environment
 */
function getBaseUrl(): string {
  // 1. Vercel production URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 2. Explicit URL from env
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // 3. Local development
  return 'http://localhost:3000';
}

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
  const requestId = randomUUID();
  const jobId = request.headers.get('X-Job-ID') || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  let quizId: string | undefined;
  
  try {
    const body = await request.json();

    const { category, age, gender, location, sensitivities = [] } = body;

    portalLogger.logRequest({
      requestId,
      jobId,
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
      portalLogger.logError(
        new Error('Query validation failed'),
        {
          requestId,
          category,
          validationError: validation.error,
          severity: validation.severity,
        }
      );

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

    // Create job in job-store for tracking
    createJob(jobId, 0);

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

    // PRODUCTION MODE: Call our intelligent recommendation system
    const backendCallStart = Date.now();
    const QUIZ_API_URL = `${getBaseUrl()}/api/portal/recommend`;

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
          'X-Job-ID': jobId,
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
          jobId,
        }),
        signal: AbortSignal.timeout(120000), // 120s timeout to allow recommend endpoint to complete (enrich can take 30-60s without cache)
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

        // Handle 404: No scientific data found (NOT an error, but intentional)
        if (recommendationResponse.status === 404) {
          console.log(
            JSON.stringify({
              event: 'QUIZ_NO_DATA_FOUND',
              requestId,
              quizId,
              category: sanitizedCategory,
              error: errorData.error || 'insufficient_data',
              message: errorData.message,
              suggestion: errorData.suggestion,
              action: 'returning_404_no_mock_data',
              timestamp: new Date().toISOString(),
            })
          );

          portalLogger.logRequest({
            requestId,
            endpoint: '/api/portal/quiz',
            category: sanitizedCategory,
            result: 'insufficient_data',
          });

          // Return 404 to frontend with helpful message
          // IMPORTANT: We do NOT use mock data here - 404 means no real data found
          return NextResponse.json(
            {
              success: false,
              error: 'insufficient_data',
              message: errorData.message || `No encontramos información científica suficiente sobre "${sanitizedCategory}".`,
              suggestion: errorData.suggestion || 'Intenta con un término más específico o verifica la ortografía.',
              category: sanitizedCategory,
              requestId,
              quizId,
            },
            { status: 404 }
          );
        }

        // For other errors (500, 502, etc.), log as errors
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

        // Return error to frontend (don't generate fake data)
        return NextResponse.json(
          {
            success: false,
            error: 'backend_error',
            message: 'Hubo un error al procesar tu solicitud. Por favor, intenta nuevamente.',
            statusCode: recommendationResponse.status,
            requestId,
            quizId,
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
            statusUrl: responseData.statusUrl || `/api/portal/enrichment-status/${responseData.recommendation_id}`,
            estimatedTime: responseData.estimatedTime || '60-120 segundos',
            pollInterval: responseData.pollInterval || '3 segundos',
            requestId,
          },
          { status: 202 }
        );
      }

      // LEGACY SYNC PATTERN: If backend returns recommendation directly (backward compatibility)
      if (responseData.recommendation) {
        // Ensure recommendation_id is set - use jobId for consistency
        if (!responseData.recommendation.recommendation_id) {
          responseData.recommendation.recommendation_id = jobId;
        }

        // Update job-store with completed recommendation
        storeJobResult(jobId, 'completed', {
          recommendation: responseData.recommendation,
        });

        return NextResponse.json(
          {
            success: true,
            jobId,  // Return jobId for frontend polling
            quiz_id: quizId,
            recommendation: responseData.recommendation,
          },
          { status: 200 }
        );
      }

      // Invalid response
      console.error('❌ Backend response missing recommendation_id or recommendation field');
      console.error('Response:', JSON.stringify(responseData, null, 2));
      
      // Update job-store with failure
      storeJobResult(jobId, 'failed', {
        error: 'Invalid backend response',
      });
      
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

      // GRACEFUL FALLBACK: Use mock data ONLY when backend is completely unreachable
      // This is different from 404 (insufficient_data) - 404 means backend responded but no data found
      // This catch block means backend is unreachable (network error, timeout, etc.)
      console.warn(
        JSON.stringify({
          event: 'QUIZ_BACKEND_UNREACHABLE',
          requestId,
          quizId,
          category: sanitizedCategory,
          error: apiError.message,
          errorType: apiError.name,
          errorCode: apiError.code,
          action: 'fallback_to_mock_data',
          note: 'This is different from 404 - backend is unreachable, not responding with insufficient_data',
          timestamp: new Date().toISOString(),
        })
      );
      
      const mockRecommendation = getMockRecommendation(sanitizedCategory);

      // Update job-store with mock data (fallback)
      storeJobResult(jobId, 'completed', {
        recommendation: {
          ...mockRecommendation,
          quiz_id: quizId,
        },
      });

      return NextResponse.json(
        {
          success: true,
          jobId,  // Return jobId for consistency
          quiz_id: quizId,
          recommendation: {
            ...mockRecommendation,
            quiz_id: quizId,
          },
          demo: true,
          fallback: true,
          fallbackReason: `Backend unreachable: ${apiError.message}`,
        },
        { status: 200 }
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

    // Update job-store with failure
    storeJobResult(jobId, 'failed', {
      error: error.message || 'Internal server error',
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

