/**
 * Query Expansion API
 * Simple wrapper around expandAbbreviation for use by enrich-v2
 */

import { NextRequest, NextResponse } from 'next/server';
import { expandAbbreviation } from '@/lib/services/abbreviation-expander';

export const runtime = 'nodejs';
export const maxDuration = 10; // 10s max for expansion
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;
    
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'query is required' },
        { status: 400 }
      );
    }
    
    // Call LLM expansion
    const expansion = await expandAbbreviation(query);
    
    return NextResponse.json({
      success: true,
      original: query,
      alternatives: expansion.alternatives,
      confidence: expansion.confidence,
      source: expansion.source,
    });
    
  } catch (error: any) {
    console.error('[expand-query] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Expansion failed',
      },
      { status: 500 }
    );
  }
}
