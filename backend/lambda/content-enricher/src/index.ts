/**
 * Content Enricher Lambda Handler
 *
 * Generates enriched supplement content using AWS Bedrock (Claude)
 * Integrates with Cache Service for performance
 */

import { Context } from 'aws-lambda';
import AWSXRay from 'aws-xray-sdk-core';
import { config, CORS_HEADERS } from './config';
import { generateEnrichedContent } from './bedrock';
import { getFromCache, saveToCacheAsync } from './cache';
import { EnrichmentRequest, EnrichmentResponse } from './types';

interface LambdaEvent {
  httpMethod?: string;
  body?: string;
  queryStringParameters?: Record<string, string>;
}

interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Main Lambda handler
 */
export async function handler(
  event: LambdaEvent,
  context: Context
): Promise<LambdaResponse> {
  // Get X-Ray segment
  const segment = config.xrayEnabled ? AWSXRay.getSegment() : null;
  const subsegment = segment?.addNewSubsegment?.('content-enricher');

  const requestId = context.awsRequestId;
  const startTime = Date.now();

  try {
    // Parse request
    let request: EnrichmentRequest;

    if (event.httpMethod === 'GET' && event.queryStringParameters) {
      // GET with query params
      request = {
        supplementId: event.queryStringParameters.supplementId || '',
        category: event.queryStringParameters.category,
        forceRefresh: event.queryStringParameters.forceRefresh === 'true',
      };
    } else if (event.body) {
      // POST with body
      request = JSON.parse(event.body);
    } else {
      return createErrorResponse(400, 'Missing request body or query parameters', requestId);
    }

    const { supplementId, category, forceRefresh, studies } = request;

    // Validate supplementId
    if (!supplementId || supplementId.trim().length === 0) {
      return createErrorResponse(400, 'supplementId is required', requestId);
    }

    // Add X-Ray annotations
    if (subsegment) {
      subsegment.addAnnotation('supplementId', supplementId);
      subsegment.addAnnotation('module', 'content-enricher');
      subsegment.addAnnotation('version', '1.0.0');
      subsegment.addAnnotation('forceRefresh', forceRefresh || false);
      subsegment.addAnnotation('studiesProvided', studies?.length || 0);
      subsegment.addAnnotation('hasRealData', !!(studies && studies.length > 0));
    }

    // Log request
    console.log(
      JSON.stringify({
        event: 'REQUEST',
        requestId,
        supplementId,
        category,
        forceRefresh,
        studiesProvided: studies?.length || 0,
        hasRealData: studies && studies.length > 0,
        timestamp: new Date().toISOString(),
      })
    );

    // Try cache first (unless forceRefresh)
    let enrichedContent;

    if (!forceRefresh) {
      enrichedContent = await getFromCache(supplementId);
      if (enrichedContent) {
        subsegment?.addAnnotation('cacheHit', true);

        const duration = Date.now() - startTime;

        console.log(
          JSON.stringify({
            event: 'CACHE_HIT',
            requestId,
            supplementId,
            duration,
          })
        );

        const response: EnrichmentResponse = {
          success: true,
          data: enrichedContent,
          metadata: {
            supplementId,
            generatedAt: new Date().toISOString(),
            cached: true,
            hasRealData: studies && studies.length > 0,
            studiesUsed: studies?.length || 0,
          },
        };

        subsegment?.close();

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify(response),
        };
      }
    }

    subsegment?.addAnnotation('cacheHit', false);

    // Cache miss or forceRefresh - call Bedrock
    console.log(
      JSON.stringify({
        event: 'GENERATING_CONTENT',
        requestId,
        supplementId,
        reason: forceRefresh ? 'force_refresh' : 'cache_miss',
        studiesProvided: studies?.length || 0,
      })
    );

    const { content, metadata: bedrockMetadata } = await generateEnrichedContent(
      supplementId,
      category || 'general',
      studies // Pass real PubMed studies to Claude
    );

    enrichedContent = content;

    // Save to cache asynchronously (don't wait)
    saveToCacheAsync(supplementId, enrichedContent).catch((err) => {
      console.error('Failed to save to cache (non-fatal):', err);
    });

    const duration = Date.now() - startTime;

    // Log success
    console.log(
      JSON.stringify({
        event: 'SUCCESS',
        requestId,
        supplementId,
        duration,
        bedrockDuration: bedrockMetadata.duration,
        tokensUsed: bedrockMetadata.tokensUsed,
      })
    );

    // Add metadata to X-Ray
    if (subsegment) {
      subsegment.addMetadata('bedrock', {
        duration: bedrockMetadata.duration,
        tokensUsed: bedrockMetadata.tokensUsed,
      });
      subsegment.addMetadata('response', {
        duration,
        mechanismsCount: enrichedContent.mechanisms?.length || 0,
        worksForCount: enrichedContent.worksFor?.length || 0,
      });
      subsegment.close();
    }

    const response: EnrichmentResponse = {
      success: true,
      data: enrichedContent,
      metadata: {
        supplementId,
        generatedAt: new Date().toISOString(),
        bedrockDuration: bedrockMetadata.duration,
        tokensUsed: bedrockMetadata.tokensUsed,
        cached: false,
        hasRealData: studies && studies.length > 0,
        studiesUsed: studies?.length || 0,
      },
    };

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    // Log error
    console.error(
      JSON.stringify({
        event: 'ERROR',
        requestId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      })
    );

    // Add error to X-Ray
    if (subsegment) {
      subsegment.addError(error);
      subsegment.close();
    }

    return createErrorResponse(500, 'Failed to generate enriched content', requestId, error.message);
  }
}

/**
 * Create error response
 */
function createErrorResponse(
  statusCode: number,
  error: string,
  requestId?: string,
  details?: string
): LambdaResponse {
  const response: EnrichmentResponse = {
    success: false,
    error,
    message: details,
  };

  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      ...response,
      requestId,
    }),
  };
}
