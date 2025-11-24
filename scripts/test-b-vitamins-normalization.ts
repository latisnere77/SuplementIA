/**
 * Test B Vitamins Normalization
 */

import { normalizeQuery } from '../lib/portal/query-normalization';

function testBVitamins() {
  console.log('🧪 TESTING B VITAMINS NORMALIZATION\n');
  console.log('='.repeat(60));

  const testCases = [
    // B2 / Riboflavin
    'riboflavin',
    'Riboflavin',
    'vitamin b2',
    'Vitamin B2',
    'vitamina b2',
    'riboflavina',
    
    // B1 / Thiamine
    'vitamin b1',
    'thiamine',
    'tiamina',
    
    // B3 / Niacin
    'vitamin b3',
    'niacin',
    'niacina',
    
    // B6 / Pyridoxine
    'vitamin b6',
    'pyridoxine',
    'piridoxina',
    
    // B9 / Folate
    'vitamin b9',
    'folic acid',
    'folate',
    'acido folico',
  ];

  console.log('\n📝 Normalization Tests');
  console.log('-'.repeat(60));
  
  for (const query of testCases) {
    const normalized = normalizeQuery(query);
    const status = normalized.confidence >= 0.9 ? '✅' : normalized.confidence >= 0.5 ? '⚠️' : '❌';
    console.log(`${status} "${query}" → "${normalized.normalized}" (${normalized.confidence})`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETE\n');
}

testBVitamins();
