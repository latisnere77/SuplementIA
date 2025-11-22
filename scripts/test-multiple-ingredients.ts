/**
 * Test Script: Multiple Ingredients
 *
 * Tests several ingredients to determine if the problem is:
 * 1. Specific to certain ingredients (kombucha, kefir)
 * 2. Systematic across all ingredients
 * 3. Related to cache, timeout, or validation
 */

const ENRICH_API_URL = 'https://www.suplementai.com/api/portal/enrich';
const RECOMMEND_API_URL = 'https://www.suplementai.com/api/portal/recommend';

interface TestCase {
  name: string;
  expectedStudies: string; // "many" | "some" | "few"
  category: string;
}

const testCases: TestCase[] = [
  // Well-known supplements (should have many studies)
  { name: 'Creatine', expectedStudies: 'many', category: 'supplement' },
  { name: 'Vitamin D', expectedStudies: 'many', category: 'supplement' },
  { name: 'Magnesium', expectedStudies: 'many', category: 'supplement' },

  // Fermented foods (like kombucha, kefir)
  { name: 'Kombucha', expectedStudies: 'some', category: 'fermented' },
  { name: 'Kefir', expectedStudies: 'some', category: 'fermented' },
  { name: 'Sauerkraut', expectedStudies: 'some', category: 'fermented' },

  // Herbs (might have fewer studies)
  { name: 'Ashwagandha', expectedStudies: 'some', category: 'herb' },
  { name: 'Rhodiola', expectedStudies: 'some', category: 'herb' },

  // Less common (might have very few)
  { name: 'Shilajit', expectedStudies: 'few', category: 'rare' },
];

