/**
 * Configuration for Studies Fetcher
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

let cachedApiKey: string | null = null;

/**
 * Load PubMed API key from AWS Secrets Manager
 */
async function loadPubMedApiKey(): Promise<string> {
  if (cachedApiKey !== null) {
    return cachedApiKey;
  }

  try {
    const client = new SecretsManagerClient({ region: 'us-east-1' });
    const command = new GetSecretValueCommand({
      SecretId: 'suplementia/pubmed-api-key',
    });
    
    const response = await client.send(command);
    const secret = JSON.parse(response.SecretString || '{}');
    cachedApiKey = secret.api_key || '';
    
    console.log('✅ PubMed API key loaded from Secrets Manager');
    return cachedApiKey || '';
  } catch (error) {
    console.warn('⚠️  Failed to load PubMed API key from Secrets Manager:', error);
    return '';
  }
}

export const config = {
  // PubMed E-utilities
  pubmedBaseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',

  // API Key (loaded from Secrets Manager)
  // Without key: 3 requests/second
  // With key: 10 requests/second
  get pubmedApiKey(): string {
    return cachedApiKey || '';
  },
  set pubmedApiKey(value: string) {
    cachedApiKey = value;
  },
  
  // Function to load API key
  loadApiKey: loadPubMedApiKey,

  // Default search parameters
  // Increased from 10 to 15 to have more studies for ranking (supports 5+ items per section)
  defaultMaxResults: parseInt(process.env.DEFAULT_MAX_RESULTS || '15'),
  defaultYearFrom: parseInt(process.env.DEFAULT_YEAR_FROM || '2010'),

  // Rate limiting
  requestDelayMs: 350, // 350ms = ~3 requests/second (safe without API key)

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
