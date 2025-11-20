/**
 * Configuration for Studies Fetcher
 */

export const config = {
  // PubMed E-utilities
  pubmedBaseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',

  // API Key (optional but recommended for higher rate limits)
  // Without key: 3 requests/second
  // With key: 10 requests/second
  pubmedApiKey: process.env.PUBMED_API_KEY || '',

  // Default search parameters
  defaultMaxResults: parseInt(process.env.DEFAULT_MAX_RESULTS || '10'),
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
