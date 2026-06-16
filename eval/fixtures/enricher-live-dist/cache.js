"use strict";
/**
 * DynamoDB Cache integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveToCacheAsync = saveToCacheAsync;
exports.getFromCache = getFromCache;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: 'us-east-1' });
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
    },
});
const TABLE_NAME = 'suplementia-content-enricher-cache';
const CACHE_TTL_DAYS = 7; // Cache expires after 7 days
/**
 * Save enriched content to DynamoDB cache (async, fire-and-forget)
 */
async function saveToCacheAsync(supplementId, data, metadata) {
    try {
        // ✅ VALIDACIÓN: Detectar ranking vacío ANTES de guardar
        if (metadata?.studies?.ranked) {
            const { positive = [], negative = [] } = metadata.studies.ranked;
            // Rechazar si ambos arrays están vacíos
            if (positive.length === 0 && negative.length === 0) {
                console.warn(JSON.stringify({
                    operation: 'CacheSaveRejected',
                    supplementId,
                    reason: 'empty_ranking_arrays',
                    timestamp: new Date().toISOString(),
                }));
                return; // ❌ NO GUARDAR
            }
        }
        const ttl = Math.floor(Date.now() / 1000) + (CACHE_TTL_DAYS * 24 * 60 * 60);
        console.log(JSON.stringify({
            operation: 'CacheSave',
            supplementId,
            table: TABLE_NAME,
            hasMetadata: !!metadata,
            hasRanking: !!metadata?.studies?.ranked,
        }));
        await docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: TABLE_NAME,
            Item: {
                supplementId,
                data,
                ...(metadata ? { metadata } : {}),
                createdAt: new Date().toISOString(),
                ttl,
                version: '1.0.0',
            },
        }));
        console.log(JSON.stringify({
            operation: 'CacheSaveSuccess',
            supplementId,
            hasRanking: !!metadata?.studies?.ranked,
        }));
    }
    catch (error) {
        // Don't throw - cache save is optional
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('DynamoDB cache save error (non-fatal):', errorMessage);
    }
}
/**
 * Get enriched content from DynamoDB cache
 * Returns both data AND metadata (including ranking)
 */
async function getFromCache(supplementId) {
    try {
        const result = await docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: TABLE_NAME,
            Key: { supplementId },
        }));
        if (!result.Item) {
            return null; // Cache miss
        }
        const now = Math.floor(Date.now() / 1000);
        const isExpired = result.Item.ttl && result.Item.ttl < now;
        if (isExpired) {
            console.log(JSON.stringify({
                operation: 'CacheExpired',
                supplementId,
            }));
            return null;
        }
        console.log(JSON.stringify({
            operation: 'CacheHit',
            supplementId,
            age: result.Item.createdAt,
            hasMetadata: !!result.Item.metadata,
            hasRanking: !!result.Item.metadata?.studies?.ranked,
        }));
        // CRITICAL FIX: Return BOTH data AND metadata (including ranking)
        // Previously we only returned data, losing the ranking metadata
        return {
            data: result.Item.data,
            metadata: result.Item.metadata,
        };
    }
    catch (error) {
        // Don't throw - cache read is optional
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('DynamoDB cache read error (non-fatal):', errorMessage);
        return null;
    }
}
//# sourceMappingURL=cache.js.map
