/**
 * Portal Subscribe API Route
 * Stripe subscription checkout for Pro features
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Stripe configuration (set in environment variables)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_ID = process.env.STRIPE_PORTAL_PRO_PRICE_ID || 'price_portal_pro_monthly';

export async function POST(request: NextRequest) {
  try {
    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stripe not configured',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { user_id, email } = body;

    if (!user_id || !email) {
      return NextResponse.json(
        {
          success: false,
          error: 'user_id and email are required',
        },
        { status: 400 }
      );
    }

    // Import Stripe dynamically (only when needed)
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: {
        user_id,
        product: 'portal_pro',
      },
      success_url: `${request.nextUrl.origin}/portal/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/portal/subscribe/cancel`,
    });

    return NextResponse.json(
      {
        success: true,
        session_id: session.id,
        checkout_url: session.url,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Portal subscribe API error:', error);

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

