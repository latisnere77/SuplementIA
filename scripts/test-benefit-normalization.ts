/**
 * Test Script: Benefit Normalization
 * Tests the Spanish → English normalization for health benefits
 *
 * Usage:
 *   npx tsx scripts/test-benefit-normalization.ts
 */

import { normalizeBenefit, getAllSupportedBenefits } from '../lib/portal/benefit-normalization';

console.log('🧪 Testing Benefit Normalization\n');
console.log('='.repeat(80));

// Test cases: Common Latino user queries
const testCases = [
  // CABELLO / HAIR
  { query: 'crecimiento de cabello', expected: 'hair growth', category: 'hair' },
  { query: 'caida de cabello', expected: 'hair loss', category: 'hair' },
  { query: 'pérdida de cabello', expected: 'hair loss', category: 'hair' },
  { query: 'alopecia', expected: 'alopecia', category: 'hair' },
  { query: 'calvicie', expected: 'baldness', category: 'hair' },

  // PIEL / SKIN
  { query: 'piel hidratada', expected: 'skin hydration', category: 'skin' },
  { query: 'piel seca', expected: 'dry skin', category: 'skin' },
  { query: 'arrugas', expected: 'wrinkles', category: 'skin' },
  { query: 'acne', expected: 'acne', category: 'skin' },
  { query: 'manchas', expected: 'skin hyperpigmentation', category: 'skin' },

  // ENERGÍA / ENERGY
  { query: 'cansancio', expected: 'fatigue', category: 'energy' },
  { query: 'fatiga', expected: 'fatigue', category: 'energy' },
  { query: 'energia', expected: 'energy', category: 'energy' },
  { query: 'agotamiento', expected: 'exhaustion', category: 'energy' },

  // SUEÑO / SLEEP
  { query: 'sueño', expected: 'sleep', category: 'sleep' },
  { query: 'dormir', expected: 'sleep', category: 'sleep' },
  { query: 'insomnio', expected: 'insomnia', category: 'sleep' },
  { query: 'calidad del sueño', expected: 'sleep quality', category: 'sleep' },

  // COGNITIVO / COGNITIVE
  { query: 'memoria', expected: 'memory', category: 'cognitive' },
  { query: 'concentracion', expected: 'concentration', category: 'cognitive' },
  { query: 'enfoque', expected: 'focus', category: 'cognitive' },
  { query: 'claridad mental', expected: 'mental clarity', category: 'cognitive' },
  { query: 'niebla mental', expected: 'brain fog', category: 'cognitive' },

  // ESTADO DE ÁNIMO / MOOD
  { query: 'ansiedad', expected: 'anxiety', category: 'mood' },
  { query: 'estres', expected: 'stress', category: 'mood' },
  { query: 'depresion', expected: 'depression', category: 'mood' },
  { query: 'tristeza', expected: 'sadness', category: 'mood' },

  // MÚSCULO / MUSCLE
  { query: 'musculo', expected: 'muscle', category: 'muscle' },
  { query: 'masa muscular', expected: 'muscle mass', category: 'muscle' },
  { query: 'ganar musculo', expected: 'muscle gain', category: 'muscle' },
  { query: 'fuerza', expected: 'strength', category: 'muscle' },

  // INMUNIDAD / IMMUNE
  { query: 'inmunidad', expected: 'immunity', category: 'immune' },
  { query: 'defensas', expected: 'immune defenses', category: 'immune' },
  { query: 'resfriado', expected: 'common cold', category: 'immune' },

  // DIGESTIVO / DIGESTIVE
  { query: 'digestion', expected: 'digestion', category: 'digestive' },
  { query: 'estomago', expected: 'stomach', category: 'digestive' },
  { query: 'intestino', expected: 'gut', category: 'digestive' },
  { query: 'estreñimiento', expected: 'constipation', category: 'digestive' },

  // ARTICULACIONES / JOINTS
  { query: 'articulaciones', expected: 'joints', category: 'joint' },
  { query: 'dolor articular', expected: 'joint pain', category: 'joint' },
  { query: 'artritis', expected: 'arthritis', category: 'joint' },
  { query: 'inflamacion', expected: 'inflammation', category: 'joint' },
];

// Test fuzzy matching (typos)
const typoTestCases = [
  { query: 'cansansio', expected: 'fatigue', note: 'typo: missing c' },
  { query: 'memorya', expected: 'memory', note: 'typo: y instead of i' },
  { query: 'ansieda', expected: 'anxiety', note: 'typo: missing d' },
  { query: 'drepresion', expected: 'depression', note: 'typo: extra d' },
];

console.log('\n📋 EXACT MATCH TESTS\n');

let passed = 0;
let failed = 0;

testCases.forEach(({ query, expected, category }) => {
  const result = normalizeBenefit(query);
  const success = result.normalized === expected && result.category === category && result.confidence === 1.0;

  if (success) {
    console.log(`✅ "${query}" → "${result.normalized}" (${result.category})`);
    passed++;
  } else {
    console.log(`❌ "${query}" → Expected: "${expected}" (${category}), Got: "${result.normalized}" (${result.category}, confidence: ${result.confidence})`);
    failed++;
  }
});

console.log('\n📋 FUZZY MATCH TESTS (TYPOS)\n');

typoTestCases.forEach(({ query, expected, note }) => {
  const result = normalizeBenefit(query);
  const success = result.normalized === expected && result.confidence >= 0.5;

  if (success) {
    console.log(`✅ "${query}" → "${result.normalized}" (confidence: ${result.confidence.toFixed(2)}) - ${note}`);
    passed++;
  } else {
    console.log(`❌ "${query}" → Expected: "${expected}", Got: "${result.normalized}" (confidence: ${result.confidence}) - ${note}`);
    failed++;
  }
});

console.log('\n📋 ALTERNATIVES TEST\n');

const alternativeTest = normalizeBenefit('crecimiento de cabello');
console.log(`Query: "crecimiento de cabello"`);
console.log(`Normalized: "${alternativeTest.normalized}"`);
console.log(`Alternatives: ${alternativeTest.alternatives.join(', ')}`);
console.log(`Category: ${alternativeTest.category}`);
console.log(`Confidence: ${alternativeTest.confidence}`);

console.log('\n📋 NO MATCH TEST (UNKNOWN QUERY)\n');

const unknownTest = normalizeBenefit('xyz123');
console.log(`Query: "xyz123"`);
console.log(`Normalized: "${unknownTest.normalized}" (should be same as original)`);
console.log(`Confidence: ${unknownTest.confidence} (should be low)`);

console.log('\n📋 SUPPORTED BENEFITS COUNT\n');

const allBenefits = getAllSupportedBenefits();
console.log(`Total supported benefits: ${allBenefits.length}`);

// Group by category
const byCategory = allBenefits.reduce((acc, benefit) => {
  if (!acc[benefit.category]) {
    acc[benefit.category] = [];
  }
  acc[benefit.category].push(benefit);
  return acc;
}, {} as Record<string, typeof allBenefits>);

console.log('\nBenefits by category:');
Object.entries(byCategory).forEach(([category, benefits]) => {
  console.log(`  ${category}: ${benefits.length} benefits`);
});

console.log('\n' + '='.repeat(80));
console.log(`\n✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

if (failed === 0) {
  console.log('🎉 All tests passed!\n');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review.\n');
  process.exit(1);
}
