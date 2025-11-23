#!/usr/bin/env tsx
/**
 * Clear condroitina cache
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'suplementia-content-enricher-cache';

async function clearCache() {
  console.log('🗑️  Clearing condroitina cache\n');

  const queries = [
    'condroitina',
    'Condroitina',
    'CONDROITINA',
    'chondroitin',
    'Chondroitin',
    'CHONDROITIN',
    'chondroitin sulfate',
    'Chondroitin Sulfate',
  ];

  for (const query of queries) {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { supplementId: query },
        })
      );
      console.log(`✅ Deleted: "${query}"`);
    } catch (error: any) {
      console.log(`⚠️  Skipped: "${query}"`);
    }
  }

  console.log('\n✅ Cache cleared!');
}

clearCache().catch(console.error);
