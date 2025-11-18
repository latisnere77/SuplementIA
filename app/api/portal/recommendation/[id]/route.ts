/**
 * Portal Recommendation API Route
 * Gets recommendation details by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getMockRecommendation } from '@/lib/portal/mockData';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PORTAL_RECOMMENDATIONS_TABLE =
  process.env.PORTAL_RECOMMENDATIONS_TABLE || 'ankosoft-portal-recommendations-staging';

// Check if we're in demo mode (only if explicitly disabled)
// 'staging' table is still a valid table, not demo mode
const isDemoMode = process.env.PORTAL_RECOMMENDATIONS_TABLE === 'DISABLED' || process.env.PORTAL_RECOMMENDATIONS_TABLE === 'false';

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

    // PRODUCTION MODE: Get recommendation from DynamoDB
    console.log(`🔍 Looking up recommendation: ${recommendationId} in table: ${PORTAL_RECOMMENDATIONS_TABLE}`);
    
    try {
      const quizId = request.nextUrl.searchParams.get('quiz_id') || '';
      
      let recommendation: any = null;
      
      // If we have quiz_id, use GetCommand (most efficient)
      if (quizId) {
        console.log(`🔍 Using GetCommand with quiz_id: ${quizId}`);
        const result = await dynamodb.send(
          new GetCommand({
            TableName: PORTAL_RECOMMENDATIONS_TABLE,
            Key: {
              recommendation_id: recommendationId,
              quiz_id: quizId,
            },
          })
        );
        recommendation = result.Item;
      } else {
        // If no quiz_id, use ScanCommand with FilterExpression (same as backend)
        // This is necessary because the table has a composite key (recommendation_id + quiz_id)
        console.log(`🔍 Using ScanCommand to find recommendation (no quiz_id provided)`);
        const scanResult = await dynamodb.send(
          new ScanCommand({
            TableName: PORTAL_RECOMMENDATIONS_TABLE,
            FilterExpression: 'recommendation_id = :recId',
            ExpressionAttributeValues: {
              ':recId': recommendationId,
            },
          })
        );
        
        if (scanResult.Items && scanResult.Items.length > 0) {
          recommendation = scanResult.Items[0];
          console.log(`✅ Found recommendation using ScanCommand (scanned ${scanResult.ScannedCount || 0} items)`);
        } else {
          console.warn(`⚠️  ScanCommand found 0 items (scanned ${scanResult.ScannedCount || 0} items)`);
        }
      }

      if (!recommendation) {
        console.error(`❌ Recommendation not found in DynamoDB: ${recommendationId}`);
        
        // Return error instead of falling back to mock
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
      console.log(`✅ Recommendation found in DynamoDB`);

      return NextResponse.json(
        {
          success: true,
          recommendation,
        },
        { status: 200 }
      );
    } catch (dbError: any) {
      console.error('❌ DynamoDB error:', dbError.name, dbError.message);
      console.error('Stack:', dbError.stack);
      
      // Return error instead of falling back to mock
      return NextResponse.json(
        {
          success: false,
          error: 'Database error',
          message: dbError.message,
          errorType: dbError.name,
        },
        { status: 500 }
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

