/**
 * Enrichment module - calls content-enricher Lambda
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import AWSXRay from 'aws-xray-sdk-core';
import { config } from './config';
import { EnrichmentData, Recommendation } from './types';

// Initialize Lambda client
const baseClient = new LambdaClient({ region: config.region });

// Capture with X-Ray if enabled
const lambdaClient = config.xrayEnabled
  ? AWSXRay.captureAWSv3Client(baseClient)
  : baseClient;

/**
 * Patterns that indicate unverified pharmacokinetic claims
 * These should be filtered out unless they cite a specific study
 */
const UNVERIFIED_CLAIM_PATTERNS = [
  // Numeric absorption claims
  /aumenta\s*(la\s*)?absorción\s*\d+%/i,
  /absorción\s*(hasta\s*)?\d+%/i,
  /biodisponibilidad\s*\d+%\s*mayor/i,
  /\d+%\s*(más|mayor)\s*biodisponible/i,
  /mejora\s*absorción\s*en\s*\d+%/i,

  // Generic absorption claims without evidence
  /con\s*alimentos\s*(para\s*)?(mejorar|aumentar|optimizar)\s*absorción/i,
  /preferiblemente\s*con\s*alimentos/i,
  /tomar\s*con\s*comida\s*para\s*(mejorar|aumentar)\s*absorción/i,
  /mejora\s*(la\s*)?absorción/i,
  /aumenta\s*(la\s*)?absorción/i,
  /optimiza\s*(la\s*)?absorción/i,
  /mayor\s*absorción/i,
  /mejor\s*biodisponibilidad/i,
];

/**
 * Sanitize dosage notes to remove unverified pharmacokinetic claims
 */
function sanitizeDosageNotes(notes: string): string {
  if (!notes) return '';

  let sanitized = notes;

  // Check for unverified claims
  for (const pattern of UNVERIFIED_CLAIM_PATTERNS) {
    if (pattern.test(sanitized)) {
      // Remove the unverified claim
      sanitized = sanitized.replace(pattern, '').trim();
      // Clean up any leftover punctuation
      sanitized = sanitized.replace(/^[,.\s]+|[,.\s]+$/g, '').trim();
      sanitized = sanitized.replace(/\s{2,}/g, ' ');
    }
  }

  // If notes became empty or too short, use a safe default
  if (sanitized.length < 10) {
    return 'Seguir indicaciones del fabricante';
  }

  return sanitized;
}

/**
 * Sanitize timing field - remove vague or unverified claims
 */
function sanitizeTiming(timing: string): string {
  if (!timing) return 'Sin preferencia de horario según estudios clínicos';

  const vaguePatterns = [
    /según\s*indicaciones/i,
    /según\s*el\s*fabricante/i,
    /como\s*se\s*indique/i,
  ];

  for (const pattern of vaguePatterns) {
    if (pattern.test(timing)) {
      return 'Sin preferencia de horario según estudios clínicos';
    }
  }

  // Also check for unverified absorption claims in timing
  for (const pattern of UNVERIFIED_CLAIM_PATTERNS) {
    if (pattern.test(timing)) {
      return 'Sin preferencia de horario según estudios clínicos';
    }
  }

  return timing;
}

/**
 * Detect if recommendation has poor/placeholder metadata that needs enrichment
 */
export function needsEnrichment(recommendation: Recommendation): boolean {
  // Always enrich if studies.ranked is missing (for intelligent analysis)
  const hasRanked = !!recommendation?.evidence_summary?.studies?.ranked;
  const grade =
    recommendation?.supplement?.overallGrade ||
    recommendation?.evidence_summary?.overallGrade;

  console.log(
    JSON.stringify({
      operation: 'NeedsEnrichment',
      hasRanked,
      grade,
      supplement: recommendation?.supplement?.name || 'unknown',
    })
  );

  if (!hasRanked) {
    return true;
  }

  const worksFor = recommendation?.supplement?.worksFor || [];

  // Check if worksFor is empty or only has placeholder
  if (worksFor.length === 0) return true;
  if (
    worksFor.length === 1 &&
    worksFor[0]?.condition === 'Bienestar General'
  )
    return true;

  // Check if evidence grade is poor (C or lower)
  const evidenceGrade =
    recommendation?.supplement?.overallGrade ||
    recommendation?.evidence_summary?.overallGrade;
  if (evidenceGrade === 'C' || evidenceGrade === 'D') return true;

  // Check if description is generic placeholder
  const description = recommendation?.supplement?.description || '';
  if (
    description.includes('Suplemento analizado basado en') &&
    description.includes('estudios científicos recuperados')
  ) {
    return true;
  }

  return false;
}

