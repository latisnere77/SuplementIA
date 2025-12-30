/**
 * Studies Fetcher Lambda Handler
 * Fetches real scientific studies from PubMed with intelligent ranking
 *
 * Supports both API Gateway and Lambda Function URL invocations
 */

import * as AWSXRay from 'aws-xray-sdk-core';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { searchPubMed } from './pubmed';
import { config, CORS_HEADERS } from './config';
import type { StudySearchRequest, StudiesResponse } from './types';
import { translateToEnglish } from './translator';

// Feature flags (enabled by default, can be disabled with 'false')
const USE_INTELLIGENT_SEARCH = process.env.USE_INTELLIGENT_SEARCH !== 'false';
const USE_INTELLIGENT_RANKING = process.env.USE_INTELLIGENT_RANKING !== 'false';

// Wrap AWS SDK if X-Ray is enabled
if (config.xrayEnabled) {
  AWSXRay.captureHTTPsGlobal(require('https'));
}

/**
 * Get HTTP method from event (supports both API Gateway and Function URL formats)
 */
function getHttpMethod(event: any): string {
  // API Gateway format
  if (event.httpMethod) {
    return event.httpMethod;
  }
  // Lambda Function URL format
  if (event.requestContext?.http?.method) {
    return event.requestContext.http.method;
  }
  // Fallback
  return 'UNKNOWN';
}

/**
 * Get request body from event (supports both API Gateway and Function URL formats)
 */
function getRequestBody(event: any): string | null {
  // Both formats use event.body, but Function URLs may have it base64 encoded
  if (!event.body) {
    return null;
  }

  // Check if body is base64 encoded (Function URL with binary content)
  if (event.isBase64Encoded) {
    return Buffer.from(event.body, 'base64').toString('utf-8');
  }

  return event.body;
}

/**
 * Lambda handler for fetching studies
 */
