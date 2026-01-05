/**
 * Search module - calls search-api-lancedb Lambda
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import AWSXRay from 'aws-xray-sdk-core';
import { config } from './config';
import { SearchHit } from './types';

// Initialize Lambda client
const baseClient = new LambdaClient({ region: config.region });

// Capture with X-Ray if enabled
const lambdaClient = config.xrayEnabled
  ? AWSXRay.captureAWSv3Client(baseClient)
  : baseClient;

/**
 * Search supplements using the LanceDB Lambda
 */
export async function searchSupplements(query: string): Promise<SearchHit[]> {
  const startTime = Date.now();

  console.log(
    JSON.stringify({
      operation: 'SearchSupplements',
      query,
      lambda: config.searchLambda,
    })
  );

  try {
    // The search Lambda expects queryStringParameters with 'q' parameter
    const payload = {
      httpMethod: 'GET',
      queryStringParameters: {
        q: query,
        limit: '20',
      },
    };

    const response = await lambdaClient.send(
      new InvokeCommand({
        FunctionName: config.searchLambda,
        InvocationType: 'RequestResponse',
        Payload: Buffer.from(JSON.stringify(payload)),
      })
    );

    const duration = Date.now() - startTime;

    if (response.FunctionError) {
      console.error(
        JSON.stringify({
          operation: 'SearchSupplements',
          error: response.FunctionError,
          duration,
        })
      );
      throw new Error(`Search Lambda error: ${response.FunctionError}`);
    }

    const responsePayload = response.Payload
      ? JSON.parse(new TextDecoder().decode(response.Payload))
      : null;

    // Handle Lambda response (may have statusCode/body structure)
    let results: SearchHit[] = [];

    if (responsePayload?.body) {
      const body =
        typeof responsePayload.body === 'string'
          ? JSON.parse(responsePayload.body)
          : responsePayload.body;

      // The search Lambda returns supplement in body for single result
      // or results array for multiple
      if (body.supplement) {
        results = [body.supplement];
      } else {
        results = body.results || body.hits || body.data || [];
      }
    } else if (Array.isArray(responsePayload)) {
      results = responsePayload;
    } else if (responsePayload?.results) {
      results = responsePayload.results;
    } else if (responsePayload?.supplement) {
      results = [responsePayload.supplement];
    }

    console.log(
      JSON.stringify({
        operation: 'SearchSupplements',
        query,
        resultsCount: results.length,
        duration,
      })
    );

    return results;
  } catch (error: any) {
    console.error(
      JSON.stringify({
        operation: 'SearchSupplements',
        error: error.message,
        query,
        duration: Date.now() - startTime,
      })
    );
    throw error;
  }
}

/**
 * Filter search hits for relevance
 * Updated to use flexible word-based matching instead of rigid substring matching
 */
export function filterRelevantHits(
  hits: SearchHit[],
  query: string
): SearchHit[] {
  const lowerQuery = query.toLowerCase();
  // Split query into words for flexible matching
  // This handles multi-word queries like "pine sap" correctly
  const words = lowerQuery.split(/\s+/).filter(w => w.length > 0);

  return hits.filter((h: any) => {
    // Support both search Lambda formats: 'title' or 'name'
    const name = ((h as any).name || h.title || '').toLowerCase();
    const ing = (
      Array.isArray(h.ingredients)
        ? h.ingredients.join(' ')
        : h.ingredients || ''
    ).toLowerCase();
    const abstract = (h.abstract || '').toLowerCase();
    // Support both 'score' and 'similarity' fields
    const similarity = (h as any).similarity || h.score || 0;

    // Critical exclusions
    if (
      lowerQuery.includes('creatine') &&
      (name.includes('urine') ||
        abstract.includes('urine') ||
        ing.includes('creatinine'))
    ) {
      return false;
    }
    if (name.includes('case report') && !name.includes('supplement')) {
      return false;
    }

    // Inclusion criteria: ANY word matches name/ingredients, or good similarity
    // Lowered threshold from 0.6 to 0.5 to handle cross-language matches
    // (e.g., "pine sap" matching "resina de pino" with 0.506 similarity)
    const hasWordMatch = words.some(word =>
      name.includes(word) || ing.includes(word)
    );

    return hasWordMatch || similarity > 0.5;
  });
}
