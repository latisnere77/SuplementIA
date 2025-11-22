/**
 * Test: Glicinato de Magnesio
 * User reports 404 for this specific search
 */

const QUIZ_API = 'https://www.suplementai.com/api/portal/quiz';

async function testGlicinatoMagnesio() {
  console.log('='.repeat(80));
  console.log('TESTING: Glicinato de Magnesio');
  console.log('='.repeat(80));

  const searches = [
    'glicinato de magnesio',  // User's exact search
    'magnesium glycinate',     // English version
    'magnesio',                // Generic magnesium
    'Magnesium',               // Capitalized
  ];

  for (const search of searches) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: "${search}"`);
    console.log('-'.repeat(80));

    const startTime = Date.now();

    try {
      const response = await fetch(QUIZ_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: search,
          age: 35,
          gender: 'male',
          location: 'CDMX',
        }),
        signal: AbortSignal.timeout(120000),
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      console.log(`Status: ${response.status}`);
      console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log(`Success: ${data.success}`);

      if (response.status === 404) {
        console.log(`\n❌ 404 INSUFFICIENT DATA:`);
        console.log(`  Error: ${data.error}`);
        console.log(`  Message: ${data.message}`);
        console.log(`  Suggestion: ${data.suggestion}`);
      } else if (data.recommendation) {
        console.log(`\n✅ SUCCESS:`);
        console.log(`  Category: ${data.recommendation.category}`);
        console.log(`  Studies: ${data.recommendation._enrichment_metadata?.studiesUsed || 0}`);
        console.log(`  Has Real Data: ${data.recommendation._enrichment_metadata?.hasRealData}`);
      }

    } catch (error: any) {
      console.log(`\n❌ ERROR: ${error.message}`);
    }

    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('DIAGNOSIS:');
  console.log('='.repeat(80));
  console.log(`
The issue is likely:

1. Query Translation/Normalization:
   - "glicinato de magnesio" needs to be translated to "magnesium glycinate"
   - Or normalized to just "magnesium" for broader search

2. Studies Search:
   - PubMed may not have results for exact phrase "glicinato de magnesio"
   - Need to search for "magnesium glycinate" OR "magnesium"

3. Possible Solutions:
   a) Add query translation (Spanish → English)
   b) Extract base supplement name ("magnesio" from "glicinato de magnesio")
   c) Search for both specific form AND generic supplement
   d) Add to dictionary for common variations
`);
}

testGlicinatoMagnesio().catch(console.error);
