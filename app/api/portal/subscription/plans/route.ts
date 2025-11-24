/**
 * Subscription Plans API Route
 * Returns available subscription plans
 */

import { NextRequest, NextResponse } from 'next/server';
import { SUBSCRIPTION_PLANS } from './config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(
      {
        success: true,
        plans: SUBSCRIPTION_PLANS,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch plans',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

