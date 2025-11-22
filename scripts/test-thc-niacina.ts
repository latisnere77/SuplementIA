/**
 * Quick test for THC and Niacina translation/search
 */

import { validateSupplementQuery } from '../lib/portal/query-validator';

const testCases = [
  { term: 'thc', expected: 'tetrahydrocannabinol' },
  { term: 'THC', expected: 'tetrahydrocannabinol' },
  { term: 'niacina', expected: 'niacin' },
  { term: 'cannabis', expected: 'cannabis' },
];

console.log('=== Testing Query Validator ===\n');

for (const { term, expected } of testCases) {
  const result = validateSupplementQuery(term);
  console.log(`Term: "${term}"`);
  console.log(`  Valid: ${result.valid}`);
  console.log(`  Expected translation: ${expected}`);

  if (!result.valid) {
    console.log(`  ❌ ERROR: ${result.error}`);
    console.log(`  Severity: ${result.severity}`);
    console.log(`  Suggestion: ${result.suggestion}`);
  } else {
    console.log(`  ✓ Passed validation`);
  }
  console.log('');
}

console.log('\n=== Testing COMMON_ABBREVIATIONS Map ===\n');

const COMMON_ABBREVIATIONS: Record<string, string> = {
  'cbd': 'cannabidiol',
  'thc': 'tetrahydrocannabinol',
  'hmb': 'beta-hydroxy beta-methylbutyrate',
  'bcaa': 'branched-chain amino acids',
  'nac': 'N-acetylcysteine',
  'coq10': 'coenzyme q10',
  '5-htp': '5-hydroxytryptophan',
};

const abbreviations = ['thc', 'THC', 'cbd', 'niacina'];

for (const abbr of abbreviations) {
  const lowerTerm = abbr.toLowerCase();
  const translated = COMMON_ABBREVIATIONS[lowerTerm];
  console.log(`"${abbr}" → "${translated || 'NOT IN MAP (will use LLM)'}"`);
}
