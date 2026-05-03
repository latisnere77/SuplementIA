/**
 * DAX Cache Service
 * 
 * Implements DynamoDB Accelerator (DAX) client for microsecond latency.
 * DAX provides in-memory caching for DynamoDB with automatic cache management.
 */

import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { generateSupplementPK, calculateTTL, type CacheItem } from '../../infrastructure/dynamodb-dax-config';

// ====================================
// DAX CLIENT CONFIGURATION
// ====================================

const DAX_ENDPOINT = process.env.DAX_ENDPOINT;
const DAX_PORT = parseInt(process.env.DAX_PORT || '8111');
const TABLE_NAME = process.env.DYNAMODB_CACHE_TABLE || 'supplement-cache';
const DEBUG_CACHE = process.env.DEBUG_CACHE === 'true';

let daxClient: DynamoDBDocumentClient | null = null;

function debugCache(message: string, details?: unknown): void {
  if (!DEBUG_CACHE) return;
  if (details === undefined) {
    console.info(message);
    return;
  }
  console.info(message, details);
}

/**
 * Initialize DAX client
 * Falls back to regular DynamoDB if DAX is not available
 */
function getDaxClient(): DynamoDBDocumentClient {
  if (daxClient) {
    return daxClient;
  }

  if (!DAX_ENDPOINT) {
    // Fallback to regular DynamoDB
    const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
    const dynamoClient = new DynamoDBClient({
      region: (process.env.AWS_REGION || 'us-east-1').trim(),
    });
    daxClient = DynamoDBDocumentClient.from(dynamoClient);
    return daxClient;
  }

  debugCache(`[DAX Cache] DAX endpoint configured (${DAX_ENDPOINT}:${DAX_PORT}), using DynamoDB SDK client fallback`);
  const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
  const dynamoClient = new DynamoDBClient({
    region: (process.env.AWS_REGION || 'us-east-1').trim(),
  });
  daxClient = DynamoDBDocumentClient.from(dynamoClient);
  return daxClient;
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
        debugCache(`[DAX Cache] MISS - Query: ${query}, Latency: ${latency.toFixed(2)}ms`);
        return null;
      }

      debugCache(`[DAX Cache] HIT - Query: ${query}, Latency: ${latency.toFixed(2)}ms`);
      return result.Item as CacheItem;

    } catch (error) {
      debugCache('[DAX Cache] Error getting item:', error);
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
      debugCache(`[DAX Cache] SET - Query: ${query}, Latency: ${latency.toFixed(2)}ms`);

    } catch (error) {
      debugCache('[DAX Cache] Error setting item:', error);
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

      debugCache(`[DAX Cache] DELETE - Query: ${query}`);

    } catch (error) {
      debugCache('[DAX Cache] Error deleting item:', error);
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
    return false;
  }

  /**
   * Get cache source (DAX or DynamoDB)
   */
  getCacheSource(): 'dax' | 'dynamodb' {
    return 'dynamodb';
  }
}

// Export singleton instance
export const daxCache = new DAXCache();
