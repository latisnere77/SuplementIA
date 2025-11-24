/**
 * Test script to validate Kefir search behavior
 * Tests the intelligent search variation system
 */

import { generateSearchVariations } from '../lib/services/abbreviation-expander';

async function testKefirSearch() {
  console.log('='.repeat(60));
  console.log('🧪 Testing Kefir Search Behavior');
  console.log('='.repeat(60));
  console.log('');

  const testTerm = 'Kefir';
  console.log(`📝 Testing term: "${testTerm}"`);
  console.log('');

  // Test 1: Generate search variations
  console.log('1️⃣  Testing search variation generation...');
  try {
    const variations = await generateSearchVariations(testTerm);
    console.log(`   ✅ Generated ${variations.length} variations:`);
    variations.forEach((v, i) => {
      console.log(`      ${i + 1}. "${v}"`);
    });
    console.log('');

    // Test 2: Check if variations make sense
    const expectedVariations = ['kefir milk', 'kefir grains', 'kefir supplementation'];
    const hasExpected = expectedVariations.some(expected => 
      variations.some(v => v.toLowerCase().includes(expected.toLowerCase()))
    );

    if (hasExpected) {
      console.log('   ✅ Variations include expected terms (milk, grains, supplementation)');
    } else {
      console.log('   ⚠️  Variations might not include expected terms');
      console.log(`   Expected to see: ${expectedVariations.join(', ')}`);
    }
    console.log('');

    // Test 3: Validate variation format
    const allValid = variations.every(v => 
      typeof v === 'string' && 
      v.length > 0 && 
      v.length < 100 &&
      v.trim() === v
    );

    if (allValid) {
      console.log('   ✅ All variations are valid (non-empty, reasonable length)');
    } else {
      console.log('   ❌ Some variations are invalid');
    }
    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));
    console.log(`✅ Variation generation: ${variations.length > 0 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Variation quality: ${hasExpected ? 'GOOD' : 'NEEDS REVIEW'}`);
    console.log(`✅ Variation format: ${allValid ? 'VALID' : 'INVALID'}`);
    console.log('');

    console.log('💡 Next steps:');
    console.log('   1. These variations will be tried automatically when no studies found');
    console.log('   2. System will try each variation until finding real studies');
    console.log('   3. First variation that finds studies will be used');
    console.log('');

  } catch (error: any) {
    console.error('❌ Error testing Kefir search:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testKefirSearch().catch(console.error);

