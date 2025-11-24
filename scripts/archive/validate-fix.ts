/**
 * Validation Script: Test Fix for forceRefresh
 *
 * Tests that changing forceRefresh: false fixes the issue for ALL ingredients
 */

const RECOMMEND_API_URL = 'https://www.suplementai.com/api/portal/recommend';

interface TestResult {
  ingredient: string;
  success: boolean;
  status: number;
  duration: number;
  hasMetadata: boolean;
  studiesUsed: number;
  error?: string;
}

const testIngredients = [
  'Creatine',
  'Kombucha',
  'Kefir',
  'Magnesium',
  'Vitamin D',
];

async function testIngredient(name: string): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(RECOMMEND_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: name,
        age: 35,
        gender: 'male',
        location: 'CDMX',
      }),
      signal: AbortSignal.timeout(120000),
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    return {
      ingredient: name,
      success: response.ok && data.success,
      status: response.status,
      duration,
      hasMetadata: !!data.recommendation?._enrichment_metadata,
      studiesUsed: data.recommendation?._enrichment_metadata?.studiesUsed || 0,
      error: data.error,
    };
  } catch (error: any) {
    return {
      ingredient: name,
      success: false,
      status: 0,
      duration: Date.now() - startTime,
      hasMetadata: false,
      studiesUsed: 0,
      error: error.message,
    };
  }
}

async function runValidation() {
  console.log('='.repeat(80));
  console.log('FIX VALIDATION TEST');
  console.log('Testing that forceRefresh=false fixes the issue');
  console.log('='.repeat(80));
  console.log();

  const results: TestResult[] = [];

  for (const ingredient of testIngredients) {
    console.log(`Testing: ${ingredient}...`);
    const result = await testIngredient(ingredient);
    results.push(result);

    const status = result.success ? '✅ OK' : '❌ FAIL';
    console.log(`  ${status} - ${result.duration}ms - Studies: ${result.studiesUsed}`);

    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('RESULTS SUMMARY');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n✅ Successful: ${successful}/${testIngredients.length}`);
  console.log(`❌ Failed: ${failed}/${testIngredients.length}`);

  console.log('\nDetailed Results:');
  console.log('-'.repeat(80));
  console.log('Ingredient'.padEnd(20) + 'Status'.padEnd(15) + 'Duration'.padEnd(15) + 'Studies');
  console.log('-'.repeat(80));

  results.forEach(r => {
    const status = r.success ? '✅ OK' : `❌ ${r.error || r.status}`;
    const duration = `${(r.duration / 1000).toFixed(2)}s`;
    console.log(
      r.ingredient.padEnd(20) +
      status.padEnd(15) +
      duration.padEnd(15) +
      r.studiesUsed
    );
  });

  console.log('\n' + '='.repeat(80));
  console.log('CONCLUSION:');
  console.log('='.repeat(80));

  if (successful === testIngredients.length) {
    console.log('🎉 FIX SUCCESSFUL!');
    console.log('   ALL ingredients now return valid results');
    console.log('   forceRefresh=false solved the timeout issue');
  } else if (successful > 0 && successful < testIngredients.length) {
    console.log('🟡 PARTIAL SUCCESS:');
    console.log(`   ${successful} ingredients work, ${failed} still fail`);
    console.log('   May need additional investigation for failed cases');
  } else {
    console.log('🔴 FIX DID NOT WORK:');
    console.log('   All ingredients still failing');
    console.log('   Need to investigate further');
  }

  console.log('='.repeat(80));
}

runValidation().catch(console.error);
