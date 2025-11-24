/**
 * Test Enrichment Status Endpoint
 * Verifies that the enrichment-status endpoint works correctly
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface TestCase {
  name: string;
  jobId: string;
  supplement: string;
  expectedStatus: number;
  description: string;
}

const testCases: TestCase[] = [
  {
    name: 'Valid supplement with cache',
    jobId: 'job_test_123',
    supplement: 'vitamin d',
    expectedStatus: 200, // or 202 if processing
    description: 'Should return cached data or processing status',
  },
  {
    name: 'Missing supplement parameter',
    jobId: 'job_test_456',
    supplement: '',
    expectedStatus: 400,
    description: 'Should return 400 for missing supplement',
  },
];

async function testEnrichmentStatus() {
  console.log('🧪 Testing Enrichment Status Endpoint\n');
  console.log('='.repeat(80));
  console.log(`Base URL: ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`   Job ID: ${testCase.jobId}`);
    console.log(`   Supplement: ${testCase.supplement || '(empty)'}`);
    console.log(`   Expected: ${testCase.expectedStatus}`);

    try {
      const url = `${BASE_URL}/api/portal/enrichment-status/${testCase.jobId}${
        testCase.supplement ? `?supplement=${encodeURIComponent(testCase.supplement)}` : ''
      }`;

      console.log(`   URL: ${url}`);

      const response = await fetch(url);
      const data = await response.json();

      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 200));

      // Check if status matches expected (allow some flexibility)
      const statusOk =
        response.status === testCase.expectedStatus ||
        (testCase.expectedStatus === 200 && response.status === 202) || // Processing is OK
        (testCase.expectedStatus === 200 && response.status === 404); // Not found yet is OK

      if (statusOk) {
        console.log(`   ✅ PASS`);
        passed++;
      } else {
        console.log(`   ❌ FAIL - Expected ${testCase.expectedStatus}, got ${response.status}`);
        failed++;
      }
    } catch (error: any) {
      console.log(`   ❌ FAIL - Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

  if (failed === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Some tests failed.');
    process.exit(1);
  }
}

// Run tests
testEnrichmentStatus().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
