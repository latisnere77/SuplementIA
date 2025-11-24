/**
 * Check DynamoDB cache for Kefir to see if there's old data with incorrect metadata
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'suplementia-content-cache-dev';

async function checkKefirCache() {
  console.log('='.repeat(60));
  console.log('🔍 Checking DynamoDB Cache for Kefir');
  console.log('='.repeat(60));
  console.log('');

  const supplementId = 'Kefir';
  
  try {
    console.log(`📝 Checking cache for: ${supplementId}`);
    console.log(`📝 Table: ${TABLE_NAME}`);
    console.log('');

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          supplementId: supplementId,
        },
      })
    );

    if (result.Item) {
      console.log('✅ Cache entry found');
      console.log('');
      
      const item = result.Item;
      const metadata = item.metadata || {};
      
      console.log('📊 Cache Metadata:');
      console.log(`   Has Real Data: ${metadata.hasRealData || false}`);
      console.log(`   Studies Used: ${metadata.studiesUsed || 0}`);
      console.log(`   Generated At: ${item.generatedAt || 'N/A'}`);
      console.log(`   Cached: ${item.cached || false}`);
      console.log('');
      
      if (metadata.hasRealData && metadata.studiesUsed > 0) {
        console.log('✅ Cache has valid metadata');
      } else {
        console.log('❌ Cache has invalid or missing metadata');
        console.log('💡 This cache entry should be invalidated');
      }
      
      console.log('');
      console.log('📋 Full cache entry (first 1000 chars):');
      console.log(JSON.stringify(item, null, 2).substring(0, 1000));
    } else {
      console.log('ℹ️  No cache entry found');
      console.log('💡 This means the system will fetch fresh data');
    }

  } catch (error: any) {
    console.error('❌ Error checking cache:', error.message);
    console.error(error.stack);
  }
}

checkKefirCache().catch(console.error);

