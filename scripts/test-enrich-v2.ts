/**
 * Test script for enrich-v2 endpoint
 * Tests the new simplified enrichment endpoint
 */

const BASE_URL = process.env.BASE_URL || 'https://www.suplementai.com';

async function testEnrichV2(supplementName: string) {
  console.log(`\n🧪 Testing enrich-v2 with: ${supplementName}`);
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/portal/enrich-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplementName,
        maxStudies: 5,
      }),
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    console.log(`\n📊 Response (${duration}ms):`);
    console.log(`Status: ${response.status}`);
    console.log(`Success: ${data.success}`);
    
    if (data.success) {
      console.log(`✅ SUCCESS`);
      console.log(`Studies: ${data.metadata?.studiesCount || 'unknown'}`);
      console.log(`Request ID: ${data.metadata?.requestId}`);
      console.log(`Version: ${data.metadata?.version}`);
      
      if (data.supplement) {
        console.log(`\nSupplement Data:`);
        console.log(`- Name: ${data.supplement.name}`);
        console.log(`- Benefits: ${data.supplement.benefits?.length || 0}`);
        console.log(`- Side Effects: ${data.supplement.sideEffects?.length || 0}`);
      }
    } else {
      console.log(`❌ FAILED`);
      console.log(`Error: ${data.error}`);
      console.log(`Message: ${data.message}`);
      console.log(`Request ID: ${data.requestId}`);
    }
    
    return data;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`\n💥 ERROR (${duration}ms):`);
    console.log(error.message);
    throw error;
  }
}

async function testQuizFlow(category: string) {
  console.log(`\n🎯 Testing full quiz flow with: ${category}`);
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/portal/quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        category,
        age: 35,
        gender: 'male',
        location: 'CDMX',
      }),
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    console.log(`\n📊 Response (${duration}ms):`);
    console.log(`Status: ${response.status}`);
    console.log(`Success: ${data.success}`);
    
    if (data.success) {
      console.log(`✅ SUCCESS`);
      console.log(`Quiz ID: ${data.quiz_id}`);
      
      if (data.recommendation) {
        console.log(`\nRecommendation:`);
        console.log(`- Supplement: ${data.recommendation.supplement?.name}`);
        console.log(`- Benefits: ${data.recommendation.supplement?.benefits?.length || 0}`);
      }
    } else {
      console.log(`❌ FAILED`);
      console.log(`Error: ${data.error}`);
      console.log(`Message: ${data.message}`);
    }
    
    return data;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`\n💥 ERROR (${duration}ms):`);
    console.log(error.message);
    throw error;
  }
}

async function testStudiesLambda(supplementName: string) {
  console.log(`\n🔬 Testing studies-fetcher Lambda directly: ${supplementName}`);
  console.log('='.repeat(60));
  
  const LAMBDA_URL = 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';
  const startTime = Date.now();
  
  try {
    const response = await fetch(LAMBDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplementName,
        maxResults: 10,
        rctOnly: false,
        yearFrom: 2010,
        humanStudiesOnly: true,
      }),
    });
    
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    console.log(`\n📊 Lambda Response (${duration}ms):`);
    console.log(`Status: ${response.status}`);
    console.log(`Studies found: ${data.studies?.length || 0}`);
    
    if (data.studies && data.studies.length > 0) {
      console.log(`✅ Lambda is working`);
      console.log(`\nFirst study:`);
      console.log(`- Title: ${data.studies[0].title?.substring(0, 80)}...`);
      console.log(`- Year: ${data.studies[0].year}`);
      console.log(`- PMID: ${data.studies[0].pmid}`);
    } else {
      console.log(`⚠️  No studies found`);
      console.log(`Message: ${data.message || 'No message'}`);
    }
    
    return data;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`\n💥 Lambda ERROR (${duration}ms):`);
    console.log(error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting enrich-v2 tests...\n');
  
  const supplements = [
    'Creatine',
    'Vitamin D',
    'Omega-3',
    'Magnesium',
    'Ashwagandha',
  ];
  
  // Test 1: Direct Lambda
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Direct Lambda Tests');
  console.log('='.repeat(60));
  
  for (const supplement of supplements.slice(0, 2)) {
    try {
      await testStudiesLambda(supplement);
    } catch (error) {
      console.log(`Failed to test ${supplement}`);
    }
  }
  
  // Test 2: Enrich-v2 endpoint
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Enrich-v2 Endpoint Tests');
  console.log('='.repeat(60));
  
  for (const supplement of supplements.slice(0, 2)) {
    try {
      await testEnrichV2(supplement);
    } catch (error) {
      console.log(`Failed to test ${supplement}`);
    }
  }
  
  // Test 3: Full quiz flow
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Full Quiz Flow Tests');
  console.log('='.repeat(60));
  
  for (const supplement of supplements.slice(0, 2)) {
    try {
      await testQuizFlow(supplement);
    } catch (error) {
      console.log(`Failed to test ${supplement}`);
    }
  }
  
  console.log('\n✨ Tests completed!\n');
}

main().catch(console.error);
