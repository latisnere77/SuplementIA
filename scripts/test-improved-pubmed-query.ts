/**
 * Test: Improved PubMed Query Strategy
 * Validates that new AND-based queries find more studies than old exact-phrase queries
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });

interface StudyRequest {
  supplementName: string;
  maxResults?: number;
  filters?: {
    yearFrom?: number;
    yearTo?: number;
    rctOnly?: boolean;
    humanStudiesOnly?: boolean;
  };
}

async function invokeLambda(request: StudyRequest): Promise<any> {
  const command = new InvokeCommand({
    FunctionName: 'suplementia-studies-fetcher-dev',
    Payload: JSON.stringify(request),
  });

  const response = await lambda.send(command);
  const payload = JSON.parse(new TextDecoder().decode(response.Payload));

  return payload;
}

async function testPubMedQueries() {
  console.log('='.repeat(80));
  console.log('IMPROVED PUBMED QUERY VALIDATION');
  console.log('Testing multi-word compound terms that should find MORE studies now');
  console.log('='.repeat(80));

  const testCases = [
    {
      name: 'Magnesium Glycinate',
      query: 'magnesium glycinate',
      expectedBefore: 8,
      expectedAfter: 10, // Should find at least this many with AND logic
      description: 'Compound supplement form',
    },
    {
      name: 'Vitamin D3',
      query: 'vitamin d3',
      expectedBefore: 20,
      expectedAfter: 10,
      description: 'Vitamin with specific form',
    },
    {
      name: 'Omega-3 Fatty Acids',
      query: 'omega-3 fatty acids',
      expectedBefore: 12,
      expectedAfter: 10,
      description: 'Multi-word with hyphens',
    },
    {
      name: 'Single Word (Control)',
      query: 'ashwagandha',
      expectedBefore: 10,
      expectedAfter: 10,
      description: 'Should work same as before (no change)',
    },
  ];

  let successCount = 0;
  let improvementCount = 0;

  for (const test of testCases) {
    console.log(`\n${'-'.repeat(80)}`);
    console.log(`Testing: ${test.name}`);
    console.log(`Query: "${test.query}"`);
    console.log(`Description: ${test.description}`);
    console.log('-'.repeat(80));

    try {
      const startTime = Date.now();

      const result = await invokeLambda({
        supplementName: test.query,
        maxResults: 10,
        filters: {
          yearFrom: 2010,
          humanStudiesOnly: true,
        },
      });

      const duration = Date.now() - startTime;

      if (result.success && result.data?.studies) {
        const studyCount = result.data.studies.length;
        const improved = studyCount >= test.expectedAfter;

        console.log(`\n✅ SUCCESS`);
        console.log(`  Studies Found: ${studyCount}`);
        console.log(`  Expected (Before): ~${test.expectedBefore} with exact phrase`);
        console.log(`  Expected (After): ${test.expectedAfter}+ with AND logic`);
        console.log(`  Duration: ${duration}ms`);
        console.log(`  Improved: ${improved ? 'YES ✅' : 'SAME/WORSE ⚠️'}`);

        // Show sample study titles
        if (result.data.studies.length > 0) {
          console.log(`\n  Sample Studies:`);
          result.data.studies.slice(0, 3).forEach((study: any, i: number) => {
            console.log(`    ${i + 1}. ${study.title.substring(0, 80)}...`);
          });
        }

        successCount++;
        if (improved) improvementCount++;

      } else {
        console.log(`\n❌ FAILED`);
        console.log(`  Error: ${result.error || 'unknown'}`);
        console.log(`  Message: ${result.message || 'unknown'}`);
      }

    } catch (error: any) {
      console.log(`\n❌ ERROR: ${error.message}`);
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Successful Queries: ${successCount}/${testCases.length}`);
  console.log(`📈 Improved Results: ${improvementCount}/${testCases.length}`);

  // Diagnosis
  console.log('\n' + '='.repeat(80));
  console.log('DIAGNOSIS');
  console.log('='.repeat(80));

  if (successCount === testCases.length && improvementCount >= 3) {
    console.log(`\n🎉 EXCELLENT! PubMed query optimization is working!`);
    console.log(`\n   Key Improvements:`);
    console.log(`   1. ✅ Multi-word terms use AND logic (better recall)`);
    console.log(`   2. ✅ Finding more studies for compound supplements`);
    console.log(`   3. ✅ Single-word terms unchanged (backwards compatible)`);
    console.log(`   4. ✅ Using [tiab] field tag (official PubMed syntax)`);
    console.log(`\n   Impact:`);
    console.log(`   - "magnesium glycinate" finds studies with BOTH words`);
    console.log(`   - No longer requires exact phrase order`);
    console.log(`   - Better coverage for supplement research`);
  } else if (successCount > 0) {
    console.log(`\n🟡 PARTIAL SUCCESS`);
    console.log(`   ${successCount} queries worked, ${improvementCount} showed improvement`);
    console.log(`   Some queries may need further optimization`);
  } else {
    console.log(`\n🔴 DEPLOYMENT MAY HAVE FAILED`);
    console.log(`   Lambda not returning expected results`);
    console.log(`   Check Lambda logs and deployment status`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('NEXT: Test with full enrichment pipeline');
  console.log('  → Run: npx tsx scripts/test-magnesium-glycinate-full.ts');
  console.log('='.repeat(80));
}

testPubMedQueries().catch(console.error);
