/**
 * Check if Kefir is cached in DynamoDB
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Check both cache systems
const CACHE_TABLE = process.env.CACHE_TABLE_NAME || 'suplementia-enriched-content';
const OLD_CACHE_TABLE = process.env.DYNAMODB_TABLE_NAME || 'production-supplements-evidence-cache';

async function checkCache(supplementName: string) {
  const normalized = supplementName.toLowerCase().trim();
  
  console.log('='.repeat(60));
  console.log(`🔍 Checking Cache for: "${supplementName}"`);
  console.log('='.repeat(60));
  console.log('');

  // Check new cache system
  console.log(`1️⃣  Checking new cache system (${CACHE_TABLE})...`);
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: CACHE_TABLE,
        Key: {
          PK: `SUPPLEMENT#${normalized}`,
          SK: `ENRICHED_CONTENT#v1`,
        },
      })
    );

    if (result.Item) {
      console.log('   ✅ FOUND in new cache system');
      console.log(`   Last Updated: ${result.Item.lastUpdated || 'N/A'}`);
      console.log(`   TTL: ${result.Item.ttl || 'N/A'}`);
      console.log(`   Has Data: ${!!result.Item.data}`);
      if (result.Item.data) {
        const data = result.Item.data;
        console.log(`   Studies Used: ${data.studiesUsed || 'N/A'}`);
        console.log(`   Has Real Data: ${data.hasRealData || false}`);
      }
      return true;
    } else {
      console.log('   ❌ NOT FOUND in new cache system');
    }
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`   ℹ️  Table ${CACHE_TABLE} does not exist`);
    } else {
      console.log(`   ⚠️  Error: ${error.message}`);
    }
  }
  console.log('');

  // Check old cache system
  console.log(`2️⃣  Checking old cache system (${OLD_CACHE_TABLE})...`);
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: OLD_CACHE_TABLE,
        Key: {
          supplementName: normalized,
        },
      })
    );

    if (result.Item) {
      console.log('   ✅ FOUND in old cache system');
      console.log(`   Last Updated: ${result.Item.lastUpdated || result.Item.createdAt || 'N/A'}`);
      console.log(`   TTL: ${result.Item.ttl || 'N/A'}`);
      console.log(`   Has Data: ${!!result.Item.evidenceData || !!result.Item.data}`);
      
      const evidenceData = result.Item.evidenceData || result.Item.data;
      if (evidenceData) {
        console.log(`   Studies Used: ${evidenceData.studiesUsed || result.Item.studiesUsed || 'N/A'}`);
        console.log(`   Has Real Data: ${evidenceData.hasRealData || result.Item.hasRealData || false}`);
      }
      return true;
    } else {
      console.log('   ❌ NOT FOUND in old cache system');
    }
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`   ℹ️  Table ${OLD_CACHE_TABLE} does not exist`);
    } else {
      console.log(`   ⚠️  Error: ${error.message}`);
    }
  }
  console.log('');

  // Try scanning for similar keys
  console.log(`3️⃣  Scanning for similar keys...`);
  try {
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: OLD_CACHE_TABLE,
        FilterExpression: 'contains(supplementName, :name)',
        ExpressionAttributeValues: {
          ':name': normalized,
        },
        Limit: 10,
      })
    );

    if (scanResult.Items && scanResult.Items.length > 0) {
      console.log(`   ✅ Found ${scanResult.Items.length} similar entries:`);
      scanResult.Items.forEach((item, i) => {
        console.log(`      ${i + 1}. ${item.supplementName} (TTL: ${item.ttl || 'N/A'})`);
      });
    } else {
      console.log('   ❌ No similar entries found');
    }
  } catch (error: any) {
    console.log(`   ⚠️  Error scanning: ${error.message}`);
  }
  console.log('');

  console.log('='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));
  console.log('Cache status: NOT FOUND (or expired)');
  console.log('Next search should generate fresh data');
  console.log('');
}

checkCache('Kefir').catch(console.error);

