/**
 * Test Intelligent Exclusion System
 * Validates that the smart exclusion detection works correctly
 */

import { buildMainQuery } from './pubmed/queryBuilder';

interface TestCase {
  supplement: string;
  expectedExclusions: string[];
  description: string;
}

const testCases: TestCase[] = [
  {
    supplement: 'ginger',
    expectedExclusions: ['ginseng', 'panax'],
    description: 'Ginger should exclude ginseng (phonetically similar)',
  },
  {
    supplement: 'ginseng',
    expectedExclusions: ['ginger', 'zingiber'],
    description: 'Ginseng should exclude ginger (phonetically similar)',
  },
  {
    supplement: 'ashwagandha',
    expectedExclusions: ['rhodiola', 'ginseng'],
    description: 'Ashwagandha should exclude other adaptogens',
  },
  {
    supplement: 'vitamin d',
    expectedExclusions: ['vitamin d2'],
    description: 'Vitamin D should exclude D2 variant',
  },
  {
    supplement: 'magnesium',
    expectedExclusions: ['manganese'],
    description: 'Magnesium should exclude manganese (similar spelling)',
  },
  {
    supplement: 'l-carnitine',
    expectedExclusions: ['creatine', 'carnosine'],
    description: 'L-carnitine should exclude similar amino acids',
  },
  {
    supplement: 'omega-3',
    expectedExclusions: ['omega-6', 'omega-9'],
    description: 'Omega-3 should exclude other omega variants',
  },
  {
    supplement: 'collagen',
    expectedExclusions: [],
    description: 'Collagen has no known confusions (should work without exclusions)',
  },
];

console.log('🧪 Testing Intelligent Exclusion System\n');
console.log('=' .repeat(80));

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  console.log(`\n📋 Test: ${testCase.description}`);
  console.log(`   Supplement: "${testCase.supplement}"`);
  
  const query = buildMainQuery({
    supplementName: testCase.supplement,
    useProximity: true,
    humanStudiesOnly: true,
  });

  console.log(`   Generated Query: ${query.substring(0, 150)}...`);
  
  // Check if expected exclusions are in the query
  const allExpected = testCase.expectedExclusions.every(exc => 
    query.toLowerCase().includes(`not ${exc.toLowerCase()}[tiab]`)
  );

  if (allExpected || testCase.expectedExclusions.length === 0) {
    console.log(`   ✅ PASS - All expected exclusions applied`);
    passed++;
  } else {
    console.log(`   ❌ FAIL - Missing expected exclusions`);
    console.log(`   Expected: ${testCase.expectedExclusions.join(', ')}`);
    failed++;
  }
}

console.log('\n' + '='.repeat(80));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
  console.log('✅ All tests passed! Intelligent exclusion system is working correctly.');
} else {
  console.log('❌ Some tests failed. Review the exclusion logic.');
  process.exit(1);
}
