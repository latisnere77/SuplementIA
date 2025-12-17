/**
 * DEBUG: Vitamina C Generation
 * Trace why vitamina c is showing poor/generic data
 */

import { transformEvidenceToNew } from '../lib/portal/evidence-transformer';

async function debugVitaminaC() {
  console.log('🔍 DEBUG: Vitamina C Generation\n');
  console.log('='.repeat(70));

  // Simulate what the frontend receives from backend
  const mockBackendEvidence = {
    totalStudies: 949705,
    totalParticipants: 2500,
    efficacyPercentage: 75,
    researchSpanYears: 10,
    ingredients: [
      { name: 'Vitamin C', grade: 'B', studyCount: 21, rctCount: 0 },
      { name: 'Vitamin E', grade: 'B', studyCount: 10, rctCount: 0 },
      { name: 'Zinc', grade: 'B', studyCount: 1, rctCount: 1 }
    ]
  };

  const category = 'vitamina c';

  console.log(`\n📦 Testing category: "${category}"`);
  console.log('   (This is what the frontend receives from backend)');
  console.log('-'.repeat(70));

  try {
    console.log('\n🔄 Calling transformEvidenceToNew...\n');

    const result = await transformEvidenceToNew(
      mockBackendEvidence,
      category,
      (progress) => {
        console.log(`   [${progress.percentage}%] ${progress.phase}: ${progress.message}`);
      }
    );

    console.log('\n✅ Transform complete!');
    console.log('\n📊 RESULT:');
    console.log('-'.repeat(70));
    console.log(`Grade: ${result.overallGrade}`);
    console.log(`\nWhat is it for:`);
    console.log(`"${result.whatIsItFor}"\n`);

    if (result.whatIsItFor.includes('Suplemento natural que puede ofrecer beneficios')) {
      console.log('❌ PROBLEM DETECTED: Using GENERIC FALLBACK!');
      console.log('\nThis means:');
      console.log('   - Static cache: MISS');
      console.log('   - DynamoDB cache: MISS');
      console.log('   - Dynamic generation: FAILED or NOT EXECUTED');
      console.log('   - Fell back to generic template');
    } else {
      console.log('✅ SUCCESS: Using DYNAMIC or CACHED data!');
    }

    console.log(`\nWorks For (${result.worksFor.length}):`);
    result.worksFor.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.condition} [${item.grade}]`);
      console.log(`      ${item.description.substring(0, 80)}...`);
    });

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n🔍 DIAGNOSIS:');
  console.log('\nPossible causes:');
  console.log('1. Query "vitamina c" (Spanish) → Should try "vitamin c" (English)');
  console.log('2. Dynamic generation failing silently');
  console.log('3. Not enough studies found in PubMed');
  console.log('4. Error in dynamic generation catching and falling back');
  console.log('\nNext: Check logs above to see which level was hit');
}

debugVitaminaC().catch(console.error);
