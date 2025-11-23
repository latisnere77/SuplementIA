#!/usr/bin/env tsx
/**
 * End-to-end test for "condroitina" search
 */

async function testCondroitinaE2E() {
  console.log('🧪 END-TO-END TEST: "condroitina" search\n');
  console.log('='.repeat(60));

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://suplementia.vercel.app';
  const testQuery = 'condroitina';

  console.log(`\n📍 Testing against: ${API_URL}`);
  console.log(`🔍 Search query: "${testQuery}"\n`);

  try {
    // Step 1: Call the enrich API
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

      if (enrichData.error === 'insufficient_data') {
        console.log(`\n🔍 DIAGNOSIS: Backend returned "insufficient_data"`);
        console.log(`   Metadata:`);
        console.log(`   - Original Query: ${enrichData.metadata?.originalQuery}`);
        console.log(`   - Translated Query: ${enrichData.metadata?.translatedQuery}`);
        console.log(`   - Studies Used: ${enrichData.metadata?.studiesUsed}`);
      }

      return;
    }

    console.log(`\n✅ SUCCESS! Enrichment completed`);
    console.log(`\nResponse summary:`);
    console.log(`- Supplement ID: ${enrichData.supplementId}`);
    console.log(`- Has Real Data: ${enrichData.metadata?.hasRealData}`);
    console.log(`- Studies Used: ${enrichData.metadata?.studiesUsed}`);
    console.log(`- Translation: ${enrichData.metadata?.originalQuery} → ${enrichData.metadata?.translatedQuery}`);

    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`✅ END-TO-END TEST PASSED`);
    console.log(`${'='.repeat(60)}`);

  } catch (error: any) {
    console.error(`\n❌ TEST FAILED WITH ERROR:`);
    console.error(error.message);
    console.error(error.stack);
  }
}

testCondroitinaE2E().catch(console.error);
