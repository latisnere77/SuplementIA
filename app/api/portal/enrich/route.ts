/**
 * Intelligent Content Enrichment API Route
 * ORCHESTRATES: studies-fetcher → content-enricher
 *
 * This route implements the intelligent system that:
 * 1. Fetches REAL PubMed studies using studies-fetcher Lambda
 * 2. Passes real studies to content-enricher Lambda
 * 3. Claude analyzes REAL data instead of guessing
 * 4. Returns high-quality, evidence-based supplement data
 *
 * NO MORE HARDCODING! This is fully dynamic and scales to any supplement.
 */

import { NextRequest, NextResponse } from 'next/server';
import { expandAbbreviation, detectAbbreviation, generateSearchVariations } from '@/lib/services/abbreviation-expander';
import { studiesCache, enrichmentCache } from '@/lib/cache/simple-cache';
import { TimeoutManager, TIMEOUTS } from '@/lib/resilience/timeout-manager';
import { globalRateLimiter } from '@/lib/resilience/rate-limiter';

// UUID generation helper (avoiding crypto import issues in Edge Runtime)
function generateUUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
}

// Configure max duration for this route (Bedrock needs time)
export const maxDuration = 100; // 100 seconds (reduced from 120 for safety)
export const dynamic = 'force-dynamic'; // Disable static optimization
export const runtime = 'nodejs'; // Use Node.js runtime instead of Edge to avoid TDZ issues

// Lambda endpoints - using getters to avoid TDZ issues with process.env in Edge Runtime
function getStudiesApiUrl(): string {
  return process.env.STUDIES_API_URL || 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';
}

function getEnricherApiUrl(): string {
  return process.env.ENRICHER_API_URL || 'https://l7mve4qnytdpxfcyu46cyly5le0vdqgx.lambda-url.us-east-1.on.aws/';
}

export interface EnrichRequest {
  supplementName: string;
  category?: string;
  forceRefresh?: boolean;
  jobId?: string;
  // Study filters
  maxStudies?: number;
  rctOnly?: boolean;
  yearFrom?: number;
  yearTo?: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateUUID();
  const correlationId = request.headers.get('X-Request-ID') || requestId;
  let supplementName = 'unknown';

  // Initialize timeout manager
  const timeoutManager = new TimeoutManager(TIMEOUTS.TOTAL_REQUEST);

