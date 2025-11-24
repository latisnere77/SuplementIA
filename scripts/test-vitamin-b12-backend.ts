/**
 * Test: Verificar si backend retorna datos reales para Vitamin B12
 */

const QUIZ_API = 'https://www.suplementai.com/api/portal/quiz';

async function testVitaminB12Backend() {
  console.log('='.repeat(80));
  console.log('TESTING: Vitamin B12 - Backend Response');
  console.log('='.repeat(80));

  try {
    const response = await fetch(QUIZ_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'Vitamin B12',
        age: 35,
        gender: 'male',
        location: 'CDMX',
      }),
    });

    console.log(`\nStatus: ${response.status}`);

    const data = await response.json();

    console.log('\n📊 BACKEND RESPONSE:');
    console.log('Success:', data.success);
    console.log('Demo:', data.demo);
    console.log('Fallback:', data.fallback);

    if (data.recommendation) {
      const rec = data.recommendation;

      console.log('\n📈 Evidence Summary:');
      console.log('  totalStudies:', rec.evidence_summary?.totalStudies);
      console.log('  totalParticipants:', rec.evidence_summary?.totalParticipants);

      console.log('\n🔍 Enrichment Metadata:');
      if (rec._enrichment_metadata) {
        console.log('  hasRealData:', rec._enrichment_metadata.hasRealData);
        console.log('  studiesUsed:', rec._enrichment_metadata.studiesUsed);
        console.log('  intelligentSystem:', rec._enrichment_metadata.intelligentSystem);
        console.log('  source:', rec._enrichment_metadata.source);
        console.log('  fallback:', rec._enrichment_metadata.fallback);
      } else {
        console.log('  ❌ NO METADATA FOUND');
      }

      console.log('\n📊 DIAGNOSIS:');
      if (data.demo || data.fallback) {
        console.log('  🔴 PROBLEM: Backend is returning MOCK data');
        console.log('  - demo:', data.demo);
        console.log('  - fallback:', data.fallback);
        console.log('  - This means backend failed and used fallback');
      } else if (!rec._enrichment_metadata) {
        console.log('  🔴 PROBLEM: No enrichment metadata');
        console.log('  - Backend may not be deployed correctly');
      } else if (rec._enrichment_metadata.hasRealData === false) {
        console.log('  🔴 PROBLEM: Backend says no real data');
        console.log('  - studiesUsed:', rec._enrichment_metadata.studiesUsed);
      } else {
        console.log('  ✅ Backend is returning REAL data');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('RAW RESPONSE (first 500 chars):');
    console.log('='.repeat(80));
    console.log(JSON.stringify(data, null, 2).substring(0, 500));

  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
  }
}

testVitaminB12Backend();
