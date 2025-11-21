/**
 * Portal Recommendation API Route
 * Generates supplement recommendations using the intelligent enrichment system
 *
 * This endpoint replaces the external AnkoSoft backend by using our own
 * intelligent content enrichment system (studies-fetcher + content-enricher).
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { portalLogger } from '@/lib/portal/api-logger';
import { validateSupplementQuery, sanitizeQuery } from '@/lib/portal/query-validator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes for enrichment

/**
 * Get the base URL for internal API calls
 * Auto-detects production URL from Vercel environment
 */
function getBaseUrl(): string {
  // 1. Vercel production URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 2. Explicit URL from env
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // 3. Local development
  return 'http://localhost:3000';
}

/**
 * POST /api/portal/recommend
 *
 * Generates intelligent supplement recommendations using real PubMed studies
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { category, age, gender, location, sensitivities = [], quiz_id } = body;

    portalLogger.logRequest({
      requestId,
      endpoint: '/api/portal/recommend',
      method: 'POST',
      category,
      age,
      gender,
      location,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
    });

    // Validate required field
    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: category',
        },
        { status: 400 }
      );
    }

    // GUARDRAILS: Validate query content
    const validation = validateSupplementQuery(category);
    if (!validation.valid) {
      portalLogger.logError(
        new Error('Query validation failed'),
        {
          requestId,
          category,
          validationError: validation.error,
          severity: validation.severity,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          suggestion: validation.suggestion,
          severity: validation.severity,
        },
        { status: 400 }
      );
    }

    // Sanitize category
    const sanitizedCategory = sanitizeQuery(category);

    // Generate unique recommendation ID for async pattern
    const recommendationId = `rec_${Date.now()}_${randomUUID().substring(0, 8)}`;

    // ASYNC PATTERN: Start enrichment and return immediately with 202 Accepted
    // Frontend will poll for completion
    console.log(`🚀 Starting async enrichment for: ${sanitizedCategory} (ID: ${recommendationId})`);

    // Start enrichment process (don't await - fire and forget)
    const ENRICH_API_URL = `${getBaseUrl()}/api/portal/enrich`;

    // Fire async enrichment (use Promise to not block response)
    processEnrichmentAsync(
      ENRICH_API_URL,
      sanitizedCategory,
      recommendationId,
      requestId,
      age || 35,
      gender || 'male',
      location || 'CDMX',
      quiz_id
    ).catch((error) => {
      console.error(`❌ Async enrichment failed for ${recommendationId}:`, error);
    });

    // Return 202 Accepted immediately with recommendation_id
    // Frontend will poll /api/portal/recommendation/[id] for completion
    return NextResponse.json(
      {
        success: true,
        status: 'processing',
        recommendation_id: recommendationId,
        message: 'Recommendation is being generated. Please poll for completion.',
        pollUrl: `/api/portal/recommendation/${recommendationId}`,
        requestId,
      },
      { status: 202 }
    );

  } catch (error: any) {
    const duration = Date.now() - startTime;

    portalLogger.logError(error, {
      requestId,
      endpoint: '/api/portal/recommend',
      method: 'POST',
      duration,
    });

    console.error(`❌ Error generating recommendation: ${error.message}`);

    // DO NOT generate fake data - return proper error instead
    return NextResponse.json(
      {
        success: false,
        error: 'recommendation_generation_failed',
        message: `Hubo un error al generar la recomendación. Por favor, intenta de nuevo.`,
        details: error.message,
        requestId,
      },
      { status: 500 }
    );
  }
}

/**
 * Process enrichment asynchronously
 * This runs in the background and saves result to cache
 */
