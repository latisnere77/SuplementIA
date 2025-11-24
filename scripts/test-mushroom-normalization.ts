/**
 * Test Mushroom Supplement Normalization
 * Verifies that mushroom supplements are properly normalized
 */

import { normalizeQuery } from '../lib/portal/query-normalization';
import { SUPPLEMENTS_DATABASE } from '../lib/portal/supplements-database';

function testMushroomNormalization() {
  console.log('🍄 TESTING MUSHROOM SUPPLEMENT NORMALIZATION\n');
  console.log('='.repeat(60));

  const testCases = [
    // Reishi variations
    'reishi',
    'reishi mushroom',
    'hongo reishi',
    'ganoderma',
    'lingzhi',
    
    // Lion's Mane variations
    'lions mane',
    'lion\'s mane',
    'melena de leon',
    'hericium',
    
    // Other mushrooms
    'chaga',
    'cordyceps',
    'turkey tail',
    'cola de pavo',
    'shiitake',
    'maitake',
  ];

  console.log('\n📝 Query Normalization Tests');
  console.log('-'.repeat(60));
  
  for (const query of testCases) {
    const normalized = normalizeQuery(query);
    const status = normalized.confidence >= 0.9 ? '✅' : normalized.confidence >= 0.5 ? '⚠️' : '❌';
    console.log(`${status} "${query}" → "${normalized.normalized}" (confidence: ${normalized.confidence})`);
    if (normalized.corrections.length > 0) {
      console.log(`   Corrections: ${normalized.corrections.join(', ')}`);
    }
  }

  console.log('\n\n🗄️ Database Entries');
  console.log('-'.repeat(60));
  
  const mushroomEntries = SUPPLEMENTS_DATABASE.filter(entry => 
    entry.name.toLowerCase().includes('reishi') ||
    entry.name.toLowerCase().includes('lion') ||
    entry.name.toLowerCase().includes('chaga') ||
    entry.name.toLowerCase().includes('cordyceps') ||
    entry.name.toLowerCase().includes('turkey') ||
    entry.name.toLowerCase().includes('cola de pavo') ||
    entry.name.toLowerCase().includes('shiitake') ||
    entry.name.toLowerCase().includes('maitake') ||
    entry.name.toLowerCase().includes('melena')
  );

  console.log(`Found ${mushroomEntries.length} mushroom entries in database:`);
  for (const entry of mushroomEntries) {
    console.log(`\n${entry.name} (${entry.language})`);
    console.log(`  ID: ${entry.id}`);
    console.log(`  Category: ${entry.category}`);
    console.log(`  Aliases: ${entry.aliases.join(', ')}`);
    console.log(`  Health conditions: ${entry.healthConditions?.join(', ')}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETE\n');
}

testMushroomNormalization();
