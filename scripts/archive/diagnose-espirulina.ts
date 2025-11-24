/**
 * Diagnose Espirulina Search Issue
 * Tests the complete flow: normalization → PubMed search → enrichment
 */

import { normalizeQuery } from '../lib/portal/query-normalization';

async function testEspirulinaFlow() {
  console.log('🔍 Diagnosing Espirulina Search Issue\n');
  console.log('='.repeat(80));
  
  const query = 'espirulina';
  
  // Step 1: Normalization
  console.log('\n📝 Step 1: Query Normalization');
  console.log('-'.repeat(80));
  const normalized = normalizeQuery(query);
  console.log(`Original: "${query}"`);
  console.log(`Normalized: "${normalized.normalized}"`);
  console.log(`Confidence: ${(normalized.confidence * 100).toFixed(0)}%`);
  
  // Step 2: Test PubMed Search via API
  console.log('\n🔬 Step 2: Testing PubMed Search via API');
  console.log('-'.repeat(80));
  
  try {
    const searchTerm = normalized.normalized;
    console.log(`Searching PubMed for: "${searchTerm}"`);
    
    // Call the studies-fetcher Lambda via API Gateway
    const apiUrl = process.env.STUDIES_FETCHER_URL || 'https://your-api-gateway-url.amazonaws.com/prod/studies';
    
    console.log(`\n⚠️  Note: This requires the Lambda to be deployed and accessible`);
    console.log(`API URL: ${apiUrl}`);
    
    // For now, let's test with a direct PubMed search
    console.log(`\n🔗 Direct PubMed URL:`);
    console.log(`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(searchTerm)}`);
    
    // Test with fetch to PubMed E-utilities
    const pubmedUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchTerm)}&retmode=json&retmax=10`;
    console.log(`\n📡 Testing E-utilities API:`);
    console.log(pubmedUrl);
    
    const response = await fetch(pubmedUrl);
    const data = await response.json();
    
    const count = data.esearchresult?.count || 0;
    const ids = data.esearchresult?.idlist || [];
    
    console.log(`\n✅ Results:`);
    console.log(`   Total studies found: ${count}`);
    console.log(`   First 10 PMIDs: ${ids.join(', ')}`);
    
    if (count === 0) {
      console.log(`\n❌ No studies found for "${searchTerm}"`);
      console.log(`\n💡 Suggestions:`);
      console.log(`   1. Try alternative terms: "spirulina platensis", "arthrospira"`);
      console.log(`   2. Check if the term is too specific`);
      console.log(`   3. Verify PubMed has studies on this topic`);
    } else {
      console.log(`\n✅ Studies found! The issue might be in:`);
      console.log(`   1. Lambda not receiving the normalized query`);
      console.log(`   2. Lambda timeout or error`);
      console.log(`   3. Content enricher not processing results`);
    }
    
  } catch (error: any) {
    console.error(`\n❌ Error testing PubMed:`, error.message);
  }
  
  // Step 3: Test with alternative terms
  console.log('\n🔄 Step 3: Testing Alternative Terms');
  console.log('-'.repeat(80));
  
  const alternatives = [
    'spirulina',
    'spirulina platensis',
    'arthrospira',
    'blue-green algae',
  ];
  
  for (const term of alternatives) {
    try {
      const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}&retmode=json&retmax=1`;
      const response = await fetch(url);
      const data = await response.json();
      const count = data.esearchresult?.count || 0;
      
      console.log(`   "${term}": ${count.toLocaleString()} studies`);
    } catch (error) {
      console.log(`   "${term}": Error`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Diagnosis complete\n');
}

testEspirulinaFlow().catch(console.error);