/**
 * Get intelligent ranking from studies-fetcher Lambda
 */
export async function getStudiesRanking(
  supplementName: string
): Promise<any | null> {
  const startTime = Date.now();

  console.log(
    JSON.stringify({
      operation: 'GetStudiesRanking',
      supplementName,
      lambda: 'production-studies-fetcher',
    })
  );

  try {
    const payload = {
      httpMethod: 'POST',
      body: JSON.stringify({
        supplementName,
        maxResults: 15,
      }),
    };

    const response = await lambdaClient.send(
      new InvokeCommand({
        FunctionName: 'production-studies-fetcher',
        InvocationType: 'RequestResponse',
        Payload: Buffer.from(JSON.stringify(payload)),
      })
    );

    const duration = Date.now() - startTime;

    if (response.FunctionError) {
      console.error(
        JSON.stringify({
          operation: 'GetStudiesRanking',
          error: response.FunctionError,
          supplementName,
          duration,
        })
      );
      return null;
    }

    const responsePayload = response.Payload
      ? JSON.parse(new TextDecoder().decode(response.Payload))
      : null;

    let rankingData;
    if (responsePayload?.body) {
      const body =
        typeof responsePayload.body === 'string'
          ? JSON.parse(responsePayload.body)
          : responsePayload.body;
      rankingData = body.data?.ranking || body.ranking;
    } else {
      rankingData = responsePayload?.data?.ranking || responsePayload?.ranking;
    }

    console.log(
      JSON.stringify({
        operation: 'GetStudiesRanking',
        supplementName,
        success: !!rankingData,
        confidence: rankingData?.metadata?.confidenceScore || 0,
        duration,
      })
    );

    return rankingData;
  } catch (error: any) {
    console.error(
      JSON.stringify({
        operation: 'GetStudiesRanking',
        error: error.message,
        supplementName,
        duration: Date.now() - startTime,
      })
    );
    return null;
  }
}

/**
 * Call the content-enricher Lambda to get detailed supplement data
 */
export async function enrichSupplement(
  supplementName: string,
  ranking?: any
): Promise<EnrichmentData | null> {
  const startTime = Date.now();

  console.log(
    JSON.stringify({
      operation: 'EnrichSupplement',
      supplementName,
      lambda: config.enricherLambda,
      hasRanking: !!ranking,
    })
  );

  try {
    // The content-enricher expects 'supplementId' (the supplement name)
    const payload = {
      httpMethod: 'POST',
      body: JSON.stringify({
        supplementId: supplementName,
        category: 'general',
        forceRefresh: false,
        ranking, // Pass ranking data to enricher
      }),
    };

    const response = await lambdaClient.send(
      new InvokeCommand({
        FunctionName: config.enricherLambda,
        InvocationType: 'RequestResponse',
        Payload: Buffer.from(JSON.stringify(payload)),
      })
    );

    const duration = Date.now() - startTime;

    if (response.FunctionError) {
      console.error(
        JSON.stringify({
          operation: 'EnrichSupplement',
          error: response.FunctionError,
          supplementName,
          duration,
        })
      );
      return null;
    }

    const responsePayload = response.Payload
      ? JSON.parse(new TextDecoder().decode(response.Payload))
      : null;

    // Handle Lambda response (may have statusCode/body structure)
    let enrichData: EnrichmentData;

    if (responsePayload?.body) {
      const body =
        typeof responsePayload.body === 'string'
          ? JSON.parse(responsePayload.body)
          : responsePayload.body;
      enrichData = body;
    } else {
      enrichData = responsePayload;
    }

    console.log(
      JSON.stringify({
        operation: 'EnrichSupplement',
        supplementName,
        success: enrichData?.success,
        hasData: !!enrichData?.data,
        duration,
      })
    );

    return enrichData;
  } catch (error: any) {
    console.error(
      JSON.stringify({
        operation: 'EnrichSupplement',
        error: error.message,
        supplementName,
        duration: Date.now() - startTime,
      })
    );
    return null;
  }
}

/**
 * Merge enriched data into recommendation structure
 */
