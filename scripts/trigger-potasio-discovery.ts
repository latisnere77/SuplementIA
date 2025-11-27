#!/usr/bin/env tsx
/**
 * Trigger Potasio Discovery
 * 
 * Simulates searches for Potasio to add it to the discovery queue.
 * The discovery worker will then process it and add it to RDS.
 */

const SEARCH_API_URL = process.env.SEARCH_API_URL || 
  'https://staging-search-api.execute-api.us-east-1.amazonaws.com/search';

async function triggerSearch(query: string): Promise<void> {
  console.log(`\n🔍 Searching: "${query}"`);
  
  try {
    const url = `${SEARCH_API_URL}?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SuplementIA-Discovery-Trigger/1.0',
      },
    });
    
    const data = await response.json();
    
    if (response.status === 404) {
      console.log('   ✅ Added to discovery queue');
      console.log(`   Message: ${data.message}`);
    } else if (response.ok) {
      console.log('   ✅ Already exists in database');
      console.log(`   Found: ${data.supplement?.name}`);
    } else {
      console.log(`   ⚠️  Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
    }
    
  } catch (error) {
    console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Trigger Discovery for Missing Minerals               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const minerals = [
    'Potasio',
    'Potassium',
    'Cobre',
    'Copper',
    'Manganeso',
    'Manganese',
    'Yodo',
    'Iodine',
  ];
  
  console.log(`\nTriggering searches for ${minerals.length} terms...`);
  console.log(`API: ${SEARCH_API_URL}\n`);
  
  for (const mineral of minerals) {
    await triggerSearch(mineral);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between requests
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                         SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\nNext steps:');
  console.log('1. Check DynamoDB discovery queue table');
  console.log('2. Verify discovery worker is running');
  console.log('3. Wait for worker to process queue (may take a few minutes)');
  console.log('4. Test search again: "Potasio"');
  console.log('\nAlternatively, manually add to RDS using:');
  console.log('   npx tsx scripts/add-missing-minerals.ts');
}

main().catch(console.error);
