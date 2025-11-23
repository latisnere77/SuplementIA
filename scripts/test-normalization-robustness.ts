/**
 * Test Query Normalization Robustness
 * Tests that normalization handles:
 * - Case variations (VITAMIN D, vitamin d, ViTaMiN D)
 * - Extra spaces (vitamin  d, vitamin   d)
 * - Accents (vitamína d, vitámina d)
 * - Typos (vitamina d, vitamine d)
 * - Spanish/English (magnesio, magnesium)
 * - Chemical forms (glicinato de magnesio, magnesium glycinate)
 */

import { normalizeQuery } from '../lib/portal/query-normalization';

interface TestCase {
  input: string;
  expectedNormalized: string;
  description: string;
}

const testCases: TestCase[] = [
  // Case variations
  { input: 'vitamin d', expectedNormalized: 'Vitamin D', description: 'lowercase' },
  { input: 'VITAMIN D', expectedNormalized: 'Vitamin D', description: 'UPPERCASE' },
  { input: 'ViTaMiN D', expectedNormalized: 'Vitamin D', description: 'MiXeD CaSe' },
  { input: 'Vitamin D', expectedNormalized: 'Vitamin D', description: 'Proper Case' },
  
  // Extra spaces
  { input: 'vitamin  d', expectedNormalized: 'Vitamin D', description: 'double space' },
  { input: 'vitamin   d', expectedNormalized: 'Vitamin D', description: 'triple space' },
  { input: '  vitamin d  ', expectedNormalized: 'Vitamin D', description: 'leading/trailing spaces' },
  
  // Accents (Spanish)
  { input: 'vitamina d', expectedNormalized: 'Vitamin D', description: 'Spanish without accent' },
  { input: 'vitamína d', expectedNormalized: 'Vitamin D', description: 'Spanish with accent on i' },
  { input: 'vitámina d', expectedNormalized: 'Vitamin D', description: 'Spanish with accent on a' },
  
  // Magnesium variations
  { input: 'magnesio', expectedNormalized: 'Magnesium', description: 'Spanish magnesium' },
  { input: 'MAGNESIO', expectedNormalized: 'Magnesium', description: 'Spanish UPPERCASE' },
  { input: 'magenesio', expectedNormalized: 'Magnesium', description: 'Common typo' },
  { input: 'magnesium', expectedNormalized: 'Magnesium', description: 'English lowercase' },
  { input: 'MAGNESIUM', expectedNormalized: 'Magnesium', description: 'English UPPERCASE' },
  
  // Chemical forms
  { input: 'glicinato de magnesio', expectedNormalized: 'Magnesium Glycinate', description: 'Spanish chemical form' },
  { input: 'GLICINATO DE MAGNESIO', expectedNormalized: 'Magnesium Glycinate', description: 'Spanish UPPERCASE' },
  { input: 'magnesium glycinate', expectedNormalized: 'Magnesium Glycinate', description: 'English chemical form' },
  { input: 'MAGNESIUM GLYCINATE', expectedNormalized: 'Magnesium Glycinate', description: 'English UPPERCASE' },
  { input: 'citrato de magnesio', expectedNormalized: 'Magnesium Citrate', description: 'Spanish citrate' },
  
  // L-Carnitine variations
  { input: 'l-carnitina', expectedNormalized: 'L-Carnitine', description: 'Spanish l-carnitine' },
  { input: 'L-CARNITINA', expectedNormalized: 'L-Carnitine', description: 'Spanish UPPERCASE' },
  { input: 'carnitina', expectedNormalized: 'L-Carnitine', description: 'Spanish without L-' },
  { input: 'l carnitina', expectedNormalized: 'L-Carnitine', description: 'Spanish with space' },
  
  // CoQ10 variations
  { input: 'coq10', expectedNormalized: 'CoQ10', description: 'lowercase coq10' },
  { input: 'COQ10', expectedNormalized: 'CoQ10', description: 'UPPERCASE COQ10' },
  { input: 'coenzima q10', expectedNormalized: 'CoQ10', description: 'Spanish full name' },
  { input: 'co q10', expectedNormalized: 'CoQ10', description: 'with space' },
  
  // Omega-3 variations
  { input: 'omega 3', expectedNormalized: 'Omega-3', description: 'with space' },
  { input: 'omega-3', expectedNormalized: 'Omega-3', description: 'with hyphen' },
  { input: 'OMEGA 3', expectedNormalized: 'Omega-3', description: 'UPPERCASE' },
  { input: 'aceite de pescado', expectedNormalized: 'Fish Oil', description: 'Spanish fish oil' },
  
  // Herbs
  { input: 'curcuma', expectedNormalized: 'Turmeric', description: 'Spanish turmeric' },
  { input: 'cúrcuma', expectedNormalized: 'Turmeric', description: 'Spanish with accent' },
  { input: 'CURCUMA', expectedNormalized: 'Turmeric', description: 'Spanish UPPERCASE' },
  { input: 'ashwagandha', expectedNormalized: 'Ashwagandha', description: 'lowercase' },
  { input: 'ASHWAGANDHA', expectedNormalized: 'Ashwagandha', description: 'UPPERCASE' },
  
  // Probiotics
  { input: 'probioticos', expectedNormalized: 'Probiotics', description: 'Spanish without accent' },
  { input: 'probióticos', expectedNormalized: 'Probiotics', description: 'Spanish with accent' },
  { input: 'PROBIOTICOS', expectedNormalized: 'Probiotics', description: 'Spanish UPPERCASE' },
  
  // Zinc
  { input: 'zinc', expectedNormalized: 'Zinc', description: 'lowercase zinc' },
  { input: 'ZINC', expectedNormalized: 'Zinc', description: 'UPPERCASE ZINC' },
  { input: 'cinc', expectedNormalized: 'Zinc', description: 'Spanish zinc' },
  
  // Creatine
  { input: 'creatina', expectedNormalized: 'Creatine', description: 'Spanish creatine' },
  { input: 'CREATINA', expectedNormalized: 'Creatine', description: 'Spanish UPPERCASE' },
  { input: 'creatine', expectedNormalized: 'Creatine', description: 'English lowercase' },
];

