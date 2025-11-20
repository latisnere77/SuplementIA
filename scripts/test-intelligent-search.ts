/**
 * TEST: Intelligent Search System
 * Test multi-candidate search with "cardo santo"
 */

import { searchSupplementInPubMed } from '../lib/services/medical-mcp-client';
import { getIntelligentSearchStrategy } from '../lib/services/supplement-intelligence';

async function testIntelligentSearch() {
  console.log('🧪 TEST: Intelligent Search System\n');
  console.log('='.repeat(70));

  const testCases = [
    'cardo santo',       // Ambiguous: milk thistle vs blessed thistle
    'cardosanto',        // Typo (no space)
    'cardo mariano',     // Alternative name
    'colaeno',           // Typo
    'vitamina c',        // Spanish
    'curcuma',           // No accent
    'omega 3',           // Common
  ];

  for (const query of testCases) {
    console.log(`\n\n${'='.repeat(70)}`);
    console.log(`📊 TEST CASE: "${query}"`);
    console.log('='.repeat(70));

    // Test 1: Strategy analysis
    console.log('\n🔍 STEP 1: Intelligent Strategy Analysis');
    console.log('-'.repeat(70));

    const strategy = getIntelligentSearchStrategy(query, 3);

    console.log(`\nOriginal query: "${strategy.originalQuery}"`);
    console.log(`Strategy: ${strategy.strategy}`);
    console.log(`Candidates found: ${strategy.candidates.length}\n`);

    strategy.candidates.forEach((c, i) => {
      console.log(`  ${i + 1}. "${c.term}"`);
      console.log(`     Type: ${c.type}`);
      console.log(`     Confidence: ${c.confidence.toFixed(2)}`);
      console.log(`     Source: ${c.source}`);
    });

    // Test 2: Actual search
    console.log('\n\n🔬 STEP 2: PubMed Search (Intelligent Mode)');
    console.log('-'.repeat(70));

    try {
      const articles = await searchSupplementInPubMed(query, {
        maxResults: 20,
        filterRCTs: true,
        filterMetaAnalyses: true,
        minYear: 2010,
        useIntelligentSearch: true, // Use new intelligent search
      });

      console.log(`\n✅ RESULT: Found ${articles.length} articles\n`);

      if (articles.length > 0) {
        console.log('📊 QUALITY METRICS:');
        console.log('-'.repeat(70));

        const rctCount = articles.filter(a =>
          a.publicationTypes.some(t => t.toLowerCase().includes('randomized controlled trial'))
        ).length;

        const metaCount = articles.filter(a =>
          a.publicationTypes.some(t => t.toLowerCase().includes('meta-analysis'))
        ).length;

        const reviewCount = articles.filter(a =>
          a.publicationTypes.some(t => t.toLowerCase().includes('systematic review'))
        ).length;

        console.log(`Total studies: ${articles.length}`);
        console.log(`RCTs: ${rctCount}`);
        console.log(`Meta-analyses: ${metaCount}`);
        console.log(`Systematic reviews: ${reviewCount}`);

        // Estimate grade
        let estimatedGrade = 'D';
        if (metaCount >= 2 && rctCount >= 10) {
          estimatedGrade = 'A';
        } else if (rctCount >= 10 || metaCount >= 1) {
          estimatedGrade = 'B';
        } else if (rctCount >= 5) {
          estimatedGrade = 'C';
        }

        console.log(`\n✅ Estimated Grade: ${estimatedGrade}`);

        console.log('\nFirst 3 studies:');
        console.log('-'.repeat(70));
        articles.slice(0, 3).forEach((study, i) => {
          console.log(`\n${i + 1}. ${study.title.substring(0, 100)}...`);
          console.log(`   PMID: ${study.pmid}`);
          console.log(`   Year: ${study.year}`);
          console.log(`   Journal: ${study.journal.substring(0, 50)}`);
        });
      } else {
        console.log('❌ No studies found');
      }

    } catch (error: any) {
      console.error('\n❌ ERROR:', error.message);
    }
  }

  console.log('\n\n' + '='.repeat(70));
  console.log('🎯 TEST COMPLETE');
  console.log('='.repeat(70));
}

testIntelligentSearch().catch(console.error);
