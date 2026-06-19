/**
 * Portal Test Config Endpoint
 * Debug endpoint to check API Gateway configuration
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { PORTAL_API_URL } from '@/lib/portal/api-config';

const debugRoutesEnabled = () =>
  process.env.NODE_ENV !== 'production' ||
  process.env.ENABLE_DEBUG_ROUTES === 'true';

export async function GET(request: NextRequest) {
  if (!debugRoutesEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const testId = 'rec_test_123';
  const testUrl = `${PORTAL_API_URL}/portal/status/${testId}`;

  try {
    console.log(`🧪 [TEST] Testing API Gateway connection`);
    console.log(`🧪 [TEST] PORTAL_API_URL: ${PORTAL_API_URL}`);
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
        rawEnv: process.env.PORTAL_API_URL || 'not set',
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
        rawEnv: process.env.PORTAL_API_URL || 'not set',
      },
    }, { status: 500 });
  }
}
