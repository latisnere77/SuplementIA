/**
 * Configuration for Content Enricher
 */

export const config = {
  // AWS Bedrock
  region: process.env.AWS_REGION || 'us-east-1',
  // OPTIMIZED: Switch to Haiku for 10x speed improvement and 5x cost reduction
  modelId: process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-3-5-haiku-20241022-v1:0',

  // Bedrock parameters
  // OPTIMIZED: Reduce from 4096 to 3000 for faster generation
  maxTokens: parseInt(process.env.MAX_TOKENS || '3000'),
  temperature: parseFloat(process.env.TEMPERATURE || '0.3'), // Low for factual content

  // Cache Service
  cacheServiceUrl: process.env.CACHE_SERVICE_URL,

  // X-Ray
  xrayEnabled: process.env.XRAY_ENABLED !== 'false',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
} as const;

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID',
  'Content-Type': 'application/json',
};
