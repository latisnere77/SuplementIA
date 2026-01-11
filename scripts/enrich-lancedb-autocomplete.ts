/**
 * Enrich LanceDB with common names/aliases for better autocomplete
 *
 * Strategy:
 * 1. Load supplements from LanceDB
 * 2. For each supplement, generate common_names from:
 *    - Hardcoded supplements-database.ts (145 items with rich aliases)
 *    - Popular abbreviations (CoQ10, B12, D3, etc.)
 *    - Scientific name variations
 *    - Common misspellings
 * 3. Update LanceDB records with enriched common_names
 * 4. Re-generate embeddings if needed
 */

import { connect } from '@lancedb/lancedb';
import { SUPPLEMENTS_DATABASE } from '../lib/portal/supplements-database';

const LANCEDB_PATH = process.env.LANCEDB_PATH || '/tmp/lancedb-pristine';

// Mapping of supplement names to common aliases
const ENRICHMENT_DATA: Record<string, string[]> = {
  // From hardcoded database - vitamins
  'vitamin d': ['vitamin d3', 'cholecalciferol', 'colecalciferol', 'd3', 'vitamina d', 'vit d', 'vitamin d complex', 'vitamina d3'],
  'vitamin c': ['ascorbic acid', 'ácido ascórbico', 'acido ascorbico', 'vitamina c', 'vit c', 'vitamin c complex', 'ascorbato'],
  'vitamin b12': ['b12', 'cobalamin', 'cyanocobalamin', 'cianocobalamina', 'vitamina b12'],
  'vitamin a': ['retinol', 'beta carotene', 'beta caroteno', 'vitamina a'],
  'vitamin e': ['tocopherol', 'tocoferol', 'vitamina e'],
  'vitamin b6': ['b6', 'pyridoxine', 'piridoxina'],
  'vitamin b1': ['b1', 'thiamine', 'thiamin', 'tiamina'],
  'vitamin b2': ['b2', 'riboflavin', 'riboflavina'],
  'vitamin b3': ['b3', 'niacin', 'niacina', 'nicotinic acid'],
  'vitamin b5': ['b5', 'pantothenic acid', 'acido pantotenico'],
  'vitamin b7': ['b7', 'biotin', 'biotina', 'vitamin h'],
  'vitamin b9': ['b9', 'folic acid', 'folate', 'acido folico', 'folato'],
  'vitamin b complex': ['vitamin b', 'vitamina b', 'vit b', 'b complex', 'complejo b', 'b vitamins', 'vitaminas b', 'complejo vitamina b'],
  'vitamin k2': ['k2', 'menaquinone'],

  // Minerals
  'magnesium': ['mg', 'magnesio', 'magnesium citrate', 'magnesium glycinate', 'citrato de magnesio', 'glicinato de magnesio'],
  'zinc': ['zn', 'zinc picolinate', 'picolinato de zinc'],
  'iron': ['fe', 'hierro', 'ferrous sulfate', 'iron bisglycinate', 'sulfato ferroso'],
  'calcium': ['ca', 'calcio', 'calcium carbonate', 'carbonato de calcio'],
  'potassium': ['k', 'potasio', 'potassium citrate'],
  'selenium': ['se', 'selenio'],
  'copper': ['cu', 'cobre'],
  'chromium': ['cr', 'cromo'],
  'iodine': ['i', 'yodo', 'iodine'],
  'manganese': ['mn', 'manganeso'],

  // Popular supplements with abbreviations
  'coenzyme q10': ['coq10', 'coq-10', 'ubiquinone', 'ubiquinona', 'coenzima q10'],
  'omega-3 fatty acids': ['omega 3', 'omega3', 'fish oil', 'epa', 'dha', 'aceite de pescado'],

  // Herbs/Adaptogens
  'ashwagandha': ['ashwaghanda', 'ashvagandha', 'withania somnifera', 'ginseng indio'],
  'turmeric': ['curcumin', 'curcuma', 'cúrcuma', 'curcumina'],
  'rhodiola': ['rhodiola rosea', 'rodiola', 'golden root'],
  'ginseng': ['panax ginseng', 'korean ginseng', 'ginseng coreano'],

  // Amino acids
  'creatine': ['creatine monohydrate', 'creatina', 'creatina monohidrato'],
  'l-theanine': ['theanine', 'teanina', 'l-teanina'],
  'l-carnitine': ['carnitine', 'carnitina'],
  'glutamine': ['l-glutamine', 'glutamina', 'l-glutamina'],
  'lysine': ['l-lysine', 'lisina', 'l-lisina'],

  // Other
  'melatonin': ['melatonina', 'sleep hormone', 'hormona del sueño'],
  'collagen': ['colágeno', 'colageno', 'collagen peptides', 'hydrolyzed collagen'],
  'cbd': ['cannabidiol', 'cbd oil', 'aceite de cbd'],
  'probiotics': ['probióticos', 'probioticos', 'gut flora', 'flora intestinal'],
  'whey protein': ['whey', 'protein powder', 'proteína whey', 'proteina de suero'],

  // Medicinal mushrooms
  'reishi': ['ganoderma lucidum', 'lingzhi', 'hongo reishi'],
  "lion's mane": ['lions mane', 'hericium erinaceus', 'melena de león', 'melena leon'],
  'cordyceps': ['cordyceps sinensis', 'hongo cordyceps'],
  'chaga': ['inonotus obliquus', 'hongo chaga'],

  // More from supplements database
  'glucosamine': ['glucosamine sulfate', 'sulfato de glucosamina'],
  'chondroitin': ['chondroitin sulfate', 'sulfato de condroitina'],
  'msm': ['methylsulfonylmethane', 'metilsulfonilmetano'],
  'resveratrol': ['resveratrol'],
  'alpha lipoic acid': ['ala', 'alpha-lipoic acid', 'ácido alfa lipoico'],
  'spirulina': ['spirulina', 'alga espirulina'],
  'chlorella': ['clorella', 'alga chlorella'],
};

