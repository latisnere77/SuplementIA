/**
 * Quiz Orchestrator Lambda Handler
 *
 * Coordinates search, enrichment, and recommendation generation.
 * Designed to run with Function URL to bypass Amplify's 30s SSR timeout.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { config } from './config';
import { searchSupplements, filterRelevantHits } from './search';
import {
  needsEnrichment,
  enrichSupplement,
  mergeEnrichedData,
  getStudiesRanking,
} from './enrichment';
import {
  validateSupplementQuery,
  sanitizeQuery,
  expandAbbreviation,
  detectAltitude,
  detectClimate,
} from './query-utils';
import { getQuerySuggestions } from './query-suggestions';
import {
  QuizRequest,
  SearchHit,
  Recommendation,
  IngredientInfo,
  WorksForItem,
} from './types';

// DynamoDB client for job status storage
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }), {
  marshallOptions: {
    removeUndefinedValues: true, // Remove undefined values to avoid DynamoDB errors
  },
});
const JOB_STATUS_TABLE = process.env.JOB_STATUS_TABLE || 'suplementai-async-jobs';

/**
 * Store job result to DynamoDB
 */
async function storeJobResult(jobId: string, status: 'completed' | 'failed', data: any): Promise<void> {
  try {
    await dynamoClient.send(new PutCommand({
      TableName: JOB_STATUS_TABLE,
      Item: {
        jobId,
        status,
        result: data,
        timestamp: Date.now(),
        ttl: Math.floor(Date.now() / 1000) + 3600, // 1 hour TTL
      },
    }));
    console.log(`✅ [Job ${jobId}] Stored result with status: ${status}`);
  } catch (error) {
    console.error(`❌ [Job ${jobId}] Failed to store result:`, error);
    // Don't throw - we still want to return the response even if DynamoDB fails
  }
}

/**
 * Transform search hits to structured Recommendation object
 * Handles both LanceDB and PubMed search result formats
 */
function transformHitsToRecommendation(
  hits: any[],
  query: string,
  quizId: string
): Recommendation {
  // Get study count from metadata if available
  const firstHit = hits[0] || {};
  const totalStudies =
    firstHit.metadata?.study_count ||
    firstHit.study_count ||
    hits.length;

  const ingredientsMap = new Map<string, number>();
  const conditionsStats = new Map<
    string,
    { count: number; papers: string[] }
  >();

  hits.forEach((hit: any) => {
    // Support both formats: hit.name (LanceDB) or hit.title (PubMed)
    const hitName = hit.name || hit.title || query;

    // Ingredients - from commonNames or ingredients field
    const rawIng = hit.commonNames || hit.ingredients;
    const ingArray = Array.isArray(rawIng)
      ? rawIng
      : typeof rawIng === 'string'
        ? rawIng.split(',').map((s: string) => s.trim())
        : [hitName];
    ingArray.forEach((ing: string) => {
      ingredientsMap.set(ing, (ingredientsMap.get(ing) || 0) + 1);
    });

    // Conditions (Works For)
    const rawCond = hit.conditions;
    const condArray = Array.isArray(rawCond)
      ? rawCond
      : typeof rawCond === 'string'
        ? rawCond.split(',').map((s: string) => s.trim())
        : [];
    condArray.forEach((cond: string) => {
      const current = conditionsStats.get(cond) || { count: 0, papers: [] };
      current.count++;
      if (hitName) current.papers.push(hitName);
      conditionsStats.set(cond, current);
    });
  });

  // Convert conditions to worksFor structure
  const sortedConditions = Array.from(conditionsStats.entries()).sort(
    (a, b) => b[1].count - a[1].count
  );

  const worksFor: WorksForItem[] = sortedConditions.map(
    ([cond, stats], index) => ({
      condition: cond,
      evidenceGrade: 'C',
      grade: 'C',
      magnitude: 'Moderada',
      studyCount: stats.count,
      notes: `Evidencia preliminar encontrada en ${stats.count} estudios.`,
      quantitativeData: 'Pendiente de analisis detallado...',
      confidence: 60 - index * 5,
    })
  );

  // Top ingredients
  const topIngredients: IngredientInfo[] = Array.from(ingredientsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      grade: 'C' as const,
      studyCount: count,
      rctCount: 0,
    }));

  // Get supplement name from first hit
  const supplementName = (hits[0] as any)?.name || (hits[0] as any)?.scientificName || query;
  const evidenceGrade = (hits[0] as any)?.metadata?.evidence_grade || 'C';

  return {
    recommendation_id: `rec_${Date.now()}_orchestrator`,
    quiz_id: quizId,
    category: query,
    supplement: {
      name: supplementName,
      description:
        (hits[0] as any)?.abstract ||
        `${supplementName} - Suplemento analizado con ${totalStudies} estudios científicos.`,
      overallGrade: evidenceGrade,
      worksFor: worksFor,
      doesntWorkFor: [],
      limitedEvidence: [],
      sideEffects: [],
      dosage: {
        standard: 'Ver analisis de evidencia',
        effectiveDose: 'Ver analisis de evidencia',
        notes: 'Dosis optimizada basada en estudios recuperados.',
      },
      safety: {
        overallRating: 'Neutral',
        pregnancyCategory: 'Consultar medico',
      },
    },
    evidence_summary: {
      totalStudies: totalStudies,
      totalParticipants: 0,
      efficacyPercentage: 0,
      researchSpanYears: 0,
      ingredients: topIngredients,
    },
    ingredients: topIngredients.map((ing) => ({
      name: ing.name,
      grade: ing.grade,
      adjustedDose: 'Ver seccion de dosis',
      adjustmentReason: 'Dosis estandar recomendada basada en evidencia',
    })),
    products: [
      {
        tier: 'premium',
        name: `Suplemento Premium de ${query}`,
        price: 0,
        currency: 'MXN',
        contains: topIngredients.map((i) => i.name),
        whereToBuy: 'Consultar Proveedor Certificado',
        description: `Formula de alta pureza optimizada para ${query}.`,
        isAnkonere: true,
      },
    ],
    personalization_factors: {
      altitude: 2250,
      climate: 'tropical',
      gender: 'neutral',
      age: 35,
      location: 'CDMX',
      sensitivities: [],
    },
  };
}

