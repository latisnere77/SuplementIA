/**
 * Configuration for Content Enricher
 */

export const config = {
  // AWS Bedrock
  region: process.env.AWS_REGION || 'us-east-1',
  modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',

  // Bedrock parameters
  maxTokens: parseInt(process.env.MAX_TOKENS || '4096'),
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
