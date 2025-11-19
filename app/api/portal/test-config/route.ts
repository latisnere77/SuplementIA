/**
 * Portal Test Config Endpoint
 * Debug endpoint to check API Gateway configuration
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PORTAL_API_URL =
  process.env.PORTAL_API_URL ||
  'https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging';

export async function GET(request: NextRequest) {
  const testId = 'rec_test_123';
  const baseUrl = PORTAL_API_URL.endsWith('/') ? PORTAL_API_URL.slice(0, -1) : PORTAL_API_URL;
  const testUrl = `${baseUrl}/portal/status/${testId}`;

  try {
    console.log(`🧪 [TEST] Testing API Gateway connection`);
    console.log(`🧪 [TEST] PORTAL_API_URL: ${PORTAL_API_URL}`);
    console.log(`🧪 [TEST] Base URL (normalized): ${baseUrl}`);
    console.log(`🧪 [TEST] Full test URL: ${testUrl}`);

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SuplementIA-Portal-API/1.0',
      },
      signal: AbortSignal.timeout(5000),
    });

    const responseText = await response.text();
    let responseData: any;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    return NextResponse.json({
      success: true,
      test: {
        url: testUrl,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseData,
      },
      config: {
        portalApiUrl: PORTAL_API_URL,
        baseUrl,
        normalized: baseUrl !== PORTAL_API_URL,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: error.name,
      stack: error.stack,
      test: {
        url: testUrl,
        portalApiUrl: PORTAL_API_URL,
        baseUrl,
      },
    }, { status: 500 });
  }
}

