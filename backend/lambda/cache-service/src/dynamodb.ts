/**
 * DynamoDB operations for Cache Service
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  GetCommandOutput,
  PutCommandOutput,
  DeleteCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import AWSXRay from 'aws-xray-sdk-core';
import { config } from './config';
import { CacheItem, EnrichedContent } from './types';

// Initialize DynamoDB client
const baseClient = new DynamoDBClient({ region: config.region });

// Capture with X-Ray if enabled
const client = config.xrayEnabled
  ? AWSXRay.captureAWSv3Client(baseClient)
  : baseClient;

const docClient = DynamoDBDocumentClient.from(client);

/**
 * Get cache item from DynamoDB
 */
export async function getCacheItem(
  supplementId: string
): Promise<CacheItem | null> {
  const startTime = Date.now();

  try {
    const response: GetCommandOutput = await docClient.send(
      new GetCommand({
        TableName: config.tableName,
        Key: {
          PK: `SUPPLEMENT#${supplementId}`,
          SK: `ENRICHED_CONTENT#${config.cacheVersion}`,
        },
      })
    );

    const duration = Date.now() - startTime;

    // Log performance
    console.log(
      JSON.stringify({
        operation: 'GetCacheItem',
        supplementId,
        duration,
        found: !!response.Item,
      })
    );

    if (!response.Item) {
      return null;
    }

    return response.Item as CacheItem;
  } catch (error) {
    console.error('Error getting cache item:', error);
    throw error;
  }
}

/**
 * Put cache item to DynamoDB
 */
export async function putCacheItem(
  supplementId: string,
  data: EnrichedContent
): Promise<void> {
  const startTime = Date.now();
  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + config.ttlSeconds;

  const item: CacheItem = {
    PK: `SUPPLEMENT#${supplementId}`,
    SK: `ENRICHED_CONTENT#${config.cacheVersion}`,
    data,
    ttl,
    lastUpdated: now,
    version: '1.0.0',
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: config.tableName,
        Item: item,
      })
    );

    const duration = Date.now() - startTime;

    // Log performance
    console.log(
      JSON.stringify({
        operation: 'PutCacheItem',
        supplementId,
        duration,
        ttl: new Date(ttl * 1000).toISOString(),
      })
    );
  } catch (error) {
    console.error('Error putting cache item:', error);
    throw error;
  }
}

/**
 * Delete cache item from DynamoDB (cache invalidation)
 */
export async function deleteCacheItem(
  supplementId: string
): Promise<void> {
  const startTime = Date.now();

  try {
    await docClient.send(
      new DeleteCommand({
        TableName: config.tableName,
        Key: {
          PK: `SUPPLEMENT#${supplementId}`,
          SK: `ENRICHED_CONTENT#${config.cacheVersion}`,
        },
      })
    );

    const duration = Date.now() - startTime;

    // Log performance
    console.log(
      JSON.stringify({
        operation: 'DeleteCacheItem',
        supplementId,
        duration,
      })
    );
  } catch (error) {
    console.error('Error deleting cache item:', error);
    throw error;
  }
}

/**
 * Check if cache item is stale
 */
export function isCacheStale(item: CacheItem): boolean {
  const now = Math.floor(Date.now() / 1000);
  return item.ttl < now;
}
