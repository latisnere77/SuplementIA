/**
 * DynamoDB Cache Service
 * Handles reading and writing supplement evidence to DynamoDB
 */

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import {
  SupplementCacheItem,
  normalizeSupplementName,
  calculateTTL,
  toDynamoDBItem,
  fromDynamoDBItem,
} from '@/infrastructure/dynamodb-schema';
import type { SupplementEvidenceData } from '@/lib/portal/supplements-evidence-data';

// ====================================
// TYPES
// ====================================

export interface CachedEvidenceResult {
  evidenceData: SupplementEvidenceData;
  generatedAt: string; // ISO string
  studyQuality: 'high' | 'medium' | 'low';
  studyCount: number;
  rctCount: number;
  metaAnalysisCount: number;
}

// ====================================
// CLIENT SETUP
// ====================================

const dynamoClient = new DynamoDBClient({
  region: (process.env.AWS_REGION || 'us-east-1').trim(),
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim(),
    }
    : undefined, // Falls back to default credential chain if not provided
});

const TABLE_NAME = process.env.DYNAMODB_CACHE_TABLE || 'production-supplements-evidence-cache';

// ====================================
// CACHE OPERATIONS
// ====================================

/**
 * Get supplement evidence from DynamoDB cache
 * Returns null if not found or expired
 */
export async function getCachedEvidence(
  supplementName: string
): Promise<CachedEvidenceResult | null> {
  try {
    const normalized = normalizeSupplementName(supplementName);

    const result = await dynamoClient.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          supplementName: { S: normalized },
        },
      })
    );

    if (!result.Item) {
      console.log(`[CACHE MISS] ${supplementName} not found in DynamoDB`);
      return null;
    }

    // Convert DynamoDB item to cache item
    const cacheItem = fromDynamoDBItem(result.Item);

    // Check if cache is still valid (within 30 days)
    const now = Math.floor(Date.now() / 1000);
    if (cacheItem.ttl < now) {
      console.log(`[CACHE EXPIRED] ${supplementName} cache expired`);
      return null;
    }

    // Increment access counter (fire and forget)
    incrementAccessCount(normalized).catch(console.error);

    // Parse and return evidence data with metadata
    const evidenceData: SupplementEvidenceData = JSON.parse(cacheItem.evidenceData);

    console.log(`[CACHE HIT] ${supplementName} found in DynamoDB (quality: ${cacheItem.studyQuality})`);

    return {
      evidenceData,
      generatedAt: new Date(cacheItem.generatedAt * 1000).toISOString(),
      studyQuality: cacheItem.studyQuality,
      studyCount: cacheItem.studyCount,
      rctCount: cacheItem.rctCount,
      metaAnalysisCount: cacheItem.metaAnalysisCount,
    };
  } catch (error) {
    console.error(`[CACHE ERROR] Failed to get ${supplementName} from cache:`, error);
    return null;
  }
}

/**
 * Save supplement evidence to DynamoDB cache
 */
export async function saveCachedEvidence(
  supplementName: string,
  evidenceData: SupplementEvidenceData,
  metadata: {
    studyQuality: 'high' | 'medium' | 'low';
    pubmedIds: string[];
    studyCount: number;
    rctCount: number;
    metaAnalysisCount: number;
  }
): Promise<void> {
  try {
    const normalized = normalizeSupplementName(supplementName);
    const now = Date.now();

    const cacheItem: SupplementCacheItem = {
      supplementName: normalized,
      evidenceData: JSON.stringify(evidenceData),
      generatedAt: Math.floor(now / 1000),
      studyQuality: metadata.studyQuality,
      studyCount: metadata.studyCount,
      rctCount: metadata.rctCount,
      metaAnalysisCount: metadata.metaAnalysisCount,
      pubmedIds: metadata.pubmedIds,
      version: '1.0',
      ttl: calculateTTL(30), // 30 days
      searchCount: 1,
      lastAccessed: Math.floor(now / 1000),
    };

    await dynamoClient.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: toDynamoDBItem(cacheItem),
      })
    );

    console.log(`[CACHE SAVED] ${supplementName} saved to DynamoDB (quality: ${metadata.studyQuality})`);
  } catch (error) {
    console.error(`[CACHE ERROR] Failed to save ${supplementName} to cache:`, error);
    throw error;
  }
}

/**
 * Increment access count for a supplement (fire and forget)
 */
async function incrementAccessCount(normalizedName: string): Promise<void> {
  try {
    await dynamoClient.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: {
          supplementName: { S: normalizedName },
        },
        UpdateExpression: 'ADD searchCount :inc SET lastAccessed = :now',
        ExpressionAttributeValues: {
          ':inc': { N: '1' },
          ':now': { N: Math.floor(Date.now() / 1000).toString() },
        },
      })
    );
  } catch (error) {
    console.error(`[CACHE ERROR] Failed to increment access count:`, error);
  }
}

/**
 * Get most popular supplements (by search count)
 * Useful for identifying which supplements to pre-generate
 */
export async function getMostPopularSupplements(limit: number = 20): Promise<Array<{
  name: string;
  searchCount: number;
  studyQuality: string;
}>> {
  try {
    // Note: This requires a scan operation which is expensive
    // In production, consider using a separate index or aggregation
    console.log('[ANALYTICS] Getting most popular supplements...');

    // For now, return empty array
    // TODO: Implement with proper GSI or aggregation pipeline
    return [];
  } catch (error) {
    console.error('[ANALYTICS ERROR] Failed to get popular supplements:', error);
    return [];
  }
}

/**
 * Check if DynamoDB cache is available
 */
export async function isCacheAvailable(): Promise<boolean> {
  try {
    // Try a simple operation
    await dynamoClient.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          supplementName: { S: 'health-check' },
        },
      })
    );
    return true;
  } catch (error) {
    console.error('[CACHE ERROR] DynamoDB cache not available:', error);
    return false;
  }
}

// ====================================
// CACHE STATISTICS
// ====================================

export interface CacheStats {
  totalItems: number;
  highQuality: number;
  mediumQuality: number;
  lowQuality: number;
  avgStudyCount: number;
}

/**
 * Get cache statistics
 * Note: This is expensive (requires scan), use sparingly
 */
export async function getCacheStats(): Promise<CacheStats | null> {
  try {
    // TODO: Implement with CloudWatch metrics or periodic aggregation
    console.log('[ANALYTICS] Cache stats not yet implemented');
    return null;
  } catch (error) {
    console.error('[ANALYTICS ERROR] Failed to get cache stats:', error);
    return null;
  }
}

// ====================================
// CACHE INVALIDATION
// ====================================

/**
 * Invalidate (delete) a supplement from cache
 * Useful for forcing regeneration
 */
export async function invalidateCachedEvidence(supplementName: string): Promise<void> {
  try {
    const normalized = normalizeSupplementName(supplementName);

    await dynamoClient.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: {
          supplementName: { S: normalized },
        },
        UpdateExpression: 'SET #ttl = :now',
        ExpressionAttributeNames: {
          '#ttl': 'ttl',
        },
        ExpressionAttributeValues: {
          ':now': { N: '0' }, // Set TTL to past = will be deleted soon
        },
      })
    );

    console.log(`[CACHE INVALIDATED] ${supplementName} marked for deletion`);
  } catch (error) {
    console.error(`[CACHE ERROR] Failed to invalidate ${supplementName}:`, error);
    throw error;
  }
}
