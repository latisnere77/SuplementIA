#!/usr/bin/env tsx
/**
 * Test Ranking System End-to-End
 * Forces fresh generation with new ranking code
 */

async function testRankingSystem() {
  console.log('🧪 Testing Ranking System End-to-End\n');

  // Step 1: Force fresh enrichment
  console.log('Step 1: Forcing fresh enrichment with ranking...');
  const enrichResponse = await fetch('https://www.suplementai.com/api/portal/enrich', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supplementName: 'l-carnitine',
      forceRefresh: true,
      maxStudies: 10,
    }),
  });

  if (!enrichResponse.ok) {
    console.error('❌ Enrich failed:', enrichResponse.status);
    const error = await enrichResponse.text();
    console.error(error);
    return;
  }

  const enrichData = await enrichResponse.json();
  
  console.log('\n✅ Enrich Response:');
  console.log('  - Success:', enrichData.success);
  console.log('  - Has data:', !!enrichData.data);
  console.log('  - Has studies:', !!enrichData.data?.studies);
  console.log('  - Has ranked:', !!enrichData.data?.studies?.ranked);
  
  if (enrichData.data?.studies?.ranked) {
    const ranked = enrichData.data.studies.ranked;
    console.log('  - Positive studies:', ranked.positive?.length || 0);
    console.log('  - Negative studies:', ranked.negative?.length || 0);
    console.log('  - Consensus:', ranked.metadata?.consensus);
    console.log('  - Confidence:', ranked.metadata?.confidenceScore);
  }

  // Step 2: Test through recommend endpoint
  console.log('\n\nStep 2: Testing through recommend endpoint...');
  const recommendResponse = await fetch('https://www.suplementai.com/api/portal/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'l-carnitine',
      age: 35,
      gender: 'male',
      location: 'CDMX',
    }),
  });

  const recommendData = await recommendResponse.json();
  
  console.log('\n✅ Recommend Response:');
  console.log('  - Success:', recommendData.success);
  console.log('  - Has recommendation:', !!recommendData.recommendation);
  console.log('  - Has metadata:', !!recommendData.recommendation?._enrichment_metadata);
  console.log('  - Has studies:', !!recommendData.recommendation?._enrichment_metadata?.studies);
  console.log('  - Has ranked:', !!recommendData.recommendation?._enrichment_metadata?.studies?.ranked);
  
  if (recommendData.recommendation?._enrichment_metadata?.studies?.ranked) {
    const ranked = recommendData.recommendation._enrichment_metadata.studies.ranked;
    console.log('  - Positive studies:', ranked.positive?.length || 0);
    console.log('  - Negative studies:', ranked.negative?.length || 0);
    console.log('  - Consensus:', ranked.metadata?.consensus);
    console.log('  - Confidence:', ranked.metadata?.confidenceScore);
  }

  // Step 3: Test through quiz endpoint
  console.log('\n\nStep 3: Testing through quiz endpoint...');
  const quizResponse = await fetch('https://www.suplementai.com/api/portal/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'l-carnitina',
      age: 35,
      gender: 'male',
      location: 'CDMX',
    }),
  });

  const quizData = await quizResponse.json();
  
  console.log('\n✅ Quiz Response:');
  console.log('  - Success:', quizData.success);
  console.log('  - Has recommendation:', !!quizData.recommendation);
  console.log('  - Has metadata:', !!quizData.recommendation?._enrichment_metadata);
  console.log('  - Has studies:', !!quizData.recommendation?._enrichment_metadata?.studies);
  console.log('  - Has ranked:', !!quizData.recommendation?._enrichment_metadata?.studies?.ranked);
  
  if (quizData.recommendation?._enrichment_metadata?.studies?.ranked) {
    const ranked = quizData.recommendation._enrichment_metadata.studies.ranked;
    console.log('  - Positive studies:', ranked.positive?.length || 0);
    console.log('  - Negative studies:', ranked.negative?.length || 0);
    console.log('  - Consensus:', ranked.metadata?.consensus);
    console.log('  - Confidence:', ranked.metadata?.confidenceScore);
    
    console.log('\n\n🎉 SUCCESS! Ranking system is working end-to-end!');
  } else {
    console.log('\n\n❌ FAILED: Ranking not present in final response');
  }
}

testRankingSystem().catch(console.error);
