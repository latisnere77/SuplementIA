/**
 * Test: Complete Quiz Flow for Selenium
 * Tests the FULL user journey: Quiz submission → Recommendation
 */

const QUIZ_API = 'https://www.suplementai.com/api/portal/quiz';

async function testSeleniumQuizFlow() {
  console.log('='.repeat(80));
  console.log('TESTING: Selenium - Complete Quiz Flow');
  console.log('='.repeat(80));

  const startTime = Date.now();

  try {
    console.log('\n📝 Step 1: Submit Quiz (like user does in browser)');
    console.log('-'.repeat(80));

    const response = await fetch(QUIZ_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'Selenium',
        age: 35,
        gender: 'male',
        location: 'CDMX',
      }),
      signal: AbortSignal.timeout(120000), // 2 min timeout
    });

    const duration = Date.now() - startTime;

    console.log(`\nStatus: ${response.status}`);
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);

    const data = await response.json();

    console.log('\n📊 QUIZ API RESPONSE:');
    console.log('Success:', data.success);
    console.log('Demo:', data.demo);
    console.log('Fallback:', data.fallback);
    console.log('Has Recommendation:', !!data.recommendation);
    console.log('Quiz ID:', data.quiz_id);

    if (data.recommendation) {
      const rec = data.recommendation;

      console.log('\n📈 Recommendation Details:');
      console.log('  ID:', rec.recommendation_id);
      console.log('  Category:', rec.category);

      console.log('\n📊 Evidence Summary:');
      console.log('  totalStudies:', rec.evidence_summary?.totalStudies);
      console.log('  totalParticipants:', rec.evidence_summary?.totalParticipants);

      if (rec.evidence_summary?.ingredients?.[0]) {
        console.log('  First Ingredient:');
        console.log('    name:', rec.evidence_summary.ingredients[0].name);
        console.log('    grade:', rec.evidence_summary.ingredients[0].grade);
        console.log('    studyCount:', rec.evidence_summary.ingredients[0].studyCount);
        console.log('    rctCount:', rec.evidence_summary.ingredients[0].rctCount);
      }

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
      console.log('-'.repeat(80));

      if (data.demo || data.fallback) {
        console.log('🔴 PROBLEM: Quiz API is returning MOCK data');
        console.log('  - demo:', data.demo);
        console.log('  - fallback:', data.fallback);
        console.log('  - This means backend call failed or timed out');
        console.log('  - Check quiz route timeout settings');
      } else if (!rec._enrichment_metadata) {
        console.log('🔴 PROBLEM: No enrichment metadata');
        console.log('  - Backend may not be deployed correctly');
        console.log('  - OR recommend endpoint did not run');
      } else if (rec._enrichment_metadata.hasRealData === false) {
        console.log('🔴 PROBLEM: Backend says no real data');
        console.log('  - studiesUsed:', rec._enrichment_metadata.studiesUsed);
      } else if (rec.evidence_summary?.totalStudies === 85 && rec.evidence_summary?.totalParticipants === 6500) {
        console.log('🔴 PROBLEM: Hardcoded mock data (85 studies, 6500 participants)');
        console.log('  - This is from lib/portal/mockData.ts');
        console.log('  - Even though metadata says hasRealData=true');
        console.log('  - BUG: Mock data being used despite real data available');
      } else {
        console.log('✅ Quiz API is returning REAL data');
        console.log('  - hasRealData:', rec._enrichment_metadata.hasRealData);
        console.log('  - studiesUsed:', rec._enrichment_metadata.studiesUsed);
      }
    } else if (data.status === 'processing') {
      console.log('\n⏳ Recommendation is PROCESSING (async pattern)');
      console.log('  recommendation_id:', data.recommendation_id);
      console.log('  status:', data.status);
      console.log('  This is expected for new async pattern');
    } else {
      console.log('\n❌ NO recommendation in response');
      console.log('  Response keys:', Object.keys(data));
    }

    console.log('\n' + '='.repeat(80));
    console.log('RAW RESPONSE (first 1000 chars):');
    console.log('='.repeat(80));
    console.log(JSON.stringify(data, null, 2).substring(0, 1000));

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('\n❌ ERROR:', error.message);
    console.error('Duration before error:', (duration / 1000).toFixed(2), 's');

    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      console.error('\n🔴 TIMEOUT DETECTED:');
      console.error('  - Quiz endpoint took longer than 120s');
      console.error('  - This will cause quiz route to fall back to mock data');
      console.error('  - Check quiz/route.ts timeout setting (currently 15s)');
    }
  }
}

testSeleniumQuizFlow().catch(console.error);
