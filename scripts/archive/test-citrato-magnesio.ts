/**
 * Test: Citrato de Magnesio - Complete Flow
 * Validates that the new translation works end-to-end
 */

const QUIZ_API = 'https://www.suplementai.com/api/portal/quiz';

async function testCitratoMagnesio() {
  console.log('='.repeat(80));
  console.log('TEST: Citrato de Magnesio - Complete Flow Validation');
  console.log('='.repeat(80));

  const testCases = [
    { query: 'Citrato de Magnesio', description: 'User format (capitalized)' },
    { query: 'citrato de magnesio', description: 'Lowercase' },
    { query: 'CITRATO DE MAGNESIO', description: 'Uppercase' },
  ];

  let successCount = 0;
  let failCount = 0;

  for (const { query, description } of testCases) {
    console.log(`\n${'-'.repeat(80)}`);
    console.log(`Testing: "${query}" (${description})`);
    console.log('-'.repeat(80));

    const startTime = Date.now();

    try {
      const response = await fetch(QUIZ_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: query,
          age: 35,
          gender: 'male',
          location: 'CDMX',
        }),
        signal: AbortSignal.timeout(120000),
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      console.log(`\nStatus: ${response.status}`);
      console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log(`Success: ${data.success}`);

      if (response.ok && data.success) {
        const rec = data.recommendation;
        const metadata = rec?._enrichment_metadata || {};
        const evidenceSummary = rec?.evidence_summary || {};

        // Check for mock data indicators
        const isMockData = (
          data.demo === true ||
          data.fallback === true ||
          (evidenceSummary.totalStudies === 85 && evidenceSummary.totalParticipants === 6500)
        );

        const hasRealData = (
          metadata.hasRealData === true &&
          metadata.studiesUsed > 0 &&
          !isMockData
        );

        console.log(`\n📊 RESULTS:`);
        console.log(`  Demo: ${data.demo || false}`);
        console.log(`  Fallback: ${data.fallback || false}`);
        console.log(`  Total Studies: ${evidenceSummary.totalStudies || 0}`);
        console.log(`  Studies Used (metadata): ${metadata.studiesUsed || 0}`);
        console.log(`  Has Real Data: ${hasRealData}`);
        console.log(`  Is Mock Data: ${isMockData}`);

        if (hasRealData && !isMockData) {
          console.log(`\n✅ SUCCESS: Real data returned`);
          console.log(`  Category: ${rec.category}`);
          console.log(`  Studies: ${metadata.studiesUsed}`);
          console.log(`  Source: ${metadata.source || 'unknown'}`);
          successCount++;
        } else {
          console.log(`\n❌ FAILED: Mock or no data`);
          console.log(`  Reason: ${isMockData ? 'Mock data detected' : 'No real data'}`);
          failCount++;
        }

      } else {
        console.log(`\n❌ FAILED: ${response.status}`);
        console.log(`  Error: ${data.error || 'unknown'}`);
        console.log(`  Message: ${data.message || 'unknown'}`);
        failCount++;
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`\n❌ ERROR: ${error.message}`);
      console.log(`  Duration: ${(duration / 1000).toFixed(2)}s`);
      failCount++;
    }

    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Successful: ${successCount}/${testCases.length}`);
  console.log(`❌ Failed: ${failCount}/${testCases.length}`);

  // Diagnosis
  console.log('\n' + '='.repeat(80));
  console.log('DIAGNOSIS');
  console.log('='.repeat(80));

  if (successCount === testCases.length) {
    console.log(`\n🎉 ALL TESTS PASSED!`);
    console.log(`   Translation system is working correctly`);
    console.log(`   "citrato de magnesio" → "magnesium citrate" → Real studies`);
    console.log(`\n   This confirms:`);
    console.log(`   1. ✅ Fallback map translation works`);
    console.log(`   2. ✅ Quiz route timeout fix works (120s)`);
    console.log(`   3. ✅ Bedrock enrichment works`);
    console.log(`   4. ✅ No mock data fallback`);
  } else if (successCount > 0) {
    console.log(`\n🟡 PARTIAL SUCCESS`);
    console.log(`   ${successCount} tests passed, ${failCount} failed`);
    console.log(`   May be deployment propagation delay`);
    console.log(`   Wait 2-3 minutes and run again`);
  } else {
    console.log(`\n🔴 ALL TESTS FAILED`);
    console.log(`   Possible causes:`);
    console.log(`   1. Deployment hasn't propagated yet (wait 2-3 min)`);
    console.log(`   2. Translation not in fallback map`);
    console.log(`   3. Backend issue`);
    console.log(`\n   Check:`);
    console.log(`   - git log: Verify commit bde4e0b is latest`);
    console.log(`   - Vercel dashboard: Check deployment status`);
  }

  console.log('\n' + '='.repeat(80));

  // Additional test: Direct translation verification
  console.log('\n📋 EXPECTED TRANSLATION:');
  console.log('   Input: "citrato de magnesio"');
  console.log('   Fallback Map: "magnesium citrate"');
  console.log('   PubMed Search: "magnesium citrate"');
  console.log('   Expected: 10+ studies found');
  console.log('='.repeat(80));
}

testCitratoMagnesio().catch(console.error);
