/**
 * Test: Fuzzy Matching Safety
 * Ensures fuzzy matching doesn't create false positives
 */

import { normalizeQuery } from '../lib/portal/query-normalization';

console.log('🧪 Testing Fuzzy Matching Safety\n');
console.log('='.repeat(80));

const testCases = [
  // Should NOT match (different supplements)
  { input: 'melatonina', shouldNotBe: 'L-Theanine', reason: 'Different supplements' },
  { input: 'melatonin', shouldNotBe: 'L-Theanine', reason: 'Different supplements' },
  { input: 'berberina', shouldNotBe: 'Berberine', reason: 'Should use LLM, not fuzzy' },
  { input: 'curcuma', shouldNotBe: 'Creatine', reason: 'Different supplements' },
  
  // Should match (real typos)
  { input: 'magenesio', shouldBe: 'Magnesium', reason: 'Common typo' },
  { input: 'cinc', shouldBe: 'Zinc', reason: 'Spanish synonym' },
];

let passed = 0;
let failed = 0;

console.log('\n❌ Testing FALSE POSITIVES (should NOT match):');
testCases.filter(t => t.shouldNotBe).forEach(({ input, shouldNotBe, reason }) => {
  const result = normalizeQuery(input);
  const isWrongMatch = result.normalized === shouldNotBe;
  
  if (!isWrongMatch) {
    console.log(`✅ "${input}" → "${result.normalized}" (NOT "${shouldNotBe}") - ${reason}`);
    passed++;
  } else {
    console.log(`❌ "${input}" → "${result.normalized}" (WRONG! Should NOT be "${shouldNotBe}") - ${reason}`);
    console.log(`   Confidence: ${result.confidence}, Corrections: ${result.corrections.join(', ')}`);
    failed++;
  }
});

console.log('\n✅ Testing TRUE POSITIVES (should match):');
testCases.filter(t => t.shouldBe).forEach(({ input, shouldBe, reason }) => {
  const result = normalizeQuery(input);
  const isCorrectMatch = result.normalized === shouldBe;
  
  if (isCorrectMatch) {
    console.log(`✅ "${input}" → "${result.normalized}" (correct!) - ${reason}`);
    passed++;
  } else {
    console.log(`❌ "${input}" → "${result.normalized}" (expected "${shouldBe}") - ${reason}`);
    console.log(`   Confidence: ${result.confidence}, Corrections: ${result.corrections.join(', ')}`);
    failed++;
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests\n`);

if (failed === 0) {
  console.log('✅ All tests passed!');
  console.log('\n🎯 Fuzzy matching is safe:');
  console.log('   - No false positives (different supplements)');
  console.log('   - Real typos still work');
  console.log('   - Long terms use LLM instead of fuzzy matching');
} else {
  console.log('❌ Some tests failed!');
  console.log('\n💡 Fuzzy matching needs adjustment');
  process.exit(1);
}