/**
 * Generate common names for a supplement by fuzzy matching against enrichment data
 */
function generateCommonNames(supplementName: string): string[] {
  const normalized = supplementName.toLowerCase().trim();
  const commonNames: Set<string> = new Set();

  // Exact match
  if (ENRICHMENT_DATA[normalized]) {
    ENRICHMENT_DATA[normalized].forEach(name => commonNames.add(name));
  }

  // Partial match (for variants like "magnesium glycinate" → include "magnesium" aliases)
  for (const [key, aliases] of Object.entries(ENRICHMENT_DATA)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      aliases.forEach(alias => commonNames.add(alias));
    }
  }

  // Also check hardcoded supplements database
  for (const entry of SUPPLEMENTS_DATABASE) {
    if (entry.name.toLowerCase() === normalized ||
        entry.aliases.some(a => a.toLowerCase() === normalized)) {
      entry.aliases.forEach(alias => commonNames.add(alias.toLowerCase()));
    }
  }

  return Array.from(commonNames);
}

async function enrichLanceDB() {
  console.log('🚀 Starting LanceDB enrichment for autocomplete...\n');

  try {
    // Connect to LanceDB
    const db = await connect(LANCEDB_PATH);
    const table = await db.openTable('supplements');
    const count = await table.countRows();

    console.log(`📊 Found ${count} supplements in LanceDB\n`);

    // Load all supplements
    const allSupplements = await table.toArray();

    let enrichedCount = 0;
    const updates = [];

    for (const supplement of allSupplements) {
      const supplementName = String(supplement.name).toLowerCase();
      const existingCommonNames = Array.isArray(supplement.common_names)
        ? supplement.common_names.filter((n: string) => n && n.trim())
        : [];

      // Generate enriched common names
      const enrichedNames = generateCommonNames(supplementName);

      if (enrichedNames.length > 0) {
        // Merge existing and new common names (deduplicate)
        const mergedNames = Array.from(new Set([
          ...existingCommonNames,
          ...enrichedNames
        ]));

        updates.push({
          ...supplement,
          common_names: mergedNames
        });

        console.log(`✅ ${supplement.name}`);
        console.log(`   Added: ${enrichedNames.join(', ')}`);
        console.log(`   Total common names: ${mergedNames.length}\n`);

        enrichedCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Total supplements: ${count}`);
    console.log(`   Enriched: ${enrichedCount}`);
    console.log(`   Unchanged: ${count - enrichedCount}`);

    if (updates.length > 0) {
      console.log(`\n💾 Updating ${updates.length} records in LanceDB...`);

      // NOTE: LanceDB doesn't support direct updates
      // You would need to:
      // 1. Drop the table
      // 2. Recreate with enriched data
      // OR use a different approach depending on your LanceDB version

      console.log('\n⚠️  WARNING: LanceDB update requires manual recreation');
      console.log('   Save enriched data to JSON and reload into LanceDB');

      // Save to JSON for manual import
      const fs = await import('fs/promises');
      await fs.writeFile(
        '/tmp/lancedb-enriched.json',
        JSON.stringify(updates, null, 2)
      );

      console.log('   ✅ Saved enriched data to: /tmp/lancedb-enriched.json');
    }

  } catch (error) {
    console.error('❌ Error during enrichment:', error);
    throw error;
  }
}

enrichLanceDB().catch(console.error);
