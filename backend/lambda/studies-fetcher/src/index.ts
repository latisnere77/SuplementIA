/**
 * Studies Fetcher Lambda Handler
 * Fetches real scientific studies from PubMed
 */

import * as AWSXRay from 'aws-xray-sdk-core';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { searchPubMed } from './pubmed';
import { config, CORS_HEADERS } from './config';
import type { StudySearchRequest, StudiesResponse } from './types';

// Wrap AWS SDK if X-Ray is enabled
if (config.xrayEnabled) {
  AWSXRay.captureHTTPsGlobal(require('https'));
}

/**
 * Lambda handler for fetching studies
 */
export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const segment = config.xrayEnabled ? AWSXRay.getSegment() : null;
  const subsegment = segment?.addNewSubsegment?.('studies-fetcher');

  const startTime = Date.now();
  const correlationId = event.headers?.['X-Request-ID'] || 
                       event.headers?.['x-request-id'] || 
                       context.awsRequestId;

  try {
    // Add X-Ray annotations
    if (subsegment) {
      subsegment.addAnnotation('module', 'studies-fetcher');
      subsegment.addAnnotation('requestId', context.awsRequestId);
      subsegment.addAnnotation('httpMethod', event.httpMethod);
      subsegment.addAnnotation('correlationId', correlationId);
    }

    // Handle OPTIONS (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'OK' }),
      };
    }

    // Only POST is supported
    if (event.httpMethod !== 'POST') {
      return createErrorResponse(405, 'Method not allowed. Use POST.');
    }

    // Parse and validate request
    const request = parseRequest(event);

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

    // Search PubMed
    const searchSubsegment = subsegment?.addNewSubsegment?.('pubmed-search');
    const searchStartTime = Date.now();
    
    try {
      if (searchSubsegment) {
        searchSubsegment.addAnnotation('searchQuery', request.supplementName);
        searchSubsegment.addMetadata('filters', request.filters || {});
      }

      const studies = await searchPubMed(request);

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

      const duration = Date.now() - startTime;
      const searchDuration = Date.now() - searchStartTime;

      // Build success response
      const response: StudiesResponse = {
        success: true,
        data: {
          studies,
          totalFound: studies.length,
          searchQuery: request.supplementName,
        },
        metadata: {
          supplementName: request.supplementName,
          searchDuration: duration,
          source: 'pubmed',
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
 * Parse and validate request body
 */
function parseRequest(event: APIGatewayProxyEvent): StudySearchRequest {
  if (!event.body) {
    throw Object.assign(new Error('Request body is required'), { statusCode: 400 });
  }

  let body: any;
  try {
    body = JSON.parse(event.body);
  } catch (error) {
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

  return {
    supplementName,
    maxResults,
    filters,
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
      console.log(`Studies cached successfully for: ${supplementName}`);
    }
  } catch (error: any) {
    // Non-fatal - log and continue
    console.warn('Cache save error (non-fatal):', error.message);
  }
}
