#!/usr/bin/env tsx
/**
 * Regenerate Top Supplements with Intelligent Ranking
 * Batch process to update cache for popular supplements
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'suplementia-content-enricher-cache';

const TOP_SUPPLEMENTS = [
  { name: 'vitamin-d', aliases: ['vitamin d', 'vitamina d', 'vitamin-d3', 'cholecalciferol'] },
  { name: 'omega-3', aliases: ['omega 3', 'omega-3', 'fish oil', 'aceite de pescado'] },
  { name: 'magnesium', aliases: ['magnesio', 'magnesium glycinate', 'magnesium citrate'] },
  { name: 'vitamin-c', aliases: ['vitamin c', 'vitamina c', 'ascorbic acid'] },
  { name: 'l-carnitine', aliases: ['l-carnitina', 'carnitine', 'carnitina'] },
  { name: 'creatine', aliases: ['creatina', 'creatine monohydrate'] },
  { name: 'protein', aliases: ['proteina', 'whey protein', 'suero de leche'] },
  { name: 'collagen', aliases: ['colageno', 'colágeno', 'collagen peptides'] },
  { name: 'zinc', aliases: ['cinc', 'zinc picolinate'] },
  { name: 'vitamin-b12', aliases: ['vitamin b12', 'vitamina b12', 'cobalamin'] },
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
      return false; // No cache entry
    }
    throw error;
  }
}

async function triggerRegeneration(supplementName: string) {
  const response = await fetch('https://www.suplementai.com/api/portal/enrich', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supplementName,
      forceRefresh: true,
      maxStudies: 10,
    }),
  });

  return response.ok;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function regenerateTopSupplements() {
  console.log('🚀 Starting batch regeneration of top supplements\n');
  console.log(`Total supplements: ${TOP_SUPPLEMENTS.length}`);
  console.log(`Estimated time: ${TOP_SUPPLEMENTS.length * 2} minutes\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < TOP_SUPPLEMENTS.length; i++) {
    const supplement = TOP_SUPPLEMENTS[i];
    const progress = `[${i + 1}/${TOP_SUPPLEMENTS.length}]`;

    console.log(`\n${progress} Processing: ${supplement.name}`);
    console.log(`  Aliases: ${supplement.aliases.join(', ')}`);

    // Step 1: Invalidate all aliases
    console.log('  Step 1: Invalidating cache...');
    let deletedCount = 0;
    for (const alias of supplement.aliases) {
      const deleted = await invalidateCache(alias);
      if (deleted) {
        deletedCount++;
        console.log(`    ✅ Deleted: ${alias}`);
      }
    }
    console.log(`  Cache entries deleted: ${deletedCount}`);

    // Step 2: Trigger regeneration
    console.log('  Step 2: Triggering regeneration...');
    try {
      const success = await triggerRegeneration(supplement.name);
      if (success) {
        console.log(`  ✅ SUCCESS: ${supplement.name} regenerated`);
        successCount++;
      } else {
        console.log(`  ❌ FAILED: ${supplement.name} (HTTP error)`);
        failCount++;
      }
    } catch (error: any) {
      console.log(`  ❌ FAILED: ${supplement.name} (${error.message})`);
      failCount++;
    }

    // Step 3: Wait before next (avoid overwhelming Lambda)
    if (i < TOP_SUPPLEMENTS.length - 1) {
      console.log('  Waiting 2 minutes before next...');
      await sleep(120000); // 2 minutes
    }
  }

  console.log('\n\n📊 Batch Regeneration Complete!');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  Total: ${TOP_SUPPLEMENTS.length}`);
  
  if (successCount === TOP_SUPPLEMENTS.length) {
    console.log('\n🎉 All supplements regenerated successfully!');
  } else if (successCount > 0) {
    console.log('\n⚠️  Some supplements failed. Check logs above.');
  } else {
    console.log('\n❌ All regenerations failed. Check Lambda and API.');
  }
}

// Run if called directly
if (require.main === module) {
  regenerateTopSupplements().catch(console.error);
}

export { regenerateTopSupplements, TOP_SUPPLEMENTS };