async function runTests() {
  console.log('🧪 Testing Query Normalization Robustness\n');
  console.log('='.repeat(80));
  
  let passed = 0;
  let failed = 0;
  const failures: Array<{ test: TestCase; result: string }> = [];
  
  for (const testCase of testCases) {
    const result = normalizeQuery(testCase.input);
    const success = result.normalized === testCase.expectedNormalized;
    
    if (success) {
      passed++;
      console.log(`✅ ${testCase.description.padEnd(35)} | "${testCase.input}" → "${result.normalized}"`);
    } else {
      failed++;
      failures.push({ test: testCase, result: result.normalized });
      console.log(`❌ ${testCase.description.padEnd(35)} | "${testCase.input}" → "${result.normalized}" (expected: "${testCase.expectedNormalized}")`);
    }
  }
  
  console.log('='.repeat(80));
  console.log(`\n📊 Results: ${passed}/${testCases.length} passed (${((passed / testCases.length) * 100).toFixed(1)}%)`);
  
  if (failures.length > 0) {
    console.log(`\n❌ Failed tests (${failures.length}):`);
    failures.forEach(({ test, result }) => {
      console.log(`  - "${test.input}" (${test.description})`);
      console.log(`    Expected: "${test.expectedNormalized}"`);
      console.log(`    Got:      "${result}"`);
    });
  } else {
    console.log('\n🎉 All tests passed! The normalization is robust.');
  }
  
  // Test fuzzy matching
  console.log('\n\n🔍 Testing Fuzzy Matching (typos):\n');
  console.log('='.repeat(80));
  
  const fuzzyTests = [
    { input: 'vitamina d', expected: 'Vitamin D' },
    { input: 'vitamine d', expected: 'Vitamin D' },
    { input: 'magenesio', expected: 'Magnesium' },
    { input: 'ashwaganda', expected: 'Ashwagandha' },
    { input: 'curcumina', expected: 'Curcumin' },
  ];
  
  fuzzyTests.forEach(({ input, expected }) => {
    const result = normalizeQuery(input);
    const match = result.normalized === expected ? '✅' : '⚠️';
    console.log(`${match} "${input}" → "${result.normalized}" (confidence: ${(result.confidence * 100).toFixed(0)}%)`);
    if (result.corrections.length > 0) {
      console.log(`   Corrections: ${result.corrections.join(', ')}`);
    }
  });
  
  console.log('='.repeat(80));
}

runTests().catch(console.error);
