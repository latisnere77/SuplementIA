/**
 * Configuration for Cache Service
 */

export const config = {
  // DynamoDB
  tableName: process.env.TABLE_NAME || 'suplementia-enriched-content',
  region: process.env.AWS_REGION || 'us-east-1',

  // TTL (30 days in seconds)
  ttlSeconds: 30 * 24 * 60 * 60,

  // Cache version
  cacheVersion: 'v1',

  // X-Ray
  xrayEnabled: process.env.XRAY_ENABLED !== 'false',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
} as const;

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID',
  'Content-Type': 'application/json',
};
