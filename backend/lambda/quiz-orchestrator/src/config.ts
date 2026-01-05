/**
 * Quiz Orchestrator Configuration
 */

export const config = {
  region: process.env.AWS_REGION || 'us-east-1',

  // Lambda function names
  searchLambda: process.env.SEARCH_LAMBDA || 'production-search-api-lancedb',
  enricherLambda: process.env.ENRICHER_LAMBDA || 'production-content-enricher',

  // Timeouts (in ms)
  searchTimeout: parseInt(process.env.SEARCH_TIMEOUT || '30000', 10),
  enrichmentTimeout: parseInt(process.env.ENRICHMENT_TIMEOUT || '180000', 10),

  // Feature flags
  xrayEnabled: process.env.AWS_XRAY_DAEMON_ADDRESS !== undefined,
  enableEnrichment: process.env.ENABLE_ENRICHMENT !== 'false',

  // Limits
  maxStudies: parseInt(process.env.MAX_STUDIES || '5', 10),
};
