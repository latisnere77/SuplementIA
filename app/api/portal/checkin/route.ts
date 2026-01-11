/**
 * Portal Check-in API Route
 * Submits week 4 & 8 check-in surveys
 */

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PORTAL_CHECKINS_TABLE =
  process.env.PORTAL_CHECKINS_TABLE || 'ankosoft-portal-checkins-staging';

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { recommendation_id, week_number, rating, notes, efficacy_score, satisfaction, side_effects } = body;

    // Validate required fields
    if (!recommendation_id || !week_number || rating === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: recommendation_id, week_number, rating',
        },
        { status: 400 }
      );
    }

    // Validate week_number (should be 4 or 8)
    if (week_number !== 4 && week_number !== 8) {
      return NextResponse.json(
        {
          success: false,
          error: 'week_number must be 4 or 8',
        },
        { status: 400 }
      );
    }

    // Validate rating (1-5)
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        {
          success: false,
          error: 'rating must be between 1 and 5',
        },
        { status: 400 }
      );
    }

    // Generate check-in ID
    const checkinId = `checkin_${Date.now()}_${randomUUID().substring(0, 8)}`;

    // Save check-in to DynamoDB
    await dynamodb.send(
      new PutCommand({
        TableName: PORTAL_CHECKINS_TABLE,
        Item: {
          checkin_id: checkinId,
          recommendation_id,
          week_number,
          rating,
          notes: notes || '',
          efficacy_score: efficacy_score || null,
          satisfaction: satisfaction || null,
          side_effects: side_effects || [],
          created_at: Math.floor(Date.now() / 1000),
        },
      })
    );

    return NextResponse.json(
      {
        success: true,
        checkin_id: checkinId,
        message: `Week ${week_number} check-in recorded successfully`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Portal check-in API error:', error);

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

