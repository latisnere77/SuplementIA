/**
 * Test: Timing of Recommend Endpoint for Selenium
 */

const RECOMMEND_API = 'https://www.suplementai.com/api/portal/recommend';

async function testRecommendTiming() {
  console.log('Testing recommend endpoint timing for Selenium...\n');

  const startTime = Date.now();

  try {
    const response = await fetch(RECOMMEND_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'Selenium',
        age: 35,
        gender: 'male',
        location: 'CDMX',
      }),
      signal: AbortSignal.timeout(120000),
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`Success: ${data.success}`);

    if (data.recommendation?._enrichment_metadata) {
      console.log(`hasRealData: ${data.recommendation._enrichment_metadata.hasRealData}`);
      console.log(`studiesUsed: ${data.recommendation._enrichment_metadata.studiesUsed}`);
    }

    console.log(`\n🔍 ANALYSIS:`);
    console.log(`  - Recommend endpoint took: ${(duration / 1000).toFixed(2)}s`);
    console.log(`  - Quiz timeout is: 15s`);

    if (duration > 15000) {
      console.log(`  - ❌ PROBLEM: Recommend is SLOWER than quiz timeout!`);
      console.log(`  - This will cause quiz to timeout and use mock data`);
      console.log(`  - FIX: Increase quiz timeout to ${Math.ceil(duration / 1000) + 5}s`);
    } else {
      console.log(`  - ✅ Recommend is FASTER than quiz timeout`);
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`ERROR: ${error.message}`);
    console.error(`Duration: ${(duration / 1000).toFixed(2)}s`);
  }
}

testRecommendTiming().catch(console.error);
