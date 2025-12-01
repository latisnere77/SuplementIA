/**
 * Validation Script for Simple Ingredient Search
 * 
 * Tests that the system can find common ingredients without normalization
 * Examples: calcio, magnesio, vitamina d, omega 3, etc.
 */

import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_SEARCH_API_URL || 
  'https://staging-search-api.execute-api.us-east-1.amazonaws.com/search';

interface SearchResult {
  ingredient: string;
  found: boolean;
  supplementName?: string;
  latency?: number;
  source?: string;
  cacheHit?: boolean;
  error?: string;
}

/**
 * Test a single ingredient search
 */
async function testIngredient(ingredient: string): Promise<SearchResult> {
  try {
    const url = `${API_BASE_URL}?q=${encodeURIComponent(ingredient)}`;
    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const latency = Date.now() - startTime;
    const data = await response.json();
    
    if (response.status === 200 && data.success && data.supplement) {
      return {
        ingredient,
        found: true,
        supplementName: data.supplement.name,
        latency,
        source: data.source,
        cacheHit: data.cacheHit,
      };
    } else if (response.status === 404) {
      return {
        ingredient,
        found: false,
        error: data.message || 'Not found',
      };
    } else {
      return {
        ingredient,
        found: false,
        error: `Status ${response.status}: ${data.error || data.message || 'Unknown error'}`,
      };
    }
  } catch (error) {
    return {
      ingredient,
      found: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Run validation tests
 */
async function runValidation() {
  console.log('🧪 Validating Simple Ingredient Search\n');
  console.log('Testing common ingredients without normalization');
  console.log('API Endpoint:', API_BASE_URL);
  console.log('='.repeat(70));
  
  // Test ingredients - common supplements in Spanish
  const testIngredients = [
    'calcio',
    'magnesio',
    'vitamina d',
    'vitamina c',
    'omega 3',
    'zinc',
    'hierro',
    'vitamina b12',
    'colageno',
    'probioticos',
    'melatonina',
    'ashwagandha',
    'curcuma',
    'glucosamina',
    'biotina',
  ];
  
  console.log(`\nTesting ${testIngredients.length} ingredients...\n`);
  
  const results: SearchResult[] = [];
  
  for (const ingredient of testIngredients) {
    process.stdout.write(`Testing "${ingredient}"... `);
    const result = await testIngredient(ingredient);
    results.push(result);
    
    if (result.found) {
      console.log(`✅ Found: ${result.supplementName} (${result.latency}ms)`);
    } else {
      console.log(`❌ Not found: ${result.error}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Summary\n');
  
  const found = results.filter(r => r.found);
  const notFound = results.filter(r => !r.found);
  
  console.log(`✅ Found: ${found.length}/${testIngredients.length}`);
  console.log(`❌ Not found: ${notFound.length}/${testIngredients.length}`);
  
  if (found.length > 0) {
    console.log('\n✅ Successfully found ingredients:');
    found.forEach(r => {
      console.log(`   • ${r.ingredient} → ${r.supplementName}`);
      console.log(`     Latency: ${r.latency}ms | Source: ${r.source} | Cache: ${r.cacheHit}`);
    });
  }
  
  if (notFound.length > 0) {
    console.log('\n❌ Not found ingredients:');
    notFound.forEach(r => {
      console.log(`   • ${r.ingredient}: ${r.error}`);
    });
  }
  
  // Performance stats
  if (found.length > 0) {
    const latencies = found.map(r => r.latency!);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);
    
    console.log('\n⚡ Performance:');
    console.log(`   Average: ${avgLatency.toFixed(0)}ms`);
    console.log(`   Min: ${minLatency}ms`);
    console.log(`   Max: ${maxLatency}ms`);
  }
  
  // Cache stats
  const cacheHits = found.filter(r => r.cacheHit).length;
  const cacheMisses = found.filter(r => !r.cacheHit).length;
  
  if (found.length > 0) {
    console.log('\n💾 Cache:');
    console.log(`   Hits: ${cacheHits}`);
    console.log(`   Misses: ${cacheMisses}`);
    console.log(`   Hit rate: ${((cacheHits / found.length) * 100).toFixed(1)}%`);
  }
  
  console.log('\n' + '='.repeat(70));
  
  // Exit code
  const successRate = (found.length / testIngredients.length) * 100;
  
  if (successRate >= 80) {
    console.log(`\n✅ VALIDATION PASSED (${successRate.toFixed(0)}% success rate)\n`);
    process.exit(0);
  } else if (successRate >= 50) {
    console.log(`\n⚠️  VALIDATION WARNING (${successRate.toFixed(0)}% success rate)\n`);
    console.log('Some ingredients not found. This may be expected if they haven\'t been indexed yet.\n');
    process.exit(0);
  } else {
    console.log(`\n❌ VALIDATION FAILED (${successRate.toFixed(0)}% success rate)\n`);
    console.log('Most ingredients not found. Please check:');
    console.log('  1. Is the API endpoint correct?');
    console.log('  2. Has the database been populated?');
    console.log('  3. Is the search service running?\n');
    process.exit(1);
  }
}

// Check if API is accessible first
async function checkAPIAccessibility(): Promise<boolean> {
  try {
    const response = await fetch(API_BASE_URL + '?q=test', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
(async () => {
  console.log('🔍 Checking API accessibility...\n');
  const isAccessible = await checkAPIAccessibility();
  
  if (!isAccessible) {
    console.log('⚠️  API Gateway endpoint is not accessible\n');
    console.log('Please ensure:');
    console.log('  1. Infrastructure is deployed (cd infrastructure && ./deploy-staging.sh)');
    console.log('  2. NEXT_PUBLIC_SEARCH_API_URL is set in .env.local');
    console.log('  3. API Gateway is configured correctly\n');
    process.exit(1);
  }
  
  console.log('✓ API is accessible\n');
  await runValidation();
})().catch(error => {
  console.error('Error running validation:', error);
  process.exit(1);
});
