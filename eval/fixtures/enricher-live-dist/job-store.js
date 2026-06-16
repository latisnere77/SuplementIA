"use strict";
/**
 * Job Store Client for Content Enricher Lambda
 * Updates DynamoDB job store when enrichment completes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateJobWithResult = updateJobWithResult;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const TABLE_NAME = 'suplementai-async-jobs';
const REGION = 'us-east-1';
// Initialize DynamoDB client
const dynamoClient = new client_dynamodb_1.DynamoDBClient({
    region: REGION,
    maxAttempts: 3,
});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
    },
});
async function updateJobWithResult(jobId, status, data) {
    try {
        const now = Date.now();
        const expiresAt = now + (15 * 60 * 1000);
        const ttl = Math.floor(expiresAt / 1000); // DynamoDB TTL is seconds
        await docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: TABLE_NAME,
            Item: {
                jobId,
                status,
                ...data,
                completedAt: now,
                lastAccessedAt: now,
                expiresAt,
                ttl,
            },
        }));
        console.log(JSON.stringify({
            operation: 'JobStoreUpdate',
            jobId,
            status,
            hasRecommendation: !!data.recommendation,
            hasError: !!data.error,
        }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(JSON.stringify({
            operation: 'JobStoreUpdateFailed',
            jobId,
            error: errorMessage,
        }));
        // Don't throw - enrichment succeeded even if job store update failed
    }
}
//# sourceMappingURL=job-store.js.map
