/**
 * Portal Quiz API Route
 * Submits quiz responses and triggers recommendation generation
 * Last updated: 2025-12-31 03:38:00 UTC
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { portalLogger } from '@/lib/portal/api-logger';
import { validateSupplementQuery, sanitizeQuery } from '@/lib/portal/query-validator';
import { expandAbbreviation } from '@/lib/services/abbreviation-expander';
import { createJob, storeJobResult, getJob } from '@/lib/portal/job-store';
import { compareEvidenceGrades, isStrongEvidenceGrade, normalizeEvidenceGrade } from '@/lib/portal/evidence-grades';
import { getSupplementEvidenceFromCache } from '@/lib/portal/supplements-evidence-data';
import { SUPPLEMENTS_DATABASE, type SupplementEntry } from '@/lib/portal/supplements-database';
import { searchPubMed } from '@/lib/services/pubmed-search';
import { isHumanClinicalEvidenceArticle } from '@/lib/services/pubmed-literature-profile';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { detectVariants } from '@/lib/portal/variant-detector';
import { logPortalSupplementOutcome, logStructured } from '@/lib/portal/structured-logger';
import { calibratePortalRecommendation } from '@/lib/portal/centella-editorial-calibration';
import type { SupplementVariant, VariantDetectionResult } from '@/types/supplement-variants';

import { searchSupplements } from '@/lib/search-service';

// Initialize Lambda client for async enrichment
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

// In-memory cache for variant detection results (24 hour TTL)
interface CachedVariantDetection extends VariantDetectionResult {
  _cachedAt: number;
  _cacheKey: string;
}

const variantDetectionCache = new Map<string, CachedVariantDetection>();
const VARIANT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const VARIANT_CACHE_MAX_SIZE = 1000;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 180; // 3 minutes to allow for complex supplements with many studies

const ENRICH_V2_PREFLIGHT_TIMEOUT_MS = 8000;

// Check if we're in demo mode
const isDemoMode = process.env.PORTAL_DEMO_MODE === 'true';

function logQuizOutcome(data: {
  requestId: string;
  jobId: string;
  quizId?: string;
  supplementName?: string;
  originalQuery?: string;
  normalizedQuery?: string;
  status: 'completed' | 'processing' | 'failed' | 'insufficient_data' | 'upstream_unavailable';
  finalStatusCode: number;
  fallback?: 'local_catalog_fallback' | 'async_enrichment' | 'insufficient_data' | 'upstream_unavailable' | 'backend_service_error' | 'none';
  errorCode?: string;
  upstreamStatus?: number;
  source?: string;
  startTime: number;
}) {
  logPortalSupplementOutcome({
    endpoint: '/api/portal/quiz',
    requestId: data.requestId,
    jobId: data.jobId,
    quizId: data.quizId,
    supplementName: data.supplementName,
    originalQuery: data.originalQuery,
    normalizedQuery: data.normalizedQuery,
    status: data.status,
    finalStatusCode: data.finalStatusCode,
    fallback: data.fallback,
    errorCode: data.errorCode,
    upstreamStatus: data.upstreamStatus,
    source: data.source,
    elapsedTime: Date.now() - data.startTime,
  });
}

/**
 * Detect if recommendation has poor/placeholder metadata that needs enrichment
 * @returns true if enrichment is needed
 */
function needsEnrichment(recommendation: any): boolean {
  // FORCE ENRICHMENT: Always enrich to ensure ranking data is generated
  // This ensures studies-fetcher is always called to get intelligent ranking
  console.log(`⚡ [NEEDS_ENRICH] FORCING ENRICHMENT for ranking generation`);
  return true;

  const worksFor = recommendation?.supplement?.worksFor || [];

  // Check if worksFor is empty or only has placeholder "Bienestar General"
  if (worksFor.length === 0) return true;
  if (worksFor.length === 1 && worksFor[0]?.condition === "Bienestar General") return true;

  // Check if evidence grade is poor (C or lower)
  const evidenceGrade = recommendation?.supplement?.evidenceGrade || recommendation?.evidence_summary?.evidenceGrade;
  if (evidenceGrade === 'C' || evidenceGrade === 'D') return true;

  // Check if description is generic placeholder
  const description = recommendation?.supplement?.description || '';
  if (description.includes('Suplemento analizado basado en') && description.includes('estudios científicos recuperados')) {
    return true;
  }

  return false;
}

/**
 * Call the enrichment API synchronously to get detailed supplement data
 * @param supplementName - Name of the supplement to enrich
 * @param baseUrl - Base URL for API calls
 * @param forceRefresh - Force bypass of enrichment cache (useful when ranking data is missing)
 * @returns Enriched recommendation data or null if failed
 */
