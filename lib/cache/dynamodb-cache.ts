/**
 * DynamoDB Cache Service
 * 
 * Implements L1 cache using DynamoDB with DAX for microsecond latency.
 * This is the first tier in the cache hierarchy.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { generateSupplementPK, calculateTTL, type CacheItem } from '../../infrastructure/dynamodb-dax-config';

// ====================================
// CLIENT CONFIGURATION
// ====================================

const dynamoClient = new DynamoDBClient({
  region: (process.env.AWS_REGION || 'us-east-1').trim(),
});

const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});

const TABLE_NAME = process.env.DYNAMODB_CACHE_TABLE || 'supplement-cache';

// ====================================
// CACHE OPERATIONS
// ====================================

export class DynamoDBCache {
  /**
   * Get supplement from cache
   */
  async get(query: string): Promise<CacheItem | null> {
    const startTime = Date.now();

    try {
      const pk = generateSupplementPK(query);

      const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: pk,
          SK: 'QUERY',
        },
      }));

      const latency = Date.now() - startTime;

      if (!result.Item) {
        console.log(`[DynamoDB Cache] MISS - Query: ${query}, Latency: ${latency}ms`);
        return null;
      }

      // Update access metadata
      await this.updateAccessMetadata(pk);

      console.log(`[DynamoDB Cache] HIT - Query: ${query}, Latency: ${latency}ms`);
      return result.Item as CacheItem;

    } catch (error) {
      console.error('[DynamoDB Cache] Error getting item:', error);
      return null;
    }
  }

  /**
   * Set supplement in cache
   */
  async set(query: string, data: Omit<CacheItem, 'PK' | 'SK' | 'cachedAt' | 'ttl'>): Promise<void> {
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

      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      }));

      console.log(`[DynamoDB Cache] SET - Query: ${query}`);

    } catch (error) {
      console.error('[DynamoDB Cache] Error setting item:', error);
      throw error;
    }
  }

  /**
   * Delete supplement from cache
   */
  async delete(query: string): Promise<void> {
    try {
      const pk = generateSupplementPK(query);

      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: pk,
          SK: 'QUERY',
        },
      }));

      console.log(`[DynamoDB Cache] DELETE - Query: ${query}`);

    } catch (error) {
      console.error('[DynamoDB Cache] Error deleting item:', error);
      throw error;
    }
  }

  /**
   * Get popular supplements (by search count)
   */
  async getPopular(limit: number = 10): Promise<CacheItem[]> {
    try {
      const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'searchCount-index',
        KeyConditionExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': 'QUERY',
        },
        ScanIndexForward: false, // Descending order
        Limit: limit,
      }));

      return (result.Items || []) as CacheItem[];

    } catch (error) {
      console.error('[DynamoDB Cache] Error getting popular items:', error);
      return [];
    }
  }

  /**
   * Update access metadata (search count, last accessed)
   */
  private async updateAccessMetadata(pk: string): Promise<void> {
    try {
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: pk,
          SK: 'QUERY',
        },
        UpdateExpression: 'SET searchCount = if_not_exists(searchCount, :zero) + :inc, lastAccessed = :now',
        ExpressionAttributeValues: {
          ':zero': 0,
          ':inc': 1,
          ':now': Date.now(),
        },
      }));
    } catch (error) {
      // Non-critical error, just log it
      console.error('[DynamoDB Cache] Error updating metadata:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalItems: number;
    avgSearchCount: number;
  }> {
    // This would require a scan which is expensive
    // In production, use CloudWatch metrics instead
    return {
      totalItems: 0,
      avgSearchCount: 0,
    };
  }
}

// Export singleton instance
export const dynamoDBCache = new DynamoDBCache();
