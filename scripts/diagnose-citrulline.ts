/**
 * Diagnostic script for Citrulline Malate (Citrulina Malato)
 * Tests the complete flow: normalization → mapping → API call
 */

import { normalizeQuery } from '../lib/portal/query-normalization';
import { getSupplementMapping } from '../lib/portal/supplement-mappings';

async function diagnoseCitrulline() {
  console.log('='.repeat(80));
  console.log('🔍 DIAGNOSTIC: Citrulina Malato');
  console.log('='.repeat(80));

  const testQueries = [
    'Citrulina Malato',
    'citrulina malato',
    'CITRULINA MALATO',
    'citrulline malate',
    'Citrulline Malate',
    'citrulina',
    'citrulline',
    'l-citrulline',
    'L-Citrulina'
  ];

  console.log('\n📋 Testing queries:');
  testQueries.forEach((q, i) => console.log(`  ${i + 1}. "${q}"`));

  for (const query of testQueries) {
    console.log('\n' + '-'.repeat(80));
    console.log(`\n🧪 Testing: "${query}"`);
    console.log('-'.repeat(80));

    // Step 1: Normalization
    console.log('\n1️⃣ NORMALIZATION:');
    const normalized = normalizeQuery(query);
    console.log('   Input:', query);
    console.log('   Normalized:', normalized.normalized);
    console.log('   Confidence:', normalized.confidence);
    console.log('   Original:', normalized.original);

    // Step 2: Mapping
    console.log('\n2️⃣ MAPPING:');
    const mapping = getSupplementMapping(normalized.normalized);
    
    if (mapping) {
      console.log('   ✅ Mapping found!');
      console.log('   Quiz ID:', mapping.quizId);
      console.log('   Recommendation ID:', mapping.recommendationId);
      console.log('   Display Name:', mapping.displayName);
      console.log('   Aliases:', mapping.aliases?.join(', ') || 'none');
    } else {
      console.log('   ❌ No mapping found');
      console.log('   This will cause a 404 error in the API');
    }

    // Step 3: API endpoint construction
    console.log('\n3️⃣ API ENDPOINT:');
    if (mapping) {
      const apiUrl = `/api/portal/recommend?id=${mapping.recommendationId}`;
      console.log('   URL:', apiUrl);
      console.log('   ✅ Would make API call');
    } else {
      console.log('   ❌ Cannot construct API URL - no mapping');
    }
  }

  // Check if citrulline exists in mappings
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CHECKING SUPPLEMENT MAPPINGS DATABASE');
  console.log('='.repeat(80));

  const citrullineVariants = [
    'citrulline',
    'citrulline-malate',
    'citrulline malate',
    'l-citrulline',
    'citrulina',
    'citrulina-malato',
    'citrulina malato'
  ];

  console.log('\n📊 Checking for these variants in mappings:');
  citrullineVariants.forEach(variant => {
    const mapping = getSupplementMapping(variant);
    if (mapping) {
      console.log(`   ✅ "${variant}" → ${mapping.recommendationId}`);
    } else {
      console.log(`   ❌ "${variant}" → NOT FOUND`);
    }
  });

  // Recommendations
  console.log('\n' + '='.repeat(80));
  console.log('💡 RECOMMENDATIONS');
  console.log('='.repeat(80));

  const hasAnyMapping = citrullineVariants.some(v => getSupplementMapping(v) !== null);

  if (!hasAnyMapping) {
    console.log('\n❌ PROBLEM IDENTIFIED:');
    console.log('   Citrulline/Citrulina is NOT in the supplement mappings database');
    console.log('\n✅ SOLUTION:');
    console.log('   Add citrulline mapping to lib/portal/supplement-mappings.ts');
    console.log('\n   Example entry:');
    console.log('   {');
    console.log('     quizId: "citrulline-malate",');
    console.log('     recommendationId: "citrulline-malate",');
    console.log('     displayName: "Citrulline Malate",');
    console.log('     aliases: [');
    console.log('       "citrulline",');
    console.log('       "l-citrulline",');
    console.log('       "citrulina",');
    console.log('       "citrulina malato",');
    console.log('       "citrulline malate"');
    console.log('     ]');
    console.log('   }');
  } else {
    console.log('\n✅ Mapping exists, checking normalization...');
    const normalized = normalizeQuery('Citrulina Malato');
    const mapping = getSupplementMapping(normalized.normalized);
    
    if (!mapping) {
      console.log('\n❌ PROBLEM IDENTIFIED:');
      console.log('   Normalization is not producing a mapped value');
      console.log('   Normalized value:', normalized.normalized);
      console.log('\n✅ SOLUTION:');
      console.log('   Update normalization rules or add alias to mapping');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ DIAGNOSTIC COMPLETE');
  console.log('='.repeat(80) + '\n');
}

// Run diagnostic
diagnoseCitrulline().catch(console.error);
