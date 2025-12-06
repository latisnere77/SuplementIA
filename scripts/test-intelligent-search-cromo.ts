
import { expandAbbreviation } from '../lib/services/abbreviation-expander';

async function testIntelligentSearch() {
  console.log('--- Running Isolated Test for Intelligent Search (LLM Translation) ---');

  const termsToTest = [
    'cromo',         // The new term that failed
    'yodo',          // The previous term that failed
    'magnesio',      // A common Spanish term that works
    'NAC',           // A common abbreviation
    'chromium',      // The English term, should not be changed
  ];

  for (const term of termsToTest) {
    console.log(`\n[TESTING] Input: "${term}"`);
    try {
      const result = await expandAbbreviation(term);
      console.log(`  => Original: ${result.original}`);
      console.log(`  => Alternatives: [${result.alternatives.join(', ')}]`);
      console.log(`  => Source: ${result.source}`);
      console.log(`  => Confidence: ${result.confidence}`);
    } catch (error) {
      console.error(`  => ERROR testing "${term}":`, error);
    }
  }

  console.log('\n--- Test Complete ---');
}

testIntelligentSearch().catch(console.error);
