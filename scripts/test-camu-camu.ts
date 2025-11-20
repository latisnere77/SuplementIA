/**
 * TEST: Camu Camu Bug Investigation
 * Debug why "camu camu" doesn't allow search
 */

import { getIntelligentSearchStrategy, normalizeQuery, detectCompounds } from '../lib/services/supplement-intelligence';

async function testCamuCamu() {
  console.log('🐛 BUG TEST: Camu Camu Search\n');
  console.log('='.repeat(70));

  const query = 'camu camu';

  // Test 1: Normalization
  console.log('\n📊 TEST 1: Text Normalization');
  console.log('-'.repeat(70));
  const normalized = normalizeQuery(query);
  console.log(`Original: "${query}"`);
  console.log(`Normalized: "${normalized}"`);
  console.log(`Length: ${normalized.length}`);
  console.log(`Is empty: ${normalized.length === 0}`);

  // Test 2: Compound Detection
  console.log('\n\n📊 TEST 2: Compound Detection');
  console.log('-'.repeat(70));
  const compounds = detectCompounds(query);
  console.log(`Detected compounds: ${compounds.length}`);
  compounds.forEach((c, i) => {
    console.log(`  ${i + 1}. "${c}"`);
  });

  // Test 3: Intelligent Strategy
  console.log('\n\n📊 TEST 3: Intelligent Search Strategy');
  console.log('-'.repeat(70));
  try {
    const strategy = getIntelligentSearchStrategy(query, 3);
    console.log(`Strategy: ${strategy.strategy}`);
    console.log(`Candidates: ${strategy.candidates.length}`);
    strategy.candidates.forEach((c, i) => {
      console.log(`  ${i + 1}. "${c.term}" (${c.type}, confidence: ${c.confidence})`);
    });
  } catch (error: any) {
    console.error('❌ ERROR in strategy:', error.message);
  }

  // Test 4: Various formats
  console.log('\n\n📊 TEST 4: Format Variations');
  console.log('-'.repeat(70));

  const variations = [
    'camu camu',
    'camu-camu',
    'camucamu',
    'Camu Camu',
    'CAMU CAMU',
  ];

  for (const variation of variations) {
    const norm = normalizeQuery(variation);
    console.log(`"${variation}" → "${norm}" (length: ${norm.length})`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n🎯 DIAGNOSIS:');

  if (normalized.length === 0) {
    console.log('❌ PROBLEM: Query normalizes to empty string!');
    console.log('This would block the search entirely.');
  } else if (compounds.length > 1) {
    console.log('⚠️  WARNING: Query detected as compound (multiple parts)');
    console.log('This might cause unexpected behavior.');
  } else {
    console.log('✅ Query processing looks OK');
    console.log('Issue might be in frontend autocomplete or validation.');
  }
}

testCamuCamu().catch(console.error);
