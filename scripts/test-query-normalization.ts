/**
 * Test Query Normalization
 * Verifies that typo correction and translation work correctly
 */

import { normalizeQuery, getSearchFallbacks, extractBaseCompound } from '../lib/portal/query-normalization';
import { suggestSupplementCorrection } from '../lib/portal/supplement-suggestions';

const testCases = [
  // Magnesium variations with typos
  'glicinato de magenesio',
  'glicinato de magnesio',
  'citrato de magenesio',
  'magnesio',
  'magenesio',
  'magnesium glycinate',
  
  // Superfoods
  'espirulina',
  'spirulina',
  'chlorella',
  
  // Other common searches
  'vitamina d',
  'omega 3',
  'carnitina',
  'ashwagandha',
  'creatina',
  
  // Typos
  'ashwaganda',
  'curcuma',
  'colageno',
];

console.log('🧪 Testing Query Normalization\n');
console.log('='.repeat(80));

testCases.forEach((query) => {
  console.log(`\n📝 Query: "${query}"`);
  console.log('-'.repeat(80));
  
  // Test normalization
  const normalized = normalizeQuery(query);
  console.log(`✅ Normalized: "${normalized.normalized}"`);
  console.log(`   Confidence: ${(normalized.confidence * 100).toFixed(0)}%`);
  
  if (normalized.corrections.length > 0) {
    console.log(`   Corrections:`);
    normalized.corrections.forEach(c => console.log(`     - ${c}`));
  }
  
  if (normalized.suggestions.length > 0) {
    console.log(`   Suggestions:`);
    normalized.suggestions.forEach(s => console.log(`     - ${s}`));
  }
  
  // Test base compound extraction
  const base = extractBaseCompound(normalized.normalized);
  if (base) {
    console.log(`   Base compound: "${base}"`);
  }
  
  // Test search fallbacks
  const fallbacks = getSearchFallbacks(query);
  if (fallbacks.length > 1) {
    console.log(`   Search fallbacks:`);
    fallbacks.forEach((f, i) => console.log(`     ${i + 1}. "${f}"`));
  }
  
  // Test supplement suggestions
  const suggestion = suggestSupplementCorrection(query);
  if (suggestion) {
    console.log(`   💡 Suggestion: "${suggestion.suggestion}" (${suggestion.reason})`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('✅ All tests completed\n');