async function enrichSupplement(supplementName: string, baseUrl: string, forceRefresh: boolean = false): Promise<any | null> {
  const enrichStart = Date.now();
  console.log(`🔥🔥🔥 [ENRICH_CALLED] supplement="${supplementName}" forceRefresh=${forceRefresh} time=${new Date().toISOString()}`);

  try {
    const enrichResponse = await fetch(`${baseUrl}/api/portal/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplementName: supplementName,
        maxStudies: 5, // Limit to 5 for speed
        rctOnly: false,
        forceRefresh: forceRefresh, // Bypass enrichment cache when ranking is missing
      }),
      signal: AbortSignal.timeout(180000), // 180 second timeout for enrichment (Bedrock + Lambda cold start)
    });

    if (!enrichResponse.ok) {
      console.error(`[Inline Enrichment] API returned ${enrichResponse.status}`);
      return null;
    }

    const enrichData = await enrichResponse.json();
    const elapsed = Date.now() - enrichStart;
    console.log(`✅ [ENRICH_RESPONSE] Completed in ${elapsed}ms`);
    console.log(`🔍 [ENRICH_RESPONSE] Response keys:`, Object.keys(enrichData || {}));
    console.log(`🔍 [ENRICH_RESPONSE] Has data.studies:`, !!enrichData?.data?.studies);
    console.log(`🔍 [ENRICH_RESPONSE] Has data.studies.ranked:`, !!enrichData?.data?.studies?.ranked);
    if (enrichData?.data?.studies?.ranked) {
      console.log(`🔍 [ENRICH_RESPONSE] Ranked data found:`, {
        confidence: enrichData.data.studies.ranked.metadata?.confidenceScore,
        consensus: enrichData.data.studies.ranked.metadata?.consensus,
        positiveCount: enrichData.data.studies.ranked.positive?.length || 0,
        negativeCount: enrichData.data.studies.ranked.negative?.length || 0,
        mixedCount: enrichData.data.studies.ranked.mixed?.length || 0
      });
    }

    return enrichData;
  } catch (error: any) {
    console.error(`[Inline Enrichment] Error:`, error.message);
    return null;
  }
}

/**
 * Invoke content-enricher Lambda asynchronously (fire-and-forget)
 * The Lambda will enrich the supplement and update the DynamoDB job store when complete
 * @param jobId - The job ID to update when enrichment completes
 * @param supplementName - The supplement name to enrich
 * @param forceRefresh - Force bypass of enrichment cache
 * @param ranking - Optional ranking data from LanceDB to preserve in enrichment
 */
async function invokeLambdaEnrichmentAsync(
  jobId: string,
  supplementName: string,
  forceRefresh: boolean = false,
  ranking?: any
): Promise<void> {
  try {
    const payload = {
      httpMethod: 'POST',
      body: JSON.stringify({
        supplementId: supplementName,
        category: 'general',
        forceRefresh,
        jobId, // Pass jobId so Lambda can update the job store
        ranking, // Pass ranking data to preserve in enrichment response
        maxStudies: 5,
        rctOnly: false,
      }),
    };

    // DEBUG: Log the exact payload being sent to Lambda
    console.log(`📦📦📦 [PAYLOAD_DEBUG] Sending to enrichment Lambda:`, JSON.stringify({
      hasRanking: !!ranking,
      rankingPositive: ranking?.positive?.length || 0,
      rankingNegative: ranking?.negative?.length || 0,
      rankingConfidence: ranking?.metadata?.confidenceScore || 0,
      supplementId: supplementName,
      forceRefresh,
      fullRanking: ranking ? JSON.stringify(ranking).substring(0, 200) : 'null',
    }));

    // Invoke Lambda asynchronously (InvocationType: 'Event')
    // This returns immediately without waiting for Lambda to complete
    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: process.env.ENRICHER_LAMBDA || 'production-content-enricher',
        InvocationType: 'Event', // Async invocation - fire and forget
        Payload: Buffer.from(JSON.stringify(payload)),
      })
    );

    console.log(`🚀 [LAMBDA_INVOKED] jobId=${jobId} supplement="${supplementName}" forceRefresh=${forceRefresh} hasRanking=${!!ranking} invocationType=Event`);
  } catch (error: any) {
    console.error(`❌ [LAMBDA_INVOKE_ERROR] jobId=${jobId} supplement="${supplementName}"`, error);
    // Mark job as failed if we can't even invoke the Lambda
    await storeJobResult(jobId, 'failed', {
      error: `Failed to invoke enrichment Lambda: ${error.message}`
    });
  }
}

/**
 * Invoke studies-fetcher Lambda to get ranked studies
 * @param supplementName - The supplement name to search
 * @param benefitQuery - Optional benefit query for focused search
 * @returns Ranking data with positive/negative studies
 */
// Cache for studies-fetcher results to respect PubMed rate limits
// PubMed limits: 3 requests/second with API key, 1 request/second without
const studiesFetcherCache = new Map<string, { data: any; timestamp: number }>();
const rateLimitBackoff = new Map<string, { retryAfter: number; count: number }>();
const CACHE_TTL_MS = 3600000; // 1 hour - cache successful results
const RATE_LIMIT_BACKOFF_MS = 300000; // 5 minutes backoff on 429 errors
const MAX_BACKOFF_RETRIES = 3;

function getPublicationTypes(study: any): string[] {
  const rawTypes = study?.publicationTypes || study?.publication_types || study?.publicationType || study?.type;

  if (Array.isArray(rawTypes)) {
    return rawTypes.map(String);
  }

  if (typeof rawTypes === 'string') {
    return rawTypes
      .split(/[;,|]/)
      .map((type) => type.trim())
      .filter(Boolean);
  }

  return [];
}

function getStudyText(study: any, field: 'title' | 'abstract'): string {
  const value = study?.[field] || study?.article?.[field] || study?.metadata?.[field] || '';
  return typeof value === 'string' ? value : '';
}

function isHumanClinicalStudy(study: any): boolean {
  return isHumanClinicalEvidenceArticle({
    title: getStudyText(study, 'title'),
    abstract: getStudyText(study, 'abstract'),
    publicationTypes: getPublicationTypes(study),
  });
}

function filterRankedDataByHumanClinical(ranking: any): any {
  if (!ranking || typeof ranking !== 'object') {
    return ranking;
  }

  const filtered = { ...ranking };
  for (const key of ['positive', 'negative', 'mixed']) {
    if (Array.isArray(filtered[key])) {
      filtered[key] = filtered[key].filter(isHumanClinicalStudy);
    }
  }

  return filtered;
}

function countRankedStudies(ranking: any): number {
  if (!ranking || typeof ranking !== 'object') {
    return 0;
  }

  return ['positive', 'negative', 'mixed'].reduce((sum, key) => {
    const studies = ranking[key];
    return sum + (Array.isArray(studies) ? studies.length : 0);
  }, 0);
}

function hasHumanClinicalRankedEvidence(ranking: any): boolean {
  return countRankedStudies(ranking) > 0;
}

function shouldUseNoDataFallbackForEmptyRanking(recommendation: any, searchTerm: string): boolean {
  const text = [
    searchTerm,
    recommendation?.supplement?.name,
    recommendation?.supplement?.description,
    recommendation?.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    text.includes('human clinical evidence remains limited') ||
    text.includes('human evidence remains limited') ||
    text.includes('safety data are not well established')
  );
}

async function invokeStudiesFetcher(
  supplementName: string,
  benefitQuery?: string
): Promise<any> {
  const cacheKey = `${supplementName}|${benefitQuery || ''}`;

  // Check successful cache first
  const cached = studiesFetcherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`✅ [STUDIES_FETCHER_CACHE] Using cached ranking for "${supplementName}"`);
    return cached.data;
  }

  // Check if in backoff due to rate limiting
  const backoff = rateLimitBackoff.get(cacheKey);
  if (backoff && Date.now() < backoff.retryAfter) {
    if (backoff.count >= MAX_BACKOFF_RETRIES) {
      console.log(`⏸️ [STUDIES_FETCHER_BACKOFF] Max retries reached for "${supplementName}", skipping to respect PubMed limits`);
      return null;
    }
    const waitMs = Math.ceil((backoff.retryAfter - Date.now()) / 1000);
    console.log(`⏸️ [STUDIES_FETCHER_BACKOFF] Rate limited, waiting ${waitMs}s before retry (${backoff.count}/${MAX_BACKOFF_RETRIES})`);
    return null; // Skip this request, respect PubMed limits
  }

  try {
    const payload = {
      httpMethod: 'POST',
      body: JSON.stringify({
        supplementName,
        maxResults: 100, // Maximum allowed by studies-fetcher Lambda
        benefitQuery, // Pass benefit query if available
        filters: {
          rctOnly: false,
          humanStudiesOnly: true,
        },
      }),
    };

    console.log(`🔬 [STUDIES_FETCHER] Calling for "${supplementName}"...`);

    const response = await lambdaClient.send(
      new InvokeCommand({
        FunctionName: process.env.STUDIES_FETCHER_LAMBDA || 'suplementia-studies-fetcher-prod',
        InvocationType: 'RequestResponse', // Synchronous call - wait for response
        Payload: Buffer.from(JSON.stringify(payload)),
      })
    );

    if (!response.Payload) {
      console.error(`❌ [STUDIES_FETCHER] No payload returned`);
      return null;
    }

    const result = JSON.parse(Buffer.from(response.Payload).toString());
    const parsedBody = JSON.parse(result.body);

    // DEBUG: Log the entire response for debugging
    console.log(`🔍 [STUDIES_FETCHER_DEBUG] Response for "${supplementName}":`, {
      success: parsedBody.success,
      hasData: !!parsedBody.data,
      dataKeys: parsedBody.data ? Object.keys(parsedBody.data) : [],
      hasRanked: !!parsedBody.data?.ranked,
      error: parsedBody.error,
    });

    if (!parsedBody.success) {
      // Check if it's a rate limit error
      if (parsedBody.error?.includes('429') || parsedBody.error?.includes('Too Many Requests')) {
        console.warn(`⚠️ [STUDIES_FETCHER_RATE_LIMIT] PubMed rate limit hit for "${supplementName}"`);
        const currentBackoff = rateLimitBackoff.get(cacheKey) || { retryAfter: 0, count: 0 };
        rateLimitBackoff.set(cacheKey, {
          retryAfter: Date.now() + RATE_LIMIT_BACKOFF_MS,
          count: currentBackoff.count + 1,
        });
      }
      console.error(`❌ [STUDIES_FETCHER] Failed:`, parsedBody.error);
      logStructured('warn', 'STUDIES_FETCHER_FAILURE', {
        endpoint: 'studies-fetcher',
        supplementName,
        error: parsedBody.error,
        statusCode: parsedBody.statusCode,
        fallback: 'async_enrichment_without_ranking',
      });
      return null;
    }

    const ranking = filterRankedDataByHumanClinical(parsedBody.data?.ranked);
    if (ranking) {
      console.log(`✅ [STUDIES_FETCHER] Got ranking: positive=${ranking.positive?.length || 0} negative=${ranking.negative?.length || 0} confidence=${ranking.metadata?.confidenceScore || 0}`);
      // Cache the successful result
      studiesFetcherCache.set(cacheKey, { data: ranking, timestamp: Date.now() });
      // Clear backoff on success
      rateLimitBackoff.delete(cacheKey);
    } else {
      console.log(`⚠️ [STUDIES_FETCHER] No ranking data in response`);
    }

    return ranking;
  } catch (error: any) {
    console.error(`❌ [STUDIES_FETCHER] Error:`, error.message);
    logStructured('warn', 'STUDIES_FETCHER_FAILURE', {
      endpoint: 'studies-fetcher',
      supplementName,
      error: error.message,
      fallback: 'async_enrichment_without_ranking',
    });
    return null; // Non-fatal - enrichment can proceed without ranking
  }
}

/**
 * Merge enriched data into recommendation structure
 */
function mergeEnrichedData(recommendation: any, enrichedData: any): any {
  console.log(`🔍🔍🔍 [MERGE_START] Starting merge for "${recommendation?.supplement?.name}"`);
  console.log(`🔍 [MERGE_INPUT] enrichedData keys:`, Object.keys(enrichedData || {}));
  console.log(`🔍 [MERGE_INPUT] enrichedData.data keys:`, Object.keys(enrichedData?.data || {}));

  // 1. Resolve evidence structure (handle multiple possible paths from enrich endpoint)
  // The enrich endpoint returns data in: enrichedData.data.supplement OR enrichedData.data directly
  const evidence = enrichedData?.evidence ||
                   enrichedData?.data?.evidence ||
                   enrichedData?.data?.supplement ||  // NEW: enrich endpoint returns supplement
                   enrichedData?.data ||              // NEW: data might BE the evidence
                   enrichedData?.supplement;          // NEW: fallback

  if (!evidence) {
    console.warn(`[MERGE_WARN] No evidence found in enrichment response for "${recommendation?.supplement?.name}"`, {
      hasTopEvidence: !!enrichedData?.evidence,
      hasDataEvidence: !!enrichedData?.data?.evidence,
      hasDataSupplement: !!enrichedData?.data?.supplement,
      hasData: !!enrichedData?.data,
      topKeys: enrichedData ? Object.keys(enrichedData) : [],
      dataKeys: enrichedData?.data ? Object.keys(enrichedData.data) : []
    });
    return recommendation;
  }

  console.log(`[MERGE_DEBUG] Found evidence via path. worksFor: ${evidence.worksFor?.length || 0}, doesntWorkFor: ${evidence.doesntWorkFor?.length || 0}`);

  // Update worksFor only with strong, explicit evidence from enrichment.
  // Catalog/search conditions are not enough to claim that a supplement "funciona para" a condition.
  if (evidence.worksFor && evidence.worksFor.length > 0) {
    const enrichedWorksFor = evidence.worksFor.map((item: any) => {
      const grade = normalizeEvidenceGrade(item.evidenceGrade || item.grade);
      return {
        condition: item.condition || item.name,
        grade,
        evidenceGrade: grade,
        studyCount: item.studyCount || 1,
        notes: item.summary || item.notes || '',
        magnitude: item.magnitude || 'Moderada',
        confidence: item.confidence || 75,
      };
    });

    recommendation.supplement.worksFor = enrichedWorksFor
      .filter((item: any) => isStrongEvidenceGrade(item.evidenceGrade))
      .sort((a: any, b: any) => compareEvidenceGrades(a.evidenceGrade, b.evidenceGrade) || ((b.studyCount || 0) - (a.studyCount || 0)));

    const weakerWorksFor = enrichedWorksFor.filter((item: any) => !isStrongEvidenceGrade(item.evidenceGrade));
    if (weakerWorksFor.length > 0) {
      recommendation.supplement.limitedEvidence = [
        ...weakerWorksFor,
        ...(Array.isArray(recommendation.supplement.limitedEvidence) ? recommendation.supplement.limitedEvidence : []),
      ];
    }
  }

  // Update description (handle both formats)
  const description = evidence.description || evidence.whatIsItFor;
  if (description) {
    recommendation.supplement.description = description;
  }

  // Update overall grade
  if (evidence.overallGrade) {
    recommendation.supplement.overallGrade = evidence.overallGrade;
    if (recommendation.evidence_summary) {
      recommendation.evidence_summary.overallGrade = evidence.overallGrade;
    }
  }

  // Update quality badges (NEW)
  if (evidence.qualityBadges) {
    recommendation.qualityBadges = {
      ...(recommendation.qualityBadges || {}),
      ...evidence.qualityBadges,
    };
    if (recommendation.evidence_summary) {
      recommendation.evidence_summary.qualityBadges = evidence.qualityBadges;
    }
  }

  // Update doesntWorkFor with real conditions from enrichment
  if (Array.isArray(evidence.doesntWorkFor)) {
    recommendation.supplement.doesntWorkFor = evidence.doesntWorkFor.map((item: any) => ({
      condition: item.condition || item.name,
      grade: item.evidenceGrade || item.grade || 'D',
      evidenceGrade: item.evidenceGrade || item.grade || 'D',
      studyCount: item.studyCount || 1,
      notes: item.summary || item.notes || '',
    }));
  }

  // Update limitedEvidence with real conditions from enrichment
  if (Array.isArray(evidence.limitedEvidence)) {
    recommendation.supplement.limitedEvidence = evidence.limitedEvidence.map((item: any) => ({
      condition: item.condition || item.name,
      grade: item.evidenceGrade || item.grade || 'C',
      evidenceGrade: item.evidenceGrade || item.grade || 'C',
      studyCount: item.studyCount || 1,
      notes: item.summary || item.notes || '',
    }));
  }

  // Update dosage
  if (evidence.dosage) {
    recommendation.supplement.dosage = {
      standard: evidence.dosage.standard || evidence.dosage.recommendedDose || recommendation.supplement.dosage?.standard || '',
      effectiveDose: evidence.dosage.effectiveDose || recommendation.supplement.dosage?.effectiveDose || '',
      notes: evidence.dosage.notes || recommendation.supplement.dosage?.notes || '',
    };
  }

  // Update side effects
  if (evidence.sideEffects && evidence.sideEffects.length > 0) {
    recommendation.supplement.sideEffects = evidence.sideEffects.map((se: any) => ({
      name: se.name || se.effect,
      frequency: se.frequency || 'Raro',
      notes: se.notes || '',
    }));
  }

  // Update products if present (NEW)
  const enrichedProducts = enrichedData?.products || enrichedData?.data?.products;
  if (enrichedProducts && enrichedProducts.length > 0) {
    recommendation.products = hasStrongWorksForEvidence(recommendation) ? enrichedProducts : [];
  }

  // **CRITICAL**: Resolve and Copy studies.ranked data
  // Look in evidence.studies (some Lambdas might return it here)
  // or enrichedData.data.studies (where enrich/route.ts puts it)
  console.log(`🔍 [STUDIES_SEARCH] Looking for studies in:`, {
    hasEvidenceStudies: !!evidence.studies,
    hasDataStudies: !!enrichedData?.data?.studies,
    hasEnrichedStudies: !!enrichedData?.studies,
    evidenceKeys: evidence ? Object.keys(evidence) : []
  });

  const studies = evidence.studies || enrichedData?.data?.studies || enrichedData?.studies;

  console.log(`🔍 [STUDIES_FOUND] studies resolved:`, {
    found: !!studies,
    studiesKeys: studies ? Object.keys(studies) : [],
    hasRanked: !!studies?.ranked,
    rankedKeys: studies?.ranked ? Object.keys(studies.ranked) : []
  });

  if (studies) {
    if (!recommendation.evidence_summary) {
      recommendation.evidence_summary = {};
    }

    // Copy all studies data including ranked analysis
    recommendation.evidence_summary.studies = {
      ...(recommendation.evidence_summary.studies || {}),
      ...studies,
    };

    console.log('✅✅✅ [MERGE_DEBUG] Successfully merged studies:', {
      hasRanked: !!studies.ranked,
      positiveCount: studies.ranked?.positive?.length || 0,
      confidence: studies.ranked?.metadata?.confidenceScore || 0,
      totalStudies: studies.total || 0,
      finalHasRanked: !!recommendation.evidence_summary.studies.ranked
    });

    // Update basedOn/totals
    if (evidence.basedOn) {
      recommendation.evidence_summary.totalStudies = evidence.basedOn.studiesCount || recommendation.evidence_summary.totalStudies;
      recommendation.evidence_summary.totalParticipants = evidence.basedOn.totalParticipants || recommendation.evidence_summary.totalParticipants;
    } else if (studies.total) {
      recommendation.evidence_summary.totalStudies = studies.total;
    }
  } else {
    console.log('⚠️⚠️⚠️ [MERGE_DEBUG] NO STUDIES DATA FOUND in enrichment response!');
  }

  // Update evidence_by_benefit if present (NEW)
  if (Array.isArray(evidence.evidenceByBenefit)) {
    recommendation.evidence_by_benefit = evidence.evidenceByBenefit.map((item: any) => ({
      benefit: item.benefit || '',
      evidence_level: item.evidenceLevel || 'Insuficiente',
      studies_found: item.studiesFound || 0,
      total_participants: item.totalParticipants || 0,
      summary: item.summary || '',
    }));
  } else if (Array.isArray(enrichedData.data?.evidenceByBenefit)) {
    // Handle alternative path
    recommendation.evidence_by_benefit = enrichedData.data.evidenceByBenefit;
  }

  // Copy enrichment metadata (CRITICAL for frontend validation)
  if (enrichedData.metadata) {
    recommendation._enrichment_metadata = {
      ...recommendation._enrichment_metadata,
      ...enrichedData.metadata,
      // Ensure hasRealData is explicitly true if we successfully merged
      hasRealData: true,
      fromEnrichmentApi: true,
      lastEnrichedAt: new Date().toISOString()
    };
  }

  // Mark as enriched
  recommendation.enriched = true;
  recommendation.enrichmentSource = 'inline_auto_v2';

  return recommendation;
}

function applyCachedPubMedEvidence(recommendation: any, supplementName: string): any {
  const cachedEvidence = getSupplementEvidenceFromCache(supplementName);

  if (!cachedEvidence) {
    return recommendation;
  }

  const strongWorksFor = cachedEvidence.worksFor
    .map((item: any) => {
      const grade = normalizeEvidenceGrade(item.grade);
      return {
        condition: item.condition,
        grade,
        evidenceGrade: grade,
        notes: item.description || '',
        studyCount: item.studyCount || 0,
      };
    })
    .filter((item: any) => isStrongEvidenceGrade(item.evidenceGrade))
    .sort((a: any, b: any) => compareEvidenceGrades(a.evidenceGrade, b.evidenceGrade));

  if (strongWorksFor.length === 0) {
    return recommendation;
  }

  return {
    ...recommendation,
    supplement: {
      ...recommendation.supplement,
      worksFor: strongWorksFor,
      doesntWorkFor: Array.isArray(cachedEvidence.doesntWorkFor)
        ? cachedEvidence.doesntWorkFor.map((item: any) => ({
          condition: item.condition,
          grade: normalizeEvidenceGrade(item.grade, 'D'),
          evidenceGrade: normalizeEvidenceGrade(item.grade, 'D'),
          notes: item.description || '',
        }))
        : recommendation.supplement?.doesntWorkFor || [],
      limitedEvidence: Array.isArray(cachedEvidence.limitedEvidence)
        ? cachedEvidence.limitedEvidence.map((item: any) => ({
          condition: item.condition,
          grade: normalizeEvidenceGrade(item.grade),
          evidenceGrade: normalizeEvidenceGrade(item.grade),
          notes: item.description || '',
        }))
        : recommendation.supplement?.limitedEvidence || [],
      dosage: cachedEvidence.dosage || recommendation.supplement?.dosage,
      sideEffects: Array.isArray(cachedEvidence.sideEffects)
        ? cachedEvidence.sideEffects
        : recommendation.supplement?.sideEffects || [],
      interactions: Array.isArray(cachedEvidence.interactions)
        ? cachedEvidence.interactions
        : recommendation.supplement?.interactions || [],
    },
    evidence_summary: {
      ...recommendation.evidence_summary,
      overallGrade: cachedEvidence.overallGrade || recommendation.evidence_summary?.overallGrade,
      ingredients: cachedEvidence.ingredients?.length
        ? cachedEvidence.ingredients
        : recommendation.evidence_summary?.ingredients,
      qualityBadges: cachedEvidence.qualityBadges || recommendation.evidence_summary?.qualityBadges,
    },
  };
}

function hasStrongWorksForEvidence(recommendation: any): boolean {
  const worksFor = recommendation?.supplement?.worksFor;

  return Array.isArray(worksFor) && worksFor.some((item: any) =>
    isStrongEvidenceGrade(item.evidenceGrade || item.grade)
  );
}

async function preflightControlledNoDataResponse(params: {
  request: NextRequest;
  requestId: string;
  jobId: string;
  quizId: string;
  supplementName: string;
  originalQuery: string;
  startTime: number;
}): Promise<NextResponse | null> {
  const {
    request,
    requestId,
    jobId,
    quizId,
    supplementName,
    originalQuery,
    startTime,
  } = params;

  try {
    const directEnrichResponse = await fetch(`${getBaseUrl(request)}/api/portal/enrich-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'SuplementIA-Portal-API/1.0',
        'X-Request-ID': requestId,
        'X-Job-ID': jobId,
      },
      body: JSON.stringify({
        supplementName,
        category: supplementName,
        forceRefresh: false,
        maxStudies: 10,
        rctOnly: false,
        yearFrom: 2010,
        jobId,
      }),
      signal: AbortSignal.timeout(ENRICH_V2_PREFLIGHT_TIMEOUT_MS),
    });

    const directErrorText = await directEnrichResponse.text();
    let directErrorData: any = {};
    try {
      directErrorData = JSON.parse(directErrorText);
    } catch {
      directErrorData = { message: directErrorText };
    }

    if (directEnrichResponse.ok) {
      const directRecommendation = calibratePortalRecommendation(
        directErrorData.recommendation || directErrorData.data || directErrorData,
        supplementName
      );

      if (directRecommendation && directRecommendation.success !== false) {
        if (!directRecommendation.recommendation_id) {
          directRecommendation.recommendation_id = jobId;
        }
        await storeJobResult(jobId, 'completed', { recommendation: directRecommendation });
        logQuizOutcome({
          requestId,
          jobId,
          quizId,
          supplementName,
          originalQuery,
          normalizedQuery: supplementName,
          status: 'completed',
          finalStatusCode: 200,
          fallback: 'none',
          source: 'enrich-v2-preflight',
          startTime,
        });

        return NextResponse.json({
          success: true,
          jobId,
          quiz_id: quizId,
          recommendation: directRecommendation,
          status: 'completed',
          source: 'enrich-v2-preflight',
        }, { status: 200 });
      }

      return null;
    }

    if (directEnrichResponse.status === 404 && directErrorData.error === 'insufficient_data') {
      logQuizOutcome({
        requestId,
        jobId,
        quizId,
        supplementName,
        originalQuery,
        normalizedQuery: supplementName,
        status: 'insufficient_data',
        finalStatusCode: 404,
        fallback: 'insufficient_data',
        errorCode: 'insufficient_data',
        upstreamStatus: directEnrichResponse.status,
        source: 'enrich-v2-preflight',
        startTime,
      });

      return NextResponse.json({
        success: false,
        error: 'insufficient_data',
        message: directErrorData.message || `No encontramos evidencia clínica humana suficiente para confirmar beneficios de "${supplementName}".`,
        suggestion: directErrorData.suggestion || 'Verifica la ortografía, intenta con una forma o extracto específico, o explora un tema clínico o componente específico.',
        requestId,
        category: supplementName,
        metadata: directErrorData.metadata,
      }, { status: 404 });
    }

    if (directEnrichResponse.status === 503 && directErrorData.error === 'upstream_unavailable') {
      console.warn('[Quiz] enrich-v2 preflight returned upstream_unavailable; preserving existing async fallback.', {
        supplementName,
        upstreamStatus: directErrorData.statusCode || directEnrichResponse.status,
      });
      return null;
    }
  } catch (error: any) {
    console.warn('[Quiz] enrich-v2 preflight failed; preserving existing async fallback.', {
      supplementName,
      message: error?.message,
    });
  }

  return null;
}

