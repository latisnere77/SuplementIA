/**
 * Portal Recommendation API Route
 * Gets recommendation details by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getMockRecommendation } from '@/lib/portal/mockData';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PORTAL_RECOMMENDATIONS_TABLE =
  process.env.PORTAL_RECOMMENDATIONS_TABLE || 'ankosoft-portal-recommendations-staging';

// Check if we're in demo mode
const isDemoMode = !process.env.PORTAL_RECOMMENDATIONS_TABLE || process.env.PORTAL_RECOMMENDATIONS_TABLE.includes('staging');

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recommendationId = params.id;

    if (!recommendationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Recommendation ID is required',
        },
        { status: 400 }
      );
    }

    // DEMO MODE: Return mock data if backend is not configured
    if (isDemoMode || recommendationId.startsWith('mock_')) {
      console.log('🎭 Demo mode: Using mock recommendation data');
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

    // PRODUCTION MODE: Get recommendation from DynamoDB
    try {
      const result = await dynamodb.send(
        new GetCommand({
          TableName: PORTAL_RECOMMENDATIONS_TABLE,
          Key: {
            recommendation_id: recommendationId,
            quiz_id: request.nextUrl.searchParams.get('quiz_id') || '', // Sort key
          },
        })
      );

      if (!result.Item) {
        // Fallback to mock data if not found
        console.log('⚠️  Recommendation not found in DB, using mock data');
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

      return NextResponse.json(
        {
          success: true,
          recommendation: result.Item,
        },
        { status: 200 }
      );
    } catch (dbError: any) {
      console.error('⚠️  DynamoDB error, using mock data:', dbError.message);
      // Fallback to mock data
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

