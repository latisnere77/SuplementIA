/**
 * Analytics API Endpoint
 * Receives search analytics batches from frontend
 */

import { NextRequest, NextResponse } from 'next/server';
import { portalLogger } from '@/lib/portal/api-logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SearchEvent {
  query: string;
  normalizedQuery?: string;
  timestamp: number;
  success: boolean;
  studiesFound: number;
  suggestionsOffered: string[];
  userAcceptedSuggestion?: boolean;
  acceptedSuggestion?: string;
  errorType?: string;
  requestId?: string;
}

interface AnalyticsBatch {
  events: SearchEvent[];
  batchId: string;
  timestamp: number;
  userAgent: string;
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const batch: AnalyticsBatch = await request.json();

    // Validate batch
    if (!batch.events || !Array.isArray(batch.events)) {
      return NextResponse.json(
        { success: false, error: 'Invalid batch format' },
        { status: 400 }
      );
    }

    // Log analytics summary
    const summary = {
      batchId: batch.batchId,
      eventCount: batch.events.length,
      successfulSearches: batch.events.filter(e => e.success).length,
      failedSearches: batch.events.filter(e => !e.success).length,
      suggestionAcceptances: batch.events.filter(e => e.userAcceptedSuggestion).length,
      timestamp: new Date().toISOString(),
    };

    portalLogger.logRequest({
      requestId,
      endpoint: '/api/portal/analytics',
      method: 'POST',
      ...summary,
    });

    // Log top failed queries
    const failedQueries = batch.events
      .filter(e => !e.success)
      .map(e => e.query);

    if (failedQueries.length > 0) {
      console.log('[Analytics] Failed searches:', {
        count: failedQueries.length,
        queries: [...new Set(failedQueries)].slice(0, 10),
        batchId: batch.batchId,
      });
    }

    // Log suggestion acceptances
    const acceptedSuggestions = batch.events
      .filter(e => e.userAcceptedSuggestion)
      .map(e => ({
        original: e.query,
        accepted: e.acceptedSuggestion,
      }));

    if (acceptedSuggestions.length > 0) {
      console.log('[Analytics] Suggestion acceptances:', {
        count: acceptedSuggestions.length,
        suggestions: acceptedSuggestions,
        batchId: batch.batchId,
      });
    }

    // TODO: Store in DynamoDB for long-term analysis
    // await storeBatchInDynamoDB(batch);

    // TODO: Send alerts if failure rate is high
    // const failureRate = summary.failedSearches / summary.eventCount;
    // if (failureRate > 0.5 && summary.eventCount > 10) {
    //   await sendSlackAlert({ ...summary, failureRate });
    // }

    return NextResponse.json({
      success: true,
      received: batch.events.length,
      batchId: batch.batchId,
      requestId,
    });
  } catch (error: any) {
    portalLogger.logError(error, {
      requestId,
      endpoint: '/api/portal/analytics',
      method: 'POST',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process analytics batch',
        message: error.message,
        requestId,
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
