/**
 * DEBUG: Colageno (Collagen) Generation
 * Trace why colageno is showing poor/generic data (Grade E)
 * Despite being a well-studied substance
 */

import { searchSupplementInPubMed } from '../lib/services/medical-mcp-client';
import { transformEvidenceToNew } from '../lib/portal/evidence-transformer';

async function debugColageno() {
  console.log('🔍 DEBUG: Colageno (Collagen) Generation\n');
  console.log('='.repeat(70));

  // Test 1: Direct PubMed search with Spanish
  console.log('\n📊 TEST 1: PubMed Search - "colageno" (Spanish)');
  console.log('-'.repeat(70));

  try {
    const colagenoStudies = await searchSupplementInPubMed('colageno', {
      maxResults: 20,
      filterRCTs: true,
      filterMetaAnalyses: true,
      minYear: 2010,
    });

    console.log(`\n✅ Found ${colagenoStudies.length} studies for "colageno"`);
    if (colagenoStudies.length > 0) {
      console.log('\nFirst 3 studies:');
      colagenoStudies.slice(0, 3).forEach((study, i) => {
        console.log(`\n${i + 1}. ${study.title}`);
        console.log(`   PMID: ${study.pmid}`);
        console.log(`   Year: ${study.year}`);
        console.log(`   Journal: ${study.journal}`);
        console.log(`   Types: ${study.publicationTypes.join(', ')}`);
      });
    }
  } catch (error: any) {
    console.error('❌ ERROR searching for "colageno":', error.message);
  }

  // Test 2: Direct PubMed search with English
  console.log('\n\n📊 TEST 2: PubMed Search - "collagen" (English)');
  console.log('-'.repeat(70));

  try {
    const collagenStudies = await searchSupplementInPubMed('collagen', {
      maxResults: 20,
      filterRCTs: true,
      filterMetaAnalyses: true,
      minYear: 2010,
    });

    console.log(`\n✅ Found ${collagenStudies.length} studies for "collagen"`);
    if (collagenStudies.length > 0) {
      console.log('\nFirst 3 studies:');
      collagenStudies.slice(0, 3).forEach((study, i) => {
        console.log(`\n${i + 1}. ${study.title}`);
        console.log(`   PMID: ${study.pmid}`);
        console.log(`   Year: ${study.year}`);
        console.log(`   Journal: ${study.journal}`);
        console.log(`   Types: ${study.publicationTypes.join(', ')}`);
      });
    }
  } catch (error: any) {
    console.error('❌ ERROR searching for "collagen":', error.message);
  }

  // Test 3: Full generation flow
  console.log('\n\n📊 TEST 3: Full Generation Flow - transformEvidenceToNew');
  console.log('-'.repeat(70));

  const mockBackendEvidence = {
    totalStudies: 857102,
    totalParticipants: 2500,
    efficacyPercentage: 75,
    researchSpanYears: 10,
    ingredients: [
      { name: 'Collagen', grade: 'E', studyCount: 25, rctCount: 1 }
    ]
  };

  try {
    console.log('\n🔄 Calling transformEvidenceToNew with "colageno"...\n');

    const result = await transformEvidenceToNew(
      mockBackendEvidence,
      'colageno',
      (progress) => {
        console.log(`   [${progress.percentage}%] ${progress.phase}: ${progress.message}`);
      }
    );

    console.log('\n✅ Transform complete!');
    console.log('\n📊 RESULT:');
    console.log('-'.repeat(70));
    console.log(`Grade: ${result.overallGrade}`);
    console.log(`\nWhat is it for:`);
    console.log(`"${result.whatIsItFor}"\n`);

    // Check if using generic fallback
    if (result.whatIsItFor.includes('Suplemento natural') ||
        result.whatIsItFor.includes('Apoya la salud')) {
      console.log('❌ PROBLEM: Using GENERIC FALLBACK or POOR DATA!');
      console.log('\nPossible causes:');
      console.log('   1. Spanish fallback not triggering');
      console.log('   2. PubMed returning insufficient studies');
      console.log('   3. Bedrock analysis producing generic output');
      console.log('   4. Search query not optimized for collagen studies');
    } else {
      console.log('✅ SUCCESS: Using rich, specific data!');
    }

    console.log(`\nWorks For (${result.worksFor.length} conditions):`);
    result.worksFor.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.condition} [${item.grade}]`);
      console.log(`      "${item.description.substring(0, 80)}..."`);
    });

    // Compare with Examine.com expectations
    console.log('\n\n📊 COMPARISON WITH EXAMINE.COM:');
    console.log('-'.repeat(70));
    console.log('Examine.com shows:');
    console.log('   - Grade: B for Pain');
    console.log('   - 603 participants in 6 trials');
    console.log('   - Conditions: Rheumatoid Arthritis, Osteoarthritis, Exercise Recovery, Joint Pain');
    console.log('   - Type II Collagen with specific dosing (40mg undenatured, 10g hydrolyzed)');
    console.log('\nOur results:');
    console.log(`   - Grade: ${result.overallGrade}`);
    console.log(`   - Works For: ${result.worksFor.length} conditions`);
    console.log(`   - Quality: ${result.worksFor.length >= 3 ? '✅ Good' : '❌ Poor'}`);

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n🎯 RECOMMENDATIONS:');
  console.log('1. Verify Spanish → English fallback is working');
  console.log('2. Check PubMed query optimization (maybe need "type II collagen")');
  console.log('3. Review Bedrock prompt to produce richer analysis');
  console.log('4. Consider adding specific collagen types (Type I, II, III)');
  console.log('5. May need to search for "collagen peptides" separately');
}

debugColageno().catch(console.error);
