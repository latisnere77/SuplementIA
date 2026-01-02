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
import { updateJobWithResult } from './job-store';
import { getSynergiesForSupplement, transformStacksWithFallback, TransformedSynergy } from './synergies';

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

    const { supplementId, category, forceRefresh, studies, ranking, contentType = 'standard', benefitQuery, jobId } = request;

    // CRITICAL DEBUG: Log what we received for ranking
    console.log(JSON.stringify({
      event: 'RANKING_DEBUG',
      requestId,
      hasRanking: !!ranking,
      rankingType: ranking ? typeof ranking : 'undefined',
      rankingKeys: ranking && typeof ranking === 'object' ? Object.keys(ranking) : 'N/A',
      rankingPositiveCount: ranking?.positive?.length || 0,
      rankingNegativeCount: ranking?.negative?.length || 0,
      timestamp: new Date().toISOString(),
    }));

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
      subsegment.addAnnotation('hasBenefitQuery', !!benefitQuery);
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
        contentType: contentType || 'standard',
        forceRefresh: forceRefresh || false,
        studiesProvided: studiesCount,
        hasRealData: studiesCount > 0,
        studyTypes: uniqueStudyTypes,
        timestamp: new Date().toISOString(),
      })
    );

    // Try cache first (unless forceRefresh)
    let enrichedContent;
    let cachedRanking;

    if (!forceRefresh) {
      const cached = await getFromCache(supplementId);
      if (cached) {
        enrichedContent = cached.data;
        cachedRanking = cached.metadata?.studies?.ranked;

        if (subsegment) {
          subsegment.addAnnotation('cacheHit', true);
          subsegment.addAnnotation('hasCachedRanking', !!cachedRanking);
        }

        // Fetch synergies for cached content (synergies are NOT cached, always fresh from external DB)
        let cachedSynergies: TransformedSynergy[] = [];
        let cachedSynergiesSource: 'external_db' | 'claude_fallback' = 'claude_fallback';

        try {
          const externalSynergies = await getSynergiesForSupplement(supplementId);
          if (externalSynergies.length > 0) {
            cachedSynergies = externalSynergies;
            cachedSynergiesSource = 'external_db';
          } else {
            // Fallback to Claude's stacksWith if no external synergies found
            const standardContent = enrichedContent as any;
            cachedSynergies = transformStacksWithFallback(standardContent.dosage?.stacksWith);
            cachedSynergiesSource = 'claude_fallback';
          }
        } catch (synergiesError) {
          console.error(JSON.stringify({
            event: 'SYNERGIES_FETCH_ERROR_CACHE_PATH',
            requestId,
            supplementId,
            error: synergiesError instanceof Error ? synergiesError.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          }));
        }

        // Add synergies to cached content
        (enrichedContent as any).synergies = cachedSynergies;
        (enrichedContent as any).synergiesSource = cachedSynergiesSource;

        const duration = Date.now() - startTime;

        console.log(
          JSON.stringify({
            event: 'CACHE_HIT',
            requestId,
            correlationId,
            supplementId,
            duration,
            studiesProvided: studiesCount,
            hasCachedRanking: !!cachedRanking,
            cachedRankingPositive: cachedRanking?.positive?.length || 0,
            cachedRankingNegative: cachedRanking?.negative?.length || 0,
            synergiesCount: cachedSynergies.length,
            synergiesSource: cachedSynergiesSource,
            timestamp: new Date().toISOString(),
          })
        );

        // Use cached ranking if available, otherwise fall back to provided ranking
        const finalRanking = cachedRanking || ranking;

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
          // Preserve ranking data from cache OR LanceDB if provided
          ...(finalRanking && {
            evidence_summary: {
              studies: {
                ranked: finalRanking,
              },
            },
          }),
        };

        // Update job store if jobId provided (cache hit path)
        if (jobId) {
          await updateJobWithResult(jobId, 'completed', {
            recommendation: response,
          });
        }

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
      try {
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
          summarizedStudies: processedStudies?.length || 0,
          timestamp: new Date().toISOString(),
        }));
      } catch (error) {
        console.error(JSON.stringify({
          event: 'STUDIES_SUMMARIZATION_FAILED',
          requestId,
          correlationId,
          error: error instanceof Error ? error.message : 'Unknown error',
          fallback: 'using_original_studies',
          timestamp: new Date().toISOString(),
        }));
        // Fallback: use original studies
        processedStudies = studies;
      }
    }

    // Choose API based on feature flag
    const { content, metadata: bedrockMetadata } = USE_TOOL_API
      ? await generateEnrichedContentWithToolUse(
          supplementId,
          category || 'general',
          processedStudies, // Pass summarized studies to Claude
          benefitQuery // Pass benefitQuery for focused analysis
        )
      : await generateEnrichedContent(
          supplementId,
          category || 'general',
          studies, // Pass real PubMed studies to Claude
          contentType, // Pass content type for format selection
          benefitQuery // Pass benefitQuery for focused analysis
        );

    enrichedContent = content;

    // Fetch synergies from external database
    let synergies: TransformedSynergy[] = [];
    let synergiesSource: 'external_db' | 'claude_fallback' = 'claude_fallback';

    try {
      const externalSynergies = await getSynergiesForSupplement(supplementId);

      if (externalSynergies.length > 0) {
        synergies = externalSynergies;
        synergiesSource = 'external_db';
      } else {
        // Fallback to Claude's stacksWith if no external synergies found
        const standardContent = enrichedContent as any;
        synergies = transformStacksWithFallback(standardContent.dosage?.stacksWith);
        synergiesSource = 'claude_fallback';
      }

      console.log(JSON.stringify({
        event: 'SYNERGIES_FETCHED',
        requestId,
        supplementId,
        synergiesCount: synergies.length,
        source: synergiesSource,
        positiveCount: synergies.filter(s => s.direction === 'positive').length,
        negativeCount: synergies.filter(s => s.direction === 'negative').length,
        timestamp: new Date().toISOString(),
      }));
    } catch (synergiesError) {
      console.error(JSON.stringify({
        event: 'SYNERGIES_FETCH_ERROR',
        requestId,
        supplementId,
        error: synergiesError instanceof Error ? synergiesError.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }));
      // Continue without synergies on error
    }

    // Add synergies to enriched content
    (enrichedContent as any).synergies = synergies;
    (enrichedContent as any).synergiesSource = synergiesSource;

    // Save to cache with ranking metadata (await to ensure it completes before Lambda freezes)
    try {
      const cacheMetadata = ranking ? {
        studies: {
          ranked: ranking,
          all: studies || [],
          total: studies?.length || 0,
        },
      } : undefined;
      
      await saveToCacheAsync(supplementId, enrichedContent, cacheMetadata);
    } catch (err) {
      console.error('Failed to save to cache (non-fatal):', err);
    }

    const duration = Date.now() - startTime;

    // Log success (handle both content types)
    const logData: any = {
      event: 'CONTENT_ENRICH_SUCCESS',
      requestId,
      correlationId,
      supplementId,
      contentType,
      duration,
      bedrockDuration: bedrockMetadata.duration,
      tokensUsed: bedrockMetadata.tokensUsed,
      studiesUsed: studiesCount,
      hasRealData: studiesCount > 0,
      timestamp: new Date().toISOString(),
    };

    // Add format-specific metrics
    if (contentType === 'examine-style') {
      const examineContent = enrichedContent as any;
      logData.benefitsCount = examineContent.benefitsByCondition?.length || 0;
      logData.mechanismsCount = examineContent.mechanisms?.length || 0;
    } else {
      const standardContent = enrichedContent as any;
      logData.mechanismsCount = standardContent.mechanisms?.length || 0;
      logData.worksForCount = standardContent.worksFor?.length || 0;
    }

    console.log(JSON.stringify(logData));

    // Add metadata to X-Ray
    if (subsegment) {
      subsegment.addAnnotation('success', true);
      subsegment.addAnnotation('studiesUsed', studiesCount);
      subsegment.addAnnotation('contentType', contentType);
      subsegment.addMetadata('bedrock', {
        duration: bedrockMetadata.duration,
        tokensUsed: bedrockMetadata.tokensUsed,
      });
      subsegment.addMetadata('response', {
        duration,
        contentType,
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
      // Preserve ranking data from LanceDB if provided
      ...(ranking && {
        evidence_summary: {
          studies: {
            ranked: ranking,
          },
        },
      }),
    };

    // Update job store if jobId provided (async enrichment)
    if (jobId) {
      await updateJobWithResult(jobId, 'completed', {
        recommendation: response, // Store the full enrichment response
      });
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Extract jobId from request for error handling
    let jobId: string | undefined;
    try {
      if (event.body) {
        const parsedBody = JSON.parse(event.body);
        jobId = parsedBody.jobId;
      }
    } catch {
      // Ignore parsing errors
    }

    // Log error
    console.error(
      JSON.stringify({
        event: 'CONTENT_ENRICH_ERROR',
        requestId,
        correlationId,
        supplementId: (event as any).body ? JSON.parse((event as any).body)?.supplementId : 'unknown',
        jobId,
        error: error.message,
        stack: error.stack,
        duration,
        timestamp: new Date().toISOString(),
      })
    );

    // Update job store with failed status if jobId provided
    if (jobId) {
      await updateJobWithResult(jobId, 'failed', {
        error: `Enrichment failed: ${error.message}`,
      });
    }

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
