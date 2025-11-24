/**
 * Test Kefir search directly by calling the enrich API
 * This bypasses cache and forces a fresh search
 */

const ENRICH_API_URL = process.env.ENRICH_API_URL || 'https://www.suplementai.com/api/portal/enrich';

async function testKefirDirect() {
  console.log('='.repeat(60));
  console.log('🧪 Testing Kefir Search Directly (Bypassing Cache)');
  console.log('='.repeat(60));
  console.log('');

  const requestId = `test-${Date.now()}`;
  
  console.log(`📝 Calling: ${ENRICH_API_URL}`);
  console.log(`📝 Request ID: ${requestId}`);
  console.log('');

  try {
    const startTime = Date.now();
    
    const response = await fetch(ENRICH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({
        supplementName: 'Kefir',
        category: 'Kefir',
        forceRefresh: true, // Force refresh to bypass cache
        maxStudies: 10,
        rctOnly: false,
        yearFrom: 2010,
      }),
    });

    const duration = Date.now() - startTime;
    const responseText = await response.text();
    
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log('');

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.log('❌ Response is not JSON:');
      console.log(responseText.substring(0, 500));
      return;
    }

    // Check if successful
    if (data.success) {
      console.log('✅ Request successful');
      console.log('');
      
      const metadata = data.metadata || {};
      console.log('📊 Metadata:');
      console.log(`   Has Real Data: ${metadata.hasRealData || false}`);
      console.log(`   Studies Used: ${metadata.studiesUsed || 0}`);
      console.log(`   Original Query: ${metadata.originalQuery || 'N/A'}`);
      console.log(`   Translated Query: ${metadata.translatedQuery || 'N/A'}`);
      console.log(`   Final Search Term: ${metadata.finalSearchTerm || 'N/A'}`);
      console.log(`   Used Variation: ${metadata.usedVariation || false}`);
      console.log('');

      if (metadata.hasRealData && metadata.studiesUsed > 0) {
        console.log('✅ SUCCESS: Found real data!');
        console.log(`   Studies: ${metadata.studiesUsed}`);
      } else {
        console.log('❌ PROBLEM: No real data found');
        console.log(`   Studies Used: ${metadata.studiesUsed || 0}`);
        console.log(`   Has Real Data: ${metadata.hasRealData || false}`);
      }
    } else {
      console.log('❌ Request failed');
      console.log(`   Error: ${data.error || 'Unknown'}`);
      console.log(`   Message: ${data.message || 'N/A'}`);
      
      if (data.error === 'insufficient_data') {
        console.log('');
        console.log('💡 This means no studies were found in PubMed');
        console.log('   The system tried variations but still found nothing');
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('📋 Full Response (first 1000 chars):');
    console.log('='.repeat(60));
    console.log(JSON.stringify(data, null, 2).substring(0, 1000));
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testKefirDirect().catch(console.error);

