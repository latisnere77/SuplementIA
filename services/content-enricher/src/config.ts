/* eslint-disable */
// @ts-nocheck
export {};
"use strict";
/**
 * Configuration for Content Enricher
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORS_HEADERS = exports.config = void 0;
exports.config = {
    // AWS Bedrock
    region: process.env.AWS_REGION || 'us-east-1',
    // OPTIMIZED: Switch to Haiku for 10x speed improvement and 5x cost reduction
    modelId: process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    // Bedrock parameters
    // Increased to 4500 to support richer evidence data (5+ items per section)
    maxTokens: parseInt(process.env.MAX_TOKENS || '4500'),
    temperature: parseFloat(process.env.TEMPERATURE || '0.3'), // Low for factual content
    // Cache Service
    cacheServiceUrl: process.env.CACHE_SERVICE_URL,
    // X-Ray
    xrayEnabled: process.env.XRAY_ENABLED !== 'false',
    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
    // CORS
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
};
exports.CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID',
    'Content-Type': 'application/json',
};
