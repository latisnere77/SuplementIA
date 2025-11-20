/**
 * Simple DynamoDB Connection Test
 * Tests basic read/write operations to the cache table
 */

import { DynamoDBClient, PutItemCommand, GetItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_CACHE_TABLE || 'production-supplements-evidence-cache';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const client = new DynamoDBClient({ region: AWS_REGION });

async function testDynamoDB() {
  console.log('🧪 Testing DynamoDB Connection...\n');
  console.log(`Table: ${TABLE_NAME}`);
  console.log(`Region: ${AWS_REGION}\n`);

  const testSupplementName = `test-supplement-${Date.now()}`;
  const testData = {
    whatIsItFor: 'Test supplement for connection testing',
    overallGrade: 'A',
  };

  try {
    // Test 1: WRITE
    console.log('📝 Test 1: Writing test item...');
    const putCommand = new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        supplementName: { S: testSupplementName },
        evidenceData: { S: JSON.stringify(testData) },
        generatedAt: { N: Math.floor(Date.now() / 1000).toString() },
        studyQuality: { S: 'high' },
        studyCount: { N: '10' },
        rctCount: { N: '5' },
        metaAnalysisCount: { N: '2' },
        pubmedIds: { L: [{ S: 'test123' }, { S: 'test456' }] },
        version: { S: '1.0' },
        ttl: { N: (Math.floor(Date.now() / 1000) + 86400).toString() }, // 24 hours
        searchCount: { N: '1' },
        lastAccessed: { N: Math.floor(Date.now() / 1000).toString() },
      },
    });

    await client.send(putCommand);
    console.log('✅ Write successful!\n');

    // Test 2: READ
    console.log('📖 Test 2: Reading test item...');
    const getCommand = new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        supplementName: { S: testSupplementName },
      },
    });

    const result = await client.send(getCommand);

    if (!result.Item) {
      throw new Error('Item not found after writing!');
    }

    const retrievedData = JSON.parse(result.Item.evidenceData.S || '{}');
    console.log('✅ Read successful!');
    console.log(`   Retrieved: ${retrievedData.whatIsItFor}\n`);

    // Test 3: DELETE (cleanup)
    console.log('🗑️  Test 3: Deleting test item...');
    const deleteCommand = new DeleteItemCommand({
      TableName: TABLE_NAME,
      Key: {
        supplementName: { S: testSupplementName },
      },
    });

    await client.send(deleteCommand);
    console.log('✅ Delete successful!\n');

    // Summary
    console.log('═'.repeat(50));
    console.log('✅ ALL TESTS PASSED!');
    console.log('═'.repeat(50));
    console.log('\nDynamoDB connection is working correctly.');
    console.log('Table is ready for production use.\n');

  } catch (error: any) {
    console.error('❌ TEST FAILED!');
    console.error(`Error: ${error.message}`);
    console.error('\nCommon issues:');
    console.error('  1. Check AWS credentials are configured');
    console.error('  2. Verify DYNAMODB_CACHE_TABLE env var is set');
    console.error('  3. Ensure IAM permissions for DynamoDB access');
    console.error('  4. Confirm table exists in the correct region\n');
    process.exit(1);
  }
}

testDynamoDB();
