/**
 * Test Vitamin B search in LanceDB
 */

import { searchLanceDB } from '../lib/lancedb-service';

async function testVitaminBSearch() {
  console.log('🧪 Testing LanceDB search for "vitamina b"...\n');

  const testQueries = [
    'vitamina b',
    'vitamin b',
    'complejo b',
    'b complex',
  ];

  for (const query of testQueries) {
    console.log(`\n📋 Query: "${query}"`);
    console.log('─'.repeat(60));

    const results = await searchLanceDB(query, 5);

    console.log('Top 5 results:');
    results.forEach((r, i) => {
      const nameDisplay = r.name.padEnd(30);
      const simDisplay = r.similarity.toFixed(3);
      const gradeDisplay = r.metadata.evidence_grade;
      console.log(`${i+1}. ${nameDisplay} (similarity: ${simDisplay}, grade: ${gradeDisplay})`);
    });
  }

  console.log('\n\n✅ Test completed successfully!');
}

testVitaminBSearch().catch(console.error);
