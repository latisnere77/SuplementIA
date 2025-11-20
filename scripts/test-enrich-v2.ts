/**
 * Test Script for Enrich V2 Endpoint
 * Tests the optimized /api/portal/enrich-v2 endpoint locally
 */

const ENDPOINT = process.env.ENRICH_V2_URL || 'http://localhost:3000/api/portal/enrich-v2';

interface TestCase {
  name: string;
  supplementName: string;
  forceRefresh?: boolean;
  expectedCacheStatus?: 'fresh' | 'stale' | 'miss';
}

const testCases: TestCase[] = [
  {
    name: 'Test 1: Cache Miss (First Time - Vitamin D)',
    supplementName: 'vitamin d',
    forceRefresh: false,
    expectedCacheStatus: 'miss',
  },
  {
    name: 'Test 2: Cache Hit (Second Time - Vitamin D)',
    supplementName: 'vitamin d',
    forceRefresh: false,
    expectedCacheStatus: 'fresh',
  },
  {
    name: 'Test 3: Force Refresh',
    supplementName: 'vitamin d',
    forceRefresh: true,
    expectedCacheStatus: 'miss',
  },
  {
    name: 'Test 4: Different Supplement (Magnesium)',
    supplementName: 'magnesium',
    forceRefresh: false,
    expectedCacheStatus: 'miss',
  },
];

async function testEnrichV2(testCase: TestCase) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 ${testCase.name}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Supplement: ${testCase.supplementName}`);
  console.log(`Force Refresh: ${testCase.forceRefresh || false}`);
  console.log(`Expected Cache Status: ${testCase.expectedCacheStatus || 'any'}\n`);

  const startTime = Date.now();

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplementName: testCase.supplementName,
        forceRefresh: testCase.forceRefresh || false,
      }),
    });

    const totalTime = Date.now() - startTime;

    if (!response.ok) {
      console.error(`❌ TEST FAILED - HTTP ${response.status}`);
      const error = await response.json();
      console.error(`Error: ${JSON.stringify(error, null, 2)}`);
      return false;
    }

    const data = await response.json();

    // Validate response structure
    if (!data.success) {
      console.error(`❌ TEST FAILED - Response indicates failure`);
      console.error(`Error: ${data.error}`);
      return false;
    }

    const { metadata, data: evidenceData } = data;

    // Display results
    console.log(`✅ SUCCESS`);
    console.log(`\n📊 PERFORMANCE:`);
    console.log(`   Total Time: ${totalTime}ms`);
    console.log(`   Cache Status: ${metadata.cacheStatus}`);
    console.log(`   Cached: ${metadata.cached}`);
    console.log(`   Refreshing: ${metadata.refreshing || false}`);
    if (metadata.generatedAt) {
      console.log(`   Generated At: ${metadata.generatedAt}`);
    }

    console.log(`\n⏱️  DETAILED TIMING:`);
    console.log(`   Cache Check: ${metadata.performance.cacheCheckTime || 0}ms`);
    console.log(`   Search Time: ${metadata.performance.searchTime || 0}ms`);
    console.log(`   Analysis Time: ${metadata.performance.analysisTime || 0}ms`);
    console.log(`   Cache Save: ${metadata.performance.cacheSaveTime || 0}ms`);
    console.log(`   Total: ${metadata.performance.totalTime}ms`);

    console.log(`\n📋 EVIDENCE DATA:`);
    console.log(`   Grade: ${evidenceData.overallGrade}`);
    console.log(`   What It's For: ${evidenceData.whatIsItFor.substring(0, 100)}...`);
    console.log(`   Works For: ${evidenceData.worksFor.length} conditions`);
    console.log(`   Doesn't Work For: ${evidenceData.doesntWorkFor.length} conditions`);
    console.log(`   Limited Evidence: ${evidenceData.limitedEvidence.length} conditions`);
    console.log(`   Ingredients: ${evidenceData.ingredients.length}`);

    // Check if cache status matches expected
    if (testCase.expectedCacheStatus && metadata.cacheStatus !== testCase.expectedCacheStatus) {
      console.log(`\n⚠️  WARNING: Expected cache status "${testCase.expectedCacheStatus}" but got "${metadata.cacheStatus}"`);
    }

    // Performance checks
    if (metadata.cacheStatus === 'fresh' || metadata.cacheStatus === 'stale') {
      if (totalTime > 500) {
        console.log(`\n⚠️  WARNING: Cache hit took ${totalTime}ms (expected < 500ms)`);
      }
    } else if (metadata.cacheStatus === 'miss') {
      if (totalTime < 1000) {
        console.log(`\n⚠️  WARNING: Cache miss took only ${totalTime}ms (suspiciously fast)`);
      }
    }

    return true;
  } catch (error: any) {
    console.error(`❌ TEST FAILED - Network or parsing error`);
    console.error(`Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('\n🚀 STARTING ENRICH V2 ENDPOINT TESTS');
  console.log(`Endpoint: ${ENDPOINT}\n`);

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const success = await testEnrichV2(testCase);
    if (success) {
      passed++;
    } else {
      failed++;
    }

    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log(`🎉 ALL TESTS PASSED!`);
    process.exit(0);
  } else {
    console.log(`❌ SOME TESTS FAILED`);
    process.exit(1);
  }
}

// Check if endpoint is available
async function checkEndpoint() {
  console.log(`\n🔍 Checking if endpoint is available at ${ENDPOINT}...\n`);

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplementName: 'test',
      }),
    });

    if (response.status === 404) {
      console.error(`❌ Endpoint not found at ${ENDPOINT}`);
      console.error(`Make sure Next.js dev server is running: npm run dev\n`);
      process.exit(1);
    }

    console.log(`✅ Endpoint is available\n`);
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error(`❌ Cannot connect to ${ENDPOINT}`);
      console.error(`Make sure Next.js dev server is running: npm run dev\n`);
      process.exit(1);
    }
    // Other errors are OK (might be validation errors from our test payload)
  }
}

// Main execution
(async () => {
  await checkEndpoint();
  await runAllTests();
})();
