/**
 * Script to invalidate cache for fake/non-existent supplements
 * Run this to clear out any mock data that was generated before the strict validation was implemented
 */

import { invalidateCachedEvidence } from '../lib/services/dynamodb-cache';

const FAKE_SUPPLEMENTS = [
  'Q20',
  'Q40',
  'Q10', // might be confused with CoQ10
  'Q30',
  'Q50',
  'XYZ',
  'ABC123',
  'test',
  'TEST',
  'Enzima q15',
  'enzima q15',
  'enzima q12',
  'Enzima q12',
];

async function main() {
  console.log('='.repeat(60));
  console.log('🗑️  Invalidating Fake Supplement Caches');
  console.log('='.repeat(60));
  console.log('');

  const results = {
    successful: [] as string[],
    failed: [] as string[],
  };

  for (const supplement of FAKE_SUPPLEMENTS) {
    try {
      console.log(`[${FAKE_SUPPLEMENTS.indexOf(supplement) + 1}/${FAKE_SUPPLEMENTS.length}] Invalidating: ${supplement}`);
      await invalidateCachedEvidence(supplement);
      results.successful.push(supplement);
      console.log(`  ✅ ${supplement} cache invalidated`);
    } catch (error: any) {
      results.failed.push(supplement);
      console.log(`  ❌ ${supplement} failed: ${error.message}`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${results.successful.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log('');

  if (results.successful.length > 0) {
    console.log('✅ Successfully invalidated:');
    results.successful.forEach(s => console.log(`   - ${s}`));
  }

  if (results.failed.length > 0) {
    console.log('');
    console.log('❌ Failed to invalidate:');
    results.failed.forEach(s => console.log(`   - ${s}`));
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Cache Invalidation Complete');
  console.log('='.repeat(60));
  console.log('');
  console.log('Next time someone searches for these terms:');
  console.log('1. System will try to find real PubMed studies');
  console.log('2. If no studies found → Returns 404 with helpful message');
  console.log('3. NO fake data will be generated');
}

main().catch(console.error);
