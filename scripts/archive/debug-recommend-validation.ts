/**
 * Debug Script: Recommend Validation Issue
 *
 * Investigates WHY recommend endpoint rejects data from enrich endpoint
 * even when enrich returns hasRealData=true and studiesUsed>0
 */

const ENRICH_API_URL = 'https://www.suplementai.com/api/portal/enrich';
const RECOMMEND_API_URL = 'https://www.suplementai.com/api/portal/recommend';

async function debugIngredient(name: string) {
  console.log('='.repeat(80));
  console.log(`Debugging: ${name}`);
  console.log('='.repeat(80));

  // Step 1: Call enrich endpoint (what recommend calls internally)
  console.log('\n📋 Step 1: Call enrich endpoint with forceRefresh=true (like recommend does)');
  console.log('-'.repeat(80));

  try {
    const enrichResponse = await fetch(ENRICH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: name,
        category: name,
        forceRefresh: true, // THIS IS WHAT RECOMMEND USES
        maxStudies: 10,
        rctOnly: false,
        yearFrom: 2010,
      }),
      signal: AbortSignal.timeout(120000),
    });

    const enrichData = await enrichResponse.json();

    console.log(`Status: ${enrichResponse.status}`);
    console.log(`Success: ${enrichData.success}`);
    console.log(`Has Data: ${!!enrichData.data}`);

    if (enrichData.metadata) {
      console.log('\nMetadata from Enrich:');
      console.log(JSON.stringify(enrichData.metadata, null, 2));
    }

    if (enrichData.data) {
      console.log('\nData Keys:');
      console.log(Object.keys(enrichData.data));
    }

    // Step 2: Now call recommend endpoint
    console.log('\n📋 Step 2: Call recommend endpoint (full user flow)');
    console.log('-'.repeat(80));

    const recommendResponse = await fetch(RECOMMEND_API_URL, {
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

    const recommendData = await recommendResponse.json();

    console.log(`Status: ${recommendResponse.status}`);
    console.log(`Success: ${recommendData.success}`);

    if (recommendResponse.ok) {
      console.log(`Has Recommendation: ${!!recommendData.recommendation}`);
      if (recommendData.recommendation?._enrichment_metadata) {
        console.log('\nMetadata from Recommend:');
        console.log(JSON.stringify(recommendData.recommendation._enrichment_metadata, null, 2));
      }
    } else {
      console.log(`Error: ${recommendData.error}`);
      console.log(`Message: ${recommendData.message}`);
      if (recommendData.metadata) {
        console.log('\nError Metadata:');
        console.log(JSON.stringify(recommendData.metadata, null, 2));
      }
    }

    // Step 3: Analysis
    console.log('\n📊 ANALYSIS:');
    console.log('-'.repeat(80));

    if (enrichResponse.ok && enrichData.success && enrichData.metadata?.hasRealData) {
      if (!recommendResponse.ok) {
        console.log('🔴 BUG CONFIRMED:');
        console.log('   - Enrich returns valid data (hasRealData=true)');
        console.log('   - But Recommend rejects it with 404');
        console.log('   - This is a VALIDATION BUG in recommend endpoint');
        console.log('\n   Possible causes:');
        console.log('   1. Recommend calls enrich with different parameters');
        console.log('   2. Recommend validation is too strict');
        console.log('   3. Data gets corrupted between enrich → recommend');
      } else {
        console.log('✅ Both endpoints work correctly');
      }
    } else if (!enrichResponse.ok || !enrichData.success) {
      console.log('⚠️  Enrich endpoint failed:');
      console.log(`   Status: ${enrichResponse.status}`);
      console.log(`   This explains why recommend fails`);
    }

  } catch (error: any) {
    console.log(`❌ Exception: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

async function runDebug() {
  // Test ingredients that showed the pattern:
  // Enrich OK but Recommend FAIL
  const ingredientsToDebug = [
    'Creatine', // Enrich OK (cache hit), Recommend FAIL
    'Kefir',    // Enrich OK (cache hit), Recommend FAIL
  ];

  for (const ingredient of ingredientsToDebug) {
    await debugIngredient(ingredient);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

runDebug().catch(console.error);
