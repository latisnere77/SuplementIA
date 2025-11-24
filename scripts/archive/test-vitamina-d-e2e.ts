#!/usr/bin/env tsx
/**
 * End-to-end test for "vitamina d" search
 * Simulates the complete flow: Frontend → API → Lambda → Response
 */

async function testVitaminaDEndToEnd() {
  console.log('🧪 END-TO-END TEST: "vitamina d" search\n');
  console.log('=' .repeat(60));

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://suplementia.vercel.app';
  const testQuery = 'vitamina d';

  console.log(`\n📍 Testing against: ${API_URL}`);
  console.log(`🔍 Search query: "${testQuery}"\n`);

  try {
    // Step 1: Call the enrich API (same as frontend)
    console.log('STEP 1: Calling /api/portal/enrich');
    console.log('─'.repeat(60));

    const enrichStart = Date.now();
    const enrichResponse = await fetch(`${API_URL}/api/portal/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplementName: testQuery,
        maxStudies: 10,
      }),
    });

    const enrichDuration = Date.now() - enrichStart;
    const enrichData = await enrichResponse.json();

    console.log(`\n⏱️  Duration: ${enrichDuration}ms`);
    console.log(`📊 Status: ${enrichResponse.status}`);
    console.log(`✅ Success: ${enrichData.success}`);

    if (!enrichResponse.ok) {
      console.log(`\n❌ ERROR RESPONSE:`);
      console.log(JSON.stringify(enrichData, null, 2));

      // Check if it's the "insufficient_data" error
      if (enrichData.error === 'insufficient_data') {
        console.log(`\n🔍 DIAGNOSIS: Backend returned "insufficient_data"`);
        console.log(`   This means the studies-fetcher Lambda found no studies`);
        console.log(`\n   Metadata:`);
        console.log(`   - Original Query: ${enrichData.metadata?.originalQuery}`);
        console.log(`   - Translated Query: ${enrichData.metadata?.translatedQuery}`);
        console.log(`   - Studies Used: ${enrichData.metadata?.studiesUsed}`);
        console.log(`   - Attempts: ${enrichData.metadata?.attempts}`);
      }

      return;
    }

    console.log(`\n✅ SUCCESS! Enrichment completed`);
    console.log(`\nResponse summary:`);
    console.log(`- Supplement ID: ${enrichData.supplementId}`);
    console.log(`- Has Real Data: ${enrichData.metadata?.hasRealData}`);
    console.log(`- Studies Used: ${enrichData.metadata?.studiesUsed}`);
    console.log(`- Translation: ${enrichData.metadata?.originalQuery} → ${enrichData.metadata?.translatedQuery}`);

    // Step 2: Call the recommend API (same as frontend)
    console.log(`\n\nSTEP 2: Calling /api/portal/recommend`);
    console.log('─'.repeat(60));

    const recommendStart = Date.now();
    const recommendResponse = await fetch(`${API_URL}/api/portal/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        category: testQuery,
      }),
    });

    const recommendDuration = Date.now() - recommendStart;
    const recommendData = await recommendResponse.json();

    console.log(`\n⏱️  Duration: ${recommendDuration}ms`);
    console.log(`📊 Status: ${recommendResponse.status}`);
    console.log(`✅ Success: ${recommendData.success}`);

    if (!recommendResponse.ok) {
      console.log(`\n❌ ERROR RESPONSE:`);
      console.log(JSON.stringify(recommendData, null, 2));
      return;
    }

    console.log(`\n✅ SUCCESS! Recommendation generated`);
    console.log(`\nRecommendation summary:`);
    console.log(`- Category: ${recommendData.recommendation?.category}`);
    console.log(`- Total Studies: ${recommendData.recommendation?.evidence_summary?.totalStudies}`);
    console.log(`- Total Participants: ${recommendData.recommendation?.evidence_summary?.totalParticipants}`);
    console.log(`- Recommendation ID: ${recommendData.recommendation_id}`);

    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`✅ END-TO-END TEST PASSED`);
    console.log(`${'='.repeat(60)}`);

  } catch (error: any) {
    console.error(`\n❌ TEST FAILED WITH ERROR:`);
    console.error(error.message);
    console.error(error.stack);
  }
}

testVitaminaDEndToEnd().catch(console.error);
