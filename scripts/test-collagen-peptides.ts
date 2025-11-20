/**
 * Test: Collagen Peptides Search
 * Direct test of "collagen peptides" query
 */

import { searchSupplementInPubMed } from '../lib/services/medical-mcp-client';

async function testCollagenPeptides() {
  console.log('🧪 TEST: Collagen Peptides Direct Search\n');
  console.log('='.repeat(70));

  try {
    console.log('\n📊 Searching for "collagen peptides"...\n');

    const studies = await searchSupplementInPubMed('collagen peptides', {
      maxResults: 20,
      filterRCTs: true,
      filterMetaAnalyses: true,
      minYear: 2010,
    });

    console.log(`\n✅ Results: ${studies.length} studies found\n`);

    if (studies.length > 0) {
      console.log('First 5 studies:');
      console.log('-'.repeat(70));
      studies.slice(0, 5).forEach((study, i) => {
        console.log(`\n${i + 1}. ${study.title}`);
        console.log(`   PMID: ${study.pmid}`);
        console.log(`   Year: ${study.year}`);
        console.log(`   Journal: ${study.journal}`);
        console.log(`   Types: ${study.publicationTypes.join(', ')}`);
        console.log(`   Abstract: ${study.abstract.substring(0, 150)}...`);
      });

      console.log('\n\n📊 QUALITY METRICS:');
      console.log('-'.repeat(70));

      const rctCount = studies.filter(s =>
        s.publicationTypes.some(t => t.toLowerCase().includes('randomized controlled trial'))
      ).length;

      const metaCount = studies.filter(s =>
        s.publicationTypes.some(t => t.toLowerCase().includes('meta-analysis'))
      ).length;

      const reviewCount = studies.filter(s =>
        s.publicationTypes.some(t => t.toLowerCase().includes('systematic review'))
      ).length;

      console.log(`Total studies: ${studies.length}`);
      console.log(`RCTs: ${rctCount}`);
      console.log(`Meta-analyses: ${metaCount}`);
      console.log(`Systematic reviews: ${reviewCount}`);

      console.log('\n✅ This should be enough for Grade B analysis!');
    } else {
      console.log('❌ No studies found - this is the problem!');
    }

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n' + '='.repeat(70));
}

testCollagenPeptides().catch(console.error);
