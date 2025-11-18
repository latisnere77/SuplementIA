/**
 * Portal Referral API Route
 * Tracks referral links and conversions
 * 
 * This route proxies requests to the backend Lambda which has access to DynamoDB.
 * The frontend should NOT access DynamoDB directly.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PORTAL_API_URL =
  process.env.PORTAL_API_URL ||
  'https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging';

/**
 * POST /api/portal/referral - Create or track referral
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, referrer_user_id, referred_user_id, referral_id } = body;

    // Validate required fields
    if (action === 'create' && !referrer_user_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'referrer_user_id is required',
        },
        { status: 400 }
      );
    }

    if (action === 'track' && (!referral_id || !referred_user_id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'referral_id and referred_user_id are required',
        },
        { status: 400 }
      );
    }

    // Call backend Lambda
    const backendUrl = `${PORTAL_API_URL}/portal/referral`;
    console.log(`🔗 Calling backend: ${backendUrl}`);

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`❌ Backend API error: ${backendResponse.status}`);
      console.error(`❌ Error response: ${errorText.substring(0, 500)}`);

      return NextResponse.json(
        {
          success: false,
          error: 'Backend API error',
          message: `Backend returned ${backendResponse.status}: ${errorText.substring(0, 200)}`,
          status: backendResponse.status,
        },
        { status: backendResponse.status }
      );
    }

    const responseData = await backendResponse.json();
    console.log(`✅ Backend response received`);

    // Add referral_link for 'create' action
    if (action === 'create' && responseData.referral_id) {
      responseData.referral_link = `${request.nextUrl.origin}/portal/quiz?ref=${responseData.referral_id}`;
    }

    return NextResponse.json(responseData, { status: 200 });
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

    // Call backend Lambda
    const backendUrl = `${PORTAL_API_URL}/portal/referral?referrer_user_id=${encodeURIComponent(referrerUserId)}`;
    console.log(`🔗 Calling backend: ${backendUrl}`);

    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`❌ Backend API error: ${backendResponse.status}`);
      console.error(`❌ Error response: ${errorText.substring(0, 500)}`);

      return NextResponse.json(
        {
          success: false,
          error: 'Backend API error',
          message: `Backend returned ${backendResponse.status}: ${errorText.substring(0, 200)}`,
          status: backendResponse.status,
        },
        { status: backendResponse.status }
      );
    }

    const responseData = await backendResponse.json();
    console.log(`✅ Backend response received`);

    return NextResponse.json(responseData, { status: 200 });
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