async function processEnrichmentAsync(
  enrichApiUrl: string,
  category: string,
  recommendationId: string,
  requestId: string,
  age: number,
  gender: string,
  location: string,
  quiz_id?: string
): Promise<void> {
  const startTime = Date.now();

  try {
    console.log(`⏳ [${recommendationId}] Starting enrichment for: ${category}`);

    const enrichResponse = await fetch(enrichApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({
        supplementName: category,
        category: category,
        maxStudies: 1,
        rctOnly: false,
        yearFrom: 2010,
      }),
      signal: AbortSignal.timeout(110000), // 110s timeout
    });

    if (!enrichResponse.ok) {
      const errorText = await enrichResponse.text();
      console.error(`❌ [${recommendationId}] Enrichment failed (${enrichResponse.status}):`, errorText);
      // Save error state to localStorage for polling endpoint
      saveRecommendationStatus(recommendationId, 'error', null, errorText);
      return;
    }

    const enrichData = await enrichResponse.json();

    if (!enrichData.success || !enrichData.data) {
      console.error(`❌ [${recommendationId}] Enrichment unsuccessful or no data`);
      saveRecommendationStatus(recommendationId, 'error', null, 'No data returned from enrichment');
      return;
    }

    // Transform enriched data to recommendation format
    const enrichedContent = enrichData.data;
    const metadata = enrichData.metadata || {};

    // CRITICAL VALIDATION: Ensure we have real scientific data
    const hasRealData = metadata.hasRealData === true && (metadata.studiesUsed || 0) > 0;

    if (!hasRealData) {
      console.error(`❌ [${recommendationId}] No real scientific data found`);
      console.error(`Metadata:`, JSON.stringify(metadata));
      saveRecommendationStatus(recommendationId, 'error', null, 'No real scientific data found');
      return;
    }

    const duration = Date.now() - startTime;

    console.log(
      JSON.stringify({
        event: 'ASYNC_ENRICHMENT_SUCCESS',
        recommendationId,
        category,
        studiesUsed: metadata.studiesUsed || 0,
        hasRealData: true,
        duration,
      })
    );

    const recommendation = transformToRecommendation(
      enrichedContent,
      category,
      age,
      gender,
      location,
      quiz_id,
      metadata,
      recommendationId // Pass the recommendation ID
    );

    // Save completed recommendation for polling endpoint
    saveRecommendationStatus(recommendationId, 'completed', recommendation, null);

    console.log(`✅ [${recommendationId}] Recommendation saved successfully`);

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [${recommendationId}] Async enrichment error:`, error.message);
    saveRecommendationStatus(recommendationId, 'error', null, error.message);
  }
}

/**
 * Save recommendation status to localStorage (temporary solution)
 * In production, this should use DynamoDB or Redis
 */
function saveRecommendationStatus(
  recommendationId: string,
  status: 'processing' | 'completed' | 'error',
  recommendation: any | null,
  error: string | null
): void {
  // Store in memory (simple in-memory cache for serverless)
  // In production, use DynamoDB or Vercel KV
  const cacheKey = `recommendation:${recommendationId}`;
  const data = {
    status,
    recommendation,
    error,
    timestamp: Date.now(),
  };

  // Save to global cache (will persist during lambda warm state)
  if (typeof global !== 'undefined') {
    if (!(global as any).__recommendationCache) {
      (global as any).__recommendationCache = new Map();
    }
    (global as any).__recommendationCache.set(cacheKey, data);
  }

  console.log(`💾 [${recommendationId}] Status saved: ${status}`);
}

/**
 * Transform enriched content to recommendation format expected by quiz frontend
 */
function transformToRecommendation(
  enrichedContent: any,
  category: string,
  age: number,
  gender: string,
  location: string,
  quiz_id?: string,
  metadata?: any,
  recommendationId?: string
): any {
  const recId = recommendationId || `rec_${Date.now()}_${randomUUID().substring(0, 8)}`;

  return {
    recommendation_id: recId,
    quiz_id: quiz_id || `quiz_${Date.now()}_${randomUUID().substring(0, 8)}`,
    category,
    user_profile: {
      age,
      gender,
      location,
    },
    // Main supplement recommendation
    supplement: {
      name: enrichedContent.name || category,
      // FIXED: Lambda returns 'whatIsIt', not 'description'
      description: enrichedContent.whatIsIt || enrichedContent.description || enrichedContent.overview || '',
      dosage: enrichedContent.dosage || 'Consultar con profesional de salud',
      // Extract benefits from worksFor array
      benefits: enrichedContent.worksFor?.map((w: any) => {
        // Handle both old and new formats
        if (typeof w === 'string') return w;
        return `${w.condition || w.use || w.benefit} (Evidencia: ${w.evidenceGrade || w.grade || 'C'}, ${w.magnitude || w.effect || 'Ver estudios'})`;
      }) || [],
      // Extract side effects from safety.sideEffects
      side_effects: enrichedContent.safety?.sideEffects?.map((s: any) => {
        if (typeof s === 'string') return s;
        return `${s.effect || s.name} (${s.frequency || 'Frecuencia variable'}, ${s.severity || 'Mild'})`;
      }) || [],
      // Extract warnings from safety.contraindications
      warnings: enrichedContent.safety?.contraindications || [],
      // Extract interactions from safety.interactions
      interactions: enrichedContent.safety?.interactions?.map((i: any) => {
        if (typeof i === 'string') return i;
        return `${i.medication || i.drug || i.substance}: ${i.description || i.effect}`;
      }) || [],
    },
    // Evidence summary (frontend expects this structure)
    evidence_summary: {
      totalStudies: metadata?.studiesUsed || 0,
      totalParticipants: enrichedContent.totalParticipants || 0,
      efficacyPercentage: enrichedContent.efficacyPercentage || 0,
      researchSpanYears: enrichedContent.researchSpanYears || 10,
      ingredients: enrichedContent.ingredients || [{
        name: enrichedContent.name || category,
        // Get grade from first worksFor item if available, fallback to C
        grade: enrichedContent.worksFor?.[0]?.evidenceGrade || enrichedContent.worksFor?.[0]?.grade || enrichedContent.evidenceGrade || 'C',
        studyCount: enrichedContent.worksFor?.[0]?.studyCount || metadata?.studiesUsed || 0,
        rctCount: enrichedContent.worksFor?.[0]?.rctCount || metadata?.rctCount || 0,
      }],
    },
    // Evidence and studies (legacy, keep for compatibility)
    evidence: {
      quality: enrichedContent.evidenceQuality || enrichedContent.evidence_quality || 'moderate',
      studies_count: metadata?.studiesUsed || 0,
      has_real_data: metadata?.hasRealData || false,
      summary: enrichedContent.evidenceSummary || enrichedContent.evidence_summary || '',
    },
    // Recommendations
    recommendations: {
      usage: enrichedContent.usage || 'Consultar con profesional de salud antes de usar',
      timing: enrichedContent.timing || 'Según indicaciones',
      duration: enrichedContent.duration || 'Según necesidad',
      considerations: enrichedContent.considerations || [],
    },
    // Products (required by frontend)
    products: enrichedContent.products || [
      {
        tier: 'budget',
        name: `${enrichedContent.name || category} Básico`,
        price: 150,
        currency: 'MXN',
        contains: [enrichedContent.name || category],
        whereToBuy: 'Amazon México',
        affiliateLink: `https://amazon.com.mx/search?k=${encodeURIComponent(category)}`,
        description: `Suplemento de ${category} de calidad básica`,
        isAnkonere: false,
      },
      {
        tier: 'value',
        name: `${enrichedContent.name || category} Premium`,
        price: 320,
        currency: 'MXN',
        contains: [enrichedContent.name || category, 'Co-factores'],
        whereToBuy: 'Amazon México',
        affiliateLink: `https://amazon.com.mx/search?k=${encodeURIComponent(category)}`,
        description: `Fórmula mejorada con ${category} y co-factores para mejor absorción`,
        isAnkonere: false,
      },
      {
        tier: 'premium',
        name: `ANKONERE ${enrichedContent.name || category} Pro`,
        price: 450,
        currency: 'MXN',
        contains: [enrichedContent.name || category, 'Formulación optimizada'],
        whereToBuy: 'ANKONERE Direct',
        directLink: `https://ankonere.com/product/${encodeURIComponent(category)}`,
        description: `Fórmula premium con ${category} optimizada para LATAM`,
        isAnkonere: true,
      },
    ],
    // Ingredients (required for ingredient adjustments)
    ingredients: enrichedContent.ingredients || [],
    // Metadata
    _enrichment_metadata: {
      hasRealData: metadata?.hasRealData || false,
      studiesUsed: metadata?.studiesUsed || 0,
      intelligentSystem: true,
      fallback: metadata?.fallback || false,
      error: metadata?.error,
      source: 'suplementia-intelligent-system',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    },
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID',
    },
  });
}
