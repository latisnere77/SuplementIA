/**
 * DynamoDB Cache integration
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { EnrichedContent, ExamineStyleContent } from './types';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = 'suplementia-content-enricher-cache';
const CACHE_TTL_DAYS = 7; // Cache expires after 7 days

/**
 * Save enriched content to DynamoDB cache (async, fire-and-forget)
 */
export async function saveToCacheAsync(
  supplementId: string,
  data: EnrichedContent | ExamineStyleContent,
  metadata?: any
): Promise<void> {
  try {
    // ✅ VALIDACIÓN: Detectar ranking vacío ANTES de guardar
    if (metadata?.studies?.ranked) {
      const { positive = [], negative = [] } = metadata.studies.ranked;

      // Rechazar si ambos arrays están vacíos
      if (positive.length === 0 && negative.length === 0) {
        console.warn(
          JSON.stringify({
            operation: 'CacheSaveRejected',
            supplementId,
            reason: 'empty_ranking_arrays',
            timestamp: new Date().toISOString(),
          })
        );
        return; // ❌ NO GUARDAR
      }
    }

    const ttl = Math.floor(Date.now() / 1000) + (CACHE_TTL_DAYS * 24 * 60 * 60);

    console.log(
      JSON.stringify({
        operation: 'CacheSave',
        supplementId,
        table: TABLE_NAME,
        hasMetadata: !!metadata,
        hasRanking: !!metadata?.studies?.ranked,
      })
    );

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          supplementId,
          data,
          ...(metadata ? { metadata } : {}),
          createdAt: new Date().toISOString(),
          ttl,
          version: '1.0.0',
        },
      })
    );

    console.log(
      JSON.stringify({
        operation: 'CacheSaveSuccess',
        supplementId,
        hasRanking: !!metadata?.studies?.ranked,
      })
    );
  } catch (error: any) {
    // Don't throw - cache save is optional
    console.warn('DynamoDB cache save error (non-fatal):', error.message);
  }
}

/**
 * Get enriched content from DynamoDB cache
 * Returns both data AND metadata (including ranking)
 */
export async function getFromCache(
  supplementId: string
): Promise<{ data: EnrichedContent | ExamineStyleContent; metadata?: any } | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { supplementId },
      })
    );

    if (!result.Item) {
      return null; // Cache miss
    }

    const now = Math.floor(Date.now() / 1000);
    const isExpired = result.Item.ttl && result.Item.ttl < now;

    if (isExpired) {
      console.log(
        JSON.stringify({
          operation: 'CacheExpired',
          supplementId,
        })
      );
      return null;
    }

    console.log(
      JSON.stringify({
        operation: 'CacheHit',
        supplementId,
        age: result.Item.createdAt,
        hasMetadata: !!result.Item.metadata,
        hasRanking: !!result.Item.metadata?.studies?.ranked,
      })
    );

    // CRITICAL FIX: Return BOTH data AND metadata (including ranking)
    // Previously we only returned data, losing the ranking metadata
    return {
      data: result.Item.data as EnrichedContent | ExamineStyleContent,
      metadata: result.Item.metadata,
    };
  } catch (error: any) {
    // Don't throw - cache read is optional
    console.warn('DynamoDB cache read error (non-fatal):', error.message);
    return null;
  }
}
