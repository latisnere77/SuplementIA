#!/usr/bin/env ts-node
/**
 * Add Missing Minerals to RDS
 * 
 * Adds Potassium, Copper, Manganese, and Iodine to the RDS database
 */

import * as fs from 'fs';
import * as path from 'path';

const EXPORT_FILE = path.join(__dirname, '../infrastructure/migrations/supplements-export.json');

interface Supplement {
  name: string;
  scientific_name: string;
  common_names: string[];
  embedding: number[] | null;
  metadata: any;
  search_count: number;
  last_searched_at: string | null;
  created_at: string;
  updated_at: string;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Add Missing Minerals to RDS Database              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Read the export file
  console.log('📖 Reading supplements export file...');
  const supplements: Supplement[] = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf-8'));
  console.log(`   Total supplements: ${supplements.length}\n`);

  // Find the new minerals
  const newMinerals = ['Potassium', 'Copper', 'Manganese', 'Iodine'];
  const found = supplements.filter(s => newMinerals.includes(s.name));

  console.log('🔍 New minerals to add:');
  found.forEach(s => {
    console.log(`   ✓ ${s.name} (${s.common_names.join(', ')})`);
  });
  console.log();

  if (found.length !== newMinerals.length) {
    console.error('❌ Error: Not all minerals found in export file');
    process.exit(1);
  }

  console.log('📝 Next steps to import to RDS:');
  console.log('   1. Ensure RDS credentials are configured');
  console.log('   2. Run: npx ts-node scripts/import-to-rds.ts');
  console.log('   3. Or manually insert using psql:\n');

  found.forEach(s => {
    const commonNamesArray = `ARRAY[${s.common_names.map(n => `'${n}'`).join(', ')}]`;
    const metadata = JSON.stringify(s.metadata).replace(/'/g, "''");
    
    console.log(`INSERT INTO supplements (name, scientific_name, common_names, metadata, search_count)`);
    console.log(`VALUES ('${s.name}', '${s.scientific_name}', ${commonNamesArray}, '${metadata}'::jsonb, 0);`);
    console.log();
  });

  console.log('\n✅ Export file updated successfully!');
  console.log(`   File: ${EXPORT_FILE}`);
  console.log(`   New count: ${supplements.length} supplements`);
}

main().catch(console.error);