async function testIngredient(ingredient: TestCase) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${ingredient.name} (Expected: ${ingredient.expectedStudies} studies)`);
  console.log('='.repeat(80));

  const results: any = {
    ingredient: ingredient.name,
    category: ingredient.category,
    expectedStudies: ingredient.expectedStudies,
    enrichEndpoint: { success: false, duration: 0, error: null },
    recommendEndpoint: { success: false, duration: 0, error: null },
  };

  // Test 1: Enrich endpoint WITHOUT forceRefresh (use cache if available)
  console.log('\n📋 Test 1: Enrich endpoint (forceRefresh=false, use cache)');
  console.log('-'.repeat(80));
  try {
    const startTime = Date.now();
    const response = await fetch(ENRICH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: ingredient.name,
        maxStudies: 10,
        rctOnly: false,
        yearFrom: 2010,
        forceRefresh: false, // Use cache
      }),
      signal: AbortSignal.timeout(120000),
    });
    const duration = Date.now() - startTime;

    results.enrichEndpoint.duration = duration;
    results.enrichEndpoint.status = response.status;

    if (response.ok) {
      const data = await response.json();
      results.enrichEndpoint.success = data.success;
      results.enrichEndpoint.hasRealData = data.metadata?.hasRealData;
      results.enrichEndpoint.studiesUsed = data.metadata?.studiesUsed;
      results.enrichEndpoint.cacheHit = duration < 5000; // Assume cache if < 5s

      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   ⏱️  Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
      console.log(`   📊 Success: ${data.success}`);
      console.log(`   📊 hasRealData: ${data.metadata?.hasRealData}`);
      console.log(`   📊 studiesUsed: ${data.metadata?.studiesUsed || 0}`);
      console.log(`   💾 Cache Hit: ${results.enrichEndpoint.cacheHit ? 'YES' : 'NO'}`);
    } else {
      const errorData = await response.json().catch(() => ({}));
      results.enrichEndpoint.error = errorData.error || 'HTTP ' + response.status;
      console.log(`   ❌ Status: ${response.status}`);
      console.log(`   ❌ Error: ${errorData.error || 'Unknown'}`);
    }
  } catch (error: any) {
    results.enrichEndpoint.error = error.message;
    console.log(`   ❌ Exception: ${error.message}`);
  }

  // Test 2: Recommend endpoint (mimics user flow)
  console.log('\n📋 Test 2: Recommend endpoint (user flow)');
  console.log('-'.repeat(80));
  try {
    const startTime = Date.now();
    const response = await fetch(RECOMMEND_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: ingredient.name,
        age: 35,
        gender: 'male',
        location: 'CDMX',
      }),
      signal: AbortSignal.timeout(120000),
    });
    const duration = Date.now() - startTime;

    results.recommendEndpoint.duration = duration;
    results.recommendEndpoint.status = response.status;

    if (response.ok) {
      const data = await response.json();
      results.recommendEndpoint.success = data.success;
      results.recommendEndpoint.hasRecommendation = !!data.recommendation;
      results.recommendEndpoint.hasMetadata = !!data.recommendation?._enrichment_metadata;
      results.recommendEndpoint.studiesUsed = data.recommendation?._enrichment_metadata?.studiesUsed;

      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   ⏱️  Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
      console.log(`   📊 Success: ${data.success}`);
      console.log(`   📊 Has Recommendation: ${!!data.recommendation}`);
      console.log(`   📊 Has Metadata: ${!!data.recommendation?._enrichment_metadata}`);
      console.log(`   📊 Studies Used: ${data.recommendation?._enrichment_metadata?.studiesUsed || 0}`);
    } else {
      const errorData = await response.json().catch(() => ({}));
      results.recommendEndpoint.error = errorData.error || 'HTTP ' + response.status;
      console.log(`   ❌ Status: ${response.status}`);
      console.log(`   ❌ Error: ${errorData.error || 'Unknown'}`);
      console.log(`   ❌ Message: ${errorData.message || 'N/A'}`);
    }
  } catch (error: any) {
    results.recommendEndpoint.error = error.message;
    console.log(`   ❌ Exception: ${error.message}`);
  }

  return results;
}

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('MULTIPLE INGREDIENTS TEST');
  console.log('Testing systematic vs specific issues');
  console.log('='.repeat(80));

  const allResults: any[] = [];

  for (const testCase of testCases) {
    const result = await testIngredient(testCase);
    allResults.push(result);

    // Wait 2s between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const enrichSuccess = allResults.filter(r => r.enrichEndpoint.success).length;
  const enrichFailed = allResults.filter(r => !r.enrichEndpoint.success).length;
  const recommendSuccess = allResults.filter(r => r.recommendEndpoint.success).length;
  const recommendFailed = allResults.filter(r => !r.recommendEndpoint.success).length;

  console.log(`\n📊 Enrich Endpoint:`);
  console.log(`   ✅ Success: ${enrichSuccess}/${testCases.length}`);
  console.log(`   ❌ Failed: ${enrichFailed}/${testCases.length}`);

  console.log(`\n📊 Recommend Endpoint:`);
  console.log(`   ✅ Success: ${recommendSuccess}/${testCases.length}`);
  console.log(`   ❌ Failed: ${recommendFailed}/${testCases.length}`);

  console.log('\n📋 Individual Results:');
  console.log('-'.repeat(80));
  console.log('Ingredient'.padEnd(20) + 'Enrich'.padEnd(15) + 'Recommend'.padEnd(15) + 'Issue');
  console.log('-'.repeat(80));

  allResults.forEach(r => {
    const enrichStatus = r.enrichEndpoint.success ? '✅ OK' : '❌ FAIL';
    const recommendStatus = r.recommendEndpoint.success ? '✅ OK' : '❌ FAIL';
    const issue = !r.recommendEndpoint.success ? r.recommendEndpoint.error || 'Unknown' : '-';

    console.log(
      r.ingredient.padEnd(20) +
      enrichStatus.padEnd(15) +
      recommendStatus.padEnd(15) +
      issue
    );
  });

  console.log('\n' + '='.repeat(80));
  console.log('DIAGNOSIS:');
  console.log('='.repeat(80));

  if (enrichSuccess === testCases.length && recommendFailed > 0) {
    console.log('🔴 SYSTEMATIC ISSUE: Enrich works but Recommend fails');
    console.log('   → Problem is in recommend endpoint validation or transformation');
    console.log('   → NOT specific to kombucha/kefir - affects multiple ingredients');
  } else if (enrichFailed > 0) {
    console.log('🟡 MIXED ISSUE: Some ingredients fail at enrich level');
    console.log('   → May be ingredient-specific (no studies in PubMed)');
    console.log('   → Or timeout/cache issues');
  } else {
    console.log('🟢 ALL WORKING: Both endpoints successful');
  }

  console.log('='.repeat(80));
}

// Run tests
runAllTests().catch(console.error);
