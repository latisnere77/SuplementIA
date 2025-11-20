/**
 * Internal API Route for Content Enricher
 * Proxies requests to Lambda Function URL from server-side only
 * This prevents exposing the Lambda URL in client-side code
 */

import { NextRequest, NextResponse } from 'next/server';
import type { PubMedArticle } from '@/lib/services/medical-mcp-client';

// Interface para el request body
interface AnalyzeStudiesRequest {
  supplementId: string;
  category: string;
  forceRefresh?: boolean;
  studies: PubMedArticle[];
}

// Interface para la respuesta del Lambda
interface LambdaResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Obtener la URL del Lambda desde variables de entorno del servidor
    const LAMBDA_URL = process.env.CONTENT_ENRICHER_FUNCTION_URL;

    if (!LAMBDA_URL) {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'LAMBDA_URL_MISSING',
          requestId,
          timestamp: new Date().toISOString(),
        })
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Content enricher not configured',
          meta: { requestId }
        },
        { status: 500 }
      );
    }

    // Parsear el body del request
    const body: AnalyzeStudiesRequest = await request.json();

    // Validar que tengamos los campos requeridos
    if (!body.supplementId || !body.category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: supplementId, category',
          meta: { requestId }
        },
        { status: 400 }
      );
    }

    // Log structured request
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'LAMBDA_PROXY_REQUEST',
        requestId,
        supplementId: body.supplementId,
        category: body.category,
        forceRefresh: body.forceRefresh,
        studiesCount: body.studies?.length || 0,
        timestamp: new Date().toISOString(),
      })
    );

    // Llamar al Lambda desde el servidor
    const lambdaResponse = await fetch(LAMBDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify(body),
    });

    const duration = Date.now() - startTime;

    if (!lambdaResponse.ok) {
      const errorText = await lambdaResponse.text();
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'LAMBDA_ERROR',
          requestId,
          supplementId: body.supplementId,
          statusCode: lambdaResponse.status,
          error: errorText.substring(0, 500),
          duration,
          timestamp: new Date().toISOString(),
        })
      );
      return NextResponse.json(
        {
          success: false,
          error: `Lambda request failed: ${lambdaResponse.status}`,
          meta: { requestId, duration }
        },
        { status: lambdaResponse.status }
      );
    }

    // Parsear la respuesta del Lambda
    // Lambda Function URL returns { statusCode, headers, body: "stringified json" }
    // So we need to parse the outer response first, then parse the body
    const lambdaFunctionResponse = await lambdaResponse.json();

    // If the response has a body field (Function URL format), parse it
    const lambdaData: LambdaResponse = typeof lambdaFunctionResponse.body === 'string'
      ? JSON.parse(lambdaFunctionResponse.body)
      : lambdaFunctionResponse;

    console.log(
      JSON.stringify({
        level: 'info',
        event: 'LAMBDA_PROXY_SUCCESS',
        requestId,
        supplementId: body.supplementId,
        duration,
        bedrockDuration: lambdaData.data?.metadata?.bedrockDuration,
        cached: lambdaData.data?.metadata?.cached,
        grade: lambdaData.data?.overallGrade,
        worksForCount: lambdaData.data?.worksFor?.length || 0,
        timestamp: new Date().toISOString(),
      })
    );

    // Retornar la respuesta del Lambda con metadata
    return NextResponse.json(
      {
        ...lambdaData,
        meta: {
          ...lambdaData.data?.metadata,
          requestId,
          proxyDuration: duration,
        }
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(
      JSON.stringify({
        level: 'error',
        event: 'LAMBDA_PROXY_ERROR',
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        meta: { requestId, duration }
      },
      { status: 500 }
    );
  }
}

// Opcional: Agregar rate limiting básico
// Para producción, considera usar una librería como @upstash/ratelimit
export const runtime = 'nodejs'; // Use Node.js runtime for full fetch support
export const maxDuration = 60; // Allow up to 60 seconds for Bedrock analysis
