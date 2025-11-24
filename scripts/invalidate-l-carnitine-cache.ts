#!/usr/bin/env ts-node
/**
 * Invalidate l-carnitine cache to force regeneration with intelligent ranking
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'suplementia-content-enricher-cache';

async function invalidateCache() {
  const supplementIds = [
    'l-carnitine',
    'l-carnitina',
    'carnitine',
    'carnitina',
  ];

  console.log('🗑️  Invalidating l-carnitine cache entries...\n');

  for (const supplementId of supplementIds) {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { supplementId },
        })
      );
      console.log(`✅ Deleted cache for: ${supplementId}`);
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        console.log(`ℹ️  No cache entry for: ${supplementId}`);
      } else {
        console.error(`❌ Error deleting ${supplementId}:`, error.message);
      }
    }
  }

  console.log('\n✅ Cache invalidation complete!');
  console.log('Next request will regenerate with intelligent ranking.');
}

invalidateCache().catch(console.error);
