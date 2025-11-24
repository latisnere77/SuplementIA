#!/usr/bin/env tsx
/**
 * Check if "vitamina d" is cached in DynamoDB
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'suplementia-content-enricher-cache';

async function checkCache() {
  console.log('🔍 Checking DynamoDB cache for "vitamina d"\n');

  const queries = [
    'vitamina d',
    'Vitamina D',
    'vitamin d',
    'Vitamin D',
  ];

  for (const query of queries) {
    try {
      const response = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { supplementId: query },
        })
      );

      if (response.Item) {
        console.log(`✅ FOUND in cache: "${query}"`);
        console.log(`   - Created: ${new Date(response.Item.createdAt).toISOString()}`);
        console.log(`   - TTL: ${response.Item.ttl ? new Date(response.Item.ttl * 1000).toISOString() : 'N/A'}`);
        console.log(`   - Has Real Data: ${response.Item.metadata?.hasRealData}`);
        console.log(`   - Studies Used: ${response.Item.metadata?.studiesUsed}`);
        console.log(`   - Original Query: ${response.Item.metadata?.originalQuery}`);
        console.log(`   - Translated Query: ${response.Item.metadata?.translatedQuery}`);
        console.log();
      } else {
        console.log(`❌ NOT in cache: "${query}"`);
      }
    } catch (error: any) {
      console.error(`❌ Error checking "${query}":`, error.message);
    }
  }
}

checkCache().catch(console.error);