export async function handler(
  event: APIGatewayProxyEvent | any,
  context: Context
): Promise<APIGatewayProxyResult> {
  const segment = config.xrayEnabled ? AWSXRay.getSegment() : null;
  const subsegment = segment?.addNewSubsegment?.('studies-fetcher');

  const startTime = Date.now();
  const correlationId = event.headers?.['X-Request-ID'] ||
                       event.headers?.['x-request-id'] ||
                       context.awsRequestId;

  // Get HTTP method (works with both API Gateway and Function URL)
  const httpMethod = getHttpMethod(event);

  try {
    // Add X-Ray annotations
    if (subsegment) {
      subsegment.addAnnotation('module', 'studies-fetcher');
      subsegment.addAnnotation('requestId', context.awsRequestId);
      if (httpMethod && httpMethod !== 'UNKNOWN') {
        subsegment.addAnnotation('httpMethod', httpMethod);
      }
      subsegment.addAnnotation('correlationId', correlationId);
    }

    // Handle OPTIONS (CORS preflight)
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'OK' }),
      };
    }

    // Only POST is supported
    if (httpMethod !== 'POST') {
      console.log(JSON.stringify({
        event: 'METHOD_NOT_ALLOWED',
        httpMethod,
        eventKeys: Object.keys(event),
        requestContext: event.requestContext ? Object.keys(event.requestContext) : null,
        timestamp: new Date().toISOString(),
      }));
      return createErrorResponse(405, `Method not allowed. Use POST. Received: ${httpMethod}`);
    }

    // Parse and validate request (with Function URL support)
    const request = parseRequest(event, httpMethod);

    if (subsegment) {
      subsegment.addAnnotation('module', 'studies-fetcher');
      subsegment.addAnnotation('supplementName', request.supplementName);
      subsegment.addAnnotation('searchQuery', request.supplementName); // Alias for clarity
      subsegment.addAnnotation('maxResults', request.maxResults || config.defaultMaxResults);
      subsegment.addAnnotation('correlationId', correlationId);
      subsegment.addMetadata('filters', {
        ...request.filters,
        rctOnly: request.filters?.rctOnly || false,
        yearFrom: request.filters?.yearFrom,
        yearTo: request.filters?.yearTo,
        humanStudiesOnly: request.filters?.humanStudiesOnly,
        studyTypes: request.filters?.studyTypes || [],
      });
      subsegment.addMetadata('request', {
        supplementName: request.supplementName,
        maxResults: request.maxResults || config.defaultMaxResults,
      });
    }

    // Log structured request
    console.log(
      JSON.stringify({
        event: 'STUDIES_FETCH_REQUEST',
        requestId: context.awsRequestId,
        correlationId,
        supplementName: request.supplementName,
        searchQuery: request.supplementName,
        maxResults: request.maxResults || config.defaultMaxResults,
        filters: request.filters || {},
        timestamp: new Date().toISOString(),
      })
    );

    // Translate Spanish to English if needed
    const translationSubsegment = subsegment?.addNewSubsegment?.('translation');
    const originalTerm = request.supplementName;
    const translatedTerm = await translateToEnglish(originalTerm);
    
    if (translationSubsegment) {
      translationSubsegment.addAnnotation('original', originalTerm);
      translationSubsegment.addAnnotation('translated', translatedTerm);
      translationSubsegment.addAnnotation('wasTranslated', originalTerm !== translatedTerm);
    }
    translationSubsegment?.close();
    
        // Use translated term for PubMed search
        let searchTerm = translatedTerm;

        // Import MESH_MAP to do expansion BEFORE benefit query construction
        const { MESH_MAP } = await import('./search/mesh-map');
        const meshTerm = MESH_MAP[translatedTerm.toLowerCase()] || translatedTerm;

        // BENEFIT SEARCH: If a benefit query is provided, construct an advanced query
        // using the MESH term (which may include scientific names)
        if (request.benefitQuery) {
          const translatedBenefitQuery = await translateToEnglish(request.benefitQuery);

          // Expand benefit query to include scientific synonyms for better recall
          const { expandBenefitQuery } = await import('./search/benefit-synonyms');
          const expandedBenefitQuery = expandBenefitQuery(translatedBenefitQuery);

          // Use MESH term + expanded benefit query with synonyms
          searchTerm = `(${meshTerm}) AND (${expandedBenefitQuery})[Title/Abstract]`;

          console.log(
            JSON.stringify({
              event: 'BENEFIT_SEARCH_QUERY_CONSTRUCTED',
              requestId: context.awsRequestId,
              correlationId,
              originalSupplement: originalTerm,
              translatedSupplement: translatedTerm,
              meshTerm: meshTerm,
              originalBenefit: request.benefitQuery,
              translatedBenefit: translatedBenefitQuery,
              expandedBenefit: expandedBenefitQuery,
              advancedQuery: searchTerm,
              timestamp: new Date().toISOString(),
            })
          );
        } else {
          // No benefit query - use MESH term for regular search
          searchTerm = meshTerm;
        }
    
        if (originalTerm !== translatedTerm) {
          console.log(
            JSON.stringify({
              event: 'TERM_TRANSLATED',          requestId: context.awsRequestId,
          correlationId,
          original: originalTerm,
          translated: translatedTerm,
          timestamp: new Date().toISOString(),
        })
      );
    }

    // Search PubMed with translated term
    const searchSubsegment = subsegment?.addNewSubsegment?.('pubmed-search');
    const searchStartTime = Date.now();
    
    try {
      if (searchSubsegment) {
        searchSubsegment.addAnnotation('searchQuery', searchTerm);
        searchSubsegment.addAnnotation('originalQuery', originalTerm);
        searchSubsegment.addMetadata('filters', request.filters || {});
      }

      let studies: any[];
      
      if (USE_INTELLIGENT_SEARCH) {
        // Use new intelligent multi-strategy search
        console.log(JSON.stringify({
          event: 'USING_INTELLIGENT_SEARCH',
          requestId: context.awsRequestId,
          correlationId,
          timestamp: new Date().toISOString(),
        }));
        
        const { multiStrategySearch } = await import('./search/strategies');
        studies = await multiStrategySearch(searchTerm, {
          maxResults: request.maxResults || 200,
          includeNegativeSearch: true,
          includeSystematicReviews: true,
        });
        
        console.log(JSON.stringify({
          event: 'INTELLIGENT_SEARCH_COMPLETE',
          requestId: context.awsRequestId,
          correlationId,
          studiesFound: studies.length,
          timestamp: new Date().toISOString(),
        }));
      } else {
        // Use traditional search
        const translatedRequest = {
          ...request,
          supplementName: searchTerm,
        };
        studies = await searchPubMed(translatedRequest);
      }

      const searchDuration = Date.now() - searchStartTime;
      const studyTypes = studies.map((s: any) => s.studyType || 'unknown');
      const studyIds = studies.map((s: any) => s.pmid || s.id).filter(Boolean);

      if (searchSubsegment) {
        searchSubsegment.addAnnotation('studiesFound', studies.length);
        searchSubsegment.addAnnotation('success', true);
        searchSubsegment.addMetadata('results', {
          count: studies.length,
          studyTypes: [...new Set(studyTypes)],
          sampleIds: studyIds.slice(0, 5), // First 5 IDs for reference
        });
      }
      searchSubsegment?.close();

      let rankedResults: any = null;
      
      if (USE_INTELLIGENT_RANKING && studies.length > 0) {
        const rankingSubsegment = subsegment?.addNewSubsegment?.('intelligent-ranking');
        const rankingStartTime = Date.now();
        
        try {
          console.log(JSON.stringify({
            event: 'USING_INTELLIGENT_RANKING',
            requestId: context.awsRequestId,
            correlationId,
            studiesCount: studies.length,
            timestamp: new Date().toISOString(),
          }));
          
          const { rankStudies } = await import('./scoring/ranker');
          rankedResults = await rankStudies(studies, searchTerm, {
            topPositive: 8, // Increased from 5 to support 5+ items per section
            topNegative: 8, // Increased from 5 to support 5+ items per section
            minConfidence: 0.5,
          });
          
          const rankingDuration = Date.now() - rankingStartTime;
          
          if (rankingSubsegment) {
            rankingSubsegment.addAnnotation('success', true);
            rankingSubsegment.addAnnotation('consensus', rankedResults.metadata.consensus);
            rankingSubsegment.addAnnotation('confidenceScore', rankedResults.metadata.confidenceScore);
            rankingSubsegment.addMetadata('ranking', {
              positive: rankedResults.positive.length,
              negative: rankedResults.negative.length,
              consensus: rankedResults.metadata.consensus,
              confidence: rankedResults.metadata.confidenceScore,
              duration: rankingDuration,
            });
          }
          
          console.log(JSON.stringify({
            event: 'INTELLIGENT_RANKING_COMPLETE',
            requestId: context.awsRequestId,
            correlationId,
            consensus: rankedResults.metadata.consensus,
            confidenceScore: rankedResults.metadata.confidenceScore,
            positive: rankedResults.positive.length,
            negative: rankedResults.negative.length,
            totalPositive: rankedResults.metadata.totalPositive,
            totalNegative: rankedResults.metadata.totalNegative,
            totalNeutral: rankedResults.metadata.totalNeutral,
            duration: rankingDuration,
            timestamp: new Date().toISOString(),
          }));
        } catch (error) {
          console.error(JSON.stringify({
            event: 'INTELLIGENT_RANKING_ERROR',
            requestId: context.awsRequestId,
            correlationId,
            error: (error as Error).message,
            stack: (error as Error).stack,
            fallback: 'using_unranked_studies',
            timestamp: new Date().toISOString(),
          }));
          
          if (rankingSubsegment) {
            rankingSubsegment.addAnnotation('success', false);
            rankingSubsegment.addError(error as Error);
          }
        } finally {
          rankingSubsegment?.close();
        }
      }

      const duration = Date.now() - startTime;

      // Build success response
      const response: StudiesResponse = {
        success: true,
        data: {
          studies,
          totalFound: studies.length,
          searchQuery: request.supplementName,
          // Add ranked results if available
          ...(rankedResults && {
            ranked: {
              positive: rankedResults.positive.map((s: any) => ({
                ...s.study,
                score: s.score.totalScore,
                scoreBreakdown: s.score.breakdown,
                sentiment: s.sentiment.sentiment,
                sentimentConfidence: s.sentiment.confidence,
                sentimentReasoning: s.sentiment.reasoning,
              })),
              negative: rankedResults.negative.map((s: any) => ({
                ...s.study,
                score: s.score.totalScore,
                scoreBreakdown: s.score.breakdown,
                sentiment: s.sentiment.sentiment,
                sentimentConfidence: s.sentiment.confidence,
                sentimentReasoning: s.sentiment.reasoning,
              })),
              metadata: rankedResults.metadata,
            },
          }),
        },
        metadata: {
          supplementName: request.supplementName,
          searchDuration: duration,
          source: 'pubmed',
          ...(rankedResults && {
            intelligentRanking: true,
            consensus: rankedResults.metadata.consensus,
            confidenceScore: rankedResults.metadata.confidenceScore,
          }),
        },
      };

      // Log structured success
      console.log(
        JSON.stringify({
          event: 'STUDIES_FETCH_SUCCESS',
          requestId: context.awsRequestId,
          correlationId,
          supplementName: request.supplementName,
          searchQuery: request.supplementName,
          studiesFound: studies.length,
          duration,
          searchDuration,
          studyTypes: [...new Set(studyTypes)],
          timestamp: new Date().toISOString(),
        })
      );

      if (subsegment) {
        subsegment.addAnnotation('success', true);
        subsegment.addAnnotation('studiesFound', studies.length);
        subsegment.addAnnotation('duration', duration);
        subsegment.addMetadata('response', { 
          studiesCount: studies.length,
          studyTypes: [...new Set(studyTypes)],
          searchDuration,
        });
      }

      // Save to cache asynchronously (fire-and-forget)
      saveToCacheAsync(request.supplementName, studies).catch((err) => {
        console.warn('Cache save failed (non-fatal):', err.message);
      });

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(response),
      };
    } catch (error) {
      const searchDuration = Date.now() - searchStartTime;
      console.error(
        JSON.stringify({
          event: 'STUDIES_FETCH_ERROR',
          requestId: context.awsRequestId,
          correlationId,
          supplementName: request.supplementName,
          searchQuery: request.supplementName,
          error: (error as Error).message,
          searchDuration,
          timestamp: new Date().toISOString(),
        })
      );

      if (searchSubsegment) {
        searchSubsegment.addAnnotation('success', false);
        searchSubsegment.addAnnotation('error', (error as Error).message);
        searchSubsegment.addError(error as Error);
      }
      searchSubsegment?.close();
      throw error;
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const correlationId = event.headers?.['X-Request-ID'] || 
                         event.headers?.['x-request-id'] || 
                         context.awsRequestId;
    console.error(
      JSON.stringify({
        event: 'STUDIES_FETCHER_ERROR',
        requestId: context.awsRequestId,
        correlationId,
        error: error.message,
        stack: error.stack,
        duration,
        timestamp: new Date().toISOString(),
      })
    );

    if (subsegment) {
      subsegment.addAnnotation('success', false);
      subsegment.addAnnotation('error', error.message);
      subsegment.addError(error);
    }

    return createErrorResponse(
      error.statusCode || 500,
      error.message || 'Failed to fetch studies'
    );
  } finally {
    subsegment?.close();
  }
}

