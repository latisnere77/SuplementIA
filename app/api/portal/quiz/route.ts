/**
 * Portal Quiz API Route
 * Submits quiz responses and triggers recommendation generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { getMockRecommendation } from '@/lib/portal/mockData';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PORTAL_API_URL =
  process.env.PORTAL_API_URL ||
  'https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend';

const PORTAL_QUIZZES_TABLE =
  process.env.PORTAL_QUIZZES_TABLE || 'ankosoft-portal-quizzes-staging';

// Check if we're in demo mode (no API URL configured or using default staging)
const isDemoMode = !process.env.PORTAL_API_URL || process.env.PORTAL_API_URL.includes('staging');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

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

    // Save quiz to DynamoDB
    try {
      await dynamodb.send(
        new PutCommand({
          TableName: PORTAL_QUIZZES_TABLE,
          Item: {
            user_id: body.user_id || 'anonymous',
            quiz_id: quizId,
            category,
            age: parseInt(finalAge.toString()),
            gender: finalGender,
            location: finalLocation,
            altitude,
            climate,
            sensitivities,
            created_at: Math.floor(Date.now() / 1000),
            ttl: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year TTL
          },
        })
      );
    } catch (dbError: any) {
      console.warn('⚠️  Failed to save quiz to DynamoDB:', dbError.message);
      // Continue even if DB save fails
    }

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
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      if (!recommendationResponse.ok) {
        const errorText = await recommendationResponse.text();
        console.error(`Portal API error: ${recommendationResponse.status} ${errorText}`);

        // Fallback to mock data if API fails
        console.log('⚠️  API failed, falling back to mock data');
        const mockRecommendation = getMockRecommendation(category);
        
        return NextResponse.json(
          {
            success: true,
            quiz_id: quizId,
            recommendation: {
              ...mockRecommendation,
              quiz_id: quizId,
            },
            demo: true,
          },
          { status: 200 }
        );
      }

      const recommendationData = await recommendationResponse.json();

      return NextResponse.json(
        {
          success: true,
          quiz_id: quizId,
          recommendation: recommendationData.recommendation,
        },
        { status: 200 }
      );
    } catch (apiError: any) {
      console.error('⚠️  API call failed, using mock data:', apiError.message);
      
      // Fallback to mock data
      const mockRecommendation = getMockRecommendation(category);
      
      return NextResponse.json(
        {
          success: true,
          quiz_id: quizId,
          recommendation: {
            ...mockRecommendation,
            quiz_id: quizId,
          },
          demo: true,
        },
        { status: 200 }
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