/**
 * Get the base URL for internal API calls
 * Auto-detects the current request origin in production and local dev.
 */
function getBaseUrl(request?: NextRequest): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (request?.nextUrl?.origin) {
    return request.nextUrl.origin;
  }
  return 'http://localhost:3000';
}

/**
 * Helper: Detect altitude from location
 */
function detectAltitude(location: string): number {
  const altitudeMap: Record<string, number> = {
    CDMX: 2250,
    'Mexico City': 2250,
    'Ciudad de México': 2250,
    Bogotá: 2640,
    Bogota: 2640,
    Quito: 2850,
    'La Paz': 3640,
  };
  return altitudeMap[location] || 0;
}

/**
 * Helper: Detect climate from location
 */
function detectClimate(location: string): string {
  const tropicalLocations = [
    'CDMX', 'Mexico City', 'Ciudad de México', 'Cancún', 'Cancun', 'Mérida', 'Merida',
  ];
  return tropicalLocations.includes(location) ? 'tropical' : 'temperate';
}

/**
 * Helper: Transform Weaviate hits to structured Recommendation object
 */
function transformHitsToRecommendation(
  hits: any[],
  query: string,
  quizId: string,
  parsedQuery?: ParsedQuery
): any {
  // Use reported total if available (from LanceDB metadata)
  const totalStudies = hits.length === 1 ? (hits[0].study_count || hits.length) : hits.length;
  const ingredientsMap = new Map<string, number>();

  hits.forEach(hit => {
    // Ingredientes
    const rawIng = hit.ingredients;
    const ingArray = Array.isArray(rawIng) ? rawIng : (typeof rawIng === 'string' ? rawIng.split(',').map((s: string) => s.trim()) : []);
    ingArray.forEach((ing: string) => {
      ingredientsMap.set(ing, (ingredientsMap.get(ing) || 0) + 1);
    });
  });

  // Do not generate worksFor placeholders from search/catalog tags.
  // "Funciona para" must be backed by explicit PubMed enrichment evidence (A/B).
  const worksFor: any[] = [];
  const doesntWorkFor: any[] = [];
  const limitedEvidence: any[] = [];

  // Top ingredientes
  const topIngredients = Array.from(ingredientsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      grade: 'C' as const,
      studyCount: count,
      rctCount: 0, // Until confirmed by enrichment
    }));

  return {
    recommendation_id: `rec_${Date.now()}_hybrid`,
    quiz_id: quizId,
    category: query,
    // ESTRUCTURA PRINCIPAL QUE BUSCA EL FRONTEND
    supplement: {
      name: parsedQuery?.isVariantSpecific ? parsedQuery.fullQuery : query,
      description: parsedQuery?.isVariantSpecific
        ? generateVariantDescription(parsedQuery, hits[0])
        : (hits[0]?.abstract || `Suplemento analizado basado en ${totalStudies} estudios científicos recuperados.`),
      worksFor: worksFor,
      doesntWorkFor: doesntWorkFor,
      limitedEvidence: limitedEvidence,
      sideEffects: [],
      dosage: {
        standard: "Ver análisis de evidencia",
        effectiveDose: "Ver análisis de evidencia",
        notes: "Dosis optimizada basada en estudios recuperados."
      },
      safety: {
        overallRating: "Neutral",
        pregnancyCategory: "Consultar médico"
      },
    },
    evidence_summary: {
      totalStudies: totalStudies, // Real count from search hits (enrichment will update with PubMed data)
      totalParticipants: 0, // Will be populated by enrichment with real data
      efficacyPercentage: 0, // Will be calculated by enrichment
      researchSpanYears: 0, // Will be calculated by enrichment
      ingredients: topIngredients,
    },
    ingredients: topIngredients.map(ing => ({
      name: ing.name,
      grade: ing.grade,
      adjustedDose: 'Ver sección de dosis',
      adjustmentReason: 'Dosis estándar recomendada basada en evidencia',
    })),
    products: [],
    personalization_factors: {
      altitude: 2250,
      climate: 'tropical',
      gender: 'neutral',
      age: 35,
      location: 'CDMX',
      sensitivities: []
    }
  };
}

