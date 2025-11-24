/**
 * Test PQQ → EPA Mismatch Fix
 * Validates that short acronyms don't get confused with each other
 */

import { normalizeQuery } from '../lib/portal/query-normalization';

interface TestCase {
  input: string;
  expected: string;
  shouldNotBe?: string;
  description: string;
}

const testCases: TestCase[] = [
  // CRITICAL: The bug that was reported
  {
    input: 'PQQ',
    expected: 'PQQ',
    shouldNotBe: 'EPA',
    description: 'PQQ should NOT map to EPA (completely different substances)',
  },
  
  // Other short acronyms that could have similar issues
  {
    input: 'EPA',
    expected: 'EPA',
    shouldNotBe: 'PQQ',
    description: 'EPA should stay as EPA',
  },
  {
    input: 'DHA',
    expected: 'DHA',
    shouldNotBe: 'EPA',
    description: 'DHA should stay as DHA',
  },
  {
    input: 'NAC',
    expected: 'NAC',
    shouldNotBe: 'EPA',
    description: 'NAC should stay as NAC',
  },
  {
    input: 'SAM',
    expected: 'SAM-e',
    shouldNotBe: 'EPA',
    description: 'SAM should map to SAM-e',
  },
  {
    input: 'TMG',
    expected: 'TMG',
    shouldNotBe: 'EPA',
    description: 'TMG should stay as TMG',
  },
  {
    input: 'NMN',
    expected: 'NMN',
    shouldNotBe: 'EPA',
    description: 'NMN should stay as NMN',
  },
  {
    input: 'NAD',
    expected: 'NAD+',
    shouldNotBe: 'EPA',
    description: 'NAD should map to NAD+',
  },
  {
    input: 'HMB',
    expected: 'HMB',
    shouldNotBe: 'EPA',
    description: 'HMB should stay as HMB',
  },
  
  // Typos that SHOULD still be corrected
  {
    input: 'magenesio',
    expected: 'Magnesium',
    description: 'Typo correction should still work for longer words',
  },
  {
    input: 'vitamina d',
    expected: 'Vitamin D',
    description: 'Spanish translation should still work',
  },
  {
    input: 'curcuma',
    expected: 'Turmeric',
    description: 'Accent-insensitive matching should still work',
  },
  
  // Edge cases
  {
    input: 'pqq',
    expected: 'PQQ',
    description: 'Lowercase PQQ should normalize to uppercase',
  },
  {
    input: 'Pqq',
    expected: 'PQQ',
    description: 'Mixed case PQQ should normalize to uppercase',
  },
  {
    input: 'P Q Q',
    expected: 'PQQ',
    description: 'PQQ with spaces should normalize correctly',
  },
];

console.log('🧪 Testing PQQ → EPA Mismatch Fix\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;
const failures: string[] = [];

for (const testCase of testCases) {
  const result = normalizeQuery(testCase.input);
  const normalized = result.normalized;
  
  let testPassed = true;
  let failureReason = '';
  
  // Check expected value
  if (normalized !== testCase.expected) {
    testPassed = false;
    failureReason = `Expected "${testCase.expected}", got "${normalized}"`;
  }
  
  // Check shouldNotBe value
  if (testCase.shouldNotBe && normalized === testCase.shouldNotBe) {
    testPassed = false;
    failureReason = `Should NOT be "${testCase.shouldNotBe}", but got "${normalized}"`;
  }
  
  if (testPassed) {
    console.log(`✅ ${testCase.description}`);
    console.log(`   Input: "${testCase.input}" → Output: "${normalized}"`);
    passed++;
  } else {
    console.log(`❌ ${testCase.description}`);
    console.log(`   Input: "${testCase.input}" → Output: "${normalized}"`);
    console.log(`   ${failureReason}`);
    failures.push(`${testCase.description}: ${failureReason}`);
    failed++;
  }
  
  console.log('');
}

console.log('='.repeat(80));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed > 0) {
  console.log('\n❌ Failed tests:\n');
  failures.forEach(f => console.log(`  - ${f}`));
  console.log('\n⚠️  Fix not complete. Review the normalization logic.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  console.log('\n🎯 PQQ → EPA mismatch is FIXED');
  console.log('   - PQQ correctly maps to PQQ');
  console.log('   - EPA correctly maps to EPA');
  console.log('   - No false positives in fuzzy matching');
  console.log('   - Typo correction still works for longer words');
}
