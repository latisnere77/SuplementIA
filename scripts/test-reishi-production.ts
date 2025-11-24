/**
 * Test Reishi in Production
 * Tests the complete production flow
 */

async function testReishiProduction() {
  console.log('🧪 TESTING REISHI IN PRODUCTION\n');
  console.log('='.repeat(60));

  const productionUrl = 'https://suplementia.vercel.app';
  
  // Test the recommend endpoint
  console.log('\n📡 Testing /api/portal/recommend');
  console.log('-'.repeat(60));
  
  try {
    const response = await fetch(`${productionUrl}/api/portal/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        category: 'reishi',
        age: 35,
        gender: 'male',
        location: 'CDMX',
      }),
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const data = await response.json();
    console.log('\nResponse:');
    console.log(JSON.stringify(data, null, 2));
    
    if (response.ok && data.success) {
      console.log('\n✅ SUCCESS! Reishi recommendation generated');
      console.log('Supplement name:', data.recommendation?.supplement?.name);
      console.log('Studies used:', data.recommendation?._enrichment_metadata?.studiesUsed);
    } else {
      console.log('\n❌ FAILED');
      console.log('Error:', data.error);
      console.log('Message:', data.message);
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETE\n');
}

testReishiProduction().catch(console.error);