// ====================================
// QUERY PARSING - VARIANT DETECTION
// ====================================

interface ParsedQuery {
  baseSupplement: string;
  variantType: string | null;
  fullQuery: string;
  isVariantSpecific: boolean;
}

function parseSupplementQuery(query: string): ParsedQuery {
  const normalized = query.toLowerCase().trim();

  // Known variant keywords from VARIANT_PATTERNS
  const variantKeywords = [
    'glycinate', 'citrate', 'oxide', 'threonate', 'taurate', 'malate', 'chloride',
    'epa', 'dha', 'ala', 'triglyceride', 'ethyl ester',
    'd2', 'd3', 'ergocalciferol', 'cholecalciferol',
    'standard', 'phytosome', 'liposomal', 'nanoparticle',
    'ubiquinone', 'ubiquinol',
    'ksm-66', 'sensoril', 'shoden'
  ];

  let detectedVariant: string | null = null;
  let baseSupplement = query;

  for (const variant of variantKeywords) {
    if (hasVariantToken(normalized, variant)) {
      detectedVariant = variant;
      baseSupplement = removeVariantToken(query, variant);
      break;
    }
  }

  return {
    baseSupplement,
    variantType: detectedVariant,
    fullQuery: query,
    isVariantSpecific: detectedVariant !== null
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function variantTokenPattern(variant: string, flags: string): RegExp {
  const escaped = escapeRegExp(variant);
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, flags);
}

function hasVariantToken(normalizedQuery: string, variant: string): boolean {
  return variantTokenPattern(variant, 'iu').test(normalizedQuery);
}

function removeVariantToken(query: string, variant: string): string {
  return query
    .replace(variantTokenPattern(variant, 'giu'), '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateVariantDescription(
  parsedQuery: ParsedQuery,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  firstHit: any | undefined
): string {
  if (!parsedQuery.isVariantSpecific || !parsedQuery.variantType) {
    return firstHit?.abstract || `${parsedQuery.fullQuery} es un suplemento dietético popular.`;
  }

  // Basic variant-specific descriptions
  const variantDescriptions: Record<string, string> = {
    citrate: 'Forma de citrato: mejor biodisponibilidad, apoya la digestión',
    glycinate: 'Forma de glicinato: mejor absorción, suave con el sistema digestivo',
    oxide: 'Forma de óxido: forma económica del suplemento',
    threonate: 'Forma de treonato: atraviesa la barrera hematoencefálica',
    taurate: 'Forma de taurato: enfocada en apoyo cardiovascular',
    malate: 'Forma de malato: relacionada con producción de energía',
    epa: 'EPA (ácido eicosapentaenoico): enfocado en salud del corazón',
    dha: 'DHA (ácido docosahexaenoico): importante para la salud cerebral',
    ala: 'ALA (ácido alfa-linolénico): forma vegetal de ácido graso omega-3',
    d3: 'Vitamina D3: forma más activa y biodisponible',
    d2: 'Vitamina D2: forma alternativa de vitamina D',
    'ksm-66': 'KSM-66: extracto estandarizado de ashwagandha',
    ubiquinol: 'Ubiquinol: forma reducida de CoQ10, más biodisponible',
    ubiquinone: 'Ubiquinona: forma estándar de CoQ10'
  };

  const baseDescription = variantDescriptions[parsedQuery.variantType] ||
    `Forma específica de ${parsedQuery.baseSupplement}`;

  const studyContext = firstHit?.abstract ? ` ${firstHit.abstract.substring(0, 150)}...` : '';

  return `${parsedQuery.fullQuery} es una forma específica de ${parsedQuery.baseSupplement}. ${baseDescription}.${studyContext}`;
}

export async function POST(request: NextRequest) {
  console.log("🚀🚀🚀 [QUIZ UPDATE] New deployment active! " + new Date().toISOString());
  const startTime = Date.now();
  const requestId = randomUUID();
  const jobId = request.headers.get('X-Job-ID') || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const quizId = `quiz_${Date.now()}_${randomUUID().substring(0, 8)}`;

  try {
    const body = await request.json();
    const { category, age, gender, location, sensitivities = [], searchIntent } = body;

    portalLogger.logRequest({
      requestId,
      jobId,
      endpoint: '/api/portal/quiz',
      method: 'POST',
      category,
      age,
      gender,
      location,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
    });

    if (!category) {
      return NextResponse.json({ success: false, error: 'Missing required field: category' }, { status: 400 });
    }

    const validation = validateSupplementQuery(category);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.error,
        suggestion: validation.suggestion,
        severity: validation.severity,
      }, { status: 400 });
    }

    const sanitizedCategory = sanitizeQuery(category);

    // Intelligent Query Expansion with Benefit Detection
    // Case 1: Simple Ingredient ("Q10") -> Normalize -> "Coenzyme Q10"
    // Case 2: Ingredient + Benefit ("Q10 para la piel") -> Split -> Normalize "Q10" -> "Coenzyme Q10 para la piel"

    let searchTerm = sanitizedCategory;
    let isExpanded = false;
    let expansionNote = '';

    const expansionSeparators = [' for ', ' para '];
    let detectedSeparator = null;

    for (const keyword of expansionSeparators) {
      if (sanitizedCategory.toLowerCase().includes(keyword)) {
        detectedSeparator = keyword;
        break;
      }
    }

    if (detectedSeparator) {
      // Handle Benefit Query
      const [ingredientPart, benefitPart] = sanitizedCategory.split(detectedSeparator);

      // Intelligent Expansion (LLM/Heuristic)
      const expandedIngredient = await expandAbbreviation(ingredientPart.trim());
      const canonicalIngredient = expandedIngredient.alternatives[0] || ingredientPart.trim();

      if (canonicalIngredient.toLowerCase() !== ingredientPart.trim().toLowerCase()) {
        searchTerm = `${canonicalIngredient}${detectedSeparator}${benefitPart}`;
        isExpanded = true;
        expansionNote = `(Benefit Query: "${ingredientPart.trim()}" expanded via LLM to "${canonicalIngredient}")`;
      } else {
        searchTerm = sanitizedCategory;
      }
    } else {
      // Handle Standard Query via Dynamic Intelligent Expansion
      const expanded = await expandAbbreviation(sanitizedCategory);
      const canonicalTerm = expanded.alternatives[0] || sanitizedCategory;

      searchTerm = canonicalTerm;
      isExpanded = searchTerm.toLowerCase() !== sanitizedCategory.toLowerCase();

      if (isExpanded) {
        expansionNote = `(LLM expanded "${sanitizedCategory}" -> "${searchTerm}")`;
      }
    }

    // =================================================================
    // NEW: Hybrid Search First Strategy (LanceDB Serverless)
    // =================================================================
    try {
      console.log(`[Hybrid Search] Attempting search for: "${searchTerm}" ${expansionNote}`);
      console.log(`[Search] Querying LanceDB via Lambda for: "${searchTerm}"`);

      const hits = await searchSupplements(searchTerm); // Uses production-search-api-lancedb

      if (hits && hits.length > 0) {
        // STRICT FILTERING V2 (Anti-Urine / Anti-Noise)
        const lowerQuery = searchTerm.toLowerCase();
        const queryRoot = lowerQuery.length > 5 ? lowerQuery.substring(0, 5) : lowerQuery; // "creat"

        const relevantHits = hits.filter((h: any) => {
          const title = (h.title || '').toLowerCase();
          const ing = (Array.isArray(h.ingredients) ? h.ingredients.join(' ') : (h.ingredients || '')).toLowerCase();
          const abstract = (h.abstract || '').toLowerCase();

          // CRITICAL EXCLUSIONS
          if (lowerQuery.includes('creatine') && (title.includes('urine') || abstract.includes('urine') || ing.includes('creatinine'))) {
            return false;
          }
          if (title.includes('case report') && !title.includes('supplement')) {
            return false;
          }

          // INCLUSION CRITERIA
          return title.includes(queryRoot) || ing.includes(queryRoot) || (h.score && h.score > 0.6);
        });

        const finalHits = relevantHits.length > 0 ? relevantHits : [];

        if (finalHits.length > 0) {
          console.log(`[Search] LanceDB returned ${hits.length} hits, filtered to ${finalHits.length}.`);
          
          // NEW: Parse query to extract variant information
          const parsedQuery = parseSupplementQuery(searchTerm);
          console.log('[Query Parsing]', {
            original: searchTerm,
            parsed: parsedQuery,
            isVariantSpecific: parsedQuery.isVariantSpecific
          });
          
          let rec = calibratePortalRecommendation(
            transformHitsToRecommendation(finalHits, searchTerm, quizId, parsedQuery),
            searchTerm
          );
          const usesLocalCatalog = finalHits.every((hit: any) => hit.source === 'local_catalog');

          if (usesLocalCatalog) {
            const recWithCachedEvidence = calibratePortalRecommendation(
              applyCachedPubMedEvidence(rec, searchTerm),
              searchTerm
            );
            rec = recWithCachedEvidence;

            const isKnownLimitedEvidenceLocalHit = shouldUseNoDataFallbackForEmptyRanking(recWithCachedEvidence, searchTerm);
            const shouldReturnLocalFallback =
              hasStrongWorksForEvidence(recWithCachedEvidence) ||
              (process.env.SEARCH_BACKEND === 'local' && !isKnownLimitedEvidenceLocalHit);

            if (shouldReturnLocalFallback) {
              const hitsForVariantDetection = finalHits.map((hit: any) => ({
                title: hit.title || '',
                abstract: hit.abstract || ''
              }));
              const variantDetection = detectVariants(searchTerm, hitsForVariantDetection);

              logQuizOutcome({
                requestId,
                jobId,
                quizId,
                supplementName: searchTerm,
                originalQuery: sanitizedCategory,
                normalizedQuery: searchTerm,
                status: 'completed',
                finalStatusCode: 200,
                fallback: 'local_catalog_fallback',
                source: 'local_catalog_fallback',
                startTime,
              });

              return NextResponse.json({
                success: true,
                quiz_id: quizId,
                recommendation: recWithCachedEvidence,
                jobId,
                status: 'completed',
                variantDetection: {
                  ...variantDetection,
                  _cacheMetadata: {
                    hit: false,
                    key: `variant_${searchTerm.toLowerCase().trim()}_${hitsForVariantDetection.length.toString(36)}`,
                    studyCount: hitsForVariantDetection.length,
                    timestamp: Date.now()
                  },
                  _selectedVariant: parsedQuery.isVariantSpecific ? {
                    type: parsedQuery.variantType,
                    baseSupplement: parsedQuery.baseSupplement,
                    fullName: parsedQuery.fullQuery
                  } : null
                },
                suggestVariantSelection: variantDetection.recommendedForGenericSearch && !parsedQuery.isVariantSpecific,
                source: 'local_catalog_fallback'
              });
            }

            console.log(`[Local Catalog] "${searchTerm}" has no cached PubMed A/B worksFor evidence; continuing to remote enrichment.`);
          }

          // NEW: Detect supplement variants (e.g., Magnesium Glycinate, Citrate, etc.)
          // For variant detection, we need MORE studies than the initial search
          // Make a separate search with higher limit specifically for variant detection
          console.log('[Variant Detection] Fetching additional studies for variant analysis...');
          const variantSearchHits = await searchSupplements(searchTerm, 50); // Get 50 studies for better variant detection
          
          const hitsForVariantDetection = variantSearchHits.map((hit: any) => ({
            title: hit.title || '',
            abstract: hit.abstract || ''
          }));
          
          console.log(`[Variant Detection] Using ${hitsForVariantDetection.length} studies for variant analysis`);

          // CACHING: Check variant detection cache before running detection
          const normalizedSearchTerm = searchTerm.toLowerCase().trim();
          const studyCountHash = hitsForVariantDetection.length.toString(36);
          const variantCacheKey = `variant_${normalizedSearchTerm}_${studyCountHash}`;

          let cachedResult = variantDetectionCache.get(variantCacheKey);
          let variantCacheHit = false;

          if (cachedResult) {
            const age = Date.now() - cachedResult._cachedAt;
            if (age < VARIANT_CACHE_TTL) {
              variantCacheHit = true;
              console.log(`🎯 [VARIANT_CACHE] HIT for "${searchTerm}" (age: ${Math.round(age / 1000 / 60)}min)`);
            } else {
              cachedResult = undefined; // Expired
            }
          }

          let variantDetection: CachedVariantDetection;
          if (!cachedResult) {
            // Cache miss - detect variants
            const newDetection = detectVariants(searchTerm, hitsForVariantDetection);
            variantDetection = {
              ...newDetection,
              _cachedAt: Date.now(),
              _cacheKey: variantCacheKey
            };
            variantDetectionCache.set(variantCacheKey, variantDetection);

            console.log(
              `💾 [VARIANT_CACHE] MISS for "${searchTerm}" - cached ${variantDetection.variants.length} variants`
            );

            // Cleanup old cache entries if > max size
            if (variantDetectionCache.size > VARIANT_CACHE_MAX_SIZE) {
              const oldestKey = Array.from(variantDetectionCache.keys())[0];
              variantDetectionCache.delete(oldestKey);
              console.log(`🗑️ [VARIANT_CACHE] Evicted oldest entry, cache size: ${variantDetectionCache.size}`);
            }
          } else {
            variantDetection = cachedResult;
          }

          if (variantDetection.hasVariants) {
            console.log(`🔍 [VARIANT_DETECTION] Found ${variantDetection.variants.length} variants for "${searchTerm}"`);
            variantDetection.variants.forEach((v: SupplementVariant, i: number) => {
              console.log(`  ${i + 1}. ${v.displayName}: ${v.studyCount ?? 'N/A'} studies (confidence: ${v.confidence ? Math.round(v.confidence * 100) : 'N/A'}%)`);
            });
          }

          // INLINE AUTO-ENRICHMENT: Check if metadata is poor and enrich if needed
          // 🔍🔍🔍 DEBUG: Log what LanceDB returned
          console.log(`🔍🔍🔍 [LANCEDB_DATA] supplement="${searchTerm}" hasEvidenceSummary=${!!rec?.evidence_summary} hasStudies=${!!rec?.evidence_summary?.studies} hasRanked=${!!rec?.evidence_summary?.studies?.ranked}`);
          if (rec?.evidence_summary?.studies?.ranked) {
            const r = rec.evidence_summary.studies.ranked;
            console.log(`🔍 [LANCEDB_RANKED] keys=${JSON.stringify(Object.keys(r))} hasMetadata=${!!r.metadata} confidence=${r.metadata?.confidenceScore || 0} positive=${r.positive?.length || 0} negative=${r.negative?.length || 0}`);
          }

          if (needsEnrichment(rec)) {
            console.log(`🚀🚀🚀 [ENRICHMENT_TRIGGERED_ASYNC] supplement="${searchTerm}" jobId=${jobId}`);

            // STEP 1: Call studies-fetcher Lambda to get intelligent ranking
            // This generates 5 positive + 5 negative studies with confidence scores
            console.log(`🔬 [STUDIES_RANKING] Fetching ranked studies for "${searchTerm}"...`);
            const rankingData = await invokeStudiesFetcher(searchTerm);

            const hasHumanClinicalRanking = hasHumanClinicalRankedEvidence(rankingData);
            const hasPreliminaryWorksForEvidence = hasStrongWorksForEvidence(rec);
            if (!hasHumanClinicalRanking && !hasPreliminaryWorksForEvidence) {
              const controlledNoDataResponse = await preflightControlledNoDataResponse({
                request,
                requestId,
                jobId,
                quizId,
                supplementName: searchTerm,
                originalQuery: sanitizedCategory,
                startTime,
              });

              if (controlledNoDataResponse) {
                return controlledNoDataResponse;
              }
            }

            if (
              !hasHumanClinicalRanking &&
              !hasPreliminaryWorksForEvidence &&
              shouldUseNoDataFallbackForEmptyRanking(rec, searchTerm)
            ) {
              console.log(`⚠️ [STUDIES_RANKING] No human clinical ranking data for known limited-evidence supplement "${searchTerm}"; continuing to backend no-data fallback.`);
            } else {
              console.log(`✅ [STUDIES_RANKING] Got ranking data: positive=${rankingData?.positive?.length || 0} negative=${rankingData?.negative?.length || 0}`);

              // Create job in DynamoDB with processing status after local screening.
              await createJob(jobId);

              // STEP 1.5: Build initial recommendation with ranking data for the immediate response.
              // Do not store it as completed: it has ranking studies but not final A/B benefit
              // extraction yet, and the UI must keep polling until enrichment writes the final job.
              const initialRecommendation = {
                ...rec,
                evidence_summary: {
                  ...rec.evidence_summary,
                  studies: rankingData ? {
                    ...(rec.evidence_summary?.studies || {}),
                    ranked: rankingData, // Preserve ranking data in initial recommendation
                  } : rec.evidence_summary?.studies,
                },
              };

              // Mark as interim enrichment with ranking but no detailed analysis yet
              initialRecommendation._enrichment_metadata = {
                ...initialRecommendation._enrichment_metadata,
                hasRanking: !!rankingData,
                rankingSource: rankingData ? 'studies-fetcher' : 'none',
                interim: true, // Will be enhanced by async enrichment
                storedAt: new Date().toISOString(),
              };

              console.log(`✅ [INITIAL_RECOMMENDATION_READY] Ranking attached for immediate response; job remains processing until final enrichment. jobId=${jobId}`);

              // STEP 2: ASYNC ENRICHMENT with ranking data
              // Lambda will enrich content AND preserve the ranking we just generated
              // The enrichment Lambda will save both to cache for future requests
              await invokeLambdaEnrichmentAsync(jobId, searchTerm, false, rankingData);

              // Return immediately with processing status
              logQuizOutcome({
                requestId,
                jobId,
                quizId,
                supplementName: searchTerm,
                originalQuery: sanitizedCategory,
                normalizedQuery: searchTerm,
                status: 'processing',
                finalStatusCode: 200,
                fallback: 'async_enrichment',
                source: 'lancedb_enriching_async',
                startTime,
              });

              return NextResponse.json({
                success: true,
                quiz_id: quizId,
                jobId,
                status: 'processing',
                message: 'Enrichment in progress. Poll /api/portal/status/{jobId} for results.',
                recommendation: initialRecommendation, // Return initial recommendation WITH ranking data
                variantDetection: {
                  ...variantDetection,
                  _cacheMetadata: {
                    hit: variantCacheHit,
                    key: variantCacheKey,
                    studyCount: hitsForVariantDetection.length,
                    timestamp: Date.now()
                  },
                  // NEW: Add selected variant info to signal frontend not to show modal
                  _selectedVariant: parsedQuery.isVariantSpecific ? {
                    type: parsedQuery.variantType,
                    baseSupplement: parsedQuery.baseSupplement,
                    fullName: parsedQuery.fullQuery
                  } : null
                },
                suggestVariantSelection: variantDetection.recommendedForGenericSearch && !parsedQuery.isVariantSpecific, // Only show if not already selected
                source: 'lancedb_enriching_async'
              });
            }
          } else {
            console.log(`⏭️ [SKIP_ENRICHMENT] supplement="${searchTerm}" already has good metadata`);

            // No enrichment needed, return immediately
            await storeJobResult(jobId, 'completed', { recommendation: rec });
            logQuizOutcome({
              requestId,
              jobId,
              quizId,
              supplementName: searchTerm,
              originalQuery: sanitizedCategory,
              normalizedQuery: searchTerm,
              status: 'completed',
              finalStatusCode: 200,
              fallback: 'none',
              source: rec.enriched ? 'lancedb_lambda_enriched' : 'lancedb_lambda_serverless',
              startTime,
            });
            return NextResponse.json({
              success: true,
              quiz_id: quizId,
              recommendation: rec,
              jobId,
              status: 'completed',
              variantDetection: {
                ...variantDetection,
                _cacheMetadata: {
                  hit: variantCacheHit,
                  key: variantCacheKey,
                  studyCount: hitsForVariantDetection.length,
                  timestamp: Date.now()
                },
                // NEW: Add selected variant info to signal frontend not to show modal
                _selectedVariant: parsedQuery.isVariantSpecific ? {
                  type: parsedQuery.variantType,
                  baseSupplement: parsedQuery.baseSupplement,
                  fullName: parsedQuery.fullQuery
                } : null
              },
              suggestVariantSelection: variantDetection.recommendedForGenericSearch && !parsedQuery.isVariantSpecific, // Only show if not already selected
              source: rec.enriched ? 'lancedb_lambda_enriched' : 'lancedb_lambda_serverless'
            });
          }
        } else {
          console.log('[Search] All LanceDB hits were filtered out as irrelevant.');
        }
      }
    } catch (wsErr: any) {
      console.error('[Hybrid Search] Error:', wsErr);
      console.warn('[Hybrid Search] Continuing with recommendation/PubMed fallback after search failure.', {
        message: wsErr?.message,
      });
    }
    // =================================================================

    // INTENT DETECTION FALLBACK
    let searchType: 'ingredient' | 'condition' | 'unknown' = 'unknown';
    const normalizedQuery = sanitizedCategory.toLowerCase();

    const dbMatch = SUPPLEMENTS_DATABASE.find(
      (entry) => entry.name.toLowerCase() === normalizedQuery || entry.aliases.some(a => a.toLowerCase() === normalizedQuery)
    );

    if (searchIntent === 'supplement') {
      searchType = 'ingredient';
    } else if (searchIntent === 'condition') {
      searchType = 'condition';
    } else if (dbMatch) {
      searchType = dbMatch.category === 'condition' ? 'condition' : 'ingredient';
    } else {
      searchType = 'condition';
    }

    if (searchType === 'condition') {
      const pubmedResults = await searchPubMed(sanitizedCategory);
      return NextResponse.json(pubmedResults, { status: 200 });
    }

    // BENEFIT SEARCH LOGIC
    let supplementName = searchTerm;
    let benefitQuery: string | undefined = undefined;
    const benefitKeywords = [' for ', ' para '];
    for (const keyword of benefitKeywords) {
      if (searchTerm.toLowerCase().includes(keyword)) {
        const parts = searchTerm.split(new RegExp(keyword, 'i'));
        supplementName = parts[0].trim();
        benefitQuery = parts.slice(1).join(keyword).trim();
        break;
      }
    }

    const finalAge = age || 35;
    const finalGender = gender || 'male';
    const finalLocation = location || 'CDMX';
    const altitude = detectAltitude(finalLocation);
    const climate = detectClimate(finalLocation);

    // STAGE 2: Backend Recommendation Service (Source of Truth)
    // We prioritize Hybrid Search (Weaviate) above. If that didn't return early, 
    // we must rely on the backend service to generate specific recommendations.
    // Mocks and fallbacks have been removed to ensure data integrity.

    const backendCallStart = Date.now();
    const QUIZ_API_URL = `${getBaseUrl(request)}/api/portal/recommend`;

    try {
      const recommendationResponse = await fetch(QUIZ_API_URL, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'SuplementIA-Portal-API/1.0',
          'X-Request-ID': requestId,
          'X-Job-ID': jobId,
        },
        method: 'POST',
        body: JSON.stringify({
          category: supplementName,
          benefitQuery,
          age: parseInt(finalAge.toString()),
          gender: finalGender,
          location: finalLocation,
          altitude,
          climate,
          sensitivities,
          quiz_id: quizId,
          jobId,
        }),
        signal: AbortSignal.timeout(120000),
      });

      const backendResponseTime = Date.now() - backendCallStart;
      portalLogger.logBackendResponse(QUIZ_API_URL, recommendationResponse.status, backendResponseTime, {
        requestId, quizId, category: sanitizedCategory,
      });

      if (!recommendationResponse.ok) {
        const errorText = await recommendationResponse.text();
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        if (recommendationResponse.status === 404 && errorData.error === 'insufficient_data') {
          logQuizOutcome({
            requestId,
            jobId,
            quizId,
            supplementName,
            originalQuery: sanitizedCategory,
            normalizedQuery: supplementName,
            status: 'insufficient_data',
            finalStatusCode: 404,
            fallback: 'insufficient_data',
            errorCode: 'insufficient_data',
            upstreamStatus: recommendationResponse.status,
            startTime,
          });
          return NextResponse.json({
            success: false,
            error: 'insufficient_data',
            message: errorData.message || `No encontramos evidencia clínica humana suficiente para confirmar beneficios de "${supplementName}".`,
            suggestion: errorData.suggestion || 'Verifica la ortografía, intenta con una forma o extracto específico, o explora un tema clínico o componente específico.',
            requestId,
            category: supplementName,
            metadata: errorData.metadata,
          }, { status: 404 });
        }

        if (recommendationResponse.status === 503 && errorData.error === 'upstream_unavailable') {
          logQuizOutcome({
            requestId,
            jobId,
            quizId,
            supplementName,
            originalQuery: sanitizedCategory,
            normalizedQuery: supplementName,
            status: 'upstream_unavailable',
            finalStatusCode: 503,
            fallback: 'upstream_unavailable',
            errorCode: 'upstream_unavailable',
            upstreamStatus: errorData.statusCode || recommendationResponse.status,
            startTime,
          });
          return NextResponse.json({
            success: false,
            error: 'upstream_unavailable',
            message: errorData.message || 'No pudimos consultar temporalmente la base de estudios. Intenta de nuevo en unos minutos.',
            details: errorData.details || errorData.error || 'Studies service unavailable',
            requestId,
            category: supplementName,
          }, { status: 503 });
        }

        if (
          searchType === 'ingredient' &&
          (errorData.error === 'backend_connection_failed' || errorData.error === 'recommendation_generation_failed')
        ) {
          try {
            const directEnrichResponse = await fetch(`${getBaseUrl(request)}/api/portal/enrich-v2`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'User-Agent': 'SuplementIA-Portal-API/1.0',
                'X-Request-ID': requestId,
                'X-Job-ID': jobId,
              },
              body: JSON.stringify({
                supplementName,
                benefitQuery,
                category: supplementName,
                forceRefresh: false,
                maxStudies: 10,
                rctOnly: false,
                yearFrom: 2010,
                jobId,
              }),
              signal: AbortSignal.timeout(120000),
            });

            if (!directEnrichResponse.ok) {
              const directErrorText = await directEnrichResponse.text();
              let directErrorData: any = {};
              try {
                directErrorData = JSON.parse(directErrorText);
              } catch {
                directErrorData = { message: directErrorText };
              }

              if (directEnrichResponse.status === 404 && directErrorData.error === 'insufficient_data') {
                logQuizOutcome({
                  requestId,
                  jobId,
                  quizId,
                  supplementName,
                  originalQuery: sanitizedCategory,
                  normalizedQuery: supplementName,
                  status: 'insufficient_data',
                  finalStatusCode: 404,
                  fallback: 'insufficient_data',
                  errorCode: 'insufficient_data',
                  upstreamStatus: directEnrichResponse.status,
                  source: 'enrich-v2-direct-fallback',
                  startTime,
                });
                return NextResponse.json({
                  success: false,
                  error: 'insufficient_data',
                  message: directErrorData.message || `No encontramos evidencia clínica humana suficiente para confirmar beneficios de "${supplementName}".`,
                  suggestion: directErrorData.suggestion || 'Verifica la ortografía, intenta con una forma o extracto específico, o explora un tema clínico o componente específico.',
                  requestId,
                  category: supplementName,
                  metadata: directErrorData.metadata,
                }, { status: 404 });
              }

              if (directEnrichResponse.status === 503 && directErrorData.error === 'upstream_unavailable') {
                logQuizOutcome({
                  requestId,
                  jobId,
                  quizId,
                  supplementName,
                  originalQuery: sanitizedCategory,
                  normalizedQuery: supplementName,
                  status: 'upstream_unavailable',
                  finalStatusCode: 503,
                  fallback: 'upstream_unavailable',
                  errorCode: 'upstream_unavailable',
                  upstreamStatus: directErrorData.statusCode || directEnrichResponse.status,
                  source: 'enrich-v2-direct-fallback',
                  startTime,
                });
                return NextResponse.json({
                  success: false,
                  error: 'upstream_unavailable',
                  message: directErrorData.message || 'No pudimos consultar temporalmente la base de estudios. Intenta de nuevo en unos minutos.',
                  details: directErrorData.details || directErrorData.error || 'Studies service unavailable',
                  requestId,
                  category: supplementName,
                }, { status: 503 });
              }
            }
          } catch (directError: any) {
            console.warn('[Quiz] Direct enrich-v2 fallback after recommend failure also failed.', {
              category: supplementName,
              message: directError?.message,
            });
          }
        }

        // If backend fails, propagate the error. NO MOCKS.
        console.error(`[CRITICAL] Backend Recommendation Service Failed: ${recommendationResponse.status}`);
        logQuizOutcome({
          requestId,
          jobId,
          quizId,
          supplementName,
          originalQuery: sanitizedCategory,
          normalizedQuery: supplementName,
          status: 'failed',
          finalStatusCode: recommendationResponse.status,
          fallback: 'backend_service_error',
          errorCode: errorData.error || 'backend_service_error',
          upstreamStatus: recommendationResponse.status,
          startTime,
        });
        return NextResponse.json({
          success: false,
          error: 'backend_service_error',
          message: 'El servicio de recomendaciones no está disponible en este momento.',
          details: errorData.message || errorData.error || `Status: ${recommendationResponse.status}`
        }, { status: recommendationResponse.status });
      }

      const responseData = await recommendationResponse.json();

      if (recommendationResponse.status === 202 && responseData.recommendation_id) {
        return NextResponse.json({
          success: true,
          jobId,
          quiz_id: quizId,
          recommendation_id: jobId,
          status: 'processing',
          message: responseData.message || 'Recomendación en proceso',
          statusUrl: `/api/portal/enrichment-status/${jobId}`,
          estimatedTime: 60,
        }, { status: 202 });
      }

      if (responseData.recommendation) {
        responseData.recommendation = calibratePortalRecommendation(
          responseData.recommendation,
          supplementName
        );
        if (!responseData.recommendation.recommendation_id) {
          responseData.recommendation.recommendation_id = jobId;
        }
        await storeJobResult(jobId, 'completed', { recommendation: responseData.recommendation });
        logQuizOutcome({
          requestId,
          jobId,
          quizId,
          supplementName,
          originalQuery: sanitizedCategory,
          normalizedQuery: supplementName,
          status: 'completed',
          finalStatusCode: 200,
          fallback: 'none',
          source: 'recommend',
          startTime,
        });
        return NextResponse.json({
          success: true,
          jobId,
          quiz_id: quizId,
          recommendation: responseData.recommendation,
        }, { status: 200 });
      }

      // If we got here, response was 200 but had no recommendation data.
      logQuizOutcome({
        requestId,
        jobId,
        quizId,
        supplementName,
        originalQuery: sanitizedCategory,
        normalizedQuery: supplementName,
        status: 'failed',
        finalStatusCode: 500,
        fallback: 'backend_service_error',
        errorCode: 'invalid_response_structure',
        startTime,
      });
      return NextResponse.json({
        success: false,
        error: 'invalid_response_structure',
        message: 'Error interno: Estructura de respuesta inválida.'
      }, { status: 500 });

    } catch (apiError: any) {
      console.error('[CRITICAL] Backend API Connection Error:', apiError);

      // DIAGNOSTIC LOGGING
      if (apiError.name === 'CredentialsError' || apiError.message.includes('credentials')) {
        console.error('[DIAGNOSTIC] AWS Credentials likely missing or invalid in Vercel Environment.');
        console.error(`[DIAGNOSTIC] AWS_REGION: ${process.env.AWS_REGION}`);
        console.error(`[DIAGNOSTIC] AWS_ACCESS_KEY_ID Present: ${!!process.env.AWS_ACCESS_KEY_ID}`);
      }

      // NO FALLBACK TO MOCK. Return 500.
      logQuizOutcome({
        requestId,
        jobId,
        quizId,
        supplementName,
        originalQuery: sanitizedCategory,
        normalizedQuery: supplementName,
        status: 'failed',
        finalStatusCode: 500,
        fallback: 'backend_service_error',
        errorCode: 'backend_connection_failed',
        startTime,
      });
      return NextResponse.json({
        success: false,
        jobId,
        quiz_id: quizId,
        error: 'backend_connection_failed',
        message: 'No se pudo conectar con el servicio de recomendaciones.',
        details: apiError.message
      }, { status: 500 });
    }

  } catch (error: any) {
    logQuizOutcome({
      requestId,
      jobId,
      status: 'failed',
      finalStatusCode: 500,
      fallback: 'backend_service_error',
      errorCode: 'Internal server error',
      startTime,
    });
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 });
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
