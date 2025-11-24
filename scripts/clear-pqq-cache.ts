/**
 * Clear PQQ cache entries
 * 
 * USAGE:
 * 1. Make sure your dev server is running (npm run dev)
 * 2. Run: npx tsx scripts/clear-pqq-cache.ts
 * 
 * OR use curl directly:
 * curl -X POST http://localhost:3000/api/cache/clear -H "Content-Type: application/json" -d '{"type":"all"}'
 */

async function clearPQQCache() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  console.log('🗑️  Clearing PQQ cache...\n');
  
  try {
    // Try to get current cache stats first
    const statsResponse = await fetch(`${baseUrl}/api/cache/stats`);
    
    if (!statsResponse.ok) {
      throw new Error('Server not responding');
    }
    
    const stats = await statsResponse.json();
    
    console.log('📊 Current cache stats:');
    console.log(`   Studies cache: ${stats.studies.size} entries`);
    console.log(`   Enrichment cache: ${stats.enrichment.size} entries`);
    
    // Find PQQ-related keys
    const pqqKeys = [
      ...stats.studies.keys.filter((k: string) => k.toLowerCase().includes('pqq')),
      ...stats.enrichment.keys.filter((k: string) => k.toLowerCase().includes('pqq'))
    ];
    
    console.log(`\n🔍 Found ${pqqKeys.length} PQQ-related cache entries:`);
    pqqKeys.forEach((key: string) => console.log(`   - ${key}`));
    
    if (pqqKeys.length === 0) {
      console.log('\n✅ No PQQ cache entries found. Cache is already clear!');
      console.log('\n💡 If you want to clear ALL cache, run:');
      console.log('   curl -X POST http://localhost:3000/api/cache/clear -H "Content-Type: application/json" -d \'{"type":"all"}\'');
      return;
    }
    
    // Clear PQQ-specific cache entries
    const clearResponse = await fetch(`${baseUrl}/api/cache/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys: pqqKeys })
    });
    
    if (clearResponse.ok) {
      const result = await clearResponse.json();
      console.log('\n✅ PQQ cache cleared successfully!');
      console.log(`   Cleared ${result.keys?.length || 0} entries`);
      console.log('\n🧪 You can now test PQQ with fresh data.');
    } else {
      throw new Error('Clear endpoint failed');
    }
    
  } catch (error: any) {
    if (error.cause?.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running!\n');
      console.log('📝 To clear cache:');
      console.log('   1. Start your dev server: npm run dev');
      console.log('   2. Run this script again: npx tsx scripts/clear-pqq-cache.ts');
      console.log('\n   OR restart the server (cache is in-memory, so restart clears it)');
    } else {
      console.error('\n❌ Error:', error.message);
      console.log('\n💡 Alternative: Restart your dev server to clear all cache');
    }
  }
}

clearPQQCache();
