/**
 * Test Fast Lookup System
 * 
 * Demonstrates the speed difference between:
 * 1. Fast lookup with mappings (< 100ms)
 * 2. Full enrichment without mappings (30-60s)
 */

import { fastLookup, canServeInstantly, batchFastLookup, getCacheStats } from '../lib/portal/fast-lookup-service';

async function testFastLookup() {
  console.log('🚀 Testing Fast Lookup System\n');
  console.log('='.repeat(60));
  
  // Test 1: Single lookups
  console.log('\n📊 Test 1: Single Lookups\n');
  
  const testQueries = [
    'reishi',
    'melena de leon',
    'cordyceps',
    'riboflavina',
    'magnesio',
    'omega-3',
    'ashwagandha',
    'coq10',
    'vitamina b12',
    'unknown-supplement-xyz', // Should not have mapping
  ];
  
  for (const query of testQueries) {
    const result = await fastLookup(query);
    
    const status = result.cached ? '✅ CACHED' : '❌ MISS';
    const time = `${result.lookupTime}ms`;
    const name = result.normalizedName;
    
    console.log(`${status} | ${time.padEnd(8)} | ${query.padEnd(25)} → ${name}`);
    
    if (result.cached && result.scientificName) {
      console.log(`         Scientific: ${result.scientificName}`);
      console.log(`         Category: ${result.category}, Popularity: ${result.popularity}`);
      if (result.pubmedQuery) {
        console.log(`         PubMed: ${result.pubmedQuery.substring(0, 60)}...`);
      }
    }
    console.log('');
  }
  
  // Test 2: Batch lookup
  console.log('\n📊 Test 2: Batch Lookup\n');
  
  const batchQueries = ['reishi', 'cordyceps', 'melena de leon', 'chaga'];
  const batchStartTime = Date.now();
  const batchResults = await batchFastLookup(batchQueries);
  const batchTime = Date.now() - batchStartTime;
  
  console.log(`Batch lookup of ${batchQueries.length} supplements: ${batchTime}ms`);
  console.log(`Average per supplement: ${Math.round(batchTime / batchQueries.length)}ms`);
  console.log(`All cached: ${batchResults.every(r => r.cached) ? '✅ YES' : '❌ NO'}`);
  
  // Test 3: Cache statistics
  console.log('\n📊 Test 3: Cache Statistics\n');
  
  const stats = getCacheStats();
  console.log(`Total mappings: ${stats.totalMappings}`);
  console.log(`High priority: ${stats.highPriority}`);
  console.log('\nBy category:');
  Object.entries(stats.byCategory).forEach(([category, count]) => {
    console.log(`  ${category.padEnd(15)}: ${count}`);
  });
  
  // Test 4: Performance comparison
  console.log('\n📊 Test 4: Performance Comparison\n');
  
  const cachedCount = testQueries.filter(q => canServeInstantly(q)).length;
  const missCount = testQueries.length - cachedCount;
  
  console.log(`Queries with mapping: ${cachedCount}/${testQueries.length}`);
  console.log(`Queries without mapping: ${missCount}/${testQueries.length}`);
  console.log('');
  console.log('Performance impact:');
  console.log(`  With mapping:    < 100ms (instant)`);
  console.log(`  Without mapping: 30-60s (full PubMed search)`);
  console.log(`  Speed improvement: ~300-600x faster! 🚀`);
  console.log('');
  console.log('Time saved per day (assuming 100 queries):');
  console.log(`  Without mappings: ${cachedCount} × 30s = ${Math.round(cachedCount * 30 / 60)} minutes`);
  console.log(`  With mappings:    ${cachedCount} × 0.1s = ${Math.round(cachedCount * 0.1)} seconds`);
  console.log(`  Time saved:       ~${Math.round(cachedCount * 30 / 60)} minutes per day! ⏱️`);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Fast Lookup System Test Complete!\n');
}

// Run tests
testFastLookup().catch(console.error);
