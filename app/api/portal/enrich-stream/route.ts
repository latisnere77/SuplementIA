/**
 * Streaming Content Enrichment API Route (SSE)
 * 
 * This route implements Server-Sent Events for real-time progress updates
 * Eliminates timeout issues by keeping connection alive
 * Provides better UX with progressive content delivery
 */

import { NextRequest } from 'next/server';
import { expandAbbreviation } from '@/lib/services/abbreviation-expander';

// Configure max duration (streaming can take longer)
export const maxDuration = 300; // 5 minutes for streaming
export const dynamic = 'force-dynamic';

// Lambda endpoints
const STUDIES_API_URL = process.env.STUDIES_API_URL || 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';
const ENRICHER_API_URL = process.env.ENRICHER_API_URL || 'https://l7mve4qnytdpxfcyu46cyly5le0vdqgx.lambda-url.us-east-1.on.aws/';

interface SSEEvent {
  event: string;
  data: any;
}

function formatSSE(event: SSEEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const supplementName = searchParams.get('supplement');
  const requestId = crypto.randomUUID();

  if (!supplementName) {
    return new Response('Missing supplement parameter', { status: 400 });
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial event
        controller.enqueue(encoder.encode(formatSSE({
          event: 'start',
          data: {
            requestId,
            supplement: supplementName,
            timestamp: new Date().toISOString(),
          },
        })));

        // Stage 1: Abbreviation Expansion
        controller.enqueue(encoder.encode(formatSSE({
          event: 'progress',
          data: {
            stage: 'expansion',
            message: 'Analyzing search term...',
            progress: 10,
          },
        })));

        const expansionStart = Date.now();
        const expansion = await expandAbbreviation(supplementName);
        const expansionDuration = Date.now() - expansionStart;

        controller.enqueue(encoder.encode(formatSSE({
          event: 'expansion',
          data: {
            original: supplementName,
            alternatives: expansion.alternatives,
            source: expansion.source,
            confidence: expansion.confidence,
            duration: expansionDuration,
          },
        })));

        // Stage 2: Studies Fetch
        controller.enqueue(encoder.encode(formatSSE({
          event: 'progress',
          data: {
            stage: 'studies',
            message: 'Searching PubMed database...',
            progress: 30,
          },
        })));

        const searchTerm = expansion.alternatives[0] || supplementName;
        const studiesStart = Date.now();

        const studiesResponse = await fetch(STUDIES_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
          },
          body: JSON.stringify({
            supplementName: searchTerm,
            maxResults: 10,
            filters: {
              rctOnly: false,
              yearFrom: 2010,
              humanStudiesOnly: true,
              studyTypes: ['randomized controlled trial', 'meta-analysis', 'systematic review'],
            },
          }),
        });

        const studiesData = await studiesResponse.json();
        const studiesDuration = Date.now() - studiesStart;

        if (!studiesData.success || !studiesData.studies || studiesData.studies.length === 0) {
          controller.enqueue(encoder.encode(formatSSE({
            event: 'error',
            data: {
              stage: 'studies',
              message: 'No studies found in PubMed',
              supplement: supplementName,
            },
          })));
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode(formatSSE({
          event: 'studies',
          data: {
            count: studiesData.studies.length,
            duration: studiesDuration,
            studyTypes: studiesData.studyTypes || [],
          },
        })));

        // Stage 3: Content Generation
        controller.enqueue(encoder.encode(formatSSE({
          event: 'progress',
          data: {
            stage: 'generation',
            message: 'Analyzing evidence and generating content...',
            progress: 60,
          },
        })));

        const enrichStart = Date.now();

        const enrichResponse = await fetch(ENRICHER_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
          },
          body: JSON.stringify({
            supplementId: searchTerm,
            category: 'general',
            studies: studiesData.studies,
          }),
        });

        const enrichData = await enrichResponse.json();
        const enrichDuration = Date.now() - enrichStart;

        if (!enrichData.success) {
          controller.enqueue(encoder.encode(formatSSE({
            event: 'error',
            data: {
              stage: 'generation',
              message: enrichData.error || 'Failed to generate content',
              details: enrichData.details,
            },
          })));
          controller.close();
          return;
        }

        // Send complete content
        controller.enqueue(encoder.encode(formatSSE({
          event: 'content',
          data: {
            ...enrichData.data,
            metadata: {
              ...enrichData.metadata,
              requestId,
              totalDuration: Date.now() - expansionStart,
              stages: {
                expansion: expansionDuration,
                studies: studiesDuration,
                generation: enrichDuration,
              },
            },
          },
        })));

        // Send completion event
        controller.enqueue(encoder.encode(formatSSE({
          event: 'complete',
          data: {
            requestId,
            supplement: supplementName,
            success: true,
            totalDuration: Date.now() - expansionStart,
          },
        })));

        controller.close();

      } catch (error) {
        console.error('Streaming error:', error);
        
        controller.enqueue(encoder.encode(formatSSE({
          event: 'error',
          data: {
            message: error instanceof Error ? error.message : 'Unknown error',
            requestId,
          },
        })));
        
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
