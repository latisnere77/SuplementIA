/**
 * Cache Service Lambda Handler
 *
 * Provides caching for enriched supplement content
 * Supports GET, PUT, DELETE operations
 */

import { Context } from 'aws-lambda';
import AWSXRay from 'aws-xray-sdk-core';
import { config, CORS_HEADERS } from './config';
import { getCacheItem, putCacheItem, deleteCacheItem, isCacheStale } from './dynamodb';
import { LambdaEvent, LambdaResponse, CacheResponse, EnrichedContent } from './types';

/**
 * Main Lambda handler
 */
export async function handler(
  event: LambdaEvent,
  context: Context
): Promise<LambdaResponse> {
  // Get X-Ray segment
  const segment = config.xrayEnabled ? AWSXRay.getSegment() : null;
  const subsegment = segment?.addNewSubsegment?.('cache-service');

  const requestId = context.requestId;
  const startTime = Date.now();

  try {
    const { httpMethod, pathParameters, body } = event;
    const supplementId = pathParameters?.supplementId;

    // Validate supplementId
    if (!supplementId) {
      return createErrorResponse(400, 'supplementId is required', requestId);
    }

    // Add X-Ray annotations
    if (subsegment) {
      subsegment.addAnnotation('supplementId', supplementId);
      subsegment.addAnnotation('module', 'cache-service');
      subsegment.addAnnotation('httpMethod', httpMethod);
      subsegment.addAnnotation('version', '1.0.0');
    }

    // Log request
    console.log(
      JSON.stringify({
        event: 'REQUEST',
        requestId,
        httpMethod,
        supplementId,
        timestamp: new Date().toISOString(),
      })
    );

    // Route based on HTTP method
    let response: LambdaResponse;

    switch (httpMethod) {
      case 'GET':
        response = await handleGet(supplementId, subsegment);
        break;

      case 'PUT':
        if (!body) {
          return createErrorResponse(400, 'Request body is required', requestId);
        }
        response = await handlePut(supplementId, body, subsegment);
        break;

      case 'DELETE':
        response = await handleDelete(supplementId, subsegment);
        break;

      case 'OPTIONS':
        response = {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: 'OK' }),
        };
        break;

      default:
        response = createErrorResponse(405, 'Method not allowed', requestId);
    }

    // Log response
    const duration = Date.now() - startTime;
    console.log(
      JSON.stringify({
        event: 'RESPONSE',
        requestId,
        statusCode: response.statusCode,
        duration,
        timestamp: new Date().toISOString(),
      })
    );

    // Add metadata to X-Ray
    if (subsegment) {
      subsegment.addMetadata('response', {
        statusCode: response.statusCode,
        duration,
      });
      subsegment.close();
    }

    return response;
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

    return createErrorResponse(500, 'Internal server error', requestId, error.message);
  }
}

/**
 * Handle GET request
 */
async function handleGet(
  supplementId: string,
  subsegment?: any
): Promise<LambdaResponse> {
  const item = await getCacheItem(supplementId);

  if (!item) {
    subsegment?.addAnnotation('cacheHit', false);

    const response: CacheResponse = {
      success: false,
      error: 'Not found',
      message: `Cache entry for ${supplementId} not found`,
    };

    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify(response),
    };
  }

  // Check if cache is stale
  const isStale = isCacheStale(item);

  subsegment?.addAnnotation('cacheHit', true);
  subsegment?.addAnnotation('cacheStale', isStale);
  subsegment?.addMetadata('cache', {
    lastUpdated: item.lastUpdated,
    version: item.version,
    isStale,
  });

  const response: CacheResponse = {
    success: true,
    data: item.data,
    metadata: {
      lastUpdated: item.lastUpdated,
      version: item.version,
      isStale,
    },
  };

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(response),
  };
}

/**
 * Handle PUT request
 */
async function handlePut(
  supplementId: string,
  body: string,
  subsegment?: any
): Promise<LambdaResponse> {
  let data: EnrichedContent;

  try {
    data = JSON.parse(body);
  } catch (error) {
    return createErrorResponse(400, 'Invalid JSON in request body');
  }

  await putCacheItem(supplementId, data);

  subsegment?.addMetadata('operation', {
    type: 'CachePut',
    dataSize: JSON.stringify(data).length,
  });

  const response: CacheResponse = {
    success: true,
    message: 'Cache updated successfully',
    metadata: {
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
    },
  };

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(response),
  };
}

/**
 * Handle DELETE request
 */
async function handleDelete(
  supplementId: string,
  subsegment?: any
): Promise<LambdaResponse> {
  await deleteCacheItem(supplementId);

  subsegment?.addMetadata('operation', {
    type: 'CacheInvalidation',
  });

  const response: CacheResponse = {
    success: true,
    message: 'Cache invalidated successfully',
  };

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(response),
  };
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
  const response: CacheResponse = {
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
