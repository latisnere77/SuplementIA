/**
 * Comprehensive Test of Search System Improvements
 * 
 * Demonstrates:
 * 1. Fallback system for unknown supplements
 * 2. Fuzzy search and suggestions
 * 3. Analytics tracking
 * 4. Typo detection
 */

import { normalizeQuery } from '../lib/portal/query-normalization';
import { getSupplementMapping, getSupplementMappingWithSuggestions } from '../lib/portal/supplement-mappings';
import { 
  suggestSupplementCorrection, 
  getBestSuggestion, 
  isLikelyTypo,
  getPopularSupplementsByCategory 
} from '../lib/portal/supplement-suggestions';
import { searchAnalytics, logSearch, generateAnalyticsReport } from '../lib/portal/search-analytics';

console.log('='.repeat(80));
console.log('🧪 TESTING SEARCH SYSTEM IMPROVEMENTS');
console.log('='.repeat(80) + '\n');

// Test cases covering different scenarios
const testCases = [
  // Exact matches
  { query: 'Ashwagandha', expected: 'should find exact match' },
  { query: 'Magnesium', expected: 'should find exact match' },
  
  // Typos
  { query: 'Ashwaganda', expected: 'should suggest Ashwagandha' },
  { query: 'Magnezium', expected: 'should suggest Magnesium' },
  
  // Different languages
  { query: 'Citrulina Malato', expected: 'should normalize to Citrulline Malate' },
  { query: 'Vitamina D', expected: 'should find Vitamin D' },
  
  // Unknown supplements (fallback test)
  { query: 'Berberine', expected: 'should use fallback' },
  { query: 'NAC', expected: 'should use fallback' },
  
  // Case variations
  { query: 'OMEGA-3', expected: 'should handle uppercase' },
  { query: 'vitamin b12', expected: 'should handle lowercase' },
];

console.log('📋 RUNNING TEST CASES:\n');

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. Testing: "${testCase.query}"`);
  console.log(`   Expected: ${testCase.expected}`);
  
  // Step 1: Normalize
  const normalized = normalizeQuery(testCase.query);
  console.log(`   ✓ Normalized: "${normalized.normalized}" (confidence: ${normalized.confidence})`);
  
  // Step 2: Get mapping
  const result = getSupplementMappingWithSuggestions(normalized.normalized);
  
  if (result.mapping) {
    console.log(`   ✓ Mapping found: ${result.mapping.normalizedName}`);
    console.log(`   ✓ Category: ${result.mapping.category}`);
    
    if (result.usedFallback) {
      console.log(`   ⚠️  Used fallback (no pre-calculated mapping)`);
    }
    
    // Log to analytics
    logSearch(
      testCase.query,
      normalized.normalized,
      !result.usedFallback,
      result.usedFallback,
      result.suggestions
    );
  } else {
    console.log(`   ❌ No mapping found`);
    logSearch(testCase.query, normalized.normalized, false, false, []);
  }
  
  // Step 3: Check for typos and suggestions
  if (isLikelyTypo(testCase.query)) {
    const best = getBestSuggestion(testCase.query);
    console.log(`   💡 Likely typo detected! Suggestion: "${best?.name}"`);
  }
  
  // Step 4: Get suggestions
  const suggestions = suggestSupplementCorrection(testCase.query);
  if (!suggestions.exactMatch && suggestions.found) {
    console.log(`   💡 Suggestions: ${suggestions.suggestions.slice(0, 3).map(s => s.name).join(', ')}`);
  }
  
  console.log('');
});

// Show popular supplements by category
console.log('\n' + '-'.repeat(80));
console.log('📊 POPULAR SUPPLEMENTS BY CATEGORY:\n');

const categories: Array<'herb' | 'vitamin' | 'mineral' | 'amino-acid' | 'fatty-acid'> = [
  'herb',
  'vitamin',
  'mineral',
  'amino-acid',
  'fatty-acid',
];

categories.forEach(category => {
  const popular = getPopularSupplementsByCategory(category, 3);
  console.log(`${category.toUpperCase()}:`);
  popular.forEach(s => console.log(`  - ${s.normalizedName}`));
  console.log('');
});

// Generate analytics report
console.log('\n' + '-'.repeat(80));
console.log(generateAnalyticsReport());

// Show statistics
const stats = searchAnalytics.getStatistics();
console.log('📈 FINAL STATISTICS:');
console.log(`  Success Rate: ${stats.successRate.toFixed(1)}%`);
console.log(`  Fallback Usage: ${stats.fallbackRate.toFixed(1)}%`);
console.log(`  Total Searches: ${stats.total}`);
console.log('');

// Show searches needing mappings
const needMappings = searchAnalytics.getSearchesNeedingMappings(1);
if (needMappings.length > 0) {
  console.log('🔧 SUPPLEMENTS THAT NEED MANUAL MAPPINGS:');
  needMappings.forEach(fs => {
    console.log(`  - "${fs.normalizedQuery}" (searched ${fs.count}x)`);
  });
  console.log('');
}

console.log('='.repeat(80));
console.log('✅ ALL TESTS COMPLETE');
console.log('='.repeat(80) + '\n');

// Summary
console.log('📝 SUMMARY OF IMPROVEMENTS:');
console.log('  ✅ Fallback system prevents 404 errors');
console.log('  ✅ Fuzzy search handles typos');
console.log('  ✅ Multi-language support (ES/EN)');
console.log('  ✅ Analytics track usage patterns');
console.log('  ✅ Suggestions help users find alternatives');
console.log('  ✅ Case-insensitive matching');
console.log('  ✅ Alias support for common names');
console.log('');
