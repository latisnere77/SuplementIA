/**
 * Debug: Full System Test for "glicinato de magnesio"
 * Test the complete flow to see where it's failing
 */

const ENRICH_API = 'https://www.suplementai.com/api/portal/enrich';

async function debugGlicinatoFullSystem() {
  console.log('='.repeat(80));
  console.log('DEBUG: Full System Test for "glicinato de magnesio"');
  console.log('='.repeat(80));

  const testCases = [
    { query: 'glicinato de magnesio', description: 'Original Spanish form' },
    { query: 'magnesium glycinate', description: 'Expected English translation' },
    { query: 'magnesium', description: 'Generic fallback' },
  ];

  for (const { query, description } of testCases) {
    console.log(`\n${'-'.repeat(80)}`);
    console.log(`Testing: "${query}" (${description})`);
    console.log('-'.repeat(80));

    const startTime = Date.now();

    try {
      const response = await fetch(ENRICH_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': `debug-${Date.now()}`,
        },
        body: JSON.stringify({
          supplementName: query,
          maxStudies: 10,
          rctOnly: false,
          yearFrom: 2010,
          forceRefresh: false, // Use cache
        }),
        signal: AbortSignal.timeout(120000),
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      console.log(`\nStatus: ${response.status}`);
      console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log(`Success: ${data.success}`);

      if (data.success && data.metadata) {
        console.log(`\n✅ SUCCESS:`);
        console.log(`  Studies Used: ${data.metadata.studiesUsed}`);
        console.log(`  Has Real Data: ${data.metadata.hasRealData}`);
        console.log(`  Search Term Used: ${data.metadata.searchTerm || 'unknown'}`);
        console.log(`  Translation Method: ${data.metadata.translationMethod || 'unknown'}`);
        console.log(`  Search Method: ${data.metadata.searchMethod || 'unknown'}`);

        if (data.metadata.expansionMetadata) {
          console.log(`\n  Translation Details:`);
          console.log(`    Original: ${data.metadata.expansionMetadata.original}`);
          console.log(`    Expanded: ${data.metadata.expansionMetadata.expanded || data.metadata.expansionMetadata.alternatives?.[0]}`);
          console.log(`    Alternatives: ${JSON.stringify(data.metadata.expansionMetadata.alternatives || [])}`);
          console.log(`    Source: ${data.metadata.expansionMetadata.source}`);
        }

        if (data.data) {
          console.log(`\n  Content Generated:`);
          console.log(`    Name: ${data.data.name}`);
          console.log(`    Total Studies: ${data.data.totalStudies || 0}`);
        }
      } else {
        console.log(`\n❌ FAILED:`);
        console.log(`  Error: ${data.error || 'unknown'}`);
        console.log(`  Message: ${data.message || 'unknown'}`);

        if (data.metadata) {
          console.log(`\n  Debug Info:`);
          console.log(`    Search Term: ${data.metadata.searchTerm || 'unknown'}`);
          console.log(`    Studies Found: ${data.metadata.studiesUsed || 0}`);
        }
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`\n❌ ERROR:`);
      console.log(`  Message: ${error.message}`);
      console.log(`  Duration: ${(duration / 1000).toFixed(2)}s`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('ANALYSIS:');
  console.log('='.repeat(80));
  console.log(`
If ALL tests succeed:
  ✅ System is working, cache is populated

If "glicinato de magnesio" fails but "magnesium" succeeds:
  → Translation is working
  → But "magnesium glycinate" has no cache
  → Fuzzy fallback should use "magnesium"
  → Check if fuzzy search variations are being tried

If ALL tests fail:
  → System may be down
  → Check CloudWatch logs
  → Check Lambda endpoints

Look for clues in:
  - Translation Method (fallback_map vs llm)
  - Search Method (primary vs fallback_1, fallback_2, etc.)
  - Expansion Metadata (shows LLM translation process)
`);
}

debugGlicinatoFullSystem().catch(console.error);
