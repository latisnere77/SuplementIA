#!/usr/bin/env tsx
/**
 * Diagnose "condroitina" translation and search
 */

import { expandAbbreviation } from '../lib/services/abbreviation-expander';

async function diagnoseCondroitina() {
  console.log('🔍 DIAGNOSING: "condroitina" translation failure\n');
  console.log('='.repeat(60));

  const testCases = [
    'condroitina',
    'Condroitina',
    'chondroitin',
    'Chondroitin',
    'glucosamina',
    'Glucosamina',
  ];

  for (const input of testCases) {
    console.log(`\n📝 Testing: "${input}"`);
    console.log('─'.repeat(60));

    try {
      const expansion = await expandAbbreviation(input);
      console.log(`Original: "${expansion.original}"`);
      console.log(`Is Abbreviation: ${expansion.isAbbreviation}`);
      console.log(`Alternatives: [${expansion.alternatives.map(a => `"${a}"`).join(', ')}]`);
      console.log(`Confidence: ${expansion.confidence}`);
      console.log(`Source: ${expansion.source}`);

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
    } catch (error: any) {
      console.error('❌ Error:', error.message);
    }
  }

  // Test direct PubMed search
  console.log('\n\n🔬 DIRECT PUBMED TESTS');
  console.log('─'.repeat(60));

  const directTests = [
    'condroitina',
    'chondroitin',
    'chondroitin sulfate',
    'glucosamina',
    'glucosamine',
  ];

  for (const term of directTests) {
    const pubmedUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}&retmode=json&retmax=1`;
    const response = await fetch(pubmedUrl);
    const data = await response.json();
    const count = data.esearchresult?.count || 0;
    console.log(`${count > 0 ? '✅' : '❌'} "${term}": ${count.toLocaleString()} studies`);
  }
}

diagnoseCondroitina().catch(console.error);
