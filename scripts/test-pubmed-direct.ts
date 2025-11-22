/**
 * Direct PubMed Search Test
 * Tests if PubMed has studies for THC and niacina
 */

const STUDIES_API_URL = process.env.STUDIES_API_URL || 'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search';

async function testPubMedSearch(term: string, description: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: "${term}"`);
  console.log(`Description: ${description}`);
  console.log('='.repeat(60));

  const testCases = [
    {
      name: 'Strict filters (RCT, 2010+)',
      filters: {
        rctOnly: true,
        yearFrom: 2010,
        humanStudiesOnly: true,
        studyTypes: ['randomized controlled trial', 'meta-analysis', 'systematic review'],
      },
    },
    {
      name: 'Relaxed filters (Any study, 2000+)',
      filters: {
        rctOnly: false,
        yearFrom: 2000,
        humanStudiesOnly: true,
      },
    },
    {
      name: 'Ultra-relaxed (Any study type, 1990+)',
      filters: {
        rctOnly: false,
        yearFrom: 1990,
        humanStudiesOnly: false,
      },
    },
  ];

  for (const { name, filters } of testCases) {
    console.log(`\n  📊 ${name}`);
    console.log(`  Filters:`, JSON.stringify(filters, null, 2).split('\n').map(l => `    ${l}`).join('\n'));

    try {
      const startTime = Date.now();
      const response = await fetch(STUDIES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplementName: term,
          maxResults: 5,
          filters,
        }),
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      console.log(`  ⏱️  Duration: ${duration}ms`);
      console.log(`  📈 Status: ${response.status}`);
      console.log(`  ✅ Success: ${data.success}`);
      console.log(`  📚 Studies found: ${data.data?.totalFound || 0}`);

      if (data.data?.studies && data.data.studies.length > 0) {
        console.log(`\n  🔬 First 2 studies:`);
        data.data.studies.slice(0, 2).forEach((study: any, i: number) => {
          console.log(`\n    ${i + 1}. ${study.title?.substring(0, 80)}...`);
          console.log(`       PMID: ${study.pmid}`);
          console.log(`       Year: ${study.year}`);
          console.log(`       Type: ${study.studyType || 'N/A'}`);
        });
        return true; // Found studies
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

  return false; // No studies found with any filter
}

async function main() {
  console.log('\n🔬 DIRECT PUBMED SEARCH TEST');
  console.log('Testing problematic supplements\n');

  const tests = [
    { term: 'tetrahydrocannabinol', description: 'THC (full name)' },
    { term: 'THC', description: 'THC (abbreviation)' },
    { term: 'delta-9-tetrahydrocannabinol', description: 'THC (scientific name)' },
    { term: 'cannabinoids', description: 'THC (general term)' },
    { term: 'niacin', description: 'Niacina (translated to English)' },
    { term: 'vitamin b3', description: 'Niacina (alternative name)' },
    { term: 'nicotinic acid', description: 'Niacina (chemical name)' },
  ];

  const results: Record<string, boolean> = {};

  for (const test of tests) {
    const found = await testPubMedSearch(test.term, test.description);
    results[test.term] = found;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  Object.entries(results).forEach(([term, found]) => {
    console.log(`  ${found ? '✅' : '❌'} ${term.padEnd(35)} ${found ? 'FOUND' : 'NOT FOUND'}`);
  });

  console.log('\n💡 RECOMMENDATIONS:');
  if (!results['tetrahydrocannabinol'] && !results['THC']) {
    console.log('  - THC: Consider using "cannabinoids" or "cannabis" as search terms');
  }
  if (!results['niacin'] && !results['vitamin b3']) {
    console.log('  - Niacina: Consider using "niacinamide" or "nicotinamide" as alternatives');
  }

  console.log('\n✅ Test complete\n');
}

main().catch(console.error);
