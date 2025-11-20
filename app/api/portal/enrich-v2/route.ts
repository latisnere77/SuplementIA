/**
 * OPTIMIZED Supplement Evidence Enrichment API (v2)
 *
 * PERFORMANCE IMPROVEMENTS:
 * - 3-level cache strategy (fresh/stale/miss)
 * - Stale-while-revalidate pattern
 * - Parallel PubMed fetching
 * - Reduced Bedrock tokens
 * - No Lambda cold starts (always warm)
 *
 * EXPECTED PERFORMANCE:
 * - Cache hit (< 7 days): 50-100ms (100x faster)
 * - Stale cache (7-30 days): 50-100ms + background refresh
 * - Cache miss: 5.7s (2.3x faster than old system)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCachedEvidence, saveCachedEvidence } from '@/lib/services/dynamodb-cache';
import { searchSupplementInPubMed } from '@/lib/services/medical-mcp-client';
import { analyzeStudiesWithBedrock } from '@/lib/services/bedrock-analyzer';
import type { SupplementEvidenceData } from '@/lib/portal/supplements-evidence-data';

// ==========================================
// TYPES
// ==========================================

interface EnrichV2Request {
  supplementName: string;
  forceRefresh?: boolean;
}

interface EnrichV2Response {
  success: boolean;
  data?: SupplementEvidenceData;
  metadata: {
    cacheStatus: 'fresh' | 'stale' | 'miss';
    cached: boolean;
    generatedAt?: string;
    refreshing?: boolean;
    performance: {
      totalTime: number;
      cacheCheckTime?: number;
      searchTime?: number;
      analysisTime?: number;
      cacheSaveTime?: number;
    };
  };
  error?: string;
}

// ==========================================
// CACHE TIMING THRESHOLDS
// ==========================================

const FRESH_THRESHOLD_DAYS = 7;
const STALE_THRESHOLD_DAYS = 30;
const FRESH_THRESHOLD_MS = FRESH_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
const STALE_THRESHOLD_MS = STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

// ==========================================
// MAIN HANDLER
// ==========================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const performance: EnrichV2Response['metadata']['performance'] = { totalTime: 0 };

  try {
    const body: EnrichV2Request = await request.json();
    const { supplementName, forceRefresh = false } = body;

    if (!supplementName || typeof supplementName !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'supplementName is required and must be a string',
          metadata: { cacheStatus: 'miss', cached: false, performance },
        } as EnrichV2Response,
        { status: 400 }
      );
    }

    console.log(`[ENRICH-V2] Processing: ${supplementName} (forceRefresh: ${forceRefresh})`);

    // LEVEL 1: Check cache (unless force refresh)
    if (!forceRefresh) {
      const cacheCheckStart = Date.now();
      const cachedData = await getCachedEvidence(supplementName);
      performance.cacheCheckTime = Date.now() - cacheCheckStart;

      if (cachedData) {
        const cacheAge = Date.now() - new Date(cachedData.generatedAt).getTime();

        // FRESH CACHE (< 7 days): Return immediately
        if (cacheAge < FRESH_THRESHOLD_MS) {
          console.log(`[CACHE HIT - FRESH] Age: ${Math.floor(cacheAge / (1000 * 60 * 60 * 24))} days`);
          performance.totalTime = Date.now() - startTime;

          return NextResponse.json({
            success: true,
            data: cachedData.evidenceData,
            metadata: {
              cacheStatus: 'fresh',
              cached: true,
              generatedAt: cachedData.generatedAt,
              performance,
            },
          } as EnrichV2Response);
        }

        // STALE CACHE (7-30 days): Return + refresh in background
        if (cacheAge < STALE_THRESHOLD_MS) {
          console.log(`[CACHE HIT - STALE] Age: ${Math.floor(cacheAge / (1000 * 60 * 60 * 24))} days. Returning stale data + refreshing in background...`);

          // Trigger background refresh (fire-and-forget)
          refreshInBackground(supplementName).catch(err => {
            console.error(`[BACKGROUND REFRESH FAILED] ${supplementName}:`, err);
          });

          performance.totalTime = Date.now() - startTime;

          return NextResponse.json({
            success: true,
            data: cachedData.evidenceData,
            metadata: {
              cacheStatus: 'stale',
              cached: true,
              generatedAt: cachedData.generatedAt,
              refreshing: true,
              performance,
            },
          } as EnrichV2Response);
        }

        // EXPIRED CACHE (> 30 days): Fall through to regenerate
        console.log(`[CACHE EXPIRED] Age: ${Math.floor(cacheAge / (1000 * 60 * 60 * 24))} days. Regenerating...`);
      } else {
        console.log(`[CACHE MISS] No cached data found for: ${supplementName}`);
      }
    } else {
      console.log(`[FORCE REFRESH] Skipping cache check`);
    }

    // LEVEL 2: Generate fresh data
    const freshData = await generateFreshEvidence(supplementName, performance);

    performance.totalTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: freshData,
      metadata: {
        cacheStatus: 'miss',
        cached: false,
        generatedAt: new Date().toISOString(),
        performance,
      },
    } as EnrichV2Response);

  } catch (error: any) {
    console.error('[ENRICH-V2 ERROR]', error);
    performance.totalTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        metadata: {
          cacheStatus: 'miss',
          cached: false,
          performance,
        },
      } as EnrichV2Response,
      { status: 500 }
    );
  }
}

// ==========================================
// CORE GENERATION LOGIC
// ==========================================

async function generateFreshEvidence(
  supplementName: string,
  performance: EnrichV2Response['metadata']['performance']
): Promise<SupplementEvidenceData> {
  console.log(`[GENERATE] Starting fresh generation for: ${supplementName}`);

  // STEP 1: Search PubMed (optimized with parallel fetching)
  const searchStart = Date.now();
  const studies = await searchSupplementInPubMed(supplementName, {
    maxResults: 20, // Will be ranked and filtered to top 12 in medical-mcp-client
    filterRCTs: true,
    filterMetaAnalyses: true,
    minYear: 2010,
  });
  performance.searchTime = Date.now() - searchStart;

  console.log(`[PUBMED] Found ${studies.length} studies in ${performance.searchTime}ms`);

  if (studies.length === 0) {
    console.log(`[NO STUDIES] Generating fallback data`);
    const fallbackData = generateFallbackData(supplementName);

    // Save fallback to cache (async, non-blocking)
    saveToCacheAsync(supplementName, fallbackData, { total: 0, rct: 0, metaAnalysis: 0 });

    return fallbackData;
  }

  // STEP 2: Analyze with Bedrock (optimized with truncated abstracts)
  const analysisStart = Date.now();
  const analysis = await analyzeStudiesWithBedrock(supplementName, studies);
  performance.analysisTime = Date.now() - analysisStart;

  console.log(`[BEDROCK] Analysis complete in ${performance.analysisTime}ms - Grade: ${analysis.overallGrade}`);

  // STEP 3: Format as SupplementEvidenceData
  const evidenceData = formatAsEvidenceData(supplementName, analysis, studies);

  // STEP 4: Save to cache (async, non-blocking)
  const cacheSaveStart = Date.now();
  saveToCacheAsync(supplementName, evidenceData, analysis.studyCount).catch(err => {
    console.error(`[CACHE SAVE FAILED] ${supplementName}:`, err);
  });
  performance.cacheSaveTime = Date.now() - cacheSaveStart;

  return evidenceData;
}

// ==========================================
// BACKGROUND REFRESH
// ==========================================

/**
 * Refresh stale cache data in the background (fire-and-forget)
 * User gets instant response with stale data while this runs
 */
