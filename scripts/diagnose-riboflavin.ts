/**
 * Diagnose Riboflavin Search Issue
 */

async function diagnoseRiboflavin() {
  console.log('🔍 DIAGNOSING RIBOFLAVIN SEARCH\n');
  console.log('='.repeat(60));

  const queries = [
    'riboflavin',
    'Riboflavin',
    'vitamin b2',
    'Vitamin B2',
    'vitamina b2',
  ];

  for (const query of queries) {
    console.log(`\n\n📝 Testing: "${query}"`);
    console.log('-'.repeat(60));

    // Test Lambda Studies Fetcher
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
      console.log(`Lambda: ${count} studies ${count > 0 ? '✅' : '❌'}`);
      
      if (count > 0) {
        console.log('Sample titles:');
        studiesData.data.studies.slice(0, 2).forEach((s: any, i: number) => {
          console.log(`  ${i + 1}. ${s.title?.substring(0, 80)}...`);
        });
      }
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
        console.log(`API: ❌ FAILED (${response.status})`);
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

diagnoseRiboflavin().catch(console.error);
