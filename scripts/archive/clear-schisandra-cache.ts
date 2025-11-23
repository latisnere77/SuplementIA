#!/usr/bin/env tsx

/**
 * Clear cache for "schisandra chinensis" to force fresh fetch
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'suplementia-content-enricher-cache';

async function clearSchisandraCache() {
  console.log('🗑️  CLEARING CACHE: "schisandra chinensis"\n');
  console.log('='.repeat(60));

  const cacheKeys = [
    'schisandra chinensis',
    'schisandra',
    'schizandra',
    'schisandra berry',
  ];

  for (const key of cacheKeys) {
    console.log(`\n📍 Checking cache for: "${key}"`);
    console.log('-'.repeat(60));

    try {
      // Check if exists
      const getResult = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { supplementId: key },
        })
      );

      if (getResult.Item) {
        console.log(`✅ Found in cache`);
        console.log(`   Created: ${new Date(getResult.Item.createdAt).toISOString()}`);
        console.log(`   TTL: ${getResult.Item.ttl ? new Date(getResult.Item.ttl * 1000).toISOString() : 'N/A'}`);

        // Delete
        await docClient.send(
          new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { supplementId: key },
          })
        );
        console.log(`🗑️  Deleted from cache`);
      } else {
        console.log(`ℹ️  Not found in cache (already cleared or never cached)`);
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CACHE CLEARING COMPLETE\n');
  console.log('💡 Next search for "schisandra chinensis" will fetch fresh data');
}

clearSchisandraCache().catch(console.error);