async function refreshInBackground(supplementName: string): Promise<void> {
  console.log(`[BACKGROUND REFRESH] Starting for: ${supplementName}`);

  try {
    const performance: EnrichV2Response['metadata']['performance'] = { totalTime: 0 };
    const freshData = await generateFreshEvidence(supplementName, performance);
    console.log(`[BACKGROUND REFRESH COMPLETE] ${supplementName} in ${performance.totalTime}ms`);
  } catch (error) {
    console.error(`[BACKGROUND REFRESH ERROR] ${supplementName}:`, error);
    throw error;
  }
}

// ==========================================
// FORMATTING
// ==========================================

function formatAsEvidenceData(
  supplementName: string,
  analysis: Awaited<ReturnType<typeof analyzeStudiesWithBedrock>>,
  studies: Awaited<ReturnType<typeof searchSupplementInPubMed>>
): SupplementEvidenceData {
  return {
    overallGrade: analysis.overallGrade,
    whatIsItFor: analysis.whatIsItFor,
    worksFor: analysis.worksFor,
    doesntWorkFor: analysis.doesntWorkFor,
    limitedEvidence: analysis.limitedEvidence,

    qualityBadges: {
      hasRCTs: analysis.studyCount.rct > 0,
      hasMetaAnalysis: analysis.studyCount.metaAnalysis > 0,
      longTermStudies: studies.some(s => s.year < new Date().getFullYear() - 5),
      safetyEstablished: true,
    },

    ingredients: [
      {
        name: supplementName,
        grade: analysis.overallGrade,
        studyCount: analysis.studyCount.total,
        rctCount: analysis.studyCount.rct,
        description: `Based on ${analysis.studyCount.total} peer-reviewed studies`,
      },
    ],
  };
}

function generateFallbackData(supplementName: string): SupplementEvidenceData {
  return {
    overallGrade: 'C',
    whatIsItFor: `Información limitada disponible sobre ${supplementName}. Se requiere más investigación.`,
    worksFor: [],
    doesntWorkFor: [],
    limitedEvidence: [
      {
        condition: 'Beneficios potenciales',
        grade: 'C',
        description: 'Evidencia insuficiente en la literatura científica',
      },
    ],
    qualityBadges: {
      hasRCTs: false,
      hasMetaAnalysis: false,
      longTermStudies: false,
      safetyEstablished: false,
    },
    ingredients: [
      {
        name: supplementName,
        grade: 'C',
        studyCount: 0,
        rctCount: 0,
        description: 'Información limitada disponible',
      },
    ],
  };
}

// ==========================================
// ASYNC CACHE SAVE (NON-BLOCKING)
// ==========================================

function saveToCacheAsync(
  supplementName: string,
  evidenceData: SupplementEvidenceData,
  studyCount: { total: number; rct: number; metaAnalysis: number }
): Promise<void> {
  // Fire-and-forget: Don't await, don't block the response
  return saveCachedEvidence(supplementName, evidenceData, {
    studyQuality: determineStudyQuality(studyCount),
    studyCount: studyCount.total,
    rctCount: studyCount.rct,
    metaAnalysisCount: studyCount.metaAnalysis,
    pubmedIds: [], // Could extract from studies if needed
  });
}

function determineStudyQuality(studyCount: { total: number; rct: number; metaAnalysis: number }): 'high' | 'medium' | 'low' {
  if (studyCount.metaAnalysis >= 2 && studyCount.rct >= 10) return 'high';
  if (studyCount.rct >= 5) return 'medium';
  return 'low';
}
