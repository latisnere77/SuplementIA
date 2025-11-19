/**
 * Autocomplete API Endpoint
 * Proporciona sugerencias de búsqueda en tiempo real según el idioma
 *
 * GET /api/portal/autocomplete?q=<query>&lang=<language>&limit=<number>
 *
 * Ejemplo:
 *   /api/portal/autocomplete?q=sueño&lang=es&limit=5
 *   /api/portal/autocomplete?q=muscle&lang=en&limit=5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSuggestions, type Language, type AutocompleteSuggestion } from '@/lib/portal/autocomplete-suggestions-fuzzy';
import * as Sentry from '@sentry/nextjs';

// Configuración de runtime
export const runtime = 'nodejs';
export const maxDuration = 10; // 10 segundos máximo

// Tipos
interface AutocompleteResponse {
  success: boolean;
  suggestions?: AutocompleteSuggestion[];
  meta?: {
    query: string;
    lang: Language;
    count: number;
    requestId: string;
    duration: number;
  };
  error?: string;
}

// Constantes
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const VALID_LANGUAGES: Language[] = ['en', 'es'];

/**
 * GET /api/portal/autocomplete
 *
 * Query parameters:
 *   - q: string (requerido) - Texto de búsqueda del usuario (min 2, max 100 caracteres)
 *   - lang: 'en' | 'es' (opcional, default: 'en') - Idioma de las sugerencias
 *   - limit: number (opcional, default: 5, max: 10) - Número máximo de sugerencias
 *
 * @param request - Next.js request object
 * @returns JSON response con sugerencias o error
 */
export async function GET(request: NextRequest): Promise<NextResponse<AutocompleteResponse>> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // 1. Extraer parámetros de query
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim();
    const langParam = searchParams.get('lang')?.toLowerCase();
    const limitParam = searchParams.get('limit');

    // 2. Validar query (requerido)
    if (!query) {
      logRequest(requestId, 'error', 'Missing query parameter', { query });
      return NextResponse.json(
        {
          success: false,
          error: 'Query parameter "q" is required',
        },
        { status: 400 }
      );
    }

    // 3. Validar longitud de query
    if (query.length < MIN_QUERY_LENGTH) {
      logRequest(requestId, 'info', 'Query too short', { query, length: query.length });
      return NextResponse.json(
        {
          success: true,
          suggestions: [],
          meta: {
            query,
            lang: 'en',
            count: 0,
            requestId,
            duration: Date.now() - startTime,
          },
        },
        { status: 200 }
      );
    }

    if (query.length > MAX_QUERY_LENGTH) {
      logRequest(requestId, 'error', 'Query too long', { query, length: query.length });
      return NextResponse.json(
        {
          success: false,
          error: `Query must be less than ${MAX_QUERY_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    // 4. Validar idioma
    const lang: Language = (VALID_LANGUAGES.includes(langParam as Language)
      ? langParam
      : 'en') as Language;

    if (langParam && !VALID_LANGUAGES.includes(langParam as Language)) {
      logRequest(requestId, 'warn', 'Invalid language, using default', {
        providedLang: langParam,
        defaultLang: lang,
      });
    }

    // 5. Validar límite
    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= MAX_LIMIT) {
        limit = parsedLimit;
      } else {
        logRequest(requestId, 'warn', 'Invalid limit, using default', {
          providedLimit: limitParam,
          defaultLimit: DEFAULT_LIMIT,
        });
      }
    }

    // 6. Obtener sugerencias
    const suggestions = getSuggestions(query, lang, limit);

    // 7. Logging de éxito
    const duration = Date.now() - startTime;
    logRequest(requestId, 'info', 'Autocomplete request successful', {
      query,
      lang,
      limit,
      resultsCount: suggestions.length,
      duration,
    });

    // 8. Sentry breadcrumb (solo para tracking, no es error)
    Sentry.addBreadcrumb({
      category: 'autocomplete',
      message: `Query: "${query}" (${lang})`,
      level: 'info',
      data: {
        query,
        lang,
        resultsCount: suggestions.length,
        duration,
        requestId,
      },
    });

    // 9. Respuesta exitosa con cache
    return NextResponse.json(
      {
        success: true,
        suggestions,
        meta: {
          query,
          lang,
          count: suggestions.length,
          requestId,
          duration,
        },
      },
      {
        status: 200,
        headers: {
          // Cache de 5 minutos (300s) en CDN
          // stale-while-revalidate: permite servir contenido stale hasta 10 minutos
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );

  } catch (error) {
    // 10. Manejo de errores
    const duration = Date.now() - startTime;

    // Log del error
    console.error(`[${requestId}] Autocomplete error:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration,
    });

    // Enviar a Sentry
    Sentry.captureException(error, {
      tags: {
        requestId,
        endpoint: '/api/portal/autocomplete',
      },
      extra: {
        query: request.nextUrl.searchParams.get('q'),
        lang: request.nextUrl.searchParams.get('lang'),
        duration,
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        meta: {
          requestId,
          query: '',
          lang: 'en',
          count: 0,
          duration,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: Logging estructurado para CloudWatch
 *
 * @param requestId - ID único de la request
 * @param level - Nivel de log
 * @param message - Mensaje del log
 * @param data - Datos adicionales
 */
function logRequest(
  requestId: string,
  level: 'info' | 'warn' | 'error',
  message: string,
  data: Record<string, any> = {}
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    requestId,
    endpoint: '/api/portal/autocomplete',
    message,
    ...data,
  };

  const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  logFn(JSON.stringify(logEntry));
}
