/**
 * Portal Referral API Route
 * Tracks referral links and conversions
 * 
 * This route proxies requests to the backend Lambda which has access to DynamoDB.
 * The frontend should NOT access DynamoDB directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { portalLogger } from '@/lib/portal/api-logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PORTAL_API_URL =
  process.env.PORTAL_API_URL ||
  'https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging';

/**
 * POST /api/portal/referral - Create or track referral
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const body = await request.json();
    const { action, referrer_user_id, referred_user_id, referral_id } = body;

    portalLogger.logRequest({
      requestId,
      endpoint: '/api/portal/referral',
      method: 'POST',
      action,
      referrerUserId: referrer_user_id,
      referredUserId: referred_user_id,
      referralId: referral_id,
    });

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
    const backendCallStart = Date.now();
    
    portalLogger.logBackendCall(backendUrl, 'POST', {
      requestId,
      action,
    });

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'SuplementIA-Portal-API/1.0',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const backendResponseTime = Date.now() - backendCallStart;
    
    portalLogger.logBackendResponse(backendUrl, backendResponse.status, backendResponseTime, {
      requestId,
      action,
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      let errorData: any;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText.substring(0, 500) };
      }

      const error = new Error(`Backend API returned ${backendResponse.status}`);
      (error as any).statusCode = backendResponse.status;
      (error as any).response = errorData;

      portalLogger.logError(error, {
        requestId,
        endpoint: '/api/portal/referral',
        method: 'POST',
        statusCode: backendResponse.status,
        backendUrl,
        backendResponse: errorData,
        action,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Backend API error',
          message: `Backend returned ${backendResponse.status}: ${errorData.message || errorText.substring(0, 200)}`,
          status: backendResponse.status,
          requestId,
          backendError: errorData,
        },
        { status: backendResponse.status }
      );
    }

    const responseData = await backendResponse.json();

    portalLogger.logSuccess({
      requestId,
      endpoint: '/api/portal/referral',
      method: 'POST',
      statusCode: 200,
      action,
      referralId: responseData.referral_id,
    });

    // Add referral_link for 'create' action
    if (action === 'create' && responseData.referral_id) {
      responseData.referral_link = `${request.nextUrl.origin}/portal/quiz?ref=${responseData.referral_id}`;
    }

    return NextResponse.json({ ...responseData, requestId }, { status: 200 });
  } catch (error: any) {
    portalLogger.logError(error, {
      requestId,
      endpoint: '/api/portal/referral',
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

/**
 * GET /api/portal/referral?referrer_user_id=xxx - Get referrals for user
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const referrerUserId = request.nextUrl.searchParams.get('referrer_user_id');

    portalLogger.logRequest({
      requestId,
      endpoint: '/api/portal/referral',
      method: 'GET',
      referrerUserId,
    });

    if (!referrerUserId) {
      portalLogger.logError(
        new Error('Missing referrer_user_id'),
        {
          requestId,
          endpoint: '/api/portal/referral',
          method: 'GET',
          statusCode: 400,
        }
      );
      
      return NextResponse.json(
        {
          success: false,
          error: 'referrer_user_id is required',
          requestId,
        },
        { status: 400 }
      );
    }

    // Call backend Lambda
    const backendUrl = `${PORTAL_API_URL}/portal/referral?referrer_user_id=${encodeURIComponent(referrerUserId)}`;
    const backendCallStart = Date.now();
    
    portalLogger.logBackendCall(backendUrl, 'GET', {
      requestId,
      referrerUserId,
    });

    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SuplementIA-Portal-API/1.0',
        'X-Request-ID': requestId,
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const backendResponseTime = Date.now() - backendCallStart;
    
    portalLogger.logBackendResponse(backendUrl, backendResponse.status, backendResponseTime, {
      requestId,
      referrerUserId,
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      let errorData: any;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText.substring(0, 500) };
      }

      const error = new Error(`Backend API returned ${backendResponse.status}`);
      (error as any).statusCode = backendResponse.status;
      (error as any).response = errorData;

      portalLogger.logError(error, {
        requestId,
        endpoint: '/api/portal/referral',
        method: 'GET',
        statusCode: backendResponse.status,
        backendUrl,
        backendResponse: errorData,
        referrerUserId,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Backend API error',
          message: `Backend returned ${backendResponse.status}: ${errorData.message || errorText.substring(0, 200)}`,
          status: backendResponse.status,
          requestId,
          backendError: errorData,
        },
        { status: backendResponse.status }
      );
    }

    const responseData = await backendResponse.json();

    portalLogger.logSuccess({
      requestId,
      endpoint: '/api/portal/referral',
      method: 'GET',
      statusCode: 200,
      referrerUserId,
    });

    return NextResponse.json({ ...responseData, requestId }, { status: 200 });
  } catch (error: any) {
    portalLogger.logError(error, {
      requestId,
      endpoint: '/api/portal/referral',
      method: 'GET',
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

