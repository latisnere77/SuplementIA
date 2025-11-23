#!/usr/bin/env tsx
/**
 * Inspect the full content of Vitamin D cache entry
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'suplementia-content-enricher-cache';

async function inspectCache() {
  console.log('🔍 Inspecting full cache content for "Vitamin D"\n');

  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { supplementId: 'Vitamin D' },
      })
    );

    if (response.Item) {
      console.log('✅ FOUND in cache\n');
      console.log('Full content:');
      console.log(JSON.stringify(response.Item, null, 2));
      
      // Check if it's actually vitamin K2 data
      const itemStr = JSON.stringify(response.Item).toLowerCase();
      if (itemStr.includes('vitamin k2') || itemStr.includes('vitamina k2')) {
        console.log('\n⚠️  WARNING: Cache contains vitamin K2 data instead of vitamin D!');
      }
      
      if (itemStr.includes('vitamin d') || itemStr.includes('vitamina d')) {
        console.log('\n✅ Cache contains vitamin D data (correct)');
      }
    } else {
      console.log('❌ NOT in cache');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

inspectCache().catch(console.error);
