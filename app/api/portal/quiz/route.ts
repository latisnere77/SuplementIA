/**
 * Portal Quiz API Route
 * Submits quiz responses and triggers recommendation generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { portalLogger } from '@/lib/portal/api-logger';
import { validateSupplementQuery, sanitizeQuery } from '@/lib/portal/query-validator';
import { expandAbbreviation } from '@/lib/services/abbreviation-expander';
import { createJob, storeJobResult } from '@/lib/portal/job-store';
import { SUPPLEMENTS_DATABASE, type SupplementEntry } from '@/lib/portal/supplements-database';
import { searchPubMed } from '@/lib/services/pubmed-search';


import { searchSupplements } from '@/lib/search-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 180; // 3 minutes to allow for complex supplements with many studies

// Check if we're in demo mode
const isDemoMode = process.env.PORTAL_DEMO_MODE === 'true';

/**
 * Detect if recommendation has poor/placeholder metadata that needs enrichment
 * @returns true if enrichment is needed
 */
function needsEnrichment(recommendation: any): boolean {
  // ALWAYS enrich if studies.ranked is missing or invalid (for intelligent analysis)
  // FIX: Check for VALID ranking data, not just if the object exists
  const ranked = recommendation?.evidence_summary?.studies?.ranked;
  const hasValidRanking = ranked && (
    (ranked.metadata?.confidenceScore > 0) ||
    (ranked.positive?.length > 0) ||
    (ranked.negative?.length > 0)
  );
  const grade = recommendation?.supplement?.evidenceGrade || recommendation?.evidence_summary?.evidenceGrade;
  console.log(`🔍 [NEEDS_ENRICH] hasValidRanking=${hasValidRanking} grade=${grade} supplement=${recommendation?.supplement?.name || 'unknown'}`);

  if (!hasValidRanking) {
    console.log(`✅ [NEEDS_ENRICH] YES - no valid ranked data`);
    return true;
  }

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
    recommendation.products = enrichedProducts;
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

/**
 * Get the base URL for internal API calls
 * Auto-detects production URL from Vercel environment
 */
function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
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
function transformHitsToRecommendation(hits: any[], query: string, quizId: string): any {
  // Use reported total if available (from LanceDB metadata)
  const totalStudies = hits.length === 1 ? (hits[0].study_count || hits.length) : hits.length;
  const ingredientsMap = new Map<string, number>();

  // Analizar condiciones y asignarles "fuerza" basada en frecuencia
  const conditionsStats = new Map<string, { count: number, papers: string[] }>();

  hits.forEach(hit => {
    // Ingredientes
    const rawIng = hit.ingredients;
    const ingArray = Array.isArray(rawIng) ? rawIng : (typeof rawIng === 'string' ? rawIng.split(',').map((s: string) => s.trim()) : []);
    ingArray.forEach((ing: string) => {
      ingredientsMap.set(ing, (ingredientsMap.get(ing) || 0) + 1);
    });

    // Condiciones (Works For)
    const rawCond = hit.conditions;
    const condArray = Array.isArray(rawCond) ? rawCond : (typeof rawCond === 'string' ? rawCond.split(',').map((s: string) => s.trim()) : []);
    condArray.forEach((cond: string) => {
      const current = conditionsStats.get(cond) || { count: 0, papers: [] };
      current.count++;
      if (hit.title) current.papers.push(hit.title);
      conditionsStats.set(cond, current);
    });
  });

  // Convertir condiciones a estructura worksFor (Grados A/B)
  // Si pocas condiciones, dividir para poblar UI
  const sortedConditions = Array.from(conditionsStats.entries())
    .sort((a, b) => b[1].count - a[1].count);

  const worksFor = sortedConditions.map(([cond, stats], index) => ({
    condition: cond,
    evidenceGrade: 'C', // Default to 'Limited/Suggesting' until LLM confirms hierarchy
    grade: 'C',
    magnitude: 'Moderada',
    effectSize: 'Por determinar',
    studyCount: stats.count,
    notes: `Evidencia preliminar encontrada en ${stats.count} estudios. Pendiente de análisis detallado.`,
    quantitativeData: "Análisis en tiempo real de PubMed en progreso...",
    confidence: 60 - (index * 5)
  }));

  // No longer generating DoesntWorkFor/LimitedEvidence placeholders.
  // We prefer showing only facts found in PubMed.
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
      name: query,
      description: hits[0]?.abstract || `Suplemento analizado basado en ${totalStudies} estudios científicos recuperados.`,
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
    products: [{
      tier: 'premium',
      name: `Suplemento Premium de ${query}`,
      price: 0, // In standard UI, 0 can be handled as 'Consultar'
      currency: 'MXN',
      contains: topIngredients.map(i => i.name),
      whereToBuy: 'Consultar Proveedor Certificado',
      description: `Fórmula de alta pureza optimizada según la evidencia científica para ${query}.`,
      isAnkonere: true // Mark as Ankonere to trigger correct UI
    }],
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

export async function POST(request: NextRequest) {
  console.log("🚀🚀🚀 [QUIZ UPDATE] New deployment active! " + new Date().toISOString());
  const requestId = randomUUID();
  const jobId = request.headers.get('X-Job-ID') || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const quizId = `quiz_${Date.now()}_${randomUUID().substring(0, 8)}`;

  try {
    const body = await request.json();
    const { category, age, gender, location, sensitivities = [] } = body;

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
          let rec = transformHitsToRecommendation(finalHits, searchTerm, quizId);

          // INLINE AUTO-ENRICHMENT: Check if metadata is poor and enrich if needed
          if (needsEnrichment(rec)) {
            // Check if we specifically need ranking data (to force cache bypass)
            // FIX: Check for VALID ranking data, not just if the object exists
            const ranked = rec?.evidence_summary?.studies?.ranked;
            const needsRanking = !ranked || (
              !ranked.metadata?.confidenceScore &&
              !ranked.positive?.length &&
              !ranked.negative?.length
            );
            console.log(`[Inline Enrichment] Poor metadata detected for "${searchTerm}", triggering enrichment... needsRanking=${needsRanking}`);
            const enrichedData = await enrichSupplement(searchTerm, getBaseUrl(), needsRanking);

            if (enrichedData) {
              rec = mergeEnrichedData(rec, enrichedData);
              console.log(`[Inline Enrichment] Successfully enriched "${searchTerm}"`);
            } else {
              console.log(`[Inline Enrichment] Enrichment failed, returning basic data for "${searchTerm}"`);
            }
          }

          storeJobResult(jobId, 'completed', { recommendation: rec });
          return NextResponse.json({
            success: true,
            quiz_id: quizId,
            recommendation: rec,
            jobId,
            source: rec.enriched ? 'lancedb_lambda_enriched' : 'lancedb_lambda_serverless'
          });
        } else {
          console.log('[Search] All LanceDB hits were filtered out as irrelevant.');
        }
      }
    } catch (wsErr: any) {
      console.error('[Hybrid Search] Error:', wsErr);
      // DEBUG: Stop swallowing errors. Return them to UI.
      return NextResponse.json({
        success: false,
        source: 'hybrid_search_debug_fail',
        error: 'Hybrid Search Failed',
        details: wsErr.message,
        stack: wsErr.stack
      }, { status: 500 });
    }
    // =================================================================

    // INTENT DETECTION FALLBACK
    let searchType: 'ingredient' | 'condition' | 'unknown' = 'unknown';
    const normalizedQuery = sanitizedCategory.toLowerCase();

    const dbMatch = SUPPLEMENTS_DATABASE.find(
      (entry) => entry.name.toLowerCase() === normalizedQuery || entry.aliases.some(a => a.toLowerCase() === normalizedQuery)
    );

    if (dbMatch) {
      searchType = dbMatch.category === 'condition' ? 'condition' : 'ingredient';
    } else {
      searchType = 'condition';
    }

    if (searchType === 'condition') {
      const pubmedResults = await searchPubMed(sanitizedCategory);
      return NextResponse.json(pubmedResults, { status: 200 });
    }

    // BENEFIT SEARCH LOGIC
    let supplementName = sanitizedCategory;
    let benefitQuery: string | undefined = undefined;
    const benefitKeywords = [' for ', ' para '];
    for (const keyword of benefitKeywords) {
      if (sanitizedCategory.toLowerCase().includes(keyword)) {
        const parts = sanitizedCategory.split(new RegExp(keyword, 'i'));
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
    const QUIZ_API_URL = `${getBaseUrl()}/api/portal/recommend`;

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
        // If backend fails, propagate the error. NO MOCKS.
        console.error(`[CRITICAL] Backend Recommendation Service Failed: ${recommendationResponse.status}`);
        return NextResponse.json({
          success: false,
          error: 'backend_service_error',
          message: 'El servicio de recomendaciones no está disponible en este momento.',
          details: `Status: ${recommendationResponse.status}`
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
        if (!responseData.recommendation.recommendation_id) {
          responseData.recommendation.recommendation_id = jobId;
        }
        storeJobResult(jobId, 'completed', { recommendation: responseData.recommendation });
        return NextResponse.json({
          success: true,
          jobId,
          quiz_id: quizId,
          recommendation: responseData.recommendation,
        }, { status: 200 });
      }

      // If we got here, response was 200 but had no recommendation data.
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