  try {
    const body: EnrichRequest = await request.json();
    supplementName = body.supplementName || 'unknown';

    const jobId = request.headers.get('X-Job-ID') || body.jobId || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🔖 [Job ${jobId}] Enrich endpoint - Supplement: "${supplementName}"`);

    // 1. RATE LIMITING
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const rateLimit = globalRateLimiter.check(clientIp);

    if (!rateLimit.allowed) {
      console.warn(
        JSON.stringify({
          event: 'RATE_LIMIT_EXCEEDED',
          requestId,
          clientIp,
          resetAt: new Date(rateLimit.resetAt).toISOString(),
          timestamp: new Date().toISOString(),
        })
      );

      return NextResponse.json(
        {
          success: false,
          error: 'rate_limit_exceeded',
          message: 'Demasiadas solicitudes. Por favor, espera un momento.',
          resetAt: rateLimit.resetAt,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          },
        }
      );
    }

    // Validate request
    if (!body.supplementName) {
      return NextResponse.json(
        { success: false, error: 'supplementName is required' },
        { status: 400 }
      );
    }

    const { category, forceRefresh, rctOnly, yearFrom, yearTo } = body;

    // 2. CHECK CACHE (unless forceRefresh)
    if (!forceRefresh) {
      const cacheKey = `enrich:v4:${supplementName.toLowerCase()}:${category || 'general'}`;
      const cached = enrichmentCache.get(cacheKey);

      if (cached) {
        console.log(
          JSON.stringify({
            event: 'CACHE_HIT',
            requestId,
            correlationId,
            supplementName,
            cacheKey,
            timestamp: new Date().toISOString(),
          })
        );

        return NextResponse.json({
          ...cached,
          metadata: {
            ...cached.metadata,
            fromCache: true,
            cacheHit: true,
            requestId,
            correlationId,
          },
        });
      }
    }

    // OPTIMIZATION: Reduce studies for extremely popular supplements to avoid timeout
    // These supplements have 20K+ studies and cause Lambda to timeout on Vercel (10s limit)
    const popularSupplements = [
      'vitamin d',      // 112K+ studies
      'vitamin c',      // 95K+ studies
      'omega 3',        // 45K+ studies
      'magnesium',      // 38K+ studies
      'calcium',        // 52K+ studies
      'iron',           // 41K+ studies
      'chondroitin',    // 24K+ studies
      'glucosamine',    // 26K+ studies
      'condroitina',    // Spanish for chondroitin
      'glucosamina',    // Spanish for glucosamine
      'creatine',       // 30K+ studies
      'creatina',
      'zinc',
      'turmeric',
      'curcuma',
      'cúrcuma',
      'ashwagandha',
      'rhodiola',
      'melatonin',
      'melatonina',
    ];
    const isPopular = popularSupplements.some(s => supplementName.toLowerCase().includes(s));
    const optimizedMaxStudies = isPopular ? 10 : (body.maxStudies || 10);

    console.log(
      JSON.stringify({
        event: 'ORCHESTRATION_START',
        requestId,
        correlationId,
        jobId,
        supplementName,
        originalQuery: supplementName,
        category,
        maxStudies: optimizedMaxStudies,
        isPopularSupplement: isPopular,
        rctOnly: rctOnly || false,
        timestamp: new Date().toISOString(),
      })
    );

    // STEP 0: Intelligent abbreviation expansion & Spanish translation
    // - Expand abbreviations: "HMB" → "beta-hydroxy beta-methylbutyrate"
    // - Translate Spanish: "cúrcuma" → "turmeric"
    // This ensures better PubMed results (PubMed is in English)
    let searchTerm = supplementName;
    let expansionMetadata = null;
    const originalQuery = supplementName;

    console.log(
      JSON.stringify({
        event: 'QUERY_TRANSLATION_START',
        requestId,
        correlationId,
        originalQuery: supplementName,
        budgetRemaining: timeoutManager.getRemainingBudget(),
        timestamp: new Date().toISOString(),
      })
    );

    // MINIMAL fallback map for ONLY the most common abbreviations
    // This is a performance optimization to avoid LLM calls for high-traffic abbreviations
    // The LLM (Claude Haiku in abbreviation-expander.ts) handles EVERYTHING ELSE intelligently,
    // including ALL Spanish translations (niacina, magnesio, etc)
    const COMMON_ABBREVIATIONS: Record<string, string> = {
      // Top abbreviations (performance-critical - these are ACRONYMS not translations)
      'cbd': 'cannabidiol',
      'thc': 'tetrahydrocannabinol',
      'dhea': 'dehydroepiandrosterone',
      'hmb': 'beta-hydroxy beta-methylbutyrate',
      'bcaa': 'branched-chain amino acids',
      'nac': 'N-acetylcysteine',
      'coq10': 'coenzyme q10',
      '5-htp': '5-hydroxytryptophan',

      // Common supplements that don't need translation (performance optimization)
      'rhodiola': 'rhodiola',
      'rhodiola rosea': 'rhodiola rosea',
      'ashwagandha': 'ashwagandha',
      'ginseng': 'ginseng',
      'panax ginseng': 'ginseng', // Normalizar a término más común
      'berberine': 'berberine',
      'berberina': 'berberine',

      // Common Spanish→English translations (high-traffic terms)
      // Restored for performance stability on critical paths
      'menta': 'peppermint',
      'jengibre': 'ginger',
      'curcuma': 'turmeric',
      'cúrcuma': 'turmeric',
      'magnesio': 'magnesium',
      'calcio': 'calcium',
      'hierro': 'iron',
      'colageno': 'collagen',
      'colágeno': 'collagen',
      'melatonina': 'melatonin',
      'valeriana': 'valerian',
      'manzanilla': 'chamomile',
      'lavanda': 'lavender',
      'condroitina': 'chondroitin',
      'glucosamina': 'glucosamine',
      'astragalo': 'astragalus',
      'astrágalo': 'astragalus',
      'biotina': 'biotin',
      'niacina': 'niacin',
      'lisina': 'lysine',
      'probioticos': 'probiotics',
      'probióticos': 'probiotics',
      'vitamina c': 'vitamin c',
      'vitamina d': 'vitamin d',
      'omega 3': 'omega 3',
      'aceite de pescado': 'fish oil',
      'hongos': 'mushrooms',
      'melena de leon': 'lions mane',
      'melena de león': 'lions mane',
      'reishi': 'reishi',
      'citrato de magnesio': 'magnesium citrate',
      'glicinato de magnesio': 'magnesium glycinate',
    };

    // First check common abbreviations map
    const lowerTerm = supplementName.toLowerCase();
    if (COMMON_ABBREVIATIONS[lowerTerm]) {
      searchTerm = COMMON_ABBREVIATIONS[lowerTerm];
      expansionMetadata = {
        original: supplementName,
        expanded: searchTerm,
        alternatives: [searchTerm],
        confidence: 1.0,
        isAbbreviation: true,
        source: 'fallback_map',
      };
      console.log(
        JSON.stringify({
          event: 'QUERY_TRANSLATED',
          requestId,
          correlationId,
          originalQuery: supplementName,
          translatedQuery: searchTerm,
          translationMethod: 'fallback_map',
          confidence: 1.0,
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      // Try LLM expansion with timeout
      console.log(
        JSON.stringify({
          event: 'QUERY_LLM_EXPANSION_START',
          requestId,
          correlationId,
          originalQuery: supplementName,
          timestamp: new Date().toISOString(),
        })
      );

      try {
        // Use timeout manager for translation
        const expansion = await timeoutManager.executeWithBudget(
          () => expandAbbreviation(supplementName),
          TIMEOUTS.TRANSLATION,
          'translation'
        );

        console.log(
          JSON.stringify({
            event: 'QUERY_LLM_EXPANSION_RESULT',
            requestId,
            correlationId,
            originalQuery: supplementName,
            source: expansion.source,
            alternativesCount: expansion.alternatives.length,
            alternatives: expansion.alternatives,
            confidence: expansion.confidence,
            isAbbreviation: expansion.isAbbreviation,
            timestamp: new Date().toISOString(),
          })
        );

        // Use expanded term if LLM provided alternatives
        if (expansion.alternatives.length > 0 && expansion.source === 'llm') {
          // Check if LLM actually provided a different term (not just echoing back)
          const expandedTerm = expansion.alternatives[0];
          const isDifferent = expandedTerm.toLowerCase() !== supplementName.toLowerCase();

          if (isDifferent) {
            // LLM provided a translation/expansion
            searchTerm = expandedTerm;
            expansionMetadata = {
              original: supplementName,
              expanded: searchTerm,
              alternatives: expansion.alternatives,
              confidence: expansion.confidence,
              isAbbreviation: expansion.isAbbreviation,
              source: 'llm',
            };
            console.log(
              JSON.stringify({
                event: 'QUERY_TRANSLATED',
                requestId,
                correlationId,
                originalQuery: supplementName,
                translatedQuery: searchTerm,
                translationMethod: 'llm',
                confidence: expansion.confidence,
                alternatives: expansion.alternatives,
                timestamp: new Date().toISOString(),
              })
            );
          } else {
            // LLM returned same term - no translation needed
            console.log(
              JSON.stringify({
                event: 'QUERY_NO_TRANSLATION_NEEDED',
                requestId,
                correlationId,
                originalQuery: supplementName,
                translatedQuery: supplementName,
                translationMethod: 'llm_same_term',
                reason: 'llm_returned_same_term',
                timestamp: new Date().toISOString(),
              })
            );
          }
        } else {
          console.warn(
            JSON.stringify({
              event: 'QUERY_NO_TRANSLATION',
              requestId,
              correlationId,
              originalQuery: supplementName,
              translatedQuery: supplementName,
              translationMethod: 'none',
              reason: expansion.source === 'llm' ? 'llm_returned_empty' : 'no_expansion_needed',
              llmSource: expansion.source,
              alternativesCount: expansion.alternatives.length,
              // IMPORTANT: If LLM returns empty for Spanish terms, this is a bug
              potentialBug: /^[a-záéíóúñ]+$/i.test(supplementName) ? 'spanish_term_not_translated' : false,
              timestamp: new Date().toISOString(),
            })
          );
        }
      } catch (error: any) {
        console.error(
          JSON.stringify({
            event: 'QUERY_TRANSLATION_FAILED',
            requestId,
            correlationId,
            jobId,
            originalQuery: supplementName,
            translatedQuery: supplementName,
            error: error.message,
            errorStack: error.stack,
            errorName: error.name,
            errorCode: error.code,
            fallback: 'using_original',
            awsRegion: process.env.AWS_REGION,
            hasAwsCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
            timestamp: new Date().toISOString(),
          })
        );

        // Log warning if this is a Spanish term that failed to translate
        if (/[áéíóúñ]/.test(supplementName) || supplementName.endsWith('ina') || supplementName.endsWith('ino')) {
          console.warn(
            JSON.stringify({
              event: 'SPANISH_TERM_TRANSLATION_FAILED',
              requestId,
              correlationId,
              jobId,
              term: supplementName,
              error: error.message,
              suggestion: 'Check AWS credentials and Bedrock access',
              timestamp: new Date().toISOString(),
            })
          );
        }
      }
    }

    // STEP 1: Fetch REAL PubMed studies
    console.log(
      JSON.stringify({
        event: 'STUDIES_FETCH_START',
        requestId,
        correlationId,
        originalQuery: supplementName,
        translatedQuery: searchTerm,
        searchTerm,
        maxStudies: optimizedMaxStudies,
        budgetRemaining: timeoutManager.getRemainingBudget(),
        timestamp: new Date().toISOString(),
      })
    );

    // Check studies cache
    const studiesCacheKey = `studies:${searchTerm.toLowerCase()}:${JSON.stringify({ rctOnly, yearFrom, yearTo })}`;
    let studies: any[] = [];
    let studiesFromCache = false;

    if (!forceRefresh) {
      const cachedStudies = studiesCache.get(studiesCacheKey);
      if (cachedStudies) {
        studies = cachedStudies;
        studiesFromCache = true;
        console.log(
          JSON.stringify({
            event: 'STUDIES_CACHE_HIT',
            requestId,
            correlationId,
            searchTerm,
            studiesCount: studies.length,
            timestamp: new Date().toISOString(),
          })
        );
      }
    }

    // Helper to fetch studies with specific filters
    const fetchStudies = async (term: string, filters: any, attempt: number) => {
      const fetchStartTime = Date.now();
      console.log(
        JSON.stringify({
          event: 'STUDIES_FETCH_ATTEMPT',
          requestId,
          correlationId,
          attempt,
          searchTerm: term,
          filters,
          lambdaUrl: getStudiesApiUrl(),
          timestamp: new Date().toISOString(),
        })
      );

      try {
        // Use timeout manager for studies fetch
        const studiesApiUrl = getStudiesApiUrl();
        const response = await timeoutManager.executeWithBudget(
          () => fetch(studiesApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': correlationId,
              'X-Job-ID': jobId,
            },
            body: JSON.stringify({
              supplementName: term,
              maxResults: Math.min(optimizedMaxStudies, 10),
              filters,
              jobId,
            }),
          }),
          TIMEOUTS.STUDIES_FETCH,
          'studies-fetch'
        );

        const fetchDuration = Date.now() - fetchStartTime;
        const responseData = await response.json().catch(() => ({ success: false }));

        console.log(
          JSON.stringify({
            event: 'STUDIES_FETCH_RESPONSE',
            requestId,
            correlationId,
            attempt,
            searchTerm: term,
            statusCode: response.status,
            success: responseData.success,
            studiesFound: responseData.success ? (responseData.data?.studies || []).length : 0,
            duration: fetchDuration,
            timestamp: new Date().toISOString(),
          })
        );

        return { response, data: responseData };
      } catch (error: any) {
        const fetchDuration = Date.now() - fetchStartTime;
        console.error(
          JSON.stringify({
            event: 'STUDIES_FETCH_ERROR',
            requestId,
            correlationId,
            attempt,
            searchTerm: term,
            error: error.message,
            duration: fetchDuration,
            timestamp: new Date().toISOString(),
          })
        );
        throw error;
      }
    };

    // Only fetch if not from cache
    let studiesResponse;
    let studiesData;

    if (!studiesFromCache) {
      // Attempt 1: Strict filters (High quality evidence)
      const strictFilters = {
        rctOnly: rctOnly || false,
        yearFrom: yearFrom || 2010,
        yearTo: yearTo,
        humanStudiesOnly: true,
        studyTypes: [
          'randomized controlled trial',
          'meta-analysis',
          'systematic review',
        ],
      };

      try {
        const result = await fetchStudies(searchTerm, strictFilters, 1);
        studiesResponse = result.response;
        studiesData = result.data;
        studies = studiesData.success ? studiesData.data?.studies || [] : [];
      } catch (error: any) {
        console.error(
          JSON.stringify({
            event: 'STUDIES_FETCH_ATTEMPT_FAILED',
            requestId,
            correlationId,
            attempt: 1,
            error: error.message,
            timestamp: new Date().toISOString(),
          })
        );
      }
    }

    // Attempt 2: Relaxed filters (If no strict studies found and not from cache)
    if (studies.length === 0 && !studiesFromCache) {
      const relaxedFilters = {
        rctOnly: false,
        yearFrom: 2000, // Look back further
        yearTo: yearTo,
        humanStudiesOnly: true, // Still require human studies
        // Remove studyTypes restriction to include all types (clinical trials, reviews, etc.)
      };

      console.log(
        JSON.stringify({
          event: 'STUDIES_FETCH_RETRY',
          requestId,
          correlationId,
          attempt: 2,
          reason: 'no_studies_with_strict_filters',
          previousAttempt: 1,
          filters: relaxedFilters,
          timestamp: new Date().toISOString(),
        })
      );

      try {
        const result = await fetchStudies(searchTerm, relaxedFilters, 2);
        studiesResponse = result.response;
        studiesData = result.data;
        studies = studiesData.success ? studiesData.data?.studies || [] : [];
      } catch (error: any) {
        console.error(
          JSON.stringify({
            event: 'STUDIES_FETCH_ATTEMPT_FAILED',
            requestId,
            correlationId,
            attempt: 2,
            error: error.message,
            timestamp: new Date().toISOString(),
          })
        );
      }
    }

    // Attempt 3: Ultra-relaxed filters (If still no studies and not from cache)
    // Sometimes "humanStudiesOnly" filter in PubMed is imperfect or studies are very new
    if (studies.length === 0 && !studiesFromCache) {
      const ultraRelaxedFilters = {
        rctOnly: false,
        yearFrom: 1990,
        yearTo: yearTo,
        humanStudiesOnly: false, // Allow in-vitro/animal if that's all we have (better than nothing)
      };

      console.log(
        JSON.stringify({
          event: 'STUDIES_FETCH_RETRY',
          requestId,
          correlationId,
          attempt: 3,
          reason: 'no_studies_with_relaxed_filters',
          previousAttempt: 2,
          filters: ultraRelaxedFilters,
          timestamp: new Date().toISOString(),
        })
      );

      try {
        const result = await fetchStudies(searchTerm, ultraRelaxedFilters, 3);
        studiesResponse = result.response;
        studiesData = result.data;
        studies = studiesData.success ? studiesData.data?.studies || [] : [];
      } catch (error: any) {
        console.error(
          JSON.stringify({
            event: 'STUDIES_FETCH_ATTEMPT_FAILED',
            requestId,
            correlationId,
            attempt: 3,
            error: error.message,
            timestamp: new Date().toISOString(),
          })
        );
      }
    }

    // STEP 1.5: If no studies found, generate and try search variations (not from cache)
    if (studies.length === 0 && !studiesFromCache) {
      console.log(
        JSON.stringify({
          event: 'STUDIES_FETCH_VARIATIONS_START',
          requestId,
          correlationId,
          originalQuery: supplementName,
          translatedQuery: searchTerm,
          searchTerm,
          reason: 'no_studies_found_with_base_term',
          timestamp: new Date().toISOString(),
        })
      );

      try {
        // Generate intelligent search variations using LLM (with timeout)
        const variationStartTime = Date.now();
        const VARIATION_TIMEOUT = 10000; // 10 seconds max for variation generation

        let variations: string[] = [];
        try {
          variations = await Promise.race([
            generateSearchVariations(searchTerm),
            new Promise<string[]>((_, reject) =>
              setTimeout(() => reject(new Error('Variation generation timeout')), VARIATION_TIMEOUT)
            ),
          ]) as string[];
        } catch (error: any) {
          console.warn(
            JSON.stringify({
              event: 'STUDIES_FETCH_VARIATIONS_GENERATION_TIMEOUT',
              requestId,
              correlationId,
              originalQuery: supplementName,
              translatedQuery: searchTerm,
              error: error.message,
              fallback: 'using_basic_variations',
              timestamp: new Date().toISOString(),
            })
          );
          // Fallback to basic variations if LLM times out
          variations = [
            searchTerm,
            `${searchTerm} supplementation`,
            `${searchTerm} supplement`,
            `${searchTerm} milk`,
            `${searchTerm} extract`,
          ].slice(0, 3); // Limit to 3 basic variations
        }

        const variationDuration = Date.now() - variationStartTime;
        console.log(
          JSON.stringify({
            event: 'STUDIES_FETCH_VARIATIONS_GENERATED',
            requestId,
            correlationId,
            originalQuery: supplementName,
            translatedQuery: searchTerm,
            variationsCount: variations.length,
            variations: variations.slice(0, 5), // Log first 5 only
            duration: variationDuration,
            timestamp: new Date().toISOString(),
          })
        );

        // Limit to first 3 variations to avoid timeout (try most likely ones first)
        const variationsToTry = variations.slice(0, 3);

        // Try variations in parallel (faster than sequential)
        const relaxedFilters = {
          rctOnly: false,
          yearFrom: 2000,
          yearTo: yearTo,
          humanStudiesOnly: true,
        };

        const variationPromises = variationsToTry.map(async (variation, i) => {
          try {
            console.log(
              JSON.stringify({
                event: 'STUDIES_FETCH_VARIATION_ATTEMPT',
                requestId,
                correlationId,
                originalQuery: supplementName,
                translatedQuery: searchTerm,
                variationIndex: i + 1,
                variation,
                totalVariations: variationsToTry.length,
                timestamp: new Date().toISOString(),
              })
            );

            const result = await fetchStudies(variation, relaxedFilters, 100 + i);
            const variationStudies = result.data.success ? result.data.data?.studies || [] : [];

            return {
              variation,
              studies: variationStudies,
              success: variationStudies.length > 0,
            };
          } catch (error: any) {
            console.warn(
              JSON.stringify({
                event: 'STUDIES_FETCH_VARIATION_FAILED',
                requestId,
                correlationId,
                variation,
                variationIndex: i + 1,
                error: error.message,
                timestamp: new Date().toISOString(),
              })
            );
            return {
              variation,
              studies: [],
              success: false,
            };
          }
        });

        // Wait for all variations (with timeout)
        const VARIATION_SEARCH_TIMEOUT = 30000; // 30 seconds max for all variation searches
        const variationResults = await Promise.race([
          Promise.all(variationPromises),
          new Promise<Array<{ variation: string; studies: any[]; success: boolean }>>((resolve) =>
            setTimeout(() => resolve([]), VARIATION_SEARCH_TIMEOUT)
          ),
        ]);

        // Find first successful variation
        const successfulResult = variationResults.find(r => r.success);
        if (successfulResult) {
          studies = successfulResult.studies;
          searchTerm = successfulResult.variation;

          console.log(
            JSON.stringify({
              event: 'STUDIES_FETCH_VARIATION_SUCCESS',
              requestId,
              correlationId,
              originalQuery: supplementName,
              translatedQuery: searchTerm,
              successfulVariation: successfulResult.variation,
              studiesFound: studies.length,
              timestamp: new Date().toISOString(),
            })
          );
        } else {
          console.log(
            JSON.stringify({
              event: 'STUDIES_FETCH_VARIATIONS_NO_SUCCESS',
              requestId,
              correlationId,
              originalQuery: supplementName,
              translatedQuery: searchTerm,
              variationsTried: variationsToTry.length,
              timestamp: new Date().toISOString(),
            })
          );
        }
      } catch (error: any) {
        console.error(
          JSON.stringify({
            event: 'STUDIES_FETCH_VARIATIONS_ERROR',
            requestId,
            correlationId,
            originalQuery: supplementName,
            translatedQuery: searchTerm,
            error: error.message,
            errorStack: error.stack,
            timestamp: new Date().toISOString(),
          })
        );
        // Continue to final error handling if variations also fail
      }
    }

    if (studies.length === 0) {
      const totalDuration = Date.now() - startTime;
      console.error(
        JSON.stringify({
          event: 'STUDIES_FETCH_FAILED',
          requestId,
          correlationId,
          originalQuery: supplementName,
          translatedQuery: searchTerm,
          searchTerm,
          attempts: 3,
          totalDuration,
          reason: 'no_studies_found_after_all_attempts_and_variations',
          timestamp: new Date().toISOString(),
        })
      );

      // STRICT VALIDATION: DO NOT generate data without studies
      return NextResponse.json(
        {
          success: false,
          error: 'insufficient_data',
          message: `No encontramos estudios científicos para "${supplementName}".`,
          suggestion: 'Verifica la ortografía o intenta con un término más específico.',
          metadata: {
            hasRealData: false,
            studiesUsed: 0,
            requestId,
            correlationId,
            originalQuery: supplementName,
            translatedQuery: searchTerm,
            attempts: 3,
            triedVariations: true,
          },
        },
        { status: 404 }
      );
    }

    // Cache studies for future requests
    if (!studiesFromCache && studies.length > 0) {
      studiesCache.set(studiesCacheKey, studies);
      console.log(
        JSON.stringify({
          event: 'STUDIES_CACHED',
          requestId,
          correlationId,
          searchTerm,
          studiesCount: studies.length,
          timestamp: new Date().toISOString(),
        })
      );
    }

    // Determine if we used a variation
    const baseTerm = expansionMetadata?.expanded || supplementName;
    const usedVariationForLogging = searchTerm !== supplementName && searchTerm !== baseTerm;

    // Extract ranking data from studiesData if available
    // studiesData comes from the studies-fetcher lambda response
    const rankedData = studiesData?.data?.ranked || null;

    // STEP 2: Pass real studies to content-enricher
    const enrichStartTime = Date.now();

    console.log(
      JSON.stringify({
        event: 'ENRICHMENT_START',
        requestId,
        correlationId,
        budgetRemaining: timeoutManager.getRemainingBudget(),
        timestamp: new Date().toISOString(),
      })
    );

    const enricherApiUrl = getEnricherApiUrl();
    const enrichResponse = await timeoutManager.executeWithBudget(
      () => fetch(enricherApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': correlationId,
          'X-Job-ID': jobId,
        },
        body: JSON.stringify({
          supplementId: supplementName,
          category: category || 'general',
          forceRefresh: true, // TEMPORARY: Force refresh to bypass corrupted cache (revert after cache cleared)
          studies, // CRITICAL: Pass real PubMed studies to Claude
          ranking: rankedData, // NEW: Pass ranking to save in cache
          jobId,
        }),
      }),
      TIMEOUTS.ENRICHMENT,
      'enrichment'
    );

    const enrichDuration = Date.now() - enrichStartTime;

    if (!enrichResponse.ok) {
      const error = await enrichResponse.text();
      console.error(
        JSON.stringify({
          event: 'CONTENT_ENRICH_ERROR',
          requestId,
          correlationId,
          originalQuery: supplementName,
          translatedQuery: searchTerm,
          supplementId: supplementName,
          statusCode: enrichResponse.status,
          error,
          duration: enrichDuration,
          timestamp: new Date().toISOString(),
        })
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to enrich content',
          details: error,
          requestId,
          correlationId,
        },
        { status: enrichResponse.status }
      );
    }

    const enrichData = await enrichResponse.json();

    const duration = Date.now() - startTime;

    // Determine if we used a variation (reuse baseTerm from earlier)
    const finalBaseTerm = expansionMetadata?.expanded || supplementName;
    const usedVariation = searchTerm !== supplementName && searchTerm !== finalBaseTerm;

    // Build response
    const response = {
      ...enrichData,
      data: {
        ...enrichData.data,
        // Add studies object with ranking (NEW)
        studies: {
          ranked: rankedData,
          all: studies,
          total: studies.length,
        },
      },
      metadata: {
        ...enrichData.metadata,
        orchestrationDuration: duration,
        studiesUsed: studies.length,
        hasRealData: true,
        intelligentSystem: true,
        studiesSource: 'PubMed',
        requestId,
        correlationId,
        originalQuery: supplementName,
        translatedQuery: finalBaseTerm,
        finalSearchTerm: searchTerm,
        usedVariation,
        studiesFromCache,
        ...(expansionMetadata ? { expansion: expansionMetadata } : {}),
        // Ranking metadata for quick access
        hasRanking: !!rankedData,
        rankingMetadata: rankedData?.metadata || null,
      },
    };

    // Cache enrichment result
    const cacheKey = `enrich:${supplementName.toLowerCase()}:${category || 'general'}`;
    enrichmentCache.set(cacheKey, response);

    console.log(
      JSON.stringify({
        event: 'ENRICHMENT_CACHED',
        requestId,
        correlationId,
        cacheKey,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(
      JSON.stringify({
        event: 'ORCHESTRATION_ERROR',
        requestId,
        correlationId,
        originalQuery: supplementName,
        error: error.message,
        stack: error.stack,
        duration,
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        intelligentSystem: false,
        requestId,
        correlationId,
      },
      { status: 500 }
    );
  }
}

/**
 * Fallback: Enrich without studies (when studies fetch fails)
 */
// ❌ REMOVED: enrichWithoutStudies function
// This function was generating fake data without real studies
// We now STRICTLY require real PubMed studies for all recommendations

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const supplementName = searchParams.get('supplementName');

  if (!supplementName) {
    return NextResponse.json(
      { success: false, error: 'supplementName is required' },
      { status: 400 }
    );
  }

  const category = searchParams.get('category') || 'general';
  const forceRefresh = searchParams.get('forceRefresh') === 'true';
  const maxStudies = parseInt(searchParams.get('maxStudies') || '20');
  const rctOnly = searchParams.get('rctOnly') === 'true';
  const yearFrom = searchParams.get('yearFrom') ? parseInt(searchParams.get('yearFrom')!) : 2010;

  // Forward to POST handler
  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        supplementName,
        category,
        forceRefresh,
        maxStudies,
        rctOnly,
        yearFrom,
      }),
    })
  );
}
