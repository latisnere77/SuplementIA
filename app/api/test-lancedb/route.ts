/**
 * Test LanceDB Integration Endpoint
 */

import { NextResponse } from 'next/server';
import { searchLanceDB, getLanceDBStats } from '@/lib/lancedb-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    console.log('[Test LanceDB] Starting test...');

    // Test 1: Get stats
    const stats = await getLanceDBStats();
    console.log('[Test LanceDB] Stats:', stats);

    // Test 2: Search
    const results = await searchLanceDB('magnesium', 3);
    console.log(`[Test LanceDB] Search returned ${results.length} results`);

    return NextResponse.json({
      success: true,
      stats,
      searchTest: {
        query: 'magnesium',
        resultsCount: results.length,
        topResult: results[0] ? {
          name: results[0].name,
          evidenceGrade: results[0].metadata.evidence_grade,
          studyCount: results[0].metadata.study_count,
          similarity: results[0].similarity
        } : null
      }
    });
  } catch (error) {
    console.error('[Test LanceDB] Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
