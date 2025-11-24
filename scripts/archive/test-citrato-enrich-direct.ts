/**
 * Test: Direct Enrich Endpoint Test for Citrato de Magnesio
 * Bypasses quiz to test enrich directly (faster deployment propagation)
 */

const ENRICH_API = 'https://www.suplementai.com/api/portal/enrich';

async function testCitratoEnrichDirect() {
  console.log('='.repeat(80));
  console.log('DIRECT ENRICH TEST: Citrato de Magnesio');
  console.log('='.repeat(80));

  const testQuery = 'citrato de magnesio';

  console.log(`\nTesting: "${testQuery}"`);
  console.log('Expected translation: "magnesium citrate"');
  console.log('-'.repeat(80));

  const startTime = Date.now();

  try {
    const response = await fetch(ENRICH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': `test-${Date.now()}`,
      },
      body: JSON.stringify({
        supplementName: testQuery,
        maxStudies: 10,
        rctOnly: false,
        yearFrom: 2010,
        forceRefresh: false,
      }),
      signal: AbortSignal.timeout(120000),
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    console.log(`\nStatus: ${response.status}`);
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`Success: ${data.success}`);

    if (data.success) {
      console.log(`\n✅ ENRICH SUCCESS`);
      console.log(`  Has Real Data: ${data.metadata?.hasRealData || false}`);
      console.log(`  Studies Used: ${data.metadata?.studiesUsed || 0}`);
      console.log(`  Search Term: ${data.metadata?.searchTerm || 'unknown'}`);
      console.log(`  Translation Method: ${data.metadata?.translationMethod || 'unknown'}`);

      if (data.metadata?.expansionMetadata) {
        console.log(`\n  Translation Details:`);
        console.log(`    Original: ${data.metadata.expansionMetadata.original}`);
        console.log(`    Translated: ${data.metadata.expansionMetadata.expanded || data.metadata.expansionMetadata.alternatives?.[0]}`);
        console.log(`    Source: ${data.metadata.expansionMetadata.source}`);
      }

      console.log(`\n📊 DIAGNOSIS:`);
      if (data.metadata?.translationMethod === 'fallback_map') {
        console.log(`  ✅ Fallback map is working!`);
        console.log(`  Translation was instant (no LLM call)`);
      } else if (data.metadata?.expansionMetadata?.source === 'llm') {
        console.log(`  ⚠️  LLM was used (fallback map may not have entry)`);
        console.log(`  Consider adding to fallback map for speed`);
      }

      if (data.metadata?.studiesUsed >= 3) {
        console.log(`  ✅ Sufficient studies found (${data.metadata.studiesUsed})`);
      } else {
        console.log(`  ⚠️  Low study count (${data.metadata?.studiesUsed || 0})`);
        console.log(`  May need fuzzy search fallback`);
      }

    } else {
      console.log(`\n❌ ENRICH FAILED`);
      console.log(`  Error: ${data.error || 'unknown'}`);
      console.log(`  Message: ${data.message || 'unknown'}`);

      console.log(`\n📊 DIAGNOSIS:`);
      console.log(`  Deployment may not have propagated yet`);
      console.log(`  OR translation → PubMed search → no results`);
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('RAW METADATA (for debugging):');
    console.log('='.repeat(80));
    console.log(JSON.stringify(data.metadata || {}, null, 2).substring(0, 1000));

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`\n❌ ERROR: ${error.message}`);
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('NEXT STEPS:');
  console.log('='.repeat(80));
  console.log(`
If FAILED with 404:
  1. Wait 2-3 minutes for Vercel deployment
  2. Run this script again
  3. Check Vercel dashboard for deployment status

If SUCCESS with fallback_map:
  ✅ Perfect! Deployment worked
  ✅ Quiz flow should work now too

If SUCCESS with LLM:
  ⚠️  Fallback map didn't work
  - Check if "citrato de magnesio" is in route.ts
  - Verify capitalization handling
`);
}

testCitratoEnrichDirect().catch(console.error);
