/**
 * Subscription Checkout API Route
 * Creates Stripe checkout session for subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { SUBSCRIPTION_PLANS } from '../plans/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

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
    const { planId, user_id, email } = body;

    if (!planId || !user_id || !email) {
      return NextResponse.json(
        {
          success: false,
          error: 'planId, user_id, and email are required',
        },
        { status: 400 }
      );
    }

    // Find plan
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid plan ID',
        },
        { status: 400 }
      );
    }

    // Free plan doesn't need Stripe
    if (plan.id === 'free') {
      return NextResponse.json(
        {
          success: true,
          plan: plan.id,
          message: 'Free plan activated',
        },
        { status: 200 }
      );
    }

    if (!plan.stripePriceId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plan does not have Stripe price ID configured',
        },
        { status: 400 }
      );
    }

    // Import Stripe dynamically
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: {
        user_id,
        plan_id: plan.id,
        plan_name: plan.name,
      },
      success_url: `${request.nextUrl.origin}/portal/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/portal/subscription/cancel`,
      subscription_data: {
        metadata: {
          user_id,
          plan_id: plan.id,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        session_id: session.id,
        checkout_url: session.url,
        plan: plan.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Subscription checkout error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create checkout session',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

