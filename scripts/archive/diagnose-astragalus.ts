/**
 * Diagnostic script for "astragalus" search failure
 * Tests the complete flow: expansion → PubMed search → results
 */

import { expandAbbreviation } from '../lib/services/abbreviation-expander';

async function testPubMedSearch(term: string): Promise<any> {
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}[Title/Abstract]&retmode=json&retmax=10`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return {
    count: parseInt(data.esearchresult?.count || '0'),
    ids: data.esearchresult?.idlist || [],
  };
}

async function diagnose() {
  const term = 'astragalus';
  
  console.log('='.repeat(80));
  console.log(`🔍 DIAGNOSING: "${term}"`);
  console.log('='.repeat(80));
  console.log();
  
  // Test 1: Abbreviation Expansion
  console.log('📋 TEST 1: Abbreviation Expansion');
  console.log('-'.repeat(80));
  const startTime = Date.now();
  const expansion = await expandAbbreviation(term);
  const duration = Date.now() - startTime;
  
  console.log('✅ SUCCESS');
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Is Abbreviation: ${expansion.isAbbreviation}`);
  console.log(`   Alternatives: ${JSON.stringify(expansion.alternatives)}`);
  console.log(`   Source: ${expansion.source}`);
  console.log(`   Confidence: ${expansion.confidence}`);
  console.log();
  
  // Test 2: PubMed Search (original term)
  console.log('📋 TEST 2: PubMed Search (Original Term)');
  console.log('-'.repeat(80));
  const pubmedOriginal = await testPubMedSearch(term);
  console.log(`   Studies Found: ${pubmedOriginal.count}`);
  if (pubmedOriginal.count > 0) {
    console.log(`   Sample IDs: ${pubmedOriginal.ids.slice(0, 3).join(', ')}`);
  }
  console.log();
  
  // Test 3: PubMed Search with alternatives
  for (const alt of expansion.alternatives) {
    if (alt.toLowerCase() === term.toLowerCase()) continue;
    
    console.log(`📋 TEST 3: PubMed Search (Alternative: "${alt}")`);
    console.log('-'.repeat(80));
    const result = await testPubMedSearch(alt);
    console.log(`   Studies Found: ${result.count}`);
    if (result.count > 0) {
      console.log(`   Sample IDs: ${result.ids.slice(0, 3).join(', ')}`);
    }
    console.log();
  }
  
  // Test 4: Try scientific name
  console.log('📋 TEST 4: PubMed Search (Scientific Name: "Astragalus membranaceus")');
  console.log('-'.repeat(80));
  const scientific = await testPubMedSearch('Astragalus membranaceus');
  console.log(`   Studies Found: ${scientific.count}`);
  if (scientific.count > 0) {
    console.log(`   Sample IDs: ${scientific.ids.slice(0, 3).join(', ')}`);
  }
  console.log();
  
  // Test 5: Production API
  console.log('📋 TEST 5: Production API');
  console.log('-'.repeat(80));
  try {
    const response = await fetch('https://suplementia.vercel.app/api/portal/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplementName: term }),
    });
    
    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Success: ${data.success}`);
    if (!data.success) {
      console.log(`   Error: ${data.error || data.message}`);
    }
  } catch (error: any) {
    console.log(`   ❌ FAILED: ${error.message}`);
  }
  console.log();
  
  // Summary
  console.log('='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Original term: ${pubmedOriginal.count} studies`);
  console.log(`Scientific name: ${scientific.count} studies`);
  console.log(`LLM suggestions: ${expansion.alternatives.join(', ')}`);
  console.log();
  
  if (pubmedOriginal.count > 0) {
    console.log('✅ PubMed has studies - system should work');
  } else if (scientific.count > 0) {
    console.log('⚠️  Need to suggest scientific name');
  } else {
    console.log('❌ No studies found in PubMed');
  }
}

diagnose().catch(console.error);
