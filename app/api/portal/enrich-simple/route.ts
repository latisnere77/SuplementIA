/**
 * Simplified Enrichment API - Bypasses TDZ Error
 * Direct Lambda calls without problematic imports
 */

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 100;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const { supplementName, category } = await request.json();

        if (!supplementName) {
            return NextResponse.json(
                { success: false, error: 'supplementName is required' },
                { status: 400 }
            );
        }

        // Call enrichment API directly
        const enricherUrl = process.env.NEXT_PUBLIC_CONTENT_ENRICHER_FUNCTION_URL;

        if (!enricherUrl) {
            return NextResponse.json(
                { success: false, error: 'Enricher URL not configured' },
                { status: 500 }
            );
        }

        const response = await fetch(enricherUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                supplementId: supplementName,
                category: category || 'general',
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            return NextResponse.json(
                { success: false, error: `Enricher failed: ${error}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json({ success: true, ...data });

    } catch (error: any) {
        console.error('Simple enrich error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
