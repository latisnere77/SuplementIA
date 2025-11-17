/**
 * Portal Referral API Route
 * Tracks referral links and conversions
 */

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PORTAL_REFERRALS_TABLE =
  process.env.PORTAL_REFERRALS_TABLE || 'ankosoft-portal-referrals-staging';

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

/**
 * POST /api/portal/referral - Create or track referral
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, referrer_user_id, referred_user_id, referral_id } = body;

    if (action === 'create') {
      // Create new referral link
      if (!referrer_user_id) {
        return NextResponse.json(
          {
            success: false,
            error: 'referrer_user_id is required',
          },
          { status: 400 }
        );
      }

      const newReferralId = `ref_${Date.now()}_${randomUUID().substring(0, 8)}`;

      await dynamodb.send(
        new PutCommand({
          TableName: PORTAL_REFERRALS_TABLE,
          Item: {
            referral_id: newReferralId,
            referrer_user_id,
            referred_user_id: null,
            status: 'pending',
            created_at: Math.floor(Date.now() / 1000),
          },
        })
      );

      return NextResponse.json(
        {
          success: true,
          referral_id: newReferralId,
          referral_link: `${request.nextUrl.origin}/portal/quiz?ref=${newReferralId}`,
        },
        { status: 200 }
      );
    } else if (action === 'track') {
      // Track referral conversion (when referred user subscribes)
      if (!referral_id || !referred_user_id) {
        return NextResponse.json(
          {
            success: false,
            error: 'referral_id and referred_user_id are required',
          },
          { status: 400 }
        );
      }

      // Get referral record
      const result = await dynamodb.send(
        new GetCommand({
          TableName: PORTAL_REFERRALS_TABLE,
          Key: {
            referral_id,
            referrer_user_id: body.referrer_user_id || '', // Need to get this from referral record
          },
        })
      );

      if (!result.Item) {
        return NextResponse.json(
          {
            success: false,
            error: 'Referral not found',
          },
          { status: 404 }
        );
      }

      // Update referral status
      await dynamodb.send(
        new UpdateCommand({
          TableName: PORTAL_REFERRALS_TABLE,
          Key: {
            referral_id,
            referrer_user_id: result.Item.referrer_user_id,
          },
          UpdateExpression: 'SET #status = :converted, referred_user_id = :referred, converted_at = :convertedAt',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':converted': 'converted',
            ':referred': referred_user_id,
            ':convertedAt': Math.floor(Date.now() / 1000),
          },
        })
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Referral conversion tracked',
          referral_id,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Use "create" or "track"',
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('❌ Portal referral API error:', error);

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

/**
 * GET /api/portal/referral?referrer_user_id=xxx - Get referrals for user
 */
export async function GET(request: NextRequest) {
  try {
    const referrerUserId = request.nextUrl.searchParams.get('referrer_user_id');

    if (!referrerUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'referrer_user_id is required',
        },
        { status: 400 }
      );
    }

    // Query referrals by referrer_user_id (using GSI)
    const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');
    const result = await dynamodb.send(
      new QueryCommand({
        TableName: PORTAL_REFERRALS_TABLE,
        IndexName: 'referrer_user_id-index',
        KeyConditionExpression: 'referrer_user_id = :referrer',
        ExpressionAttributeValues: {
          ':referrer': referrerUserId,
        },
      })
    );

    return NextResponse.json(
      {
        success: true,
        referrals: result.Items || [],
        count: result.Items?.length || 0,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Portal referral GET API error:', error);

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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

