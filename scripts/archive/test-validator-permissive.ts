/**
 * TEST: Permissive Validator
 * Test that validator now allows more legitimate supplements
 */

import { validateSupplementQuery } from '../lib/portal/query-validator';

function testPermissiveValidator() {
  console.log('🧪 TEST: Permissive Validator\n');
  console.log('='.repeat(70));

  const testCases = [
    // Casos que DEBERÍAN pasar (suplementos legítimos no en whitelist)
    { query: 'rhodiola rosea', shouldPass: true, description: 'Adaptogen herb' },
    { query: 'bacopa monnieri', shouldPass: true, description: 'Nootropic' },
    { query: 'lions mane', shouldPass: true, description: 'Mushroom' },
    { query: 'lion\'s mane', shouldPass: true, description: 'Mushroom (with apostrophe)' },
    { query: 'cordyceps', shouldPass: true, description: 'Mushroom' },
    { query: 'reishi', shouldPass: true, description: 'Mushroom' },
    { query: 'mucuna pruriens', shouldPass: true, description: 'L-dopa source' },
    { query: 'tongkat ali', shouldPass: true, description: 'Testosterone booster' },
    { query: 'boswellia', shouldPass: true, description: 'Anti-inflammatory' },
    { query: 'berberine', shouldPass: true, description: 'Metabolic compound' },
    { query: 'beta glucan', shouldPass: true, description: 'Immune support' },
    { query: 'phosphatidylserine', shouldPass: true, description: 'Cognitive' },
    { query: 'huperzine a', shouldPass: true, description: 'Nootropic' },
    { query: 'pterostilbene', shouldPass: true, description: 'Antioxidant' },
    { query: 'panax ginseng', shouldPass: true, description: 'Scientific name' },
    { query: 'withania somnifera', shouldPass: true, description: 'Ashwagandha scientific' },

    // Casos en español
    { query: 'hongo melena leon', shouldPass: true, description: 'Lion\'s mane en español' },
    { query: 'raiz ashwagandha', shouldPass: true, description: 'Ashwagandha root' },
    { query: 'extracto curcuma', shouldPass: true, description: 'Turmeric extract' },

    // Casos que DEBERÍAN bloquearse (no suplementos)
    { query: 'pizza recipe', shouldPass: false, description: 'Recipe (blocked)' },
    { query: 'cocaine', shouldPass: false, description: 'Illegal drug (blocked)' },
    { query: 'ab', shouldPass: false, description: 'Too short' },
    { query: '!!', shouldPass: false, description: 'Invalid characters' },

    // Edge cases
    { query: 'test', shouldPass: true, description: 'Simple 4-letter word (permissive)' },
    { query: 'xyz supplement', shouldPass: true, description: 'Unknown but looks legit' },
  ];

  let passedCount = 0;
  let failedCount = 0;

  for (const testCase of testCases) {
    console.log(`\n📊 Testing: "${testCase.query}"`);
    console.log(`   Description: ${testCase.description}`);
    console.log(`   Expected: ${testCase.shouldPass ? 'ALLOW' : 'BLOCK'}`);
    console.log('-'.repeat(70));

    const result = validateSupplementQuery(testCase.query);

    const actualPass = result.valid;
    const testPassed = actualPass === testCase.shouldPass;

    if (testPassed) {
      console.log(`   ✅ TEST PASSED: ${actualPass ? 'Allowed' : 'Blocked'} as expected`);
      passedCount++;
    } else {
      console.log(`   ❌ TEST FAILED: ${actualPass ? 'Allowed' : 'Blocked'} but expected ${testCase.shouldPass ? 'ALLOW' : 'BLOCK'}`);
      if (!result.valid) {
        console.log(`   Error: ${result.error}`);
      }
      failedCount++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 RESULTS:`);
  console.log(`   ✅ Passed: ${passedCount}/${testCases.length}`);
  console.log(`   ❌ Failed: ${failedCount}/${testCases.length}`);
  console.log(`   Success Rate: ${Math.round((passedCount / testCases.length) * 100)}%`);

  if (failedCount === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Validator is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the cases above.');
  }
}

testPermissiveValidator();
