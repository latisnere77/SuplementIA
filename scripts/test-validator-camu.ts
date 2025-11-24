/**
 * TEST: Validator Fix for "camu camu"
 */

import { validateSupplementQuery } from '../lib/portal/query-validator';

function testValidator() {
  console.log('🧪 TEST: Query Validator - Camu Camu\n');
  console.log('='.repeat(70));

  const testCases = [
    'camu camu',
    'camu-camu',
    'Camu Camu',
    'CAMU CAMU',
    'camu',
    'acai',
    'goji',
    'cardo santo',
    'cardo-santo',
  ];

  for (const query of testCases) {
    console.log(`\n📊 Testing: "${query}"`);
    console.log('-'.repeat(70));

    const result = validateSupplementQuery(query);

    if (result.valid) {
      console.log('✅ VALID - Search allowed');
    } else {
      console.log('❌ INVALID - Search blocked');
      console.log(`   Error: ${result.error}`);
      console.log(`   Severity: ${result.severity}`);
      if (result.suggestion) {
        console.log(`   Suggestion: ${result.suggestion}`);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
}

testValidator();
