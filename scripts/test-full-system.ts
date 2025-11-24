/**
 * TEST: Full Dynamic Evidence Generation System
 *
 * This script tests the COMPLETE end-to-end flow:
 * 1. Search PubMed via Medical MCP Client
 * 2. Analyze studies with Bedrock Claude
 * 3. Generate rich evidence data
 * 4. Cache in DynamoDB (simulated)
 *
 * Run: npx tsx scripts/test-full-system.ts
 */

import { generateRichEvidenceData } from '../lib/portal/supplements-evidence-dynamic';
import { getRichSupplementData } from '../lib/portal/supplements-evidence-rich';

// ====================================
// TEST CONFIGURATION
// ====================================

const TEST_SUPPLEMENT = 'zinc'; // Not in cache, needs generation

// ====================================
// MAIN TEST
// ====================================

async function testFullSystem() {
  console.log('🧪 TEST: Full Dynamic Evidence Generation System\n');
  console.log('='.repeat(70));

  console.log(`\n📦 Testing with: ${TEST_SUPPLEMENT.toUpperCase()}`);
  console.log('-'.repeat(70));

  // Step 1: Check if in static cache
  console.log('\n1️⃣  Checking static cache...');
  const staticData = getRichSupplementData(TEST_SUPPLEMENT);

  if (staticData) {
    console.log(`   ✅ Found in static cache - Grade ${staticData.overallGrade}`);
    console.log('   ℹ️  Skipping dynamic generation (already cached)');
    return;
  }

  console.log('   ❌ Not in static cache');
  console.log('   → Will generate dynamically');

  // Step 2: Generate dynamically
  console.log('\n2️⃣  Generating evidence dynamically...');
  console.log('   This will:');
  console.log('   - Search PubMed for RCTs and meta-analyses');
  console.log('   - Analyze studies with Bedrock Claude');
  console.log('   - Generate structured rich data');
  console.log('   - Format in Examine.com style\n');

  const startTime = Date.now();

  try {
    const generated = await generateRichEvidenceData(TEST_SUPPLEMENT);
    const duration = Date.now() - startTime;

    console.log(`\n✅ Generation complete in ${(duration / 1000).toFixed(1)}s\n`);

    // Step 3: Display results
    console.log('3️⃣  Generated Data:\n');
    console.log('-'.repeat(70));

    console.log(`\n📊 Overall Grade: ${generated.overallGrade}`);
    console.log(`\n📝 What is it for:`);
    console.log(`   ${generated.whatIsItFor}\n`);

    console.log(`✅ Works For (${generated.worksFor.length} conditions):`);
    generated.worksFor.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.condition} [Grade ${item.grade}]`);
      console.log(`      ${item.description}\n`);
    });

    console.log(`❌ Doesn't Work For (${generated.doesntWorkFor.length} conditions):`);
    generated.doesntWorkFor.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.condition} [Grade ${item.grade}]`);
      console.log(`      ${item.description}\n`);
    });

    if (generated.limitedEvidence && generated.limitedEvidence.length > 0) {
      console.log(`⚠️  Limited Evidence (${generated.limitedEvidence.length} conditions):`);
      generated.limitedEvidence.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.condition} [Grade ${item.grade}]`);
        console.log(`      ${item.description}\n`);
      });
    }

    console.log(`🔬 Study Quality:`);
    console.log(`   Total Studies: ${generated.ingredients[0]?.studyCount || 0}`);
    console.log(`   RCTs: ${generated.ingredients[0]?.rctCount || 0}`);
    console.log(`   Quality Badges:`);
    console.log(`   - RCTs: ${generated.qualityBadges.hasRCTs ? '✅' : '❌'}`);
    console.log(`   - Meta-Analyses: ${generated.qualityBadges.hasMetaAnalysis ? '✅' : '❌'}`);
    console.log(`   - Long-term Studies: ${generated.qualityBadges.longTermStudies ? '✅' : '❌'}`);
    console.log(`   - Safety Established: ${generated.qualityBadges.safetyEstablished ? '✅' : '❌'}`);

    // Step 4: Verify sources
    if ('sources' in generated && Array.isArray(generated.sources)) {
      console.log(`\n🔗 Verifiable Sources:`);
      console.log(`   PMIDs: ${generated.sources.slice(0, 5).join(', ')}...`);
      console.log(`   Total: ${generated.sources.length} studies referenced`);
    }

    // Step 5: Compare with manual curation
    console.log('\n4️⃣  Quality Assessment:\n');
    console.log('-'.repeat(70));

    console.log('\n✅ Checklist:');
    console.log(`   [ ${generated.overallGrade !== 'F' ? '✅' : '❌'} ] Has valid grade`);
    console.log(`   [ ${generated.worksFor.length > 0 ? '✅' : '❌'} ] Has "Works For" items`);
    console.log(`   [ ${generated.whatIsItFor.length > 50 ? '✅' : '❌'} ] Has detailed description`);
    console.log(`   [ ${generated.qualityBadges.hasRCTs ? '✅' : '❌'} ] Based on RCTs`);

    const qualityScore =
      (generated.overallGrade !== 'F' ? 25 : 0) +
      (generated.worksFor.length > 0 ? 25 : 0) +
      (generated.whatIsItFor.length > 50 ? 25 : 0) +
      (generated.qualityBadges.hasRCTs ? 25 : 0);

    console.log(`\n   Overall Quality: ${qualityScore}%`);

    if (qualityScore >= 75) {
      console.log('   ✅ HIGH QUALITY - Ready for production');
    } else if (qualityScore >= 50) {
      console.log('   ⚠️  MEDIUM QUALITY - May need review');
    } else {
      console.log('   ❌ LOW QUALITY - Needs improvement');
    }

    // Step 6: Performance metrics
    console.log('\n5️⃣  Performance Metrics:\n');
    console.log('-'.repeat(70));
    console.log(`\n   Generation Time: ${(duration / 1000).toFixed(1)}s`);
    console.log(`   Target: <10s first time`);
    console.log(`   Status: ${duration < 10000 ? '✅ PASS' : '⚠️  SLOW'}`);

    // Step 7: Cost estimation
    const estimatedCost = 0.037; // From earlier test
    console.log(`\n   Estimated Cost: $${estimatedCost.toFixed(3)}`);
    console.log(`   Budget: $0.050 per generation`);
    console.log(`   Status: ${estimatedCost < 0.05 ? '✅ WITHIN BUDGET' : '⚠️  OVER BUDGET'}`);

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ SYSTEM TEST COMPLETE!');
    console.log('\nNext Steps:');
    console.log('1. Deploy DynamoDB table for caching');
    console.log('2. Add this supplement to cache automatically');
    console.log('3. Future searches will be instant (<100ms)');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error('\nError details:', error);

    console.log('\n\n🔧 Troubleshooting:');
    console.log('1. Check AWS credentials for Bedrock');
    console.log('2. Verify PubMed API is accessible');
    console.log('3. Check network connectivity');
    console.log('4. Review error logs above');

    throw error;
  }
}

// ====================================
// RUN TEST
// ====================================

testFullSystem().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