export function mergeEnrichedData(
  recommendation: Recommendation,
  enrichedData: EnrichmentData
): Recommendation {
  // Resolve evidence structure (handle multiple possible paths)
  const evidence =
    enrichedData?.evidence ||
    enrichedData?.data?.evidence ||
    enrichedData?.data?.supplement ||
    enrichedData?.data ||
    enrichedData?.supplement;

  if (!evidence) {
    console.warn(
      JSON.stringify({
        operation: 'MergeEnrichedData',
        warning: 'No evidence found',
        supplement: recommendation?.supplement?.name,
        hasTopEvidence: !!enrichedData?.evidence,
        hasDataEvidence: !!enrichedData?.data?.evidence,
        hasDataSupplement: !!enrichedData?.data?.supplement,
      })
    );
    return recommendation;
  }

  console.log(
    JSON.stringify({
      operation: 'MergeEnrichedData',
      worksForCount: evidence.worksFor?.length || 0,
      doesntWorkForCount: evidence.doesntWorkFor?.length || 0,
    })
  );

  // Update worksFor with real conditions from enrichment
  if (evidence.worksFor && evidence.worksFor.length > 0) {
    recommendation.supplement.worksFor = evidence.worksFor.map((item: any) => ({
      condition: item.condition || item.name,
      grade: item.evidenceGrade || item.grade || 'B',
      evidenceGrade: item.evidenceGrade || item.grade || 'B',
      studyCount: item.studyCount || 1,
      notes: item.summary || item.notes || '',
      magnitude: item.magnitude || 'Moderada',
      confidence: item.confidence || 75,
    }));
  }

  // Update whatIsIt (rich description from content-enricher)
  const whatIsIt = evidence.whatIsIt || evidence.whatIsItFor || evidence.description;
  if (whatIsIt) {
    recommendation.supplement.whatIsIt = whatIsIt;
    // Also update description as fallback
    if (!recommendation.supplement.description || recommendation.supplement.description.includes('Suplemento analizado')) {
      recommendation.supplement.description = whatIsIt;
    }
  }

  // Update mechanisms (how it works)
  if (Array.isArray(evidence.mechanisms) && evidence.mechanisms.length > 0) {
    recommendation.supplement.mechanisms = evidence.mechanisms
      .filter((m: any) => m.name && m.evidenceLevel)
      .slice(0, 3) // Max 3 mechanisms
      .map((m: any) => ({
        name: m.name,
        description: m.description || '',
        evidenceLevel: ['strong', 'moderate', 'weak'].includes(m.evidenceLevel)
          ? m.evidenceLevel
          : 'moderate',
        target: m.target || undefined,
      }));

    console.log(
      JSON.stringify({
        operation: 'MergeMechanisms',
        count: recommendation.supplement.mechanisms?.length || 0,
      })
    );
  }

  // Update buyingGuidance (what to look for when buying)
  if (evidence.buyingGuidance) {
    recommendation.supplement.buyingGuidance = {
      preferredForm: evidence.buyingGuidance.preferredForm || '',
      keyCompounds: Array.isArray(evidence.buyingGuidance.keyCompounds)
        ? evidence.buyingGuidance.keyCompounds.map((c: any) => ({
            name: c.name || '',
            source: c.source || '',
            lookFor: c.lookFor || '',
          }))
        : [],
      avoidFlags: Array.isArray(evidence.buyingGuidance.avoidFlags)
        ? evidence.buyingGuidance.avoidFlags.filter((f: string) => f && f.length > 0)
        : [],
      qualityIndicators: Array.isArray(evidence.buyingGuidance.qualityIndicators)
        ? evidence.buyingGuidance.qualityIndicators.filter((i: string) => i && i.length > 0)
        : [],
      notes: evidence.buyingGuidance.notes || undefined,
    };

    console.log(
      JSON.stringify({
        operation: 'MergeBuyingGuidance',
        hasPreferredForm: !!recommendation.supplement.buyingGuidance.preferredForm,
        keyCompoundsCount: recommendation.supplement.buyingGuidance.keyCompounds.length,
        avoidFlagsCount: recommendation.supplement.buyingGuidance.avoidFlags.length,
      })
    );
  }

  // Update overall grade
  if (evidence.overallGrade) {
    recommendation.supplement.overallGrade = evidence.overallGrade;
    if (recommendation.evidence_summary) {
      recommendation.evidence_summary.overallGrade = evidence.overallGrade;
    }
  }

  // Update quality badges
  if (evidence.qualityBadges) {
    recommendation.qualityBadges = {
      ...(recommendation.qualityBadges || {}),
      ...evidence.qualityBadges,
    };
    if (recommendation.evidence_summary) {
      recommendation.evidence_summary.qualityBadges = evidence.qualityBadges;
    }
  }

  // Update doesntWorkFor
  if (Array.isArray(evidence.doesntWorkFor)) {
    recommendation.supplement.doesntWorkFor = evidence.doesntWorkFor.map(
      (item: any) => ({
        condition: item.condition || item.name,
        grade: item.evidenceGrade || item.grade || 'D',
        evidenceGrade: item.evidenceGrade || item.grade || 'D',
        studyCount: item.studyCount || 1,
        notes: item.summary || item.notes || '',
      })
    );
  }

  // Update limitedEvidence
  if (Array.isArray(evidence.limitedEvidence)) {
    recommendation.supplement.limitedEvidence = evidence.limitedEvidence.map(
      (item: any) => ({
        condition: item.condition || item.name,
        grade: item.evidenceGrade || item.grade || 'C',
        evidenceGrade: item.evidenceGrade || item.grade || 'C',
        studyCount: item.studyCount || 1,
        notes: item.summary || item.notes || '',
      })
    );
  }

  // Update dosage with sanitization
  if (evidence.dosage) {
    const rawNotes = evidence.dosage.notes ||
      recommendation.supplement.dosage?.notes ||
      '';
    const rawTiming = evidence.dosage.timing || '';

    recommendation.supplement.dosage = {
      standard:
        evidence.dosage.standard ||
        evidence.dosage.recommendedDose ||
        recommendation.supplement.dosage?.standard ||
        '',
      effectiveDose:
        evidence.dosage.effectiveDose ||
        recommendation.supplement.dosage?.effectiveDose ||
        '',
      notes: sanitizeDosageNotes(rawNotes),
    };

    // Add timing if available (sanitized)
    if (rawTiming) {
      (recommendation.supplement.dosage as any).timing = sanitizeTiming(rawTiming);
    }
  }

  // Update side effects
  if (evidence.sideEffects && evidence.sideEffects.length > 0) {
    recommendation.supplement.sideEffects = evidence.sideEffects.map(
      (se: any) => ({
        name: se.name || se.effect,
        frequency: se.frequency || 'Raro',
        notes: se.notes || '',
      })
    );
  }

  // Copy products if present
  const enrichedProducts =
    enrichedData?.products || enrichedData?.data?.products;
  if (enrichedProducts && enrichedProducts.length > 0) {
    recommendation.products = enrichedProducts;
  }

  // Copy studies.ranked data
  const studies =
    evidence.studies || enrichedData?.data?.studies || enrichedData?.studies;

  if (studies) {
    if (!recommendation.evidence_summary) {
      recommendation.evidence_summary = {} as any;
    }

    recommendation.evidence_summary.studies = {
      ...(recommendation.evidence_summary.studies || {}),
      ...studies,
    };

    console.log(
      JSON.stringify({
        operation: 'MergeStudies',
        hasRanked: !!studies.ranked,
        positiveCount: studies.ranked?.positive?.length || 0,
        confidence: studies.ranked?.metadata?.confidenceScore || 0,
      })
    );

    // Update basedOn/totals
    if (evidence.basedOn) {
      recommendation.evidence_summary.totalStudies =
        evidence.basedOn.studiesCount ||
        recommendation.evidence_summary.totalStudies;
      recommendation.evidence_summary.totalParticipants =
        evidence.basedOn.totalParticipants ||
        recommendation.evidence_summary.totalParticipants;
    } else if (studies.total) {
      recommendation.evidence_summary.totalStudies = studies.total;
    }
  }

  // Update evidence_by_benefit
  if (Array.isArray(evidence.evidenceByBenefit)) {
    recommendation.evidence_by_benefit = evidence.evidenceByBenefit.map(
      (item: any) => ({
        benefit: item.benefit || '',
        evidence_level: item.evidenceLevel || 'Insuficiente',
        studies_found: item.studiesFound || 0,
        total_participants: item.totalParticipants || 0,
        summary: item.summary || '',
      })
    );
  } else if (Array.isArray(enrichedData.data?.evidenceByBenefit)) {
    recommendation.evidence_by_benefit = enrichedData.data.evidenceByBenefit;
  }

  // Copy enrichment metadata
  if (enrichedData.metadata) {
    recommendation._enrichment_metadata = {
      ...recommendation._enrichment_metadata,
      ...enrichedData.metadata,
      hasRealData: true,
      fromEnrichmentApi: true,
      lastEnrichedAt: new Date().toISOString(),
    };
  }

  // Copy synergies if present in enrichment data
  const synergies = enrichedData.synergies || enrichedData.data?.synergies;
  const synergiesSource = enrichedData.synergiesSource || enrichedData.data?.synergiesSource;

  if (synergies && synergies.length > 0) {
    (recommendation as any).synergies = synergies;
    (recommendation as any).synergiesSource = synergiesSource || 'external_db';

    console.log(
      JSON.stringify({
        operation: 'MergeSynergies',
        synergiesCount: synergies.length,
        source: synergiesSource,
        positiveCount: synergies.filter((s: any) => s.direction === 'positive').length,
        negativeCount: synergies.filter((s: any) => s.direction === 'negative').length,
      })
    );
  }

  // Mark as enriched
  recommendation.enriched = true;
  recommendation.enrichmentSource = 'quiz_orchestrator_lambda';

  return recommendation;
}
