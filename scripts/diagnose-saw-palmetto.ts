/**
 * Diagnostic script for "saw palmetto" search failure
 * Tests the complete flow: expansion → PubMed search → results
 */

import { expandAbbreviation } from '../lib/services/abbreviation-expander';

interface TestResult {
  step: string;
  success: boolean;
  duration: number;
  data?: any;
  error?: string;
}

async function testPubMedSearch(term: string): Promise<any> {
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}[Title/Abstract]&retmode=json&retmax=10`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return {
    count: parseInt(data.esearchresult?.count || '0'),
    ids: data.esearchresult?.idlist || [],
    raw: data,
  };
}

async function testEnrichAPI(term: string): Promise<any> {
  const url = process.env.NEXT_PUBLIC_API_URL 
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/portal/enrich`
    : 'http://localhost:3000/api/portal/enrich';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supplement: term }),
  });
  
  const data = await response.json();
  
  return {
    statusCode: response.status,
    data,
  };
}

async function diagnose() {
  const term = 'saw palmetto';
  const results: TestResult[] = [];
  
  console.log('='.repeat(80));
  console.log(`🔍 DIAGNOSING: "${term}"`);
  console.log('='.repeat(80));
  console.log();
  
  // Test 1: Abbreviation Expansion
  console.log('📋 TEST 1: Abbreviation Expansion');
  console.log('-'.repeat(80));
  try {
    const startTime = Date.now();
    const expansion = await expandAbbreviation(term);
    const duration = Date.now() - startTime;
    
    results.push({
      step: 'abbreviation_expansion',
      success: true,
      duration,
      data: expansion,
    });
    
    console.log('✅ SUCCESS');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Is Abbreviation: ${expansion.isAbbreviation}`);
    console.log(`   Alternatives: ${JSON.stringify(expansion.alternatives)}`);
    console.log(`   Source: ${expansion.source}`);
    console.log(`   Confidence: ${expansion.confidence}`);
  } catch (error: any) {
    const duration = Date.now();
    results.push({
      step: 'abbreviation_expansion',
      success: false,
      duration,
      error: error.message,
    });
    console.log(`❌ FAILED: ${error.message}`);
  }
  console.log();
  
  // Test 2: Direct PubMed Search (original term)
  console.log('📋 TEST 2: PubMed Search (Original Term)');
  console.log('-'.repeat(80));
  try {
    const startTime = Date.now();
    const result = await testPubMedSearch(term);
    const duration = Date.now() - startTime;
    
    results.push({
      step: 'pubmed_original',
      success: result.count > 0,
      duration,
      data: result,
    });
    
    if (result.count > 0) {
      console.log('✅ SUCCESS');
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Studies Found: ${result.count}`);
      console.log(`   Sample IDs: ${result.ids.slice(0, 3).join(', ')}`);
    } else {
      console.log('⚠️  NO RESULTS');
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Studies Found: 0`);
    }
  } catch (error: any) {
    results.push({
      step: 'pubmed_original',
      success: false,
      duration: 0,
      error: error.message,
    });
    console.log(`❌ FAILED: ${error.message}`);
  }
  console.log();
  
  // Test 3: PubMed Search with Alternatives
  const expansion = results.find(r => r.step === 'abbreviation_expansion');
  if (expansion?.data?.alternatives && expansion.data.alternatives.length > 0) {
    for (const alt of expansion.data.alternatives) {
      if (alt.toLowerCase() === term.toLowerCase()) continue;
      
      console.log(`📋 TEST 3: PubMed Search (Alternative: "${alt}")`);
      console.log('-'.repeat(80));
      try {
        const startTime = Date.now();
        const result = await testPubMedSearch(alt);
        const duration = Date.now() - startTime;
        
        results.push({
          step: `pubmed_alternative_${alt}`,
          success: result.count > 0,
          duration,
          data: result,
        });
        
        if (result.count > 0) {
          console.log('✅ SUCCESS');
          console.log(`   Duration: ${duration}ms`);
          console.log(`   Studies Found: ${result.count}`);
          console.log(`   Sample IDs: ${result.ids.slice(0, 3).join(', ')}`);
        } else {
          console.log('⚠️  NO RESULTS');
          console.log(`   Duration: ${duration}ms`);
          console.log(`   Studies Found: 0`);
        }
      } catch (error: any) {
        results.push({
          step: `pubmed_alternative_${alt}`,
          success: false,
          duration: 0,
          error: error.message,
        });
        console.log(`❌ FAILED: ${error.message}`);
      }
      console.log();
    }
  }
  
  // Test 4: Try scientific name
  console.log('📋 TEST 4: PubMed Search (Scientific Name: "Serenoa repens")');
  console.log('-'.repeat(80));
  try {
    const startTime = Date.now();
    const result = await testPubMedSearch('Serenoa repens');
    const duration = Date.now() - startTime;
    
    results.push({
      step: 'pubmed_scientific',
      success: result.count > 0,
      duration,
      data: result,
    });
    
    if (result.count > 0) {
      console.log('✅ SUCCESS');
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Studies Found: ${result.count}`);
      console.log(`   Sample IDs: ${result.ids.slice(0, 3).join(', ')}`);
    } else {
      console.log('⚠️  NO RESULTS');
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Studies Found: 0`);
    }
  } catch (error: any) {
    results.push({
      step: 'pubmed_scientific',
      success: false,
      duration: 0,
      error: error.message,
    });
    console.log(`❌ FAILED: ${error.message}`);
  }
  console.log();
  
  // Test 5: Full Enrich API
  console.log('📋 TEST 5: Full Enrich API');
  console.log('-'.repeat(80));
  try {
    const startTime = Date.now();
    const result = await testEnrichAPI(term);
    const duration = Date.now() - startTime;
    
    results.push({
      step: 'enrich_api',
      success: result.statusCode === 200,
      duration,
      data: result,
    });
    
    if (result.statusCode === 200) {
      console.log('✅ SUCCESS');
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Status: ${result.statusCode}`);
      console.log(`   Response: ${JSON.stringify(result.data, null, 2).substring(0, 500)}...`);
    } else {
      console.log('❌ FAILED');
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Status: ${result.statusCode}`);
      console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
    }
  } catch (error: any) {
    results.push({
      step: 'enrich_api',
      success: false,
      duration: 0,
      error: error.message,
    });
    console.log(`❌ FAILED: ${error.message}`);
  }
  console.log();
  
  // Summary
  console.log('='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log();
  
  console.log('Test Results:');
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`  ${status} ${r.step} (${r.duration}ms)`);
    if (r.error) {
      console.log(`     Error: ${r.error}`);
    }
  });
  console.log();
  
  // Root Cause Analysis
  console.log('='.repeat(80));
  console.log('🔍 ROOT CAUSE ANALYSIS');
  console.log('='.repeat(80));
  
  const expansionResult = results.find(r => r.step === 'abbreviation_expansion');
  const pubmedOriginal = results.find(r => r.step === 'pubmed_original');
  const pubmedScientific = results.find(r => r.step === 'pubmed_scientific');
  
  if (!expansionResult?.success) {
    console.log('❌ PROBLEM: Abbreviation expansion failed');
    console.log('   This prevents the system from finding alternatives');
  } else if (pubmedOriginal?.success) {
    console.log('✅ PubMed has studies for "saw palmetto"');
    console.log('   The term should work - check API logic');
  } else if (pubmedScientific?.success) {
    console.log('⚠️  PubMed has studies for scientific name "Serenoa repens"');
    console.log('   LLM should suggest this alternative');
    console.log('   Check if LLM is returning the scientific name');
  } else {
    console.log('❌ PROBLEM: No studies found in PubMed');
    console.log('   This is unexpected - "saw palmetto" is a common supplement');
  }
  
  console.log();
  console.log('='.repeat(80));
}

// Run diagnostic
diagnose().catch(console.error);
