/**
 * TRACE: Vitamin B12 Generation
 * Debug why vitamin B12 is showing poor results
 */

import { searchSupplementInPubMed, getStudyQualityMetrics } from '../lib/services/medical-mcp-client';
import { analyzeStudiesWithBedrock } from '../lib/services/bedrock-analyzer';

async function traceVitaminB12() {
  console.log('🔍 TRACE: Vitamin B12 Generation\n');
  console.log('='.repeat(70));

  const queries = [
    'vitamin b12',
    'vitamin-b12',
    'vitamina b12',
    'b12',
    'cobalamin',
  ];

  for (const query of queries) {
    console.log(`\n\n📦 Testing query: "${query}"`);
    console.log('-'.repeat(70));

    try {
      // Step 1: Search PubMed
      console.log('\n1️⃣  Searching PubMed...');
      const studies = await searchSupplementInPubMed(query, {
        maxResults: 20,
        filterRCTs: true,
        filterMetaAnalyses: true,
        minYear: 2010,
      });

      console.log(`   Found: ${studies.length} studies`);

      if (studies.length === 0) {
        console.log('   ❌ NO STUDIES FOUND - This is the problem!');
        continue;
      }

      // Step 2: Show sample studies
      console.log('\n2️⃣  Sample Studies:');
      studies.slice(0, 3).forEach((study, i) => {
        console.log(`\n   ${i + 1}. ${study.title.substring(0, 80)}...`);
        console.log(`      PMID: ${study.pmid}`);
        console.log(`      Year: ${study.year}`);
        console.log(`      Types: ${study.publicationTypes.join(', ')}`);
      });

      // Step 3: Quality metrics
      const metrics = getStudyQualityMetrics(studies);
      console.log('\n3️⃣  Quality Metrics:');
      console.log(`   Total: ${metrics.total}`);
      console.log(`   RCTs: ${metrics.rctCount}`);
      console.log(`   Meta-analyses: ${metrics.metaAnalysisCount}`);
      console.log(`   Quality Score: ${metrics.qualityScore}`);

      // Step 4: Try Bedrock analysis (if studies found)
      if (studies.length >= 5) {
        console.log('\n4️⃣  Analyzing with Bedrock...');
        try {
          const analysis = await analyzeStudiesWithBedrock(query, studies);
          console.log(`   ✅ Analysis successful`);
          console.log(`   Grade: ${analysis.overallGrade}`);
          console.log(`   Works For: ${analysis.worksFor.length} items`);
          console.log(`   Doesn't Work For: ${analysis.doesntWorkFor.length} items`);

          // Show details
          console.log('\n   📊 Details:');
          console.log(`   What is it for: ${analysis.whatIsItFor.substring(0, 100)}...`);

          if (analysis.worksFor.length > 0) {
            console.log('\n   ✅ Works For:');
            analysis.worksFor.forEach(item => {
              console.log(`      - ${item.condition} [${item.grade}]`);
            });
          }

          if (analysis.doesntWorkFor.length > 0) {
            console.log('\n   ❌ Doesn\'t Work For:');
            analysis.doesntWorkFor.forEach(item => {
              console.log(`      - ${item.condition} [${item.grade}]`);
            });
          }

        } catch (error: any) {
          console.error('   ❌ Bedrock analysis failed:', error.message);
        }
      } else {
        console.log('\n4️⃣  ⚠️  Not enough studies for analysis (need 5+)');
      }

    } catch (error: any) {
      console.error(`\n❌ Error for "${query}":`, error.message);
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(70));
  console.log('\n📊 SUMMARY: Why Vitamin B12 Might Be Failing\n');
  console.log('Possible causes:');
  console.log('1. Query normalization issue (vitamin b12 → vitamin-b12)');
  console.log('2. PubMed search not finding studies');
  console.log('3. Bedrock analysis returning generic data');
  console.log('4. Frontend using old/fallback data instead of generated');
  console.log('\nCheck logs above to identify exact issue.');
}

traceVitaminB12().catch(console.error);
