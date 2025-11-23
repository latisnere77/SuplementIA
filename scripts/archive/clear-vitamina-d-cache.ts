#!/usr/bin/env tsx
/**
 * Clear "vitamina d" from DynamoDB cache to force fresh lookup
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'suplementia-content-enricher-cache';

async function clearCache() {
  console.log('🗑️  Clearing DynamoDB cache for "vitamina d"\n');

  const queries = [
    'vitamina d',
    'Vitamina D',
    'vitamin d',
    'Vitamin D',
  ];

  for (const query of queries) {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { supplementId: query },
        })
      );
      console.log(`✅ Deleted cache entry: "${query}"`);
    } catch (error: any) {
      console.error(`❌ Error deleting "${query}":`, error.message);
    }
  }

  console.log('\n✅ Cache cleared! Next search will fetch fresh data.');
}

clearCache().catch(console.error);
