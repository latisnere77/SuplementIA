/**
 * Script to invalidate HMB cache in DynamoDB
 * This forces the system to regenerate with the new abbreviation expansion system
 */

import { invalidateCachedEvidence } from '../lib/services/dynamodb-cache';

async function main() {
  console.log('='.repeat(60));
  console.log('🗑️  Invalidating HMB Cache');
  console.log('='.repeat(60));

  try {
    // Invalidate HMB cache
    console.log('\n[1/2] Invalidating HMB cache...');
    await invalidateCachedEvidence('HMB');
    console.log('✅ HMB cache invalidated successfully');

    // Also invalidate lowercase variant just in case
    console.log('\n[2/2] Invalidating hmb cache (lowercase)...');
    await invalidateCachedEvidence('hmb');
    console.log('✅ hmb cache invalidated successfully');

    console.log('\n' + '='.repeat(60));
    console.log('✅ Cache Invalidation Complete');
    console.log('='.repeat(60));
    console.log('\nNext time someone searches for HMB:');
    console.log('1. System will detect it\'s an abbreviation');
    console.log('2. Claude Haiku will expand to "beta-hydroxy beta-methylbutyrate"');
    console.log('3. PubMed search will find high-quality studies');
    console.log('4. Claude Sonnet will analyze and generate Grade A/B recommendation');
    console.log('5. Result will be cached for 30 days');

  } catch (error) {
    console.error('\n❌ Error invalidating cache:', error);
    process.exit(1);
  }
}

main();
