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
import { generateEnrichedContentWithToolUse } from './bedrockConverse';
import { getFromCache, saveToCacheAsync } from './cache';
import { EnrichmentRequest, EnrichmentResponse } from './types';

// Feature flag to enable Tool Use API (will be controlled via environment variable)
const USE_TOOL_API = process.env.USE_TOOL_API === 'true';

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
  const correlationId = (event as any).headers?.['X-Request-ID'] || 
                        (event as any).headers?.['x-request-id'] || 
                        requestId;

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

    // Extract study metadata
    const studiesCount = studies?.length || 0;
    const studyTypes = studies?.map((s: any) => s.studyType || 'unknown') || [];
    const studyIds = studies?.map((s: any) => s.pmid || s.id).filter(Boolean) || [];
    const uniqueStudyTypes = [...new Set(studyTypes)];

    // Add X-Ray annotations
    if (subsegment) {
      subsegment.addAnnotation('supplementId', supplementId);
      subsegment.addAnnotation('module', 'content-enricher');
      subsegment.addAnnotation('version', '1.0.0');
      subsegment.addAnnotation('correlationId', correlationId);
      subsegment.addAnnotation('forceRefresh', forceRefresh || false);
      subsegment.addAnnotation('studiesProvided', studiesCount);
      subsegment.addAnnotation('hasRealData', studiesCount > 0);
      subsegment.addMetadata('studies', {
        count: studiesCount,
        studyTypes: uniqueStudyTypes,
        sampleIds: studyIds.slice(0, 10), // First 10 IDs for reference
        hasStudies: studiesCount > 0,
      });
      subsegment.addMetadata('request', {
        supplementId,
        category: category || 'general',
        forceRefresh: forceRefresh || false,
      });
    }

    // Log request
    console.log(
      JSON.stringify({
        event: 'CONTENT_ENRICH_REQUEST',
        requestId,
        correlationId,
        supplementId,
        category: category || 'general',
        forceRefresh: forceRefresh || false,
        studiesProvided: studiesCount,
        hasRealData: studiesCount > 0,
        studyTypes: uniqueStudyTypes,
        timestamp: new Date().toISOString(),
      })
    );

    // Try cache first (unless forceRefresh)
    let enrichedContent;

    if (!forceRefresh) {
      enrichedContent = await getFromCache(supplementId);
      if (enrichedContent) {
        if (subsegment) {
          subsegment.addAnnotation('cacheHit', true);
        }

        const duration = Date.now() - startTime;

        console.log(
          JSON.stringify({
            event: 'CACHE_HIT',
            requestId,
            correlationId,
            supplementId,
            duration,
            studiesProvided: studiesCount,
            timestamp: new Date().toISOString(),
          })
        );

        const response: EnrichmentResponse = {
          success: true,
          data: enrichedContent,
          metadata: {
            supplementId,
            generatedAt: new Date().toISOString(),
            cached: true,
            hasRealData: studiesCount > 0,
            studiesUsed: studiesCount,
            requestId,
            correlationId,
          },
        };

        if (subsegment) {
          subsegment.addAnnotation('success', true);
          subsegment.addMetadata('response', {
            cached: true,
            hasRealData: studiesCount > 0,
            studiesUsed: studiesCount,
          });
          subsegment.close();
        }

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify(response),
        };
      }
    }

    if (subsegment) {
      subsegment.addAnnotation('cacheHit', false);
    }

    // Cache miss or forceRefresh - call Bedrock
    console.log(
      JSON.stringify({
        event: 'GENERATING_CONTENT',
        requestId,
        correlationId,
        supplementId,
        reason: forceRefresh ? 'force_refresh' : 'cache_miss',
        studiesProvided: studiesCount,
        studyTypes: uniqueStudyTypes,
        useToolAPI: USE_TOOL_API,
        timestamp: new Date().toISOString(),
      })
    );

    // OPTIMIZATION: Summarize studies first to reduce tokens by 60%
    let processedStudies = studies;
    if (studies && studies.length > 0) {
      const { summarizeStudies } = await import('./studySummarizer');
      const summaries = await summarizeStudies(studies);
      
      // Convert summaries back to study format for compatibility
      processedStudies = summaries.map(s => ({
        ...studies.find(study => study.pmid === s.pmid),
        abstract: s.summary, // Replace long abstract with short summary
        findings: undefined, // Remove findings to save tokens
      })) as any;

      console.log(JSON.stringify({
        event: 'STUDIES_SUMMARIZED',
        requestId,
        correlationId,
        originalStudies: studies.length,
        summarizedStudies: processedStudies.length,
        timestamp: new Date().toISOString(),
      }));
    }

    // Choose API based on feature flag
    const { content, metadata: bedrockMetadata } = USE_TOOL_API
      ? await generateEnrichedContentWithToolUse(
          supplementId,
          category || 'general',
          processedStudies // Pass summarized studies to Claude
        )
      : await generateEnrichedContent(
          supplementId,
          category || 'general',
          studies // Pass real PubMed studies to Claude
        );

    enrichedContent = content;

    // Save to cache (await to ensure it completes before Lambda freezes)
    try {
      await saveToCacheAsync(supplementId, enrichedContent);
    } catch (err) {
      console.error('Failed to save to cache (non-fatal):', err);
    }

    const duration = Date.now() - startTime;

    // Log success
    console.log(
      JSON.stringify({
        event: 'CONTENT_ENRICH_SUCCESS',
        requestId,
        correlationId,
        supplementId,
        duration,
        bedrockDuration: bedrockMetadata.duration,
        tokensUsed: bedrockMetadata.tokensUsed,
        studiesUsed: studiesCount,
        hasRealData: studiesCount > 0,
        mechanismsCount: enrichedContent.mechanisms?.length || 0,
        worksForCount: enrichedContent.worksFor?.length || 0,
        timestamp: new Date().toISOString(),
      })
    );

    // Add metadata to X-Ray
    if (subsegment) {
      subsegment.addAnnotation('success', true);
      subsegment.addAnnotation('studiesUsed', studiesCount);
      subsegment.addMetadata('bedrock', {
        duration: bedrockMetadata.duration,
        tokensUsed: bedrockMetadata.tokensUsed,
      });
      subsegment.addMetadata('response', {
        duration,
        mechanismsCount: enrichedContent.mechanisms?.length || 0,
        worksForCount: enrichedContent.worksFor?.length || 0,
        hasRealData: studiesCount > 0,
        studiesUsed: studiesCount,
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
        hasRealData: studiesCount > 0,
        studiesUsed: studiesCount,
        requestId,
        correlationId,
      },
    };

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    // Log error
    console.error(
      JSON.stringify({
        event: 'CONTENT_ENRICH_ERROR',
        requestId,
        correlationId,
        supplementId: (event as any).body ? JSON.parse((event as any).body)?.supplementId : 'unknown',
        error: error.message,
        stack: error.stack,
        duration,
        timestamp: new Date().toISOString(),
      })
    );

    // Add error to X-Ray
    if (subsegment) {
      subsegment.addAnnotation('success', false);
      subsegment.addAnnotation('error', error.message);
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
