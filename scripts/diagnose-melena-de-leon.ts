/**
 * Diagnose Melena de León Search Issue
 */

async function diagnoseMelenaDeLeón() {
  console.log('🔍 DIAGNOSING MELENA DE LEÓN SEARCH\n');
  console.log('='.repeat(60));

  const queries = [
    'melena de leon',
    'melena de león', // with accent
    'lions mane',
    'hericium erinaceus',
  ];

  for (const query of queries) {
    console.log(`\n\n📝 Testing: "${query}"`);
    console.log('-'.repeat(60));

    // Test Lambda
    try {
      const studiesUrl = 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';
      
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

      const studiesData = await studiesResponse.json();
      const count = studiesData.data?.studies?.length || 0;
      console.log(`Lambda: ${count} studies found ${count > 0 ? '✅' : '❌'}`);
    } catch (error) {
      console.error('Lambda error:', error);
    }

    // Test Production API
    try {
      const response = await fetch('https://suplementia.vercel.app/api/portal/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: query,
          age: 35,
          gender: 'male',
          location: 'CDMX',
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log(`API: ✅ SUCCESS`);
        console.log(`  Studies: ${data.recommendation?._enrichment_metadata?.studiesUsed}`);
        console.log(`  Name: ${data.recommendation?.supplement?.name}`);
      } else {
        console.log(`API: ❌ FAILED`);
        console.log(`  Error: ${data.error}`);
        console.log(`  Message: ${data.message}`);
      }
    } catch (error) {
      console.error('API error:', error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ DIAGNOSIS COMPLETE\n');
}

diagnoseMelenaDeLeón().catch(console.error);
