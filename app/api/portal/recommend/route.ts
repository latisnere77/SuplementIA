/**
 * Portal Recommendation API Route
 * Generates supplement recommendations using the intelligent enrichment system
 *
 * This endpoint replaces the external AnkoSoft backend by using our own
 * intelligent content enrichment system (studies-fetcher + content-enricher).
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getMockRecommendation } from '@/lib/portal/mockData';
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

    // Call our intelligent enrichment system
    const ENRICH_API_URL = `${getBaseUrl()}/api/portal/enrich`;
    console.log(`🧠 Calling intelligent enrichment system for: ${sanitizedCategory}`);

    const enrichResponse = await fetch(ENRICH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({
        supplementName: sanitizedCategory,
        category: sanitizedCategory,
        maxStudies: 1, // Start with 1 study to stay under timeout
        rctOnly: false,
        yearFrom: 2010,
      }),
      signal: AbortSignal.timeout(110000), // 110s timeout (less than maxDuration)
    });

    if (!enrichResponse.ok) {
      const errorText = await enrichResponse.text();
      console.warn(`⚠️  Enrichment failed (${enrichResponse.status}), using fallback`);

      // Graceful fallback to mock data
      const mockRecommendation = getMockRecommendation(sanitizedCategory);

      return NextResponse.json(
        {
          success: true,
          requestId,
          recommendation: transformToRecommendation(
            mockRecommendation,
            sanitizedCategory,
            age || 35,
            gender || 'male',
            location || 'CDMX',
            quiz_id,
            { hasRealData: false, fallback: true }
          ),
        },
        { status: 200 }
      );
    }

    const enrichData = await enrichResponse.json();

    if (!enrichData.success) {
      console.warn(`⚠️  Enrichment unsuccessful, using fallback`);
      const mockRecommendation = getMockRecommendation(sanitizedCategory);

      return NextResponse.json(
        {
          success: true,
          requestId,
          recommendation: transformToRecommendation(
            mockRecommendation,
            sanitizedCategory,
            age || 35,
            gender || 'male',
            location || 'CDMX',
            quiz_id,
            { hasRealData: false, fallback: true }
          ),
        },
        { status: 200 }
      );
    }

    // Transform enriched data to recommendation format
    const enrichedContent = enrichData.data;
    const metadata = enrichData.metadata || {};

    const duration = Date.now() - startTime;

    console.log(
      JSON.stringify({
        event: 'INTELLIGENT_RECOMMENDATION_SUCCESS',
        requestId,
        category: sanitizedCategory,
        studiesUsed: metadata.studiesUsed || 0,
        hasRealData: metadata.hasRealData || false,
        duration,
      })
    );

    const recommendation = transformToRecommendation(
      enrichedContent,
      sanitizedCategory,
      age || 35,
      gender || 'male',
      location || 'CDMX',
      quiz_id,
      metadata
    );

    return NextResponse.json(
      {
        success: true,
        requestId,
        recommendation,
      },
      { status: 200 }
    );

  } catch (error: any) {
    const duration = Date.now() - startTime;

    portalLogger.logError(error, {
      requestId,
      endpoint: '/api/portal/recommend',
      method: 'POST',
      duration,
    });

    // Graceful fallback on any error
    console.warn(`⚠️  Error generating recommendation, using fallback: ${error.message}`);

    const mockRecommendation = getMockRecommendation('general');

    return NextResponse.json(
      {
        success: true,
        requestId,
        recommendation: transformToRecommendation(
          mockRecommendation,
          'general',
          35,
          'male',
          'CDMX',
          undefined,
          { hasRealData: false, fallback: true, error: error.message }
        ),
      },
      { status: 200 }
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
  const recommendationId = `rec_${Date.now()}_${randomUUID().substring(0, 8)}`;

  return {
    recommendation_id: recommendationId,
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
        grade: enrichedContent.evidenceGrade || 'C',
        studyCount: metadata?.studiesUsed || 0,
        rctCount: metadata?.rctCount || 0,
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
