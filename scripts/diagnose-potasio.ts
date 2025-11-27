#!/usr/bin/env ts-node
/**
 * Diagnose Potasio Search Issue
 * Tests the complete flow for "Potasio" (Potassium) search
 */

const SEARCH_API_URL = process.env.SEARCH_API_URL || 
  'https://staging-search-api.execute-api.us-east-1.amazonaws.com/search';

async function testSearchAPI(query: string) {
  console.log(`\n🔍 Testing Search API: "${query}"`);
  console.log('='.repeat(80));
  
  try {
    const url = `${SEARCH_API_URL}?q=${encodeURIComponent(query)}`;
    console.log(`URL: ${url}`);
    
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SuplementIA-Diagnostic/1.0',
      },
    });
    const latency = Date.now() - startTime;
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Latency: ${latency}ms`);
    
    const data = await response.json();
    console.log('\nResponse:');
    console.log(JSON.stringify(data, null, 2));
    
    return { success: response.ok, data, latency };
    
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, error };
  }
}

async function testFrontendAPI(query: string) {
  console.log(`\n🌐 Testing Frontend API: "${query}"`);
  console.log('='.repeat(80));
  
  try {
    const url = `http://localhost:3000/api/portal/search?q=${encodeURIComponent(query)}`;
    console.log(`URL: ${url}`);
    
    const startTime = Date.now();
    const response = await fetch(url);
    const latency = Date.now() - startTime;
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Latency: ${latency}ms`);
    
    const data = await response.json();
    console.log('\nResponse:');
    console.log(JSON.stringify(data, null, 2));
    
    return { success: response.ok, data, latency };
    
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('Note: Make sure dev server is running (npm run dev)');
    return { success: false, error };
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         DIAGNOSTIC: Potasio (Potassium) Search            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const testQueries = [
    'Potasio',
    'potasio',
    'Potassium',
    'potassium',
  ];
  
  // Test 1: Direct Lambda API
  console.log('\n📋 TEST 1: Direct Lambda Search API');
  console.log('='.repeat(80));
  
  for (const query of testQueries) {
    await testSearchAPI(query);
  }
  
  // Test 2: Frontend API (with fallback)
  console.log('\n\n📋 TEST 2: Frontend API (with fallback)');
  console.log('='.repeat(80));
  
  for (const query of testQueries) {
    await testFrontendAPI(query);
  }
  
  // Summary
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      DIAGNOSTIC SUMMARY                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\nPossible Issues:');
  console.log('1. Potasio not indexed in RDS Postgres database');
  console.log('2. Embedding similarity below threshold (0.85)');
  console.log('3. Lambda function error or timeout');
  console.log('4. Cache contains incorrect data');
  console.log('\nNext Steps:');
  console.log('1. Check RDS database: SELECT * FROM supplements WHERE name ILIKE \'%potasio%\'');
  console.log('2. Check discovery queue: Check DynamoDB staging-discovery-queue table');
  console.log('3. Check CloudWatch logs for Lambda errors');
  console.log('4. Run: npm run dev and test in browser');
}

main().catch(console.error);
