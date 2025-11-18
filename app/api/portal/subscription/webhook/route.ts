/**
 * Stripe Webhook Handler
 * Handles subscription events (created, updated, cancelled, etc.)
 * 
 * This handler validates the Stripe webhook signature and then forwards
 * the event to the backend Lambda which saves to DynamoDB.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const PORTAL_API_URL =
  process.env.PORTAL_API_URL ||
  'https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging';

export async function POST(request: NextRequest) {
  try {
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Import Stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // Verify webhook signature (security: must be done in frontend)
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Forward verified event to backend Lambda
    // The backend will handle saving to DynamoDB
    const backendUrl = `${PORTAL_API_URL}/portal/subscription/webhook`;
    console.log(`🔗 Forwarding verified Stripe event to backend: ${backendUrl}`);

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature, // Forward signature for audit
      },
      body: JSON.stringify(event), // Send verified event
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`❌ Backend webhook handler error: ${backendResponse.status}`);
      console.error(`❌ Error response: ${errorText.substring(0, 500)}`);

      return NextResponse.json(
        {
          error: 'Backend webhook handler failed',
          message: `Backend returned ${backendResponse.status}: ${errorText.substring(0, 200)}`,
        },
        { status: backendResponse.status }
      );
    }

    const backendData = await backendResponse.json();
    console.log(`✅ Backend webhook handler processed event: ${event.type}`);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed', message: error.message },
      { status: 500 }
    );
  }
}

