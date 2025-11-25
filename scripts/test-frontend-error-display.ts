#!/usr/bin/env tsx
/**
 * Manual Testing Script for Frontend Error Display Fix
 * Tests various supplements to verify error handling works correctly
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const CACHE_TABLE = process.env.DYNAMODB_CACHE_TABLE || 'SupplementCache';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface TestCase {
  name: string;
  query: string;
  expectedBehavior: 'success' | 'educational_error' | 'system_error';
  description: string;
}

const testCases: TestCase[] = [
  {
    name: 'Ashwagandha',
    query: 'ashwagandha',
    expectedBehavior: 'success',
    description: 'Should display recommendation with studies'
  },
  {
    name: 'Omega-3',
    query: 'omega-3',
    expectedBehavior: 'success',
    description: 'Should display recommendation with studies'
  },
  {
    name: 'Vitamin D',
    query: 'vitamin d',
    expectedBehavior: 'success',
    description: 'Should display recommendation with studies'
  },
  {
    name: 'Magnesium',
    query: 'magnesium',
    expectedBehavior: 'success',
    description: 'Should display recommendation with studies'
  },
  {
    name: 'Rutina',
    query: 'rutina',
    expectedBehavior: 'educational_error',
    description: 'Should show educational error with suggestions'
  },
  {
    name: 'Quercetin',
    query: 'quercetin',
    expectedBehavior: 'educational_error',
    description: 'Should show educational error with suggestions'
  }
];

async function clearCache(supplementName: string): Promise<void> {
  const cacheKey = `supplement:${supplementName.toLowerCase().trim()}`;
  
  try {
    await docClient.send(new DeleteCommand({
      TableName: CACHE_TABLE,
      Key: { cacheKey }
    }));
    console.log(`✅ Cleared cache for: ${supplementName}`);
  } catch (error) {
    console.log(`ℹ️  No cache to clear for: ${supplementName}`);
  }
}

async function checkCache(supplementName: string): Promise<any> {
  const cacheKey = `supplement:${supplementName.toLowerCase().trim()}`;
  
  try {
    const result = await docClient.send(new GetCommand({
      TableName: CACHE_TABLE,
      Key: { cacheKey }
    }));
    
    return result.Item;
  } catch (error) {
    return null;
  }
}

async function testRecommendAPI(query: string): Promise<any> {
  const url = `${API_BASE_URL}/api/portal/recommend?query=${encodeURIComponent(query)}`;
  
  console.log(`\n🔍 Testing: ${query}`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${data.success}`);
    
    if (data.success && data.recommendation) {
      const rec = data.recommendation;
      const metadata = rec._enrichment_metadata || {};
      const totalStudies = rec.evidence_summary?.totalStudies || 0;
      
      console.log(`   ✅ Recommendation ID: ${rec.recommendation_id}`);
      console.log(`   📊 Total Studies: ${totalStudies}`);
      console.log(`   📊 Studies Used: ${metadata.studiesUsed || 0}`);
      console.log(`   🔬 Has Real Data: ${metadata.hasRealData}`);
      console.log(`   📦 Category: ${rec.category}`);
      
      return {
        status: 'success',
        hasRealData: metadata.hasRealData,
        totalStudies,
        response: data
      };
    } else if (response.status === 404 && data.error === 'insufficient_data') {
      console.log(`   ⚠️  Insufficient data error`);
      console.log(`   💡 Suggestions: ${data.suggestions?.join(', ') || 'none'}`);
      
      return {
        status: 'educational_error',
        suggestions: data.suggestions,
        response: data
      };
    } else {
      console.log(`   ❌ Error: ${data.error || 'Unknown error'}`);
      
      return {
        status: 'system_error',
        error: data.error,
        response: data
      };
    }
  } catch (error) {
    console.log(`   ❌ Network error: ${error}`);
    
    return {
      status: 'system_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function runTest(testCase: TestCase): Promise<boolean> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${testCase.name}`);
  console.log(`Expected: ${testCase.expectedBehavior}`);
  console.log(`Description: ${testCase.description}`);
  console.log('='.repeat(60));
  
  // Clear cache first
  await clearCache(testCase.query);
  
  // Test API
  const result = await testRecommendAPI(testCase.query);
  
  // Verify result matches expected behavior
  let passed = false;
  
  if (testCase.expectedBehavior === 'success') {
    passed = result.status === 'success' && result.hasRealData === true;
    
    if (passed) {
      console.log(`\n✅ PASSED: ${testCase.name} returned valid recommendation with studies`);
    } else {
      console.log(`\n❌ FAILED: ${testCase.name} did not return valid recommendation`);
      console.log(`   Expected: success with real data`);
      console.log(`   Got: ${result.status}, hasRealData: ${result.hasRealData}`);
    }
  } else if (testCase.expectedBehavior === 'educational_error') {
    passed = result.status === 'educational_error' && result.suggestions && result.suggestions.length > 0;
    
    if (passed) {
      console.log(`\n✅ PASSED: ${testCase.name} returned educational error with suggestions`);
    } else {
      console.log(`\n❌ FAILED: ${testCase.name} did not return educational error`);
      console.log(`   Expected: educational_error with suggestions`);
      console.log(`   Got: ${result.status}`);
    }
  } else if (testCase.expectedBehavior === 'system_error') {
    passed = result.status === 'system_error';
    
    if (passed) {
      console.log(`\n✅ PASSED: ${testCase.name} returned system error`);
    } else {
      console.log(`\n❌ FAILED: ${testCase.name} did not return system error`);
      console.log(`   Expected: system_error`);
      console.log(`   Got: ${result.status}`);
    }
  }
  
  return passed;
}

async function testCachePersistence(query: string): Promise<boolean> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: Cache Persistence for ${query}`);
  console.log('='.repeat(60));
  
  // Clear cache
  await clearCache(query);
  
  // First call - should fetch from API
  console.log('\n1️⃣  First call (no cache):');
  const result1 = await testRecommendAPI(query);
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check cache
  console.log('\n2️⃣  Checking cache:');
  const cached = await checkCache(query);
  
  if (cached) {
    console.log(`   ✅ Cache exists`);
    console.log(`   📦 Cache Key: ${cached.cacheKey}`);
    console.log(`   ⏰ Timestamp: ${new Date(cached.timestamp).toISOString()}`);
  } else {
    console.log(`   ❌ No cache found`);
    return false;
  }
  
  // Second call - should use cache
  console.log('\n3️⃣  Second call (with cache):');
  const result2 = await testRecommendAPI(query);
  
  const passed = result1.status === result2.status;
  
  if (passed) {
    console.log(`\n✅ PASSED: Cache persistence works correctly`);
  } else {
    console.log(`\n❌ FAILED: Cache persistence issue`);
  }
  
  return passed;
}

async function testStaleCacheHandling(query: string): Promise<boolean> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: Stale Cache Handling for ${query}`);
  console.log('='.repeat(60));
  
  const cacheKey = `supplement:${query.toLowerCase().trim()}`;
  
  // Create stale cache entry (expired)
  const staleData = {
    cacheKey,
    data: {
      recommendation: {
        recommendation_id: 'stale-123',
        category: query,
        evidence_summary: { totalStudies: 0 },
        _enrichment_metadata: { hasRealData: false }
      }
    },
    timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago (expired)
    ttl: Math.floor(Date.now() / 1000) - 3600 // Already expired
  };
  
  console.log('\n1️⃣  Creating stale cache entry:');
  await docClient.send(new PutCommand({
    TableName: CACHE_TABLE,
    Item: staleData
  }));
  console.log(`   ✅ Stale cache created (25 hours old)`);
  
  // Test API - should detect stale cache and fetch fresh
  console.log('\n2️⃣  Testing with stale cache:');
  const result = await testRecommendAPI(query);
  
  // Check if fresh data was fetched
  const passed = result.status === 'success' && result.hasRealData === true;
  
  if (passed) {
    console.log(`\n✅ PASSED: Stale cache was detected and fresh data fetched`);
  } else {
    console.log(`\n❌ FAILED: Stale cache handling issue`);
  }
  
  // Clean up
  await clearCache(query);
  
  return passed;
}

async function main() {
  console.log('🧪 Frontend Error Display Fix - Manual Testing Suite');
  console.log('====================================================\n');
  
  const results: { test: string; passed: boolean }[] = [];
  
  // Test all basic cases
  for (const testCase of testCases) {
    const passed = await runTest(testCase);
    results.push({ test: testCase.name, passed });
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Test cache persistence
  const cachePassed = await testCachePersistence('ashwagandha');
  results.push({ test: 'Cache Persistence', passed: cachePassed });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test stale cache handling
  const stalePassed = await testStaleCacheHandling('magnesium');
  results.push({ test: 'Stale Cache Handling', passed: stalePassed });
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.test}`);
  });
  
  console.log(`\n${passed}/${total} tests passed (${Math.round(passed / total * 100)}%)`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
