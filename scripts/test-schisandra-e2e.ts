#!/usr/bin/env tsx

/**
 * End-to-end test for "schisandra chinensis" search
 */

const API_BASE = 'https://suplementia.vercel.app';

async function testSchisandra() {
  console.log('🧪 END-TO-END TEST: "schisandra chinensis" search\n');
  console.log('='.repeat(60));
  console.log(`\n📍 Testing against: ${API_BASE}`);
  console.log('🔍 Search query: "schisandra chinensis"\n');

  // STEP 1: Call /api/portal/enrich
  console.log('STEP 1: Calling /api/portal/enrich');
  console.log('─'.repeat(60));
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE}/api/portal/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplementName: 'schisandra chinensis',
        maxStudies: 10,
        category: 'general',
        forceRefresh: false,
        rctOnly: false,
        yearFrom: 2010,
        yearTo: 2025,
      }),
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    console.log(`\n⏱️  Duration: ${duration}ms`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`✅ Success: ${data.success}`);

    if (data.success) {
      console.log('\n✅ SUCCESS! Enrichment completed\n');
      console.log('Response summary:');
      console.log(`- Supplement ID: ${data.metadata?.supplementId || data.data?.supplementId}`);
      console.log(`- Has Real Data: ${data.metadata?.hasRealData}`);
      console.log(`- Studies Used: ${data.metadata?.studiesUsed}`);
      console.log(`- Translation: ${data.metadata?.originalQuery} → ${data.metadata?.translatedQuery}`);
      
      if (data.metadata?.expansion) {
        console.log(`- Expansion Source: ${data.metadata.expansion.source}`);
        console.log(`- Alternatives: ${data.metadata.expansion.alternatives?.join(', ')}`);
      }
    } else {
      console.log('\n❌ FAILED! Enrichment error\n');
      console.log('Error details:');
      console.log(JSON.stringify(data, null, 2));
    }

    console.log('\n' + '='.repeat(60));
    
    if (data.success) {
      console.log('✅ END-TO-END TEST PASSED');
    } else {
      console.log('❌ END-TO-END TEST FAILED');
      console.log('\n🔍 Possible causes:');
      console.log('1. Studies fetch failed');
      console.log('2. Content enrichment failed');
      console.log('3. Translation issue');
      console.log('4. Timeout');
    }
    
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`\n⏱️  Duration: ${duration}ms`);
    console.log(`❌ ERROR: ${error.message}\n`);
    console.log('Stack trace:');
    console.log(error.stack);
  }
}

testSchisandra().catch(console.error);
