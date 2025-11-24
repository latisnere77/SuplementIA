/**
 * Validation Script: Quiz Timeout Fix
 *
 * Tests that quiz route now waits for recommend endpoint to complete
 * and returns REAL data instead of mock data fallback
 */

const QUIZ_API = 'https://www.suplementai.com/api/portal/quiz';

interface TestResult {
  ingredient: string;
  success: boolean;
  duration: number;
  hasRealData: boolean;
  isMockData: boolean;
  demo?: boolean;
  fallback?: boolean;
  totalStudies: number;
  studiesUsed: number;
  error?: string;
  status: number;
}

const testIngredients = [
  'Selenium',      // User's reported case
  'Vitamin B12',   // User's reported case
  'Kombucha',      // Original reported case
  'Ashwagandha',   // Common supplement without cache
  'Rhodiola',      // Common supplement without cache
];

async function testIngredient(name: string): Promise<TestResult> {
  console.log(`\nTesting: ${name}...`);
  const startTime = Date.now();

  try {
    const response = await fetch(QUIZ_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: name,
        age: 35,
        gender: 'male',
        location: 'CDMX',
      }),
      signal: AbortSignal.timeout(130000), // 130s (slightly more than server timeout)
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    const recommendation = data.recommendation;
    const metadata = recommendation?._enrichment_metadata || {};
    const evidenceSummary = recommendation?.evidence_summary || {};

    // Check if this is mock data
    const isMockData = (
      data.demo === true ||
      data.fallback === true ||
      (evidenceSummary.totalStudies === 85 && evidenceSummary.totalParticipants === 6500)
    );

    // Check if has real data based on metadata
    const hasRealData = (
      metadata.hasRealData === true &&
      metadata.studiesUsed > 0 &&
      !isMockData
    );

    const result: TestResult = {
      ingredient: name,
      success: response.ok && hasRealData,
      duration,
      hasRealData,
      isMockData,
      demo: data.demo,
      fallback: data.fallback,
      totalStudies: evidenceSummary.totalStudies || 0,
      studiesUsed: metadata.studiesUsed || 0,
      status: response.status,
    };

    // Log detailed info for debugging
    console.log(`  Status: ${response.status}`);
    console.log(`  Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`  Demo: ${data.demo}`);
    console.log(`  Fallback: ${data.fallback}`);
    console.log(`  Total Studies: ${result.totalStudies}`);
    console.log(`  Studies Used: ${result.studiesUsed}`);
    console.log(`  Has Real Data: ${hasRealData}`);
    console.log(`  Is Mock Data: ${isMockData}`);

    return result;

  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.log(`  ❌ ERROR: ${error.message}`);
    console.log(`  Duration: ${(duration / 1000).toFixed(2)}s`);

    return {
      ingredient: name,
      success: false,
      duration,
      hasRealData: false,
      isMockData: false,
      totalStudies: 0,
      studiesUsed: 0,
      error: error.message,
      status: 0,
    };
  }
}

async function runValidation() {
  console.log('='.repeat(80));
  console.log('QUIZ TIMEOUT FIX VALIDATION');
  console.log('='.repeat(80));
  console.log('\nTesting that quiz route now waits for recommend endpoint');
  console.log('and returns REAL data instead of mock data fallback');
  console.log('\nExpected behavior:');
  console.log('  - First search: 30-60s (no cache) → REAL data');
  console.log('  - No timeout at 15s');
  console.log('  - No mock data (85 studies, 6500 participants)');
  console.log('  - demo: undefined (not true)');
  console.log('  - fallback: undefined (not true)');
  console.log('='.repeat(80));

  const results: TestResult[] = [];

  for (const ingredient of testIngredients) {
    const result = await testIngredient(ingredient);
    results.push(result);

    // Wait 2s between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('RESULTS SUMMARY');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success).length;
  const mockData = results.filter(r => r.isMockData).length;
  const realData = results.filter(r => r.hasRealData).length;
  const errors = results.filter(r => r.error).length;

  console.log(`\n✅ Real Data: ${realData}/${testIngredients.length}`);
  console.log(`❌ Mock Data: ${mockData}/${testIngredients.length}`);
  console.log(`⚠️  Errors: ${errors}/${testIngredients.length}`);

  // Detailed table
  console.log('\n' + '-'.repeat(100));
  console.log(
    'Ingredient'.padEnd(20) +
    'Status'.padEnd(12) +
    'Duration'.padEnd(12) +
    'Studies'.padEnd(10) +
    'Mock?'.padEnd(10) +
    'Demo'.padEnd(10) +
    'Fallback'
  );
  console.log('-'.repeat(100));

  results.forEach(r => {
    const status = r.success ? '✅ REAL' : (r.isMockData ? '❌ MOCK' : '⚠️  ERROR');
    const duration = `${(r.duration / 1000).toFixed(1)}s`;
    const studies = r.studiesUsed > 0 ? `${r.studiesUsed}` : `${r.totalStudies}`;
    const isMock = r.isMockData ? 'YES' : 'NO';
    const demo = r.demo === true ? 'true' : 'false';
    const fallback = r.fallback === true ? 'true' : 'false';

    console.log(
      r.ingredient.padEnd(20) +
      status.padEnd(12) +
      duration.padEnd(12) +
      studies.padEnd(10) +
      isMock.padEnd(10) +
      demo.padEnd(10) +
      fallback
    );
  });

  // Diagnosis
  console.log('\n' + '='.repeat(80));
  console.log('DIAGNOSIS');
  console.log('='.repeat(80));

  if (mockData > 0) {
    console.log('\n🔴 FIX DID NOT WORK:');
    console.log(`   ${mockData} ingredients still returning mock data`);
    console.log('   Possible causes:');
    console.log('   1. Deployment has not propagated yet (wait 2-5 minutes)');
    console.log('   2. Quiz route timeout still too short');
    console.log('   3. Recommend endpoint still failing');
    console.log('\n   Check:');
    console.log('   - git log: Verify commit a602d70 is latest');
    console.log('   - Vercel dashboard: Check deployment status');
    console.log('   - CloudWatch logs: Check for errors');
  } else if (realData === testIngredients.length) {
    console.log('\n🎉 FIX SUCCESSFUL!');
    console.log(`   ALL ${testIngredients.length} ingredients return REAL data`);
    console.log('   ✅ No mock data fallback');
    console.log('   ✅ No demo=true or fallback=true');
    console.log('   ✅ Quiz route waits for recommend endpoint');
    console.log('\n   Performance:');
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    console.log(`   - Average duration: ${(avgDuration / 1000).toFixed(1)}s`);
    const maxDuration = Math.max(...results.map(r => r.duration));
    console.log(`   - Max duration: ${(maxDuration / 1000).toFixed(1)}s`);
    if (maxDuration < 60000) {
      console.log('   ✅ All requests completed under 60s (cache working)');
    }
  } else if (realData > 0) {
    console.log('\n🟡 PARTIAL SUCCESS:');
    console.log(`   ${realData} ingredients work with REAL data`);
    console.log(`   ${mockData} still return MOCK data`);
    console.log(`   ${errors} have errors`);
    console.log('\n   May need additional investigation');
  } else {
    console.log('\n🔴 ALL TESTS FAILED:');
    console.log('   No ingredients returning real data');
    console.log('   System may be down or fix not deployed');
  }

  // Specific issues
  const slowRequests = results.filter(r => r.duration > 60000);
  if (slowRequests.length > 0) {
    console.log('\n⚠️  SLOW REQUESTS (>60s):');
    slowRequests.forEach(r => {
      console.log(`   - ${r.ingredient}: ${(r.duration / 1000).toFixed(1)}s`);
    });
    console.log('   Consider pre-populating cache for these ingredients');
  }

  const timeouts = results.filter(r => r.error?.includes('timeout'));
  if (timeouts.length > 0) {
    console.log('\n❌ TIMEOUTS DETECTED:');
    timeouts.forEach(r => {
      console.log(`   - ${r.ingredient}: ${r.error}`);
    });
    console.log('   Quiz timeout may still be too short');
  }

  console.log('\n' + '='.repeat(80));
}

runValidation().catch(console.error);
