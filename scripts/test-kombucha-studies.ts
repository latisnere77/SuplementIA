/**
 * Test Script: Kombucha Studies Fetcher
 *
 * Tests if the studies-fetcher Lambda can find PubMed studies for "kombucha"
 * This is Step 1 in the diagnostic flow
 */

const STUDIES_API_URL = 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';

interface StudyResult {
  success: boolean;
  data?: {
    studies?: any[];
    query?: string;
  };
  error?: string;
}

async function testKombuchaStudies() {
  console.log('='.repeat(80));
  console.log('KOMBUCHA DIAGNOSIS - Step 1: Studies Fetcher Test');
  console.log('='.repeat(80));
  console.log();

  const testCases = [
    { query: 'kombucha', description: 'Original query (lowercase)' },
    { query: 'Kombucha', description: 'Capitalized query' },
    { query: 'kombucha supplementation', description: 'With "supplementation"' },
    { query: 'kombucha tea', description: 'With "tea"' },
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.description}`);
    console.log(`   Query: "${testCase.query}"`);
    console.log('-'.repeat(80));

    try {
      const startTime = Date.now();

      const response = await fetch(STUDIES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: testCase.query,
          maxResults: 10,
          rctOnly: false,
          yearFrom: 2010,
          humanStudiesOnly: true,
        }),
      });

      const duration = Date.now() - startTime;
      const data: StudyResult = await response.json();

      console.log(`   ⏱️  Duration: ${duration}ms`);
      console.log(`   📡 Status: ${response.status}`);
      console.log(`   ✅ Success: ${data.success}`);

      if (data.success && data.data?.studies) {
        const studies = data.data.studies;
        console.log(`   📚 Studies Found: ${studies.length}`);

        if (studies.length > 0) {
          console.log(`\n   First 3 studies:`);
          studies.slice(0, 3).forEach((study, i) => {
            console.log(`      ${i + 1}. ${study.title?.substring(0, 60)}...`);
            console.log(`         PMID: ${study.pmid || 'N/A'}`);
            console.log(`         Type: ${study.studyType || 'N/A'}`);
            console.log(`         Year: ${study.year || 'N/A'}`);
          });
        }
      } else {
        console.log(`   ❌ No studies found`);
        console.log(`   Error: ${data.error || 'Unknown error'}`);
      }

    } catch (error: any) {
      console.log(`   ❌ ERROR: ${error.message}`);
      console.log(`   Stack: ${error.stack}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('CONCLUSION:');
  console.log('='.repeat(80));
  console.log('If studies are found, the problem is likely in:');
  console.log('  1. Content-enricher Lambda (timeout or processing error)');
  console.log('  2. Metadata validation in recommend endpoint');
  console.log('  3. Cache issues in DynamoDB');
  console.log();
  console.log('If NO studies are found, the problem is:');
  console.log('  1. PubMed has no studies for "kombucha" (unlikely)');
  console.log('  2. Studies-fetcher Lambda query formatting');
  console.log('  3. Need to use search variations');
  console.log('='.repeat(80));
}

// Run the test
testKombuchaStudies().catch(console.error);
