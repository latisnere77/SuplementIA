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
  // Top 10 - Most Popular
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
  
  // 11-30 - Very Popular
  { name: 'iron', aliases: ['hierro', 'ferrous sulfate'] },
  { name: 'calcium', aliases: ['calcio', 'calcium carbonate'] },
  { name: 'vitamin-b-complex', aliases: ['vitamin b', 'vitamina b', 'b complex'] },
  { name: 'probiotics', aliases: ['probioticos', 'probióticos', 'lactobacillus'] },
  { name: 'melatonin', aliases: ['melatonina'] },
  { name: 'ashwagandha', aliases: ['ashwagandha'] },
  { name: 'turmeric', aliases: ['curcuma', 'cúrcuma', 'curcumin'] },
  { name: 'coq10', aliases: ['coenzyme q10', 'coenzima q10'] },
  { name: 'biotin', aliases: ['biotina', 'vitamin b7'] },
  { name: 'vitamin-e', aliases: ['vitamin e', 'vitamina e', 'tocopherol'] },
  { name: 'vitamin-k', aliases: ['vitamin k', 'vitamina k'] },
  { name: 'vitamin-a', aliases: ['vitamin a', 'vitamina a', 'retinol'] },
  { name: 'folic-acid', aliases: ['folate', 'acido folico', 'ácido fólico'] },
  { name: 'selenium', aliases: ['selenio'] },
  { name: 'chromium', aliases: ['cromo'] },
  { name: 'copper', aliases: ['cobre'] },
  { name: 'manganese', aliases: ['manganeso'] },
  { name: 'iodine', aliases: ['yodo', 'iodine'] },
  { name: 'potassium', aliases: ['potasio'] },
  { name: 'bcaa', aliases: ['branched chain amino acids', 'aminoacidos ramificados'] },
  
  // 31-60 - Popular
  { name: 'glutamine', aliases: ['glutamina', 'l-glutamine'] },
  { name: 'glucosamine', aliases: ['glucosamina'] },
  { name: 'chondroitin', aliases: ['condroitina'] },
  { name: 'msm', aliases: ['methylsulfonylmethane', 'metilsulfonilmetano'] },
  { name: 'green-tea-extract', aliases: ['green tea', 'te verde', 'té verde', 'egcg'] },
  { name: 'ginkgo-biloba', aliases: ['ginkgo'] },
  { name: 'ginseng', aliases: ['panax ginseng'] },
  { name: 'rhodiola', aliases: ['rhodiola rosea'] },
  { name: 'valerian', aliases: ['valeriana'] },
  { name: 'chamomile', aliases: ['manzanilla'] },
  { name: 'lavender', aliases: ['lavanda'] },
  { name: 'echinacea', aliases: ['equinacea'] },
  { name: 'garlic', aliases: ['ajo', 'garlic extract'] },
  { name: 'ginger', aliases: ['jengibre'] },
  { name: 'cinnamon', aliases: ['canela'] },
  { name: 'saw-palmetto', aliases: ['saw palmetto', 'palma enana'] },
  { name: 'milk-thistle', aliases: ['milk thistle', 'cardo mariano'] },
  { name: 'alpha-lipoic-acid', aliases: ['ala', 'acido alfa lipoico', 'ácido alfa lipoico'] },
  { name: 'resveratrol', aliases: ['resveratrol'] },
  { name: 'quercetin', aliases: ['quercetina'] },
  { name: 'lutein', aliases: ['luteina', 'luteína'] },
  { name: 'zeaxanthin', aliases: ['zeaxantina'] },
  { name: 'astaxanthin', aliases: ['astaxantina'] },
  { name: 'lycopene', aliases: ['licopeno'] },
  { name: 'beta-carotene', aliases: ['beta carotene', 'betacaroteno'] },
  { name: 'spirulina', aliases: ['espirulina'] },
  { name: 'chlorella', aliases: ['clorella'] },
  { name: 'maca', aliases: ['maca root', 'raiz de maca', 'raíz de maca'] },
  { name: 'tribulus', aliases: ['tribulus terrestris'] },
  { name: 'fenugreek', aliases: ['fenogreco', 'alholva'] },
  
  // 61-90 - Common
  { name: 'berberine', aliases: ['berberina'] },
  { name: 'nac', aliases: ['n-acetylcysteine', 'n-acetilcisteina'] },
  { name: '5-htp', aliases: ['5-hydroxytryptophan', '5-hidroxitriptofano'] },
  { name: 'l-theanine', aliases: ['l-teanina', 'theanine', 'teanina'] },
  { name: 'taurine', aliases: ['taurina'] },
  { name: 'arginine', aliases: ['arginina', 'l-arginine'] },
  { name: 'citrulline', aliases: ['citrulina', 'l-citrulline'] },
  { name: 'beta-alanine', aliases: ['beta alanina', 'beta-alanina'] },
  { name: 'hmb', aliases: ['beta-hydroxy beta-methylbutyrate'] },
  { name: 'cla', aliases: ['conjugated linoleic acid', 'acido linoleico conjugado'] },
  { name: 'mct-oil', aliases: ['mct', 'medium chain triglycerides'] },
  { name: 'psyllium', aliases: ['psilio', 'psyllium husk'] },
  { name: 'inulin', aliases: ['inulina'] },
  { name: 'glucomannan', aliases: ['glucomanano'] },
  { name: 'apple-cider-vinegar', aliases: ['vinagre de manzana', 'acv'] },
  { name: 'black-seed-oil', aliases: ['black seed', 'aceite de comino negro'] },
  { name: 'evening-primrose-oil', aliases: ['evening primrose', 'aceite de onagra'] },
  { name: 'borage-oil', aliases: ['borage', 'aceite de borraja'] },
  { name: 'flaxseed-oil', aliases: ['flaxseed', 'aceite de linaza'] },
  { name: 'chia-seeds', aliases: ['chia', 'semillas de chia', 'semillas de chía'] },
  { name: 'hemp-seeds', aliases: ['hemp', 'semillas de cañamo', 'semillas de cáñamo'] },
  { name: 'pumpkin-seeds', aliases: ['pumpkin', 'semillas de calabaza'] },
  { name: 'sunflower-lecithin', aliases: ['lecithin', 'lecitina'] },
  { name: 'phosphatidylserine', aliases: ['fosfatidilserina'] },
  { name: 'dmae', aliases: ['dimethylaminoethanol'] },
  { name: 'bacopa', aliases: ['bacopa monnieri'] },
  { name: 'lions-mane', aliases: ['lions mane', 'melena de leon', 'melena de león'] },
  { name: 'cordyceps', aliases: ['cordyceps'] },
  { name: 'reishi', aliases: ['reishi mushroom', 'hongo reishi'] },
  { name: 'chaga', aliases: ['chaga mushroom', 'hongo chaga'] },
  
  // 91-100 - Specialized
  { name: 'dhea', aliases: ['dehydroepiandrosterone'] },
  { name: 'pregnenolone', aliases: ['pregnenolona'] },
  { name: 'sam-e', aliases: ['s-adenosylmethionine'] },
  { name: 'pqq', aliases: ['pyrroloquinoline quinone'] },
  { name: 'nicotinamide-riboside', aliases: ['nr', 'niagen'] },
  { name: 'nmn', aliases: ['nicotinamide mononucleotide'] },
  { name: 'sulforaphane', aliases: ['sulforafano'] },
  { name: 'pterostilbene', aliases: ['pterostilbeno'] },
  { name: 'apigenin', aliases: ['apigenina'] },
  { name: 'boron', aliases: ['boro'] },
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
