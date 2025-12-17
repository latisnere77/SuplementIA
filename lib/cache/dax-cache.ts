/**
 * DAX Cache Service
 * 
 * Implements DynamoDB Accelerator (DAX) client for microsecond latency.
 * DAX provides in-memory caching for DynamoDB with automatic cache management.
 */

import AmazonDaxClient from 'amazon-dax-client';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { generateSupplementPK, calculateTTL, type CacheItem } from '../../infrastructure/dynamodb-dax-config';

// ====================================
// DAX CLIENT CONFIGURATION
// ====================================

const DAX_ENDPOINT = process.env.DAX_ENDPOINT;
const DAX_PORT = parseInt(process.env.DAX_PORT || '8111');
const TABLE_NAME = process.env.DYNAMODB_CACHE_TABLE || 'supplement-cache';

let daxClient: DynamoDBDocumentClient | null = null;

/**
 * Initialize DAX client
 * Falls back to regular DynamoDB if DAX is not available
 */
function getDaxClient(): DynamoDBDocumentClient {
  if (daxClient) {
    return daxClient;
  }

  if (!DAX_ENDPOINT) {
    console.warn('[DAX Cache] DAX_ENDPOINT not configured, using regular DynamoDB');
    // Fallback to regular DynamoDB
    const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
    const dynamoClient = new DynamoDBClient({
      region: (process.env.AWS_REGION || 'us-east-1').trim(),
    });
    daxClient = DynamoDBDocumentClient.from(dynamoClient);
    return daxClient;
  }

  try {
    // Create DAX client
    const dax = new AmazonDaxClient({
      endpoints: [`${DAX_ENDPOINT}:${DAX_PORT}`],
      region: (process.env.AWS_REGION || 'us-east-1').trim(),
    });

    daxClient = DynamoDBDocumentClient.from(dax, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
    });

    console.log(`[DAX Cache] Connected to DAX cluster: ${DAX_ENDPOINT}:${DAX_PORT}`);
    return daxClient;

  } catch (error) {
    console.error('[DAX Cache] Failed to initialize DAX client:', error);
    // Fallback to regular DynamoDB
    const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
    const dynamoClient = new DynamoDBClient({
      region: (process.env.AWS_REGION || 'us-east-1').trim(),
    });
    daxClient = DynamoDBDocumentClient.from(dynamoClient);
    return daxClient;
  }
}

// ====================================
// CACHE OPERATIONS
// ====================================

export class DAXCache {
  private client: DynamoDBDocumentClient;

  constructor() {
    this.client = getDaxClient();
  }

  /**
   * Get supplement from DAX cache
   * Expected latency: < 1ms (microseconds)
   */
  async get(query: string): Promise<CacheItem | null> {
    const startTime = performance.now();

    try {
      const pk = generateSupplementPK(query);

      const result = await this.client.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: pk,
          SK: 'QUERY',
        },
        ConsistentRead: false, // Use eventually consistent reads for better performance
      }));

      const latency = performance.now() - startTime;

      if (!result.Item) {
        console.log(`[DAX Cache] MISS - Query: ${query}, Latency: ${latency.toFixed(2)}ms`);
        return null;
      }

      console.log(`[DAX Cache] HIT - Query: ${query}, Latency: ${latency.toFixed(2)}ms`);
      return result.Item as CacheItem;

    } catch (error) {
      console.error('[DAX Cache] Error getting item:', error);
      return null;
    }
  }

  /**
   * Set supplement in DAX cache
   * DAX automatically caches writes
   */
  async set(query: string, data: Omit<CacheItem, 'PK' | 'SK' | 'cachedAt' | 'ttl'>): Promise<void> {
    const startTime = performance.now();

    try {
      const pk = generateSupplementPK(query);
      const now = Date.now();

      const item: CacheItem = {
        PK: pk,
        SK: 'QUERY',
        ...data,
        cachedAt: now,
        ttl: calculateTTL(7), // 7 days
      };

      await this.client.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      }));

      const latency = performance.now() - startTime;
      console.log(`[DAX Cache] SET - Query: ${query}, Latency: ${latency.toFixed(2)}ms`);

    } catch (error) {
      console.error('[DAX Cache] Error setting item:', error);
      throw error;
    }
  }

  /**
   * Delete supplement from DAX cache
   * DAX automatically invalidates cache
   */
  async delete(query: string): Promise<void> {
    try {
      const pk = generateSupplementPK(query);

      await this.client.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: pk,
          SK: 'QUERY',
        },
      }));

      console.log(`[DAX Cache] DELETE - Query: ${query}`);

    } catch (error) {
      console.error('[DAX Cache] Error deleting item:', error);
      throw error;
    }
  }

  /**
   * Batch get multiple supplements
   * Optimized for DAX's batch operations
   */
  async batchGet(queries: string[]): Promise<Map<string, CacheItem>> {
    const results = new Map<string, CacheItem>();

    // DAX supports batch operations efficiently
    const promises = queries.map(async (query) => {
      const item = await this.get(query);
      if (item) {
        results.set(query, item);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Check if DAX is available
   */
  isDAXAvailable(): boolean {
    return !!DAX_ENDPOINT;
  }

  /**
   * Get cache source (DAX or DynamoDB)
   */
  getCacheSource(): 'dax' | 'dynamodb' {
    return DAX_ENDPOINT ? 'dax' : 'dynamodb';
  }
}

// Export singleton instance
export const daxCache = new DAXCache();
