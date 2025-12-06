/**
 * Test Script: Intelligent Search with Benefit Query for Romero
 * Tests the Lambda's benefit-specific search functionality
 *
 * Usage:
 *   npx tsx scripts/test-intelligent-search-romero.ts
 */

const STUDIES_API_URL =
  'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';

console.log('🧪 Testing Intelligent Search with Benefit Query for Romero\n');
console.log('='.repeat(80));

async function testBenefitSearch() {
  console.log('\n📋 TEST 1: Search Romero WITHOUT benefit query (baseline)\n');

  const baselineResponse = await fetch(STUDIES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      supplementName: 'rosemary',
      maxResults: 10,
      humanStudiesOnly: true,
    }),
  });

  if (!baselineResponse.ok) {
    throw new Error(`Baseline search failed: ${baselineResponse.status}`);
  }

  const baselineData = await baselineResponse.json();
  const baselineStudies = baselineData.data?.studies || [];

  console.log(`✅ Found ${baselineStudies.length} studies for rosemary (baseline)`);
  console.log('Top 3 study titles:');
  baselineStudies.slice(0, 3).forEach((study: any, idx: number) => {
    console.log(`  ${idx + 1}. ${study.title?.substring(0, 80)}...`);
  });

  console.log('\n📋 TEST 2: Search Romero WITH benefit query (hair growth)\n');

  const benefitResponse = await fetch(STUDIES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      supplementName: 'rosemary',
      benefitQuery: 'hair growth',  // <-- The critical parameter
      maxResults: 20,  // Increased to catch older studies too
      humanStudiesOnly: true,
    }),
  });

  if (!benefitResponse.ok) {
    throw new Error(`Benefit search failed: ${benefitResponse.status}`);
  }

  const benefitData = await benefitResponse.json();
  const benefitStudies = benefitData.data?.studies || [];

  console.log(`✅ Found ${benefitStudies.length} studies for rosemary + hair growth`);
  console.log('Top study titles:');
  benefitStudies.slice(0, 5).forEach((study: any, idx: number) => {
    console.log(`  ${idx + 1}. ${study.title}`);
    console.log(`      PMID: ${study.pmid}, Year: ${study.year}`);
  });

  console.log('\n📋 TEST 3: Check for the specific PMID 22517595 (rosemary + alopecia study)\n');

  const pmid22517595 = benefitStudies.find((s: any) => s.pmid === '22517595');

  if (pmid22517595) {
    console.log('✅ SUCCESS! Found PMID 22517595:');
    console.log(`   Title: ${pmid22517595.title}`);
    console.log(`   Year: ${pmid22517595.year}`);
    console.log(`   Journal: ${pmid22517595.journal}`);
  } else {
    console.log('❌ PMID 22517595 NOT found in results');
    console.log('   All PMIDs returned:', benefitStudies.map((s: any) => s.pmid));
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Summary:\n');
  console.log(`1. Baseline search (no benefit): ${baselineStudies.length} studies`);
  console.log(`2. Benefit search (hair growth): ${benefitStudies.length} studies`);
  console.log(`3. Target study PMID 22517595: ${pmid22517595 ? '✅ FOUND' : '❌ NOT FOUND'}`);

  if (benefitStudies.length > 0) {
    console.log('\n✅ Benefit query is working! Lambda correctly filters for hair growth studies.');
  } else {
    console.log('\n⚠️  No studies found with benefit query - may need to adjust search strategy.');
  }

  console.log('\n🎉 Test complete!\n');
}

testBenefitSearch().catch((error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
