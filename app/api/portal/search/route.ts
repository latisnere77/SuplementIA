/**
 * Intelligent Search API Route
 * 
 * Proxies requests to Lambda search-api with vector similarity search.
 * Provides fallback to legacy normalizer for backward compatibility.
 * 
 * Flow:
 * 1. Call Lambda search-api (vector search + semantic similarity)
 * 2. If found: Return supplement with similarity score
 * 3. If not found: Add to discovery queue, return 404
 * 4. If Lambda fails: Fallback to legacy normalizer
 * 
 * @see backend/lambda/search-api/lambda_function.py
 */

import { NextRequest, NextResponse } from 'next/server';
import { normalizeQuery } from '@/lib/portal/query-normalization/normalizer';

// Lambda search-api endpoint
const SEARCH_API_URL = process.env.SEARCH_API_URL || 
  process.env.NEXT_PUBLIC_SEARCH_API_URL ||
  'https://staging-search-api.execute-api.us-east-1.amazonaws.com/search';

// Timeout for Lambda calls
const LAMBDA_TIMEOUT_MS = 5000;

interface SearchResult {
  success: boolean;
  supplement?: {
    id: string;
    name: string;
    scientificName?: string;
    commonNames?: string[];
    metadata?: Record<string, unknown>;
    similarity?: number;
  };
  similarity?: number;
  source?: 'dynamodb' | 'redis' | 'postgres' | 'discovery' | 'fallback';
  cacheHit?: boolean;
  latency?: number;
  message?: string;
}

/**
 * Call Lambda search-api with timeout
 */
async function callSearchAPI(query: string): Promise<SearchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LAMBDA_TIMEOUT_MS);

  try {
    const url = `${SEARCH_API_URL}?q=${encodeURIComponent(query)}`;
    
    console.log(`[Intelligent Search] Calling Lambda: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SuplementIA-Frontend/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (response.ok && data.success) {
      console.log(`[Intelligent Search] Found: ${data.supplement?.name} (similarity: ${data.similarity})`);
      return {
        success: true,
        supplement: data.supplement,
        similarity: data.similarity,
        source: data.source,
        cacheHit: data.cacheHit,
        latency: data.latency,
      };
    }

    // Not found (404) - added to discovery queue
    if (response.status === 404) {
      console.log(`[Intelligent Search] Not found, added to discovery: ${query}`);
      return {
        success: false,
        message: data.message || 'Supplement not found. We\'ve added it to our discovery queue.',
        source: 'discovery',
      };
    }

    // Other error
    throw new Error(`Search API error: ${response.status} ${data.error || 'Unknown error'}`);

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error(`[Intelligent Search] Timeout after ${LAMBDA_TIMEOUT_MS}ms`);
        throw new Error('Search timeout');
      }
      console.error(`[Intelligent Search] Error: ${error.message}`);
      throw error;
    }
    
    throw new Error('Unknown search error');
  }
}

/**
 * Fallback to legacy normalizer
 */
function fallbackToNormalizer(query: string): SearchResult {
  console.warn(`[Intelligent Search] Falling back to legacy normalizer for: ${query}`);
  
  try {
    const normalized = normalizeQuery(query);
    
    if (normalized.confidence > 0) {
      return {
        success: true,
        supplement: {
          id: `legacy-${normalized.normalized.toLowerCase().replace(/\s+/g, '-')}`,
          name: normalized.normalized,
          commonNames: normalized.variations,
          metadata: {
            category: normalized.category,
            confidence: normalized.confidence,
            source: 'legacy-normalizer',
          },
        },
        similarity: normalized.confidence,
        source: 'fallback',
        cacheHit: false,
      };
    }

    return {
      success: false,
      message: 'Supplement not found in legacy system',
      source: 'fallback',
    };

  } catch (error) {
    console.error('[Intelligent Search] Fallback error:', error);
    return {
      success: false,
      message: 'Search system unavailable',
      source: 'fallback',
    };
  }
}

/**
 * GET /api/portal/search
 * 
 * Query parameters:
 *   q: Search query (required)
 *   fallback: Enable fallback to legacy normalizer (default: true)
 * 
 * Response:
 *   200: Supplement found
 *   404: Supplement not found (added to discovery)
 *   400: Invalid request
 *   503: Service unavailable
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim();
    const enableFallback = searchParams.get('fallback') !== 'false';

    // Validate query
    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query parameter "q" is required',
        },
        { status: 400 }
      );
    }

    if (query.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query too short (minimum 2 characters)',
        },
        { status: 400 }
      );
    }

    if (query.length > 200) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query too long (maximum 200 characters)',
        },
        { status: 400 }
      );
    }

    console.log(`[Intelligent Search] Query: "${query}" (fallback: ${enableFallback})`);

    // Try intelligent search first
    try {
      const result = await callSearchAPI(query);
      
      const totalLatency = Date.now() - startTime;

      if (result.success) {
        return NextResponse.json(
          {
            success: true,
            supplement: result.supplement,
            similarity: result.similarity,
            source: result.source,
            cacheHit: result.cacheHit,
            latency: totalLatency,
          },
          { status: 200 }
        );
      }

      // Not found - added to discovery
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          query,
          addedToDiscovery: true,
          source: result.source,
          latency: totalLatency,
        },
        { status: 404 }
      );

    } catch (lambdaError) {
      console.error('[Intelligent Search] Lambda error:', lambdaError);

      // Try fallback if enabled
      if (enableFallback) {
        const fallbackResult = fallbackToNormalizer(query);
        const totalLatency = Date.now() - startTime;

        if (fallbackResult.success) {
          return NextResponse.json(
            {
              success: true,
              supplement: fallbackResult.supplement,
              similarity: fallbackResult.similarity,
              source: 'fallback',
              cacheHit: false,
              latency: totalLatency,
              warning: 'Using legacy search system',
            },
            { status: 200 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            message: fallbackResult.message,
            query,
            source: 'fallback',
            latency: totalLatency,
          },
          { status: 404 }
        );
      }

      // No fallback - return service unavailable
      return NextResponse.json(
        {
          success: false,
          error: 'Search service temporarily unavailable',
          query,
          latency: Date.now() - startTime,
        },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('[Intelligent Search] Unexpected error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Export runtime config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
