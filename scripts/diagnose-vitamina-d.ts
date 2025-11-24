#!/usr/bin/env tsx
/**
 * Diagnostic script for "vitamina d" search failure
 * Tests the complete flow: input → translation → PubMed → enrichment
 */

import { expandAbbreviation } from '../lib/services/abbreviation-expander';

async function diagnoseVitaminaD() {
  console.log('🔍 DIAGNOSING: "vitamina d" search failure\n');
  
  const testCases = [
    'vitamina d',
    'Vitamina D',
    'VITAMINA D',
    'vitamin d',
    'Vitamin D',
  ];

  for (const input of testCases) {
    console.log(`\n📝 Testing: "${input}"`);
    console.log('─'.repeat(50));
    
    try {
      const expansion = await expandAbbreviation(input);
      console.log(`Original: "${expansion.original}"`);
      console.log(`Is Abbreviation: ${expansion.isAbbreviation}`);
      console.log(`Alternatives: [${expansion.alternatives.map(a => `"${a}"`).join(', ')}]`);
      console.log(`Confidence: ${expansion.confidence}`);
      console.log(`Source: ${expansion.source}`);
      
      // Check if translation occurred
      const hasAlternatives = expansion.alternatives.length > 0;
      if (!hasAlternatives) {
        console.log('⚠️  NO TRANSLATION/EXPANSION OCCURRED');
      } else {
        console.log('✅ Translation/expansion successful');
        
        // Test PubMed with first alternative
        const searchTerm = expansion.alternatives[0];
        const pubmedUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchTerm)}&retmode=json&retmax=5`;
        console.log(`\n🔬 Testing PubMed with: "${searchTerm}"`);
        
        const response = await fetch(pubmedUrl);
        const data = await response.json();
        const count = data.esearchresult?.count || 0;
        
        console.log(`📊 PubMed results: ${count} studies`);
        
        if (count > 0) {
          console.log('✅ PubMed search successful');
        } else {
          console.log('❌ No PubMed results found');
        }
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }

  // Check the abbreviation expander with more Spanish terms
  console.log('\n\n🔍 CHECKING OTHER SPANISH TERMS');
  console.log('─'.repeat(50));
  
  const spanishTerms = [
    'vitamina d',
    'vitamina c',
    'omega 3',
    'coenzima q10',
    'magnesio',
    'berberina',
  ];
  
  for (const term of spanishTerms) {
    try {
      const expansion = await expandAbbreviation(term);
      const hasAlternatives = expansion.alternatives.length > 0;
      const firstAlt = expansion.alternatives[0] || term;
      console.log(`${hasAlternatives ? '✅' : '❌'} "${term}" → "${firstAlt}" (${expansion.source})`);
    } catch (error) {
      console.log(`❌ "${term}" → ERROR: ${error}`);
    }
  }
}

diagnoseVitaminaD().catch(console.error);