/**
 * Parse and validate request body (supports both API Gateway and Function URL)
 */
function parseRequest(event: any, _httpMethod?: string): StudySearchRequest {
  // Get body using helper function that handles base64 encoding
  const rawBody = getRequestBody(event);

  if (!rawBody) {
    throw Object.assign(new Error('Request body is required'), { statusCode: 400 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'JSON_PARSE_ERROR',
      rawBody: rawBody?.substring(0, 200),
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    }));
    throw Object.assign(new Error('Invalid JSON in request body'), { statusCode: 400 });
  }

  // Validate supplementName
  if (!body.supplementName || typeof body.supplementName !== 'string') {
    throw Object.assign(
      new Error('supplementName is required and must be a string'),
      { statusCode: 400 }
    );
  }

  const supplementName = body.supplementName.trim();
  if (supplementName.length === 0) {
    throw Object.assign(new Error('supplementName cannot be empty'), { statusCode: 400 });
  }

  if (supplementName.length > 200) {
    throw Object.assign(
      new Error('supplementName must be 200 characters or less'),
      { statusCode: 400 }
    );
  }

  // Validate maxResults (optional)
  let maxResults = config.defaultMaxResults;
  if (body.maxResults !== undefined) {
    if (typeof body.maxResults !== 'number' || body.maxResults < 1 || body.maxResults > 100) {
      throw Object.assign(
        new Error('maxResults must be a number between 1 and 100'),
        { statusCode: 400 }
      );
    }
    maxResults = body.maxResults;
  }

  // Validate filters (optional)
  const filters = body.filters || {};
  if (typeof filters !== 'object' || Array.isArray(filters)) {
    throw Object.assign(new Error('filters must be an object'), { statusCode: 400 });
  }

  // Extract benefitQuery (optional)
  const benefitQuery = body.benefitQuery || undefined;
  if (benefitQuery && typeof benefitQuery !== 'string') {
    throw Object.assign(new Error('benefitQuery must be a string'), { statusCode: 400 });
  }

  return {
    supplementName,
    maxResults,
    filters,
    benefitQuery,
  };
}

/**
 * Create error response
 */
function createErrorResponse(statusCode: number, message: string): APIGatewayProxyResult {
  const response: StudiesResponse = {
    success: false,
    error: message,
    message,
  };

  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(response),
  };
}

/**
 * Save studies to cache (async, non-blocking)
 */
async function saveToCacheAsync(supplementName: string, studies: any[]): Promise<void> {
  // Skip if cache service URL not configured
  if (!process.env.CACHE_SERVICE_URL) {
    console.log('Cache service URL not configured, skipping cache save');
    return;
  }

  try {
    const cacheKey = `studies-${supplementName.toLowerCase().replace(/\s+/g, '-')}`;
    const response = await fetch(`${process.env.CACHE_SERVICE_URL}/cache/${cacheKey}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studies,
        supplementName,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });

    if (!response.ok) {
      console.warn(`Cache save failed: ${response.status} ${response.statusText}`);
    } else {
      
    }
  } catch (error: any) {
    // Non-fatal - log and continue
    console.warn('Cache save error (non-fatal):', error.message);
  }
}
