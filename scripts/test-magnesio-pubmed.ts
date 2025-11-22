/**
 * Test: PubMed Search for Magnesio variations
 * Test if PubMed studies-fetcher can find studies for different magnesium searches
 */

const STUDIES_LAMBDA = 'https://8yez6jj0j4.execute-api.us-east-1.amazonaws.com/studies/search';

async function testMagnesiumVariations() {
  console.log('='.repeat(80));
  console.log('TESTING: PubMed Search for Magnesium Variations');
  console.log('='.repeat(80));

  const searches = [
    { query: 'magnesio', description: 'Spanish generic' },
    { query: 'glicinato de magnesio', description: 'Spanish glycinate' },
    { query: 'magnesium', description: 'English generic' },
    { query: 'magnesium glycinate', description: 'English glycinate' },
    { query: 'Magnesium', description: 'Capitalized' },
  ];

  for (const { query, description } of searches) {
    console.log(`\n${'-'.repeat(80)}`);
    console.log(`Query: "${query}" (${description})`);
    console.log('-'.repeat(80));

    try {
      const response = await fetch(STUDIES_LAMBDA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplementName: query,
          maxResults: 10,
          rctOnly: false,
          yearFrom: 2010,
        }),
        signal: AbortSignal.timeout(30000),
      });

      const data = await response.json();

      if (data.success && data.studies) {
        console.log(`✅ SUCCESS: Found ${data.studies.length} studies`);
        if (data.studies.length > 0) {
          console.log(`  First study title: ${data.studies[0].title.substring(0, 80)}...`);
        }
      } else {
        console.log(`❌ NO STUDIES FOUND`);
        console.log(`  Success: ${data.success}`);
        console.log(`  Studies: ${data.studies?.length || 0}`);
        console.log(`  Error: ${data.error || 'none'}`);
      }

    } catch (error: any) {
      console.log(`❌ ERROR: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('CONCLUSION:');
  console.log('='.repeat(80));
  console.log(`
If PubMed studies-fetcher DOES find studies for "magnesium" but NOT for "magnesio":
→ Problem: Need Spanish-to-English translation BEFORE calling studies-fetcher
→ Solution: Add translation layer in enrich endpoint

If PubMed studies-fetcher does NOT find studies for ANY variation:
→ Problem: PubMed API issue or Lambda configuration
→ Solution: Debug Lambda directly

If PubMed DOES find studies for all variations:
→ Problem: Something else in the pipeline (enrich validation, recommend validation)
→ Solution: Debug enrich/recommend endpoints
`);
}

testMagnesiumVariations().catch(console.error);
