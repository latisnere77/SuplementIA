#!/usr/bin/env tsx
/**
 * Diagnose 500 Error in Search Flow
 * Tests each step of the search → quiz → recommend → enrich chain
 */

const SEARCH_TERM = 'vitamina d';

async function testSearchAPI() {
  console.log('\n🔍 Testing /api/portal/search...');
  try {
    const response = await fetch(`http://localhost:3000/api/portal/search?q=${encodeURIComponent(SEARCH_TERM)}`);
    const data = await response.json();
    console.log(`✅ Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    return { success: response.ok, data };
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testQuizAPI() {
  console.log('\n📝 Testing /api/portal/quiz...');
  try {
    const response = await fetch('http://localhost:3000/api/portal/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: SEARCH_TERM,
        age: 35,
        gender: 'male',
        location: 'CDMX',
      }),
    });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    return { success: response.ok, data, status: response.status };
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testRecommendAPI() {
  console.log('\n💡 Testing /api/portal/recommend...');
  try {
    const response = await fetch('http://localhost:3000/api/portal/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: SEARCH_TERM,
        age: 35,
        gender: 'male',
        location: 'CDMX',
      }),
    });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    return { success: response.ok, data, status: response.status };
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testEnrichV2API() {
  console.log('\n🔬 Testing /api/portal/enrich-v2...');
  try {
    const response = await fetch('http://localhost:3000/api/portal/enrich-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: SEARCH_TERM,
        maxStudies: 10,
        category: SEARCH_TERM,
      }),
    });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    return { success: response.ok, data, status: response.status };
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testStudiesLambda() {
  console.log('\n📚 Testing Studies Lambda directly...');
  const url = process.env.STUDIES_API_URL || 
    'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: SEARCH_TERM,
        maxResults: 10,
        rctOnly: false,
        yearFrom: 2010,
      }),
    });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    return { success: response.ok, data, status: response.status };
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testEnricherLambda() {
  console.log('\n🤖 Testing Enricher Lambda directly...');
  const url = process.env.ENRICHER_API_URL ||
    'https://l7mve4qnytdpxfcyu46cyly5le0vdqgx.lambda-url.us-east-1.on.aws/';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementId: SEARCH_TERM,
        category: 'vitamins',
        forceRefresh: false,
        studies: [
          {
            title: 'Test study',
            abstract: 'Test abstract',
            year: 2020,
          }
        ],
      }),
    });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    return { success: response.ok, data, status: response.status };
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 Diagnosing 500 Error in Search Flow');
  console.log('========================================\n');
  console.log(`Search term: "${SEARCH_TERM}"`);
  
  // Test each layer
  const results = {
    search: await testSearchAPI(),
    quiz: await testQuizAPI(),
    recommend: await testRecommendAPI(),
    enrichV2: await testEnrichV2API(),
    studiesLambda: await testStudiesLambda(),
    enricherLambda: await testEnricherLambda(),
  };
  
  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('==========');
  console.log(`Search API:        ${results.search.success ? '✅' : '❌'}`);
  console.log(`Quiz API:          ${results.quiz.success ? '✅' : '❌'} (${results.quiz.status})`);
  console.log(`Recommend API:     ${results.recommend.success ? '✅' : '❌'} (${results.recommend.status})`);
  console.log(`Enrich-v2 API:     ${results.enrichV2.success ? '✅' : '❌'} (${results.enrichV2.status})`);
  console.log(`Studies Lambda:    ${results.studiesLambda.success ? '✅' : '❌'} (${results.studiesLambda.status})`);
  console.log(`Enricher Lambda:   ${results.enricherLambda.success ? '✅' : '❌'} (${results.enricherLambda.status})`);
  
  // Identify failure point
  console.log('\n🎯 FAILURE POINT:');
  if (!results.enricherLambda.success) {
    console.log('❌ Enricher Lambda is failing');
    console.log('   This is the content-enricher Lambda that uses Claude');
  } else if (!results.studiesLambda.success) {
    console.log('❌ Studies Lambda is failing');
    console.log('   This is the studies-fetcher Lambda that queries PubMed');
  } else if (!results.enrichV2.success) {
    console.log('❌ Enrich-v2 API is failing');
    console.log('   Check the Next.js API route');
  } else if (!results.recommend.success) {
    console.log('❌ Recommend API is failing');
    console.log('   Check the transformation logic');
  } else if (!results.quiz.success) {
    console.log('❌ Quiz API is failing');
    console.log('   Check the quiz endpoint');
  } else {
    console.log('✅ All endpoints working!');
  }
}

main().catch(console.error);
