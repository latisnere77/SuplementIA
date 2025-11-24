#!/usr/bin/env tsx
/**
 * Clear all vitamin-related cache entries
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'suplementia-content-enricher-cache';

async function clearAllVitaminCache() {
  console.log('🗑️  Clearing all vitamin-related cache entries\n');

  const queries = [
    // Vitamin D variants
    'vitamina d',
    'Vitamina D',
    'vitamin d',
    'Vitamin D',
    'VITAMINA D',
    'VITAMIN D',
    
    // Vitamin K2 variants
    'vitamina k2',
    'Vitamina K2',
    'vitamin k2',
    'Vitamin K2',
    'VITAMINA K2',
    'VITAMIN K2',
    
    // Vitamin C variants
    'vitamina c',
    'Vitamina C',
    'vitamin c',
    'Vitamin C',
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
      console.log(`⚠️  Skipped: "${query}" (${error.message})`);
    }
  }

  console.log('\n✅ All vitamin cache entries cleared!');
}

clearAllVitaminCache().catch(console.error);
