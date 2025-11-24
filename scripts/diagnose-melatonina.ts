/**
 * Diagnose: Melatonina → L-Theanina mismatch
 * Critical bug: User searched for melatonin, got theanine results
 */

import { expandAbbreviation } from '../lib/services/abbreviation-expander';
import { normalizeQuery } from '../lib/portal/query-normalization';

async function diagnoseMelatonina() {
  console.log('🔍 Diagnosing Melatonina → L-Theanina Mismatch\n');
  console.log('='.repeat(80));

  // Test 1: Query normalization
  console.log('\n1️⃣ Testing Query Normalization:');
  const normalized = normalizeQuery('melatonina');
  console.log(`   Input: "melatonina"`);
  console.log(`   Normalized: "${normalized.normalized}"`);
  console.log(`   Confidence: ${normalized.confidence}`);
  console.log(`   Corrections: ${JSON.stringify(normalized.corrections)}`);

  // Test 2: LLM expansion
  console.log('\n2️⃣ Testing LLM Expansion:');
  try {
    const expanded = await expandAbbreviation('melatonina');
    console.log(`   Input: "melatonina"`);
    console.log(`   Expanded: ${JSON.stringify(expanded)}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Test 3: Check if there's confusion in the dictionary
  console.log('\n3️⃣ Checking for Dictionary Confusion:');
  const testTerms = ['melatonina', 'melatonin', 'l-theanine', 'l-teanina', 'theanine', 'teanina'];
  
  for (const term of testTerms) {
    const result = normalizeQuery(term);
    console.log(`   "${term}" → "${result.normalized}" (confidence: ${result.confidence})`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n🎯 DIAGNOSIS:');
  console.log('   The issue is likely in one of these places:');
  console.log('   1. Query normalization is mapping melatonina → wrong term');
  console.log('   2. LLM expansion is returning wrong alternatives');
  console.log('   3. Backend is searching for wrong supplement');
  console.log('   4. Cache is returning wrong cached result');
  console.log('\n💡 NEXT STEPS:');
  console.log('   - Check the URL parameter in browser (is it melatonina or l-theanine?)');
  console.log('   - Check backend logs for what term was actually searched');
  console.log('   - Clear cache and try again');
}

diagnoseMelatonina().catch(console.error);
