/**
 * Subscription Status API Route
 * Gets user's current subscription status
 */

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PORTAL_SUBSCRIPTIONS_TABLE =
  process.env.PORTAL_SUBSCRIPTIONS_TABLE || 'ankosoft-portal-subscriptions-staging';

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'user_id is required',
        },
        { status: 400 }
      );
    }

    // Get subscription from DynamoDB
    const result = await dynamodb.send(
      new GetCommand({
        TableName: PORTAL_SUBSCRIPTIONS_TABLE,
        Key: { user_id: userId },
      })
    );

    if (!result.Item) {
      // No subscription found = free plan
      return NextResponse.json(
        {
          success: true,
          subscription: {
            plan_id: 'free',
            status: 'active',
            limits: {
              recommendationsPerDay: 1,
              accessToPremiumProducts: false,
              advancedComparisons: false,
              fullStudyAccess: false,
            },
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        subscription: result.Item,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Subscription status error:', error);

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

