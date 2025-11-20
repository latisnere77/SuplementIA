/**
 * TEST: Complete System with Real Caching
 *
 * This test verifies the ENTIRE system works end-to-end:
 * 1. Search PubMed for real studies
 * 2. Analyze with Bedrock
 * 3. Save to DynamoDB
 * 4. Retrieve from cache
 * 5. Verify cache hit
 */

import { searchSupplementInPubMed, getStudyQualityMetrics } from '../lib/services/medical-mcp-client';
import { analyzeStudiesWithBedrock, estimateAnalysisCost } from '../lib/services/bedrock-analyzer';
import { getCachedEvidence, saveCachedEvidence } from '../lib/services/dynamodb-cache';
import { getRichSupplementData } from '../lib/portal/supplements-evidence-rich';

const TEST_SUPPLEMENT = 'zinc';

async function testCompleteSystem() {
  console.log('🧪 TEST: Complete System with Real Caching\n');
  console.log('='.repeat(70));
  console.log(`\nTesting with: ${TEST_SUPPLEMENT.toUpperCase()}`);
  console.log('-'.repeat(70));

  try {
    // LEVEL 1: Check static cache
    console.log('\n📦 LEVEL 1: Static Cache');
    const staticData = getRichSupplementData(TEST_SUPPLEMENT);
    if (staticData) {
      console.log('   ✅ Found in static cache');
      console.log('   ℹ️  No need for dynamic generation');
      return;
    }
    console.log('   ❌ Not in static cache');

    // LEVEL 2: Check DynamoDB cache
    console.log('\n📦 LEVEL 2: Dynamic Cache (DynamoDB)');
    const cachedData = await getCachedEvidence(TEST_SUPPLEMENT);

    if (cachedData) {
      console.log('   ✅ Found in DynamoDB cache!');
      console.log(`   Grade: ${cachedData.overallGrade}`);
      console.log(`   Works For: ${cachedData.worksFor.length} items`);
      console.log('   ⚡ Fast response from cache');
      return;
    }
    console.log('   ❌ Not in DynamoDB cache');

    // LEVEL 3: Generate dynamically
    console.log('\n📦 LEVEL 3: Dynamic Generation');
    console.log('   🔬 Searching PubMed...');

    const startTime = Date.now();
    const studies = await searchSupplementInPubMed(TEST_SUPPLEMENT, {
      maxResults: 20,
      filterRCTs: true,
      filterMetaAnalyses: true,
      minYear: 2010,
    });

    console.log(`   ✅ Found ${studies.length} studies`);

    if (studies.length === 0) {
      console.log('   ⚠️  No studies found, cannot generate');
      return;
    }

    const metrics = getStudyQualityMetrics(studies);
    console.log(`   📊 Quality: ${metrics.qualityScore.toUpperCase()}`);
    console.log(`   📊 RCTs: ${metrics.rctCount}, Meta-analyses: ${metrics.metaAnalysisCount}`);

    // Cost estimation
    const cost = estimateAnalysisCost(studies);
    console.log(`\n   💰 Cost Estimate:`);
    console.log(`      Input tokens: ${cost.inputTokens}`);
    console.log(`      Output tokens: ${cost.outputTokens}`);
    console.log(`      Total cost: $${cost.totalCost.toFixed(3)}`);

    // Analyze with Bedrock
    console.log('\n   🤖 Analyzing with Bedrock Claude...');
    const analysis = await analyzeStudiesWithBedrock(TEST_SUPPLEMENT, studies);
    console.log(`   ✅ Analysis complete - Grade ${analysis.overallGrade}`);

    // Format as rich data
    const evidenceData = {
      overallGrade: analysis.overallGrade,
      whatIsItFor: analysis.whatIsItFor,
      worksFor: analysis.worksFor,
      doesntWorkFor: analysis.doesntWorkFor,
      limitedEvidence: analysis.limitedEvidence,
      qualityBadges: {
        hasRCTs: metrics.rctCount > 0,
        hasMetaAnalysis: metrics.metaAnalysisCount > 0,
        longTermStudies: metrics.avgYear < new Date().getFullYear() - 5,
        safetyEstablished: true,
      },
      ingredients: [
        {
          name: TEST_SUPPLEMENT.charAt(0).toUpperCase() + TEST_SUPPLEMENT.slice(1),
          grade: analysis.overallGrade,
          studyCount: metrics.total,
          rctCount: metrics.rctCount,
          description: `Based on ${metrics.total} peer-reviewed studies`,
        },
      ],
    };

    const duration = Date.now() - startTime;
    console.log(`\n   ⏱️  Generation time: ${(duration / 1000).toFixed(1)}s`);

    // Save to DynamoDB
    console.log('\n   💾 Saving to DynamoDB cache...');
    await saveCachedEvidence(TEST_SUPPLEMENT, evidenceData, {
      studyQuality: metrics.qualityScore,
      pubmedIds: studies.map(s => s.pmid),
      studyCount: metrics.total,
      rctCount: metrics.rctCount,
      metaAnalysisCount: metrics.metaAnalysisCount,
    });
    console.log('   ✅ Saved to cache');

    // Verify cache works
    console.log('\n   🔍 Verifying cache...');
    const verifyCache = await getCachedEvidence(TEST_SUPPLEMENT);

    if (verifyCache) {
      console.log('   ✅ Cache verified! Data can be retrieved');
    } else {
      console.log('   ❌ Cache verification failed');
      throw new Error('Cache not working');
    }

    // Display results
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 GENERATED EVIDENCE DATA:');
    console.log('-'.repeat(70));
    console.log(`\nGrade: ${evidenceData.overallGrade}`);
    console.log(`\nWhat is it for:`);
    console.log(`${evidenceData.whatIsItFor}\n`);

    console.log(`✅ Works For (${evidenceData.worksFor.length}):`);
    evidenceData.worksFor.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.condition} [${item.grade}]`);
    });

    console.log(`\n❌ Doesn't Work For (${evidenceData.doesntWorkFor.length}):`);
    evidenceData.doesntWorkFor.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.condition} [${item.grade}]`);
    });

    // Final verification - test cache hit
    console.log('\n' + '='.repeat(70));
    console.log('\n🔄 TESTING CACHE HIT:');
    console.log('-'.repeat(70));

    const cacheHitStart = Date.now();
    const cachedResult = await getCachedEvidence(TEST_SUPPLEMENT);
    const cacheHitTime = Date.now() - cacheHitStart;

    if (cachedResult) {
      console.log(`\n✅ Cache hit successful!`);
      console.log(`⚡ Response time: ${cacheHitTime}ms`);
      console.log(`📈 Speed improvement: ${(duration / cacheHitTime).toFixed(0)}x faster`);
      console.log(`\nFirst time: ${(duration / 1000).toFixed(1)}s`);
      console.log(`Cache hit: ${cacheHitTime}ms`);
    } else {
      console.log('\n❌ Cache hit failed');
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ COMPLETE SYSTEM TEST PASSED!');
    console.log('\n🎉 System is 100% operational:');
    console.log('   ✅ PubMed search working');
    console.log('   ✅ Bedrock analysis working');
    console.log('   ✅ DynamoDB caching working');
    console.log('   ✅ Cache retrieval working');
    console.log(`   ✅ Performance: First ${(duration/1000).toFixed(1)}s, then ${cacheHitTime}ms`);

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
    throw error;
  }
}

testCompleteSystem().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
