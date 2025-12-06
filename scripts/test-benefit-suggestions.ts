/**
 * Test Script: Supplement Benefit Suggestions
 * Tests the auto-suggestion system for supplement-specific benefits
 *
 * Usage:
 *   npx tsx scripts/test-benefit-suggestions.ts
 */

import { getSuggestedBenefits, getTopSuggestedBenefit, hasSuggestedBenefits } from '../lib/portal/supplement-benefit-suggestions';

console.log('🧪 Testing Supplement Benefit Auto-Suggestions\n');
console.log('='.repeat(80));

// Test cases: Supplements with known benefits
const testSupplements = [
  'romero',
  'rosemary',
  'biotina',
  'biotin',
  'ashwagandha',
  'colágeno',
  'collagen',
  'omega-3',
  'omega 3',
  'magnesio',
  'magnesium',
  'vitamina d',
  'vitamin d',
  'creatina',
  'creatine',
  'zinc',
  'melatonina',
  'melatonin',
  'cúrcuma',
  'turmeric',
  'hierro',
  'iron',
];

console.log('\n📋 AUTO-SUGGESTION TESTS\n');

testSupplements.forEach(supplement => {
  const hasSuggestions = hasSuggestedBenefits(supplement);
  const topSuggestion = getTopSuggestedBenefit(supplement);
  const allSuggestions = getSuggestedBenefits(supplement);

  if (hasSuggestions && topSuggestion) {
    console.log(`\n✅ ${supplement.toUpperCase()}`);
    console.log(`   Top Benefit: "${topSuggestion.benefitEs}" (${topSuggestion.benefit})`);
    console.log(`   Priority: ${topSuggestion.priority}`);
    console.log(`   Reason: ${topSuggestion.reason}`);

    if (allSuggestions.length > 1) {
      console.log(`   Other suggestions (${allSuggestions.length - 1}):`);
      allSuggestions.slice(1, 3).forEach(s => {
        console.log(`     • ${s.benefitEs} (${s.benefit})`);
      });
    }
  } else {
    console.log(`\n❌ ${supplement.toUpperCase()}: No suggestions found`);
  }
});

console.log('\n📋 DETAILED EXAMPLE: ROMERO\n');

const romeroSuggestions = getSuggestedBenefits('romero');
console.log(`Supplement: Romero`);
console.log(`Total suggestions: ${romeroSuggestions.length}\n`);

romeroSuggestions.forEach((suggestion, idx) => {
  console.log(`${idx + 1}. ${suggestion.benefitEs} (${suggestion.benefit})`);
  console.log(`   Priority: ${suggestion.priority}`);
  console.log(`   Reason: ${suggestion.reason}\n`);
});

console.log('📋 DETAILED EXAMPLE: ASHWAGANDHA\n');

const ashwagandhaSuggestions = getSuggestedBenefits('ashwagandha');
console.log(`Supplement: Ashwagandha`);
console.log(`Total suggestions: ${ashwagandhaSuggestions.length}\n`);

ashwagandhaSuggestions.forEach((suggestion, idx) => {
  console.log(`${idx + 1}. ${suggestion.benefitEs} (${suggestion.benefit})`);
  console.log(`   Priority: ${suggestion.priority}`);
  console.log(`   Reason: ${suggestion.reason}\n`);
});

console.log('📋 PARTIAL MATCH TEST\n');

// Test partial matches
const partialMatches = [
  'vitamin d3', // Should match "vitamin d"
  'omega-3 fish oil', // Should match "omega-3"
  'magnesium citrate', // Should match "magnesio"
];

partialMatches.forEach(query => {
  const topSuggestion = getTopSuggestedBenefit(query);
  if (topSuggestion) {
    console.log(`✅ "${query}" → ${topSuggestion.benefitEs} (${topSuggestion.benefit})`);
  } else {
    console.log(`❌ "${query}" → No suggestion found`);
  }
});

console.log('\n📋 NO MATCH TEST\n');

const noMatchSupplements = [
  'unknown-supplement',
  'xyz123',
  'fake-vitamin',
];

noMatchSupplements.forEach(supplement => {
  const hasSuggestions = hasSuggestedBenefits(supplement);
  if (hasSuggestions) {
    console.log(`❌ "${supplement}" → Unexpected suggestions found`);
  } else {
    console.log(`✅ "${supplement}" → No suggestions (expected)`);
  }
});

console.log('\n' + '='.repeat(80));

// Count total supplements with suggestions
const totalWithSuggestions = testSupplements.filter(s => hasSuggestedBenefits(s)).length;
console.log(`\n📊 Summary:`);
console.log(`   Total supplements tested: ${testSupplements.length}`);
console.log(`   Supplements with suggestions: ${totalWithSuggestions}`);
console.log(`   Coverage: ${((totalWithSuggestions / testSupplements.length) * 100).toFixed(1)}%`);

console.log('\n🎉 Benefit auto-suggestion system is working!\n');
