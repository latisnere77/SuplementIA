#!/usr/bin/env tsx
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'suplementia-content-enricher-cache';

async function checkCache() {
  console.log('🔍 Checking cache for condroitina/chondroitin\n');

  const queries = ['condroitina', 'Condroitina', 'chondroitin', 'Chondroitin'];

  for (const query of queries) {
    try {
      const response = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { supplementId: query },
        })
      );

      if (response.Item) {
        console.log(`✅ FOUND: "${query}"`);
        console.log(`   Created: ${response.Item.createdAt}`);
        console.log(`   Has data: ${!!response.Item.data}`);
        console.log(`   Studies: ${response.Item.data?.totalStudies || 0}`);
      } else {
        console.log(`❌ NOT FOUND: "${query}"`);
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

checkCache().catch(console.error);
