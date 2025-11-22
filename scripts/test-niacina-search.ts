/**
 * Test script to debug niacina search issue
 *
 * This script simulates the search flow for "niacina" to identify
 * why it's not finding studies in PubMed
 */

const STUDIES_API_URL = process.env.STUDIES_API_URL || 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';

async function testNiacinaSearch() {
  console.log('=== Testing Niacina Search ===\n');

  const testTerms = [
    { original: 'niacina', translated: 'niacin', description: 'Spanish term (should translate to niacin)' },
    { original: 'niacin', translated: 'niacin', description: 'English term (direct search)' },
    { original: 'vitamin b3', translated: 'vitamin b3', description: 'Alternative name' },
  ];

  for (const { original, translated, description } of testTerms) {
    console.log(`\n--- Testing: "${original}" ---`);
    console.log(`Description: ${description}`);
    console.log(`Translated to: "${translated}"`);

    try {
      const response = await fetch(STUDIES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplementName: translated,
          maxResults: 5,
          filters: {
            rctOnly: false,
            yearFrom: 2010,
            humanStudiesOnly: true,
          },
        }),
      });

      const data = await response.json();

      console.log(`✓ Response status: ${response.status}`);
      console.log(`✓ Success: ${data.success}`);
      console.log(`✓ Studies found: ${data.data?.totalFound || 0}`);

      if (data.data?.studies && data.data.studies.length > 0) {
        console.log(`\n  First study:`);
        const study = data.data.studies[0];
        console.log(`  - Title: ${study.title?.substring(0, 100)}...`);
        console.log(`  - PMID: ${study.pmid}`);
        console.log(`  - Year: ${study.year}`);
      } else {
        console.log(`  ❌ NO STUDIES FOUND`);
        if (data.error) {
          console.log(`  Error: ${data.error}`);
        }
      }
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n=== Test Complete ===');
}

testNiacinaSearch().catch(console.error);
