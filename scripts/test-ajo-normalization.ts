/**
 * Test: Ajo → Garlic normalization
 * Verifies that Spanish supplement names are normalized to English
 */

import { normalizeQuery } from '../lib/portal/query-normalization';

console.log('🧪 Testing Ajo → Garlic Normalization\n');
console.log('='.repeat(80));

const testCases = [
  { input: 'ajo', expected: 'Garlic' },
  { input: 'Ajo', expected: 'Garlic' },
  { input: 'AJO', expected: 'Garlic' },
  { input: 'garlic', expected: 'Garlic' },
  { input: 'Garlic', expected: 'Garlic' },
];

let passed = 0;
let failed = 0;

testCases.forEach(({ input, expected }) => {
  const result = normalizeQuery(input);
  const success = result.normalized === expected;
  
  if (success) {
    console.log(`✅ "${input}" → "${result.normalized}" (confidence: ${result.confidence.toFixed(2)})`);
    passed++;
  } else {
    console.log(`❌ "${input}" → "${result.normalized}" (expected: "${expected}")`);
    console.log(`   Confidence: ${result.confidence.toFixed(2)}`);
    console.log(`   Corrections: ${result.corrections.join(', ')}`);
    failed++;
  }
});

console.log('='.repeat(80));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests\n`);

if (failed === 0) {
  console.log('✅ All tests passed!');
  console.log('\n🎯 Ajo normalization works correctly');
  console.log('   - Spanish "ajo" maps to English "Garlic"');
  console.log('   - Case-insensitive matching works');
  console.log('   - Users can search in Spanish and get English results');
} else {
  console.log('❌ Some tests failed!');
  console.log('\n💡 The autocomplete should suggest "Garlic" when typing "ajo"');
  console.log('   If autocomplete is not used, the query normalization should handle it');
  process.exit(1);
}
