/**
 * Test DynamoDB Connection
 * Verifies that DynamoDB table is accessible and working
 */

import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

const TABLE_NAME = 'production-supplements-evidence-cache';
const REGION = 'us-east-1';

async function testDynamoDB() {
  console.log('🧪 Testing DynamoDB Connection\n');
  console.log('='.repeat(70));

  const client = new DynamoDBClient({ region: REGION });

  try {
    // Test 1: Write a test item
    console.log('\n1️⃣  Writing test item...');
    const testItem = {
      supplementName: { S: 'test-supplement-' + Date.now() },
      evidenceData: { S: JSON.stringify({ test: true }) },
      generatedAt: { N: Math.floor(Date.now() / 1000).toString() },
      studyQuality: { S: 'high' },
      studyCount: { N: '10' },
      rctCount: { N: '5' },
      metaAnalysisCount: { N: '2' },
      pubmedIds: { SS: ['12345', '67890'] },
      version: { S: '1.0' },
      ttl: { N: (Math.floor(Date.now() / 1000) + 86400).toString() }, // 24 hours
      searchCount: { N: '1' },
      lastAccessed: { N: Math.floor(Date.now() / 1000).toString() },
    };

    await client.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: testItem,
      })
    );

    console.log('   ✅ Write successful');
    console.log(`   Item: ${testItem.supplementName.S}`);

    // Test 2: Read the item back
    console.log('\n2️⃣  Reading test item...');
    const result = await client.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          supplementName: testItem.supplementName,
        },
      })
    );

    if (result.Item) {
      console.log('   ✅ Read successful');
      console.log(`   Item found: ${result.Item.supplementName.S}`);
      console.log(`   Quality: ${result.Item.studyQuality.S}`);
    } else {
      console.log('   ❌ Item not found');
      throw new Error('Failed to read item');
    }

    // Test 3: Verify table info
    console.log('\n3️⃣  Table Information:');
    console.log(`   Table Name: ${TABLE_NAME}`);
    console.log(`   Region: ${REGION}`);
    console.log(`   Status: ✅ OPERATIONAL`);

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ ALL TESTS PASSED!');
    console.log('\nDynamoDB is ready for production use.');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nError details:', error);

    console.log('\n\n🔧 Troubleshooting:');
    console.log('1. Check AWS credentials are configured');
    console.log('2. Verify table name:', TABLE_NAME);
    console.log('3. Verify region:', REGION);
    console.log('4. Check IAM permissions for DynamoDB');

    throw error;
  }
}

testDynamoDB().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