/**
 * Build response headers
 * Note: CORS headers are handled by Lambda Function URL configuration
 * Do NOT add Access-Control-* headers here to avoid duplicates
 */
function responseHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
  };
}

/**
 * Create error response
 */
function errorResponse(
  statusCode: number,
  error: string,
  details?: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: responseHeaders(),
    body: JSON.stringify({
      success: false,
      error,
      details,
      timestamp: new Date().toISOString(),
    }),
  };
}

/**
 * Main Lambda handler
 * Supports both API Gateway and Function URL event formats
 */
export async function handler(
  event: any
): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  const requestId = event.requestContext?.requestId || randomUUID();

  // Function URLs use requestContext.http.method, API Gateway uses httpMethod
  const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'UNKNOWN';

  console.log(
    JSON.stringify({
      operation: 'QuizOrchestrator',
      requestId,
      httpMethod,
      path: event.path || event.rawPath,
      eventType: event.httpMethod ? 'APIGateway' : 'FunctionURL',
    })
  );

  // Handle OPTIONS (CORS preflight)
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: responseHeaders(),
      body: '',
    };
  }

  // Only accept POST
  if (httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  // Parse request body
  let body: QuizRequest;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return errorResponse(400, 'Invalid JSON body');
  }

  const { category, age, gender, location, sensitivities = [], jobId: providedJobId, forceRefresh } = body;

  // Validate category
  if (!category) {
    return errorResponse(400, 'Missing required field: category');
  }

  const validation = validateSupplementQuery(category);
  if (!validation.valid) {
    return {
      statusCode: 400,
      headers: responseHeaders(),
      body: JSON.stringify({
        success: false,
        error: validation.error,
        suggestion: validation.suggestion,
        severity: validation.severity,
      }),
    };
  }

  const sanitizedCategory = sanitizeQuery(category);
  const quizId = `quiz_${Date.now()}_${randomUUID().substring(0, 8)}`;
  // Use provided jobId from async enrichment request, or generate new one
  const jobId = providedJobId || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Expand abbreviations
    const expansion = expandAbbreviation(sanitizedCategory);
    const searchTerm = expansion.expanded;

    console.log(
      JSON.stringify({
        operation: 'QueryExpansion',
        original: sanitizedCategory,
        expanded: searchTerm,
        wasExpanded: expansion.wasExpanded,
      })
    );

    // Step 1: Search via LanceDB Lambda
    console.log(
      JSON.stringify({
        operation: 'SearchStart',
        searchTerm,
        requestId,
      })
    );

    const hits = await searchSupplements(searchTerm);

    if (hits && hits.length > 0) {
      // Filter for relevance
      const relevantHits = filterRelevantHits(hits, searchTerm);
      const finalHits = relevantHits.length > 0 ? relevantHits : [];

      if (finalHits.length > 0) {
        console.log(
          JSON.stringify({
            operation: 'SearchResults',
            totalHits: hits.length,
            filteredHits: finalHits.length,
            requestId,
          })
        );

        // Transform to recommendation structure
        let recommendation = transformHitsToRecommendation(
          finalHits,
          searchTerm,
          quizId
        );

        // Step 2: Get studies ranking
        let ranking = null;
        const rankingData = await getStudiesRanking(searchTerm);
        if (rankingData) {
          ranking = rankingData;
        }

        // Step 3: Enrich if needed
        if (config.enableEnrichment && needsEnrichment(recommendation)) {
          console.log(
            JSON.stringify({
              operation: 'EnrichmentStart',
              supplement: searchTerm,
              requestId,
              hasRanking: !!ranking,
            })
          );

          const enrichedData = await enrichSupplement(searchTerm, ranking);

          if (enrichedData) {
            recommendation = mergeEnrichedData(recommendation, enrichedData);
            console.log(
              JSON.stringify({
                operation: 'EnrichmentComplete',
                supplement: searchTerm,
                requestId,
              })
            );
          } else {
            console.log(
              JSON.stringify({
                operation: 'EnrichmentFailed',
                supplement: searchTerm,
                requestId,
              })
            );
          }
        }

        // Add personalization
        recommendation.personalization_factors = {
          altitude: detectAltitude(location || 'CDMX'),
          climate: detectClimate(location || 'CDMX'),
          gender: gender || 'neutral',
          age: age || 35,
          location: location || 'CDMX',
          sensitivities: sensitivities,
        };

        const duration = Date.now() - startTime;

        console.log(
          JSON.stringify({
            operation: 'QuizComplete',
            requestId,
            quizId,
            duration,
            enriched: recommendation.enriched || false,
            worksForCount: recommendation.supplement.worksFor.length,
          })
        );

        // Check for query suggestions (ambiguous queries)
        // Use original query (sanitizedCategory) to preserve language
        const suggestions = getQuerySuggestions(sanitizedCategory);

        const responseData = {
          success: true,
          quiz_id: quizId,
          recommendation,
          jobId,
          source: recommendation.enriched
            ? 'orchestrator_enriched'
            : 'orchestrator_search',
          suggestions: suggestions || undefined, // Include suggestions if available
          metadata: {
            duration,
            requestId,
            searchTerm,
            wasExpanded: expansion.wasExpanded,
          },
        };

        // Store result to DynamoDB if this is an async job
        if (providedJobId) {
          await storeJobResult(jobId, 'completed', responseData);
        }

        return {
          statusCode: 200,
          headers: responseHeaders(),
          body: JSON.stringify(responseData),
        };
      }
    }

    // No results found
    console.log(
      JSON.stringify({
        operation: 'NoResults',
        searchTerm,
        requestId,
      })
    );

    // Check for query suggestions even when no results found
    // Use original query (sanitizedCategory) to preserve language
    const suggestions = getQuerySuggestions(sanitizedCategory);

    return {
      statusCode: 200,
      headers: responseHeaders(),
      body: JSON.stringify({
        success: false,
        quiz_id: quizId,
        error: 'no_results',
        message: `No se encontraron estudios para "${sanitizedCategory}".`,
        suggestion: 'Intenta con un término diferente o más específico.',
        suggestions: suggestions || undefined, // Include suggestions if available
        metadata: {
          duration: Date.now() - startTime,
          requestId,
          searchTerm,
        },
      }),
    };
  } catch (error: any) {
    console.error(
      JSON.stringify({
        operation: 'QuizError',
        error: error.message,
        stack: error.stack,
        requestId,
        duration: Date.now() - startTime,
      })
    );

    // Store failure to DynamoDB if this is an async job
    if (providedJobId) {
      await storeJobResult(jobId, 'failed', {
        success: false,
        error: error.message,
        requestId,
      });
    }

    return errorResponse(500, 'Internal server error', error.message);
  }
}
