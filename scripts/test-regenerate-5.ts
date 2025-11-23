#!/usr/bin/env tsx
/**
 * TEST: Regenerate Top 5 Supplements
 * Proof of concept before scaling to 100
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'suplementia-content-enricher-cache';

// TEST: Only top 5 most popular
const TEST_SUPPLEMENTS = [
  { name: 'vitamin-d', aliases: ['vitamin d', 'vitamina d', 'vitamin-d3'] },
  { name: 'omega-3', aliases: ['omega 3', 'omega-3', 'fish oil'] },
  { name: 'magnesium', aliases: ['magnesio', 'magnesium glycinate'] },
  { name: 'l-carnitine', aliases: ['l-carnitina', 'carnitine'] },
  { name: 'creatine', aliases: ['creatina', 'creatine monohydrate'] },
];

async function invalidateCache(supplementId: string) {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { supplementId },
      })
    );
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function triggerRegeneration(supplementName: string) {
  console.log(`    🔄 Starting async regeneration...`);
  
  // Step 1: Trigger async regeneration (returns immediately)
  const asyncResponse = await fetch('https://www.suplementai.com/api/portal/enrich-async', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supplementName,
      forceRefresh: true,
      maxStudies: 10,
    }),
  });

  if (!asyncResponse.ok) {
    return {
      success: false,
      status: asyncResponse.status,
      hasRanking: false,
      positiveCount: 0,
      negativeCount: 0,
      consensus: null,
    };
  }

  const asyncData = await asyncResponse.json();
  const jobId = asyncData.jobId;
  const pollUrl = asyncData.pollUrl;

  console.log(`    ⏳ Job started: ${jobId}`);
  console.log(`    🔄 Polling for completion...`);

  // Step 2: Poll until complete (max 2 minutes)
  const maxAttempts = 60; // 60 attempts × 2s = 2 minutes
  let attempts = 0;

  while (attempts < maxAttempts) {
    await sleep(2000); // Wait 2 seconds
    attempts++;

    const statusResponse = await fetch(`https://www.suplementai.com${pollUrl}`, {
      method: 'GET',
    });

    const statusData = await statusResponse.json();

    if (statusData.status === 'completed') {
      console.log(`    ✅ Completed after ${attempts * 2}s`);
      
      return {
        success: true,
        status: 200,
        hasRanking: statusData.data?.studies?.ranked != null,
        positiveCount: statusData.data?.studies?.ranked?.positive?.length || 0,
        negativeCount: statusData.data?.studies?.ranked?.negative?.length || 0,
        consensus: statusData.data?.studies?.ranked?.metadata?.consensus || null,
      };
    } else if (statusData.status === 'error') {
      console.log(`    ❌ Error: ${statusData.error}`);
      return {
        success: false,
        status: 500,
        hasRanking: false,
        positiveCount: 0,
        negativeCount: 0,
        consensus: null,
      };
    }

    // Still processing
    if (attempts % 10 === 0) {
      console.log(`    ⏳ Still processing... (${attempts * 2}s elapsed)`);
    }
  }

  // Timeout after 2 minutes
  console.log(`    ⏱️  Timeout after ${maxAttempts * 2}s`);
  return {
    success: false,
    status: 408,
    hasRanking: false,
    positiveCount: 0,
    negativeCount: 0,
    consensus: null,
  };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testRegeneration() {
  console.log('🧪 TEST: Regenerating Top 5 Supplements\n');
  console.log(`Total: ${TEST_SUPPLEMENTS.length} supplements`);
  console.log(`Estimated time: ~10 minutes`);
  console.log(`Estimated cost: $0.03 USD\n`);

  const results: any[] = [];

  for (let i = 0; i < TEST_SUPPLEMENTS.length; i++) {
    const supplement = TEST_SUPPLEMENTS[i];
    const progress = `[${i + 1}/${TEST_SUPPLEMENTS.length}]`;

    console.log(`\n${progress} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📦 Processing: ${supplement.name}`);
    console.log(`   Aliases: ${supplement.aliases.join(', ')}`);

    // Step 1: Invalidate cache
    console.log(`\n  Step 1/3: Invalidating cache...`);
    let deletedCount = 0;
    for (const alias of supplement.aliases) {
      const deleted = await invalidateCache(alias);
      if (deleted) {
        deletedCount++;
        console.log(`    ✅ Deleted: ${alias}`);
      } else {
        console.log(`    ℹ️  No cache: ${alias}`);
      }
    }
    console.log(`  Cache entries deleted: ${deletedCount}`);

    // Step 2: Trigger regeneration
    console.log(`\n  Step 2/3: Triggering regeneration...`);
    const startTime = Date.now();
    
    try {
      const result = await triggerRegeneration(supplement.name);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (result.success) {
        console.log(`  ✅ SUCCESS (${duration}s)`);
        console.log(`     - Has ranking: ${result.hasRanking ? '✅' : '❌'}`);
        if (result.hasRanking) {
          console.log(`     - Positive studies: ${result.positiveCount}`);
          console.log(`     - Negative studies: ${result.negativeCount}`);
          console.log(`     - Consensus: ${result.consensus}`);
        }
        
        results.push({
          supplement: supplement.name,
          success: true,
          hasRanking: result.hasRanking,
          duration: parseFloat(duration),
          ...result,
        });
      } else {
        console.log(`  ❌ FAILED (${duration}s) - Status: ${result.status}`);
        results.push({
          supplement: supplement.name,
          success: false,
          status: result.status,
          duration: parseFloat(duration),
        });
      }
    } catch (error: any) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ❌ ERROR (${duration}s): ${error.message}`);
      results.push({
        supplement: supplement.name,
        success: false,
        error: error.message,
        duration: parseFloat(duration),
      });
    }

    // Step 3: Wait before next
    if (i < TEST_SUPPLEMENTS.length - 1) {
      console.log(`\n  Step 3/3: Waiting 2 minutes before next...`);
      await sleep(120000); // 2 minutes
    }
  }

  // Summary
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const successful = results.filter(r => r.success);
  const withRanking = results.filter(r => r.hasRanking);
  const failed = results.filter(r => !r.success);
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`🎯 With Ranking: ${withRanking.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  console.log(`⏱️  Avg Duration: ${avgDuration.toFixed(1)}s`);

  if (withRanking.length > 0) {
    console.log('\n📈 Ranking Details:');
    withRanking.forEach(r => {
      console.log(`  - ${r.supplement}: ${r.positiveCount}+ / ${r.negativeCount}- (${r.consensus})`);
    });
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed Supplements:');
    failed.forEach(r => {
      console.log(`  - ${r.supplement}: ${r.error || `Status ${r.status}`}`);
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (withRanking.length === results.length) {
    console.log('🎉 TEST PASSED! All supplements regenerated with ranking.');
    console.log('✅ Ready to scale to 100 supplements.');
  } else if (withRanking.length > 0) {
    console.log('⚠️  TEST PARTIAL: Some supplements have ranking.');
    console.log('🔍 Review failures before scaling.');
  } else {
    console.log('❌ TEST FAILED: No supplements have ranking.');
    console.log('🔧 Fix issues before scaling.');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return results;
}

testRegeneration().catch(console.error);
