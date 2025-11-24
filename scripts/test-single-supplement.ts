#!/usr/bin/env tsx
/**
 * Test single supplement regeneration with ranking
 */

const SUPPLEMENT = 'l-carnitine';
const ALIASES = ['l-carnitine', 'l-carnitina', 'carnitine', 'carnitina'];

async function main() {
  console.log(`\n🧪 Testing: ${SUPPLEMENT}\n`);

  // Step 1: Invalidate cache
  console.log('Step 1: Invalidating cache...');
  const AWS = require('aws-sdk');
  const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });
  
  for (const alias of ALIASES) {
    try {
      await dynamodb.delete({
        TableName: 'suplementia-cache-dev',
        Key: { supplementId: alias },
      }).promise();
      console.log(`  ✅ Deleted: ${alias}`);
    } catch (error: any) {
      console.log(`  ⚠️  ${alias}: ${error.message}`);
    }
  }

  // Step 2: Trigger regeneration
  console.log('\nStep 2: Triggering regeneration...');
  const response = await fetch('https://www.suplementai.com/api/portal/enrich', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supplementName: SUPPLEMENT,
      forceRefresh: true,
    }),
  });

  if (!response.ok) {
    console.error(`❌ Failed: ${response.status}`);
    const text = await response.text();
    console.error(text.substring(0, 500));
    process.exit(1);
  }

  const data = await response.json();
  
  // Step 3: Verify ranking
  console.log('\nStep 3: Verifying ranking...');
  const ranking = data.data?.studies?.ranked;
  
  if (!ranking) {
    console.error('❌ No ranking found in response');
    console.log(JSON.stringify(data, null, 2).substring(0, 1000));
    process.exit(1);
  }

  console.log('\n✅ SUCCESS!');
  console.log(`   Positive studies: ${ranking.positive?.length || 0}`);
  console.log(`   Negative studies: ${ranking.negative?.length || 0}`);
  console.log(`   Consensus: ${ranking.metadata?.consensus || 'unknown'}`);
  console.log(`   Confidence: ${ranking.metadata?.confidenceScore || 0}`);
}

main().catch(console.error);
