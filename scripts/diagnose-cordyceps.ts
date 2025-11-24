/**
 * Diagnose Cordyceps Search Issue
 * Tests the complete flow for "cordyceps" supplement search
 */

async function diagnoseCordyceps() {
  console.log('🔍 DIAGNOSING CORDYCEPS SEARCH ISSUE\n');
  console.log('='.repeat(60));

  const query = 'cordyceps';

  // Step 1: Test Lambda Studies Fetcher directly
  console.log('\n🔬 Step 1: Testing Lambda Studies Fetcher');
  console.log('-'.repeat(60));
  try {
    const studiesUrl = 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';
    console.log('Calling:', studiesUrl);
    console.log('Query:', query);
    
    const studiesResponse = await fetch(studiesUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: query,
        maxResults: 10,
        rctOnly: false,
        yearFrom: 2010,
        humanStudiesOnly: true,
      }),
    });

    console.log('Status:', studiesResponse.status);
    const studiesData = await studiesResponse.json();
    console.log('Studies found:', studiesData.data?.studies?.length || 0);
    
    if (studiesData.data?.studies?.length > 0) {
      console.log('\n✅ Studies found! Sample titles:');
      studiesData.data.studies.slice(0, 3).forEach((study: any, idx: number) => {
        console.log(`${idx + 1}. ${study.title?.substring(0, 100)}...`);
      });
    } else {
      console.log('\n❌ No studies found');
      console.log('Response:', JSON.stringify(studiesData, null, 2));
    }
  } catch (error) {
    console.error('❌ Lambda call failed:', error);
  }

  // Step 2: Test Production API
  console.log('\n\n🌐 Step 2: Testing Production API');
  console.log('-'.repeat(60));
  
  try {
    const productionUrl = 'https://suplementia.vercel.app';
    console.log('Calling:', `${productionUrl}/api/portal/recommend`);
    
    const response = await fetch(`${productionUrl}/api/portal/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        category: query,
        age: 35,
        gender: 'male',
        location: 'CDMX',
      }),
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('\n✅ SUCCESS! Cordyceps recommendation generated');
      console.log('Supplement name:', data.recommendation?.supplement?.name);
      console.log('Studies used:', data.recommendation?._enrichment_metadata?.studiesUsed);
      console.log('Has real data:', data.recommendation?._enrichment_metadata?.hasRealData);
    } else {
      console.log('\n❌ FAILED');
      console.log('Error:', data.error);
      console.log('Message:', data.message);
      console.log('\nFull response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error);
  }

  // Step 3: Test with alternative terms
  console.log('\n\n🔄 Step 3: Testing Alternative Terms');
  console.log('-'.repeat(60));
  const alternatives = [
    'cordyceps sinensis',
    'cordyceps militaris',
    'caterpillar fungus',
  ];

  for (const term of alternatives) {
    try {
      console.log(`\nTrying: "${term}"`);
      const studiesUrl = 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';
      
      const response = await fetch(studiesUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplementName: term,
          maxResults: 10,
          rctOnly: false,
          yearFrom: 2010,
          humanStudiesOnly: true,
        }),
      });

      const data = await response.json();
      const count = data.data?.studies?.length || 0;
      console.log(`  → Found ${count} studies`);
      
      if (count > 0) {
        console.log(`  ✅ SUCCESS with "${term}"`);
      }
    } catch (error) {
      console.error(`  ❌ Error with "${term}":`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ DIAGNOSIS COMPLETE\n');
}

diagnoseCordyceps().catch(console.error);
