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
import { normalizeQuery } from '@/lib/portal/query-normalization';
import { fastLookup, getOptimizedEnrichmentParams } from '@/lib/portal/fast-lookup-service';

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
    
    const jobId = request.headers.get('X-Job-ID') || body.jobId || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🔖 [Job ${jobId}] Recommend endpoint - Category: "${category}"`);

    portalLogger.logRequest({
      requestId,
      jobId,
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
        { 
          status: 400,
          headers: {
            'Cache-Control': 'no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
          },
        }
      );
    }

    // Sanitize category
    const sanitizedCategory = sanitizeQuery(category);

    // Normalize query (Spanish→English, typo correction)
    const normalized = normalizeQuery(sanitizedCategory);
    const searchTerm = normalized.normalized;

    console.log(
      JSON.stringify({
        event: 'QUERY_NORMALIZED',
        requestId,
        original: category,
        sanitized: sanitizedCategory,
        normalized: searchTerm,
        confidence: normalized.confidence,
        corrections: normalized.corrections,
        timestamp: new Date().toISOString(),
      })
    );

    // 🚀 FAST LOOKUP: Check if we have pre-calculated mappings
    const lookupResult = await fastLookup(sanitizedCategory);
    
    console.log(
      JSON.stringify({
        event: 'FAST_LOOKUP_RESULT',
        requestId,
        cached: lookupResult.cached,
        normalizedName: lookupResult.normalizedName,
        scientificName: lookupResult.scientificName,
        lookupTime: lookupResult.lookupTime,
        category: lookupResult.category,
        popularity: lookupResult.popularity,
        timestamp: new Date().toISOString(),
      })
    );

    // Call our intelligent enrichment system with extended timeout
    // Using enrich (full version with LLM expansion) for better query handling
    const ENRICH_API_URL = `${getBaseUrl()}/api/portal/enrich`;
    const enrichStartTime = Date.now();
    
    // 🚀 OPTIMIZATION: Use optimized parameters from mapping if available
    const enrichParams = getOptimizedEnrichmentParams(sanitizedCategory);
    
    console.log(
      JSON.stringify({
        event: 'RECOMMEND_ENRICH_CALL_START',
        requestId,
        category: searchTerm,
        originalCategory: category,
        enrichApiUrl: ENRICH_API_URL,
        optimizedParams: enrichParams,
        usedMapping: lookupResult.cached,
        timestamp: new Date().toISOString(),
      })
    );

    // Try sync first with shorter timeout (30s)
    // If timeout, fall back to async processing
    let enrichResponse;
    let isAsync = false;
    
    try {
      enrichResponse = await fetch(ENRICH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-Job-ID': jobId,
        },
        body: JSON.stringify({
          supplementName: enrichParams.supplementName,
          category: enrichParams.supplementName,
          forceRefresh: false, // Use cache when available (96% faster: 1s vs 30s)
          maxStudies: enrichParams.maxStudies || 10,
          rctOnly: enrichParams.rctOnly || false,
          yearFrom: enrichParams.yearFrom || 2010,
          // 🚀 NEW: Pass optimized PubMed query if available
          customPubMedQuery: enrichParams.pubmedQuery,
          jobId,
        }),
        signal: AbortSignal.timeout(30000), // 30s timeout - if longer, use async
      });
    } catch (error: any) {
      // If timeout, switch to async processing
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        console.log(
          JSON.stringify({
            event: 'RECOMMEND_SWITCHING_TO_ASYNC',
            requestId,
            jobId,
            category: searchTerm,
            reason: 'sync_timeout_30s',
            timestamp: new Date().toISOString(),
          })
        );
        
        isAsync = true;
        
        // Start async enrichment (fire and forget)
        fetch(ENRICH_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'X-Job-ID': jobId,
          },
          body: JSON.stringify({
            supplementName: searchTerm,
            category: searchTerm,
            forceRefresh: false,
            maxStudies: 10,
            rctOnly: false,
            yearFrom: 2010,
            jobId,
          }),
        }).catch((err) => {
          console.error('Background enrichment error:', err);
        });
        
        // Return async response immediately
        return NextResponse.json({
          success: true,
          status: 'processing',
          recommendation_id: jobId, // Quiz expects this field
          jobId, // Keep for backward compatibility
          supplementName: searchTerm,
          originalQuery: category,
          message: 'Enrichment started in background',
          pollUrl: `/api/portal/enrichment-status/${jobId}?supplement=${encodeURIComponent(searchTerm)}`,
          pollInterval: 2000, // Poll every 2 seconds
          estimatedTime: 60, // Estimated 60 seconds
        }, { status: 202 }); // 202 Accepted
      }
      
      // Other errors - rethrow
      throw error;
    }

    const enrichDuration = Date.now() - enrichStartTime;

    if (!enrichResponse.ok) {
      const errorText = await enrichResponse.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText.substring(0, 500) };
      }

      console.error(
        JSON.stringify({
          event: 'RECOMMEND_ENRICH_CALL_FAILED',
          requestId,
          category: sanitizedCategory,
          originalCategory: category,
          statusCode: enrichResponse.status,
          duration: enrichDuration,
          error: errorData.error || errorData.message || 'Unknown error',
          errorData,
          timestamp: new Date().toISOString(),
        })
      );

      // Differentiate between "no data" (404) vs system errors (500, timeout)
      if (enrichResponse.status === 404 && errorData.error === 'insufficient_data') {
        // TRUE 404: No studies found - this is expected for some supplements
        return NextResponse.json(
          {
            success: false,
            error: 'insufficient_data',
            message: errorData.message || `No pudimos encontrar información científica suficiente sobre "${sanitizedCategory}".`,
            suggestion: errorData.suggestion || 'Intenta buscar con un nombre más específico o verifica la ortografía.',
            requestId,
            category: sanitizedCategory,
          },
          { status: 404 }
        );
      } else {
        // SYSTEM ERROR: Lambda failed, timeout, or other server error
        // Return 500 so frontend shows system error (red) not "no data" (yellow)
        return NextResponse.json(
          {
            success: false,
            error: 'enrichment_failed',
            message: `Hubo un error al procesar la información de "${sanitizedCategory}". Por favor, intenta de nuevo.`,
            details: errorData.error || errorData.message || 'Enrichment service error',
            statusCode: enrichResponse.status,
            requestId,
            category: sanitizedCategory,
          },
          { status: 500 }
        );
      }
    }

    const enrichData = await enrichResponse.json();

    

    if (!enrichData.success || !enrichData.data) {
      console.error(
        JSON.stringify({
          event: 'RECOMMEND_ENRICH_NO_DATA',
          requestId,
          category: sanitizedCategory,
          originalCategory: category,
          success: enrichData.success,
          hasData: !!enrichData.data,
          enrichDataKeys: Object.keys(enrichData),
          enrichError: enrichData.error,
          timestamp: new Date().toISOString(),
        })
      );

      // Check if this is a true "no data" case or a system error
      if (enrichData.error === 'insufficient_data') {
        // TRUE insufficient data: No studies found
        return NextResponse.json(
          {
            success: false,
            error: 'insufficient_data',
            message: enrichData.message || `No pudimos encontrar información científica suficiente sobre "${sanitizedCategory}".`,
            suggestion: enrichData.suggestion || 'Intenta buscar con un nombre más específico o verifica la ortografía.',
            requestId,
            category: sanitizedCategory,
          },
          { status: 404 }
        );
      } else {
        // SYSTEM ERROR: Enrichment failed for technical reasons
        return NextResponse.json(
          {
            success: false,
            error: 'enrichment_failed',
            message: `Hubo un error al procesar la información de "${sanitizedCategory}". Por favor, intenta de nuevo.`,
            details: enrichData.error || 'Enrichment processing error',
            requestId,
            category: sanitizedCategory,
          },
          { status: 500 }
        );
      }
    }

    // Transform enriched data to recommendation format
    const enrichedContent = enrichData.data;
    const metadata = enrichData.metadata || {};

    // CRITICAL VALIDATION: Ensure we have real scientific data
    const hasRealData = metadata.hasRealData === true && (metadata.studiesUsed || 0) > 0;

    

    if (!hasRealData) {
      console.error(
        JSON.stringify({
          event: 'RECOMMEND_VALIDATION_FAILED',
          requestId,
          category: sanitizedCategory,
          originalCategory: category,
          hasRealData: false,
          studiesUsed: metadata.studiesUsed || 0,
          metadata: JSON.stringify(metadata),
          timestamp: new Date().toISOString(),
        })
      );

      // STRICT VALIDATION: DO NOT generate fake data
      // Return 404 with clear message
      return NextResponse.json(
        {
          success: false,
          error: 'insufficient_data',
          message: `No encontramos estudios científicos verificables sobre "${sanitizedCategory}".`,
          suggestion: 'Verifica la ortografía o intenta con un término más específico. Si crees que esto es un error, contáctanos.',
          requestId,
          category: sanitizedCategory,
          metadata: {
            studiesUsed: metadata.studiesUsed || 0,
            hasRealData: metadata.hasRealData || false,
          },
        },
        { status: 404 }
      );
    }

    const recommendation = transformToRecommendation(
      enrichedContent,
      sanitizedCategory,
      age || 35,
      gender || 'male',
      location || 'CDMX',
      quiz_id,
      metadata
    );

    const duration = Date.now() - startTime;

    

    return NextResponse.json(
      {
        success: true,
        requestId,
        recommendation,
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );

  } catch (error: any) {
    const duration = Date.now() - startTime;
    let category = 'unknown';
    
    try {
      const errorBody = await request.clone().json().catch(() => ({}));
      category = errorBody?.category || 'unknown';
    } catch {
      // Ignore - category will remain 'unknown'
    }

    portalLogger.logError(error, {
      requestId,
      endpoint: '/api/portal/recommend',
      method: 'POST',
      duration,
    });

    console.error(
      JSON.stringify({
        event: 'RECOMMEND_ERROR',
        requestId,
        category,
        error: error.message,
        stack: error.stack,
        duration,
        timestamp: new Date().toISOString(),
      })
    );

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
 * Transform enriched content to recommendation format expected by quiz frontend
 */
function transformToRecommendation(
  enrichedContent: any,
  category: string,
  age: number,
  gender: string,
  location: string,
  quiz_id?: string,
  metadata?: any
): any {
  const recId = `rec_${Date.now()}_${randomUUID().substring(0, 8)}`;

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
      // ✅ KEEP STRUCTURED DATA - Don't convert to strings
      worksFor: enrichedContent.worksFor || [],
      doesntWorkFor: enrichedContent.doesntWorkFor || [],
      limitedEvidence: enrichedContent.limitedEvidence || [],
      // Side effects as structured objects
      sideEffects: enrichedContent.safety?.sideEffects || [],
      // Contraindications/warnings as array
      contraindications: enrichedContent.safety?.contraindications || [],
      // Interactions as structured objects
      interactions: enrichedContent.safety?.interactions || [],
      // LEGACY: Keep old format for backwards compatibility
      benefits: enrichedContent.worksFor?.map((w: any) => {
        if (typeof w === 'string') return w;
        return `${w.condition || w.use || w.benefit} (Evidencia: ${w.evidenceGrade || w.grade || 'C'}, ${w.magnitude || w.effect || 'Ver estudios'})`;
      }) || [],
      side_effects: enrichedContent.safety?.sideEffects?.map((s: any) => {
        if (typeof s === 'string') return s;
        return `${s.effect || s.name} (${s.frequency || 'Frecuencia variable'}, ${s.severity || 'Mild'})`;
      }) || [],
      warnings: enrichedContent.safety?.contraindications || [],
    },
    // Evidence summary (frontend expects this structure)
    evidence_summary: {
      totalStudies: enrichedContent.totalStudies || metadata?.studiesUsed || 0,
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
