/**
 * Portal Transform Evidence API Route
 *
 * Server-side endpoint que ejecuta la transformación de evidencia.
 * Mueve toda la lógica de transformación del cliente al servidor,
 * permitiendo acceso seguro a DynamoDB y Lambda.
 *
 * Flow:
 * 1. Recibe evidenceSummary + category del frontend
 * 2. Ejecuta transformEvidenceToNew() en servidor (tiene credenciales AWS)
 * 3. Retorna datos enriquecidos al frontend
 *
 * @see XRAY-ARCHITECTURE-ANALYSIS.md - Sección 3.2
 * @see BUENAS_PRACTICAS_LAMBDAS.md - Template de API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { transformEvidenceToNew } from '@/lib/portal/evidence-transformer';

// ====================================
// TYPES
// ====================================

interface TransformEvidenceRequest {
  category: string;
  evidenceSummary: any;
  forceRefresh?: boolean;
}

interface TransformEvidenceResponse {
  success: boolean;
  data?: any;
  error?: string;
  meta?: {
    requestId: string;
    duration: number;
    level?: 1 | 2 | 3; // Which cache level was used
    cached?: boolean;
  };
}

interface ProgressUpdate {
  step: number;
  totalSteps: number;
  message: string;
  percentage: number;
  phase: 'searching' | 'analyzing' | 'caching' | 'complete';
}

// ====================================
// CONFIGURATION
// ====================================

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60s for Bedrock analysis
export const dynamic = 'force-dynamic';

// ====================================
// HANDLER
// ====================================

/**
 * POST /api/portal/transform-evidence
 *
 * Transforms legacy evidence format to new rich evidence format
 * using 3-level caching system (Static → DynamoDB → Dynamic Generation)
 */
export async function POST(request: NextRequest): Promise<NextResponse<TransformEvidenceResponse>> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // 1. Parse and validate input
    const body: TransformEvidenceRequest = await request.json();

    if (!body.category || typeof body.category !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid category parameter',
          meta: { requestId, duration: Date.now() - startTime },
        },
        { status: 400 }
      );
    }

    // 2. Log structured request
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'TRANSFORM_REQUEST',
        requestId,
        category: body.category,
        hasEvidenceSummary: !!body.evidenceSummary,
        forceRefresh: body.forceRefresh || false,
        timestamp: new Date().toISOString(),
      })
    );

    // 3. Track progress updates
    let lastProgress: ProgressUpdate | null = null;
    const progressCallback = (progress: ProgressUpdate) => {
      lastProgress = progress;
      console.log(
        JSON.stringify({
          level: 'info',
          event: 'TRANSFORM_PROGRESS',
          requestId,
          category: body.category,
          progress,
          timestamp: new Date().toISOString(),
        })
      );
    };

    // 4. Execute transformation (server-side with AWS credentials)
    const transformedData = await transformEvidenceToNew(
      body.evidenceSummary,
      body.category,
      progressCallback
    );

    const duration = Date.now() - startTime;

    // 5. Determine which level was used
    let level: 1 | 2 | 3 = 3; // Default to dynamic generation
    let cached = false;

    // Detect level based on response time and data structure
    if (duration < 100) {
      level = 1; // Static cache (instant)
      cached = true;
    } else if (duration < 2000) {
      level = 2; // DynamoDB cache (< 2s)
      cached = true;
    } else {
      level = 3; // Dynamic generation (> 2s)
      cached = false;
    }

    // 6. Log success
    const grade = 'overallGrade' in transformedData ? transformedData.overallGrade : undefined;
    const worksForCount = 'worksFor' in transformedData ? transformedData.worksFor?.length || 0 : 0;

    console.log(
      JSON.stringify({
        level: 'info',
        event: 'TRANSFORM_SUCCESS',
        requestId,
        category: body.category,
        duration,
        cacheLevel: level,
        cached,
        grade,
        worksForCount,
        timestamp: new Date().toISOString(),
      })
    );

    // 7. Return success response
    return NextResponse.json(
      {
        success: true,
        data: transformedData,
        meta: {
          requestId,
          duration,
          level,
          cached,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );

  } catch (error: any) {
    // 8. Error handling
    const duration = Date.now() - startTime;

    console.error(
      JSON.stringify({
        level: 'error',
        event: 'TRANSFORM_ERROR',
        requestId,
        error: error.message,
        stack: error.stack,
        duration,
        timestamp: new Date().toISOString(),
      })
    );

    // Don't expose internal errors to client
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to transform evidence data',
        meta: { requestId, duration },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/portal/transform-evidence?category=xxx
 *
 * Optional: Support GET for simple queries (no evidenceSummary needed)
 */
export async function GET(request: NextRequest): Promise<NextResponse<TransformEvidenceResponse>> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing category parameter',
          meta: { requestId, duration: Date.now() - startTime },
        },
        { status: 400 }
      );
    }

    console.log(
      JSON.stringify({
        level: 'info',
        event: 'TRANSFORM_GET_REQUEST',
        requestId,
        category,
        timestamp: new Date().toISOString(),
      })
    );

    // Transform with no evidence summary (will use dynamic generation)
    const transformedData = await transformEvidenceToNew(
      {}, // Empty evidence summary
      category
    );

    const duration = Date.now() - startTime;

    console.log(
      JSON.stringify({
        level: 'info',
        event: 'TRANSFORM_GET_SUCCESS',
        requestId,
        category,
        duration,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: transformedData,
        meta: { requestId, duration },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );

  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.error(
      JSON.stringify({
        level: 'error',
        event: 'TRANSFORM_GET_ERROR',
        requestId,
        error: error.message,
        duration,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to transform evidence data',
        meta: { requestId, duration },
      },
      { status: 500 }
    );
  }
}
