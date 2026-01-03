/**
 * Synergies Service
 *
 * Fetches supplement synergies from external DynamoDB table (FormulationEngine-IngredientSynergies)
 * Uses cross-account access via STS AssumeRole
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';

// External account configuration
const EXTERNAL_ROLE_ARN = process.env.SYNERGIES_ROLE_ARN || 'arn:aws:iam::239378269775:role/suplementia-synergies-access-role';
const EXTERNAL_TABLE = 'FormulationEngine-IngredientSynergies';
const EXTERNAL_REGION = 'us-east-1';

// Cache for cross-account credentials (15 min TTL)
let cachedCredentials: {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
} | null = null;

// Raw DynamoDB item format is handled dynamically in transformSynergy
// due to mixed marshalled/unmarshalled formats from DocumentClient

/**
 * Transformed synergy for frontend
 */
export interface TransformedSynergy {
  supplement: string;
  type: string;
  mechanism: string;
  effect: string;
  score: number;
  tier: number;
  categories: string[];
  direction: 'positive' | 'negative';
  evidence?: {
    studyCount: number;
    pubmedIds: string[];
    source: string;
  };
}

/**
 * Get cross-account credentials via STS AssumeRole
 */
async function getCrossAccountCredentials(): Promise<{
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}> {
  // Return cached credentials if still valid (with 1 min buffer)
  if (cachedCredentials && cachedCredentials.expiration > new Date(Date.now() + 60000)) {
    return cachedCredentials;
  }

  console.log(JSON.stringify({
    event: 'SYNERGIES_ASSUME_ROLE',
    roleArn: EXTERNAL_ROLE_ARN,
    timestamp: new Date().toISOString(),
  }));

  const stsClient = new STSClient({ region: EXTERNAL_REGION });

  try {
    const { Credentials } = await stsClient.send(new AssumeRoleCommand({
      RoleArn: EXTERNAL_ROLE_ARN,
      RoleSessionName: 'suplementia-synergies-session',
      DurationSeconds: 900, // 15 minutes
    }));

    if (!Credentials || !Credentials.AccessKeyId || !Credentials.SecretAccessKey || !Credentials.SessionToken) {
      throw new Error('Failed to assume cross-account role - no credentials returned');
    }

    cachedCredentials = {
      accessKeyId: Credentials.AccessKeyId,
      secretAccessKey: Credentials.SecretAccessKey,
      sessionToken: Credentials.SessionToken,
      expiration: Credentials.Expiration || new Date(Date.now() + 900000),
    };

    console.log(JSON.stringify({
      event: 'SYNERGIES_ROLE_ASSUMED',
      expiresAt: cachedCredentials.expiration.toISOString(),
      timestamp: new Date().toISOString(),
    }));

    return cachedCredentials;
  } catch (error) {
    console.error(JSON.stringify({
      event: 'SYNERGIES_ASSUME_ROLE_FAILED',
      error: error instanceof Error ? error.message : 'Unknown error',
      roleArn: EXTERNAL_ROLE_ARN,
      timestamp: new Date().toISOString(),
    }));
    throw error;
  }
}

/**
 * Normalize supplement name for DynamoDB lookup
 */
function normalizeSupplementName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * DynamoDB attribute value types
 */
interface DynamoDBStringValue {
  S: string;
}

interface DynamoDBNumberValue {
  N: string;
}

interface DynamoDBListValue {
  L: Array<{ S?: string; N?: string; M?: Record<string, unknown> }>;
}

interface DynamoDBMapValue {
  M: Record<string, { S?: string; N?: string; L?: DynamoDBListValue }>;
}

/**
 * Raw DynamoDB synergy item structure
 */
interface DynamoDBSynergyItem {
  ingredient_1?: DynamoDBStringValue | string;
  ingredient_2?: DynamoDBStringValue | string;
  synergy_type?: DynamoDBStringValue | string;
  mechanism?: DynamoDBStringValue | string;
  effect?: DynamoDBStringValue | string;
  synergy_score?: DynamoDBNumberValue | string;
  tier?: DynamoDBNumberValue | string;
  matched_categories?: DynamoDBListValue | string[];
  evidence?: DynamoDBMapValue;
}

/**
 * Helper to extract string from DynamoDB attribute or plain string
 */
function extractString(value: DynamoDBStringValue | string | undefined, defaultValue: string = ''): string {
  if (!value) return defaultValue;
  if (typeof value === 'string') return value;
  return value.S || defaultValue;
}

/**
 * Helper to extract number from DynamoDB attribute or plain string
 */
function extractNumber(value: DynamoDBNumberValue | string | undefined, defaultValue: string): number {
  if (!value) return parseInt(defaultValue, 10);
  if (typeof value === 'string') return parseInt(value, 10);
  return parseInt(value.N || defaultValue, 10);
}

/**
 * Transform raw DynamoDB item to frontend format
 */
function transformSynergy(item: DynamoDBSynergyItem, currentSupplement: string): TransformedSynergy {
  const ingredient1 = extractString(item.ingredient_1);
  const ingredient2 = extractString(item.ingredient_2);
  const synergyType = extractString(item.synergy_type, 'general_synergy');

  // Determine which ingredient is the partner
  const partnerSupplement = ingredient1.toLowerCase() === currentSupplement.toLowerCase()
    ? ingredient2
    : ingredient1;

  // Determine if this is a negative synergy
  const isNegative = synergyType.toLowerCase().includes('avoid') ||
                     synergyType.toLowerCase().includes('contra') ||
                     synergyType.toLowerCase().includes('negative');

  // Extract categories
  const categories: string[] = [];
  if (item.matched_categories && typeof item.matched_categories === 'object' && 'L' in item.matched_categories) {
    item.matched_categories.L.forEach((cat) => {
      if (cat.S) categories.push(cat.S);
    });
  } else if (item.matched_categories && Array.isArray(item.matched_categories)) {
    item.matched_categories.forEach((cat: string) => categories.push(cat));
  }

  // Extract evidence if available
  let evidence: TransformedSynergy['evidence'] | undefined;
  if (item.evidence && 'M' in item.evidence) {
    const ev = item.evidence.M;
    const pubmedIds: string[] = [];

    if (ev.pubmedIds && 'L' in ev.pubmedIds && Array.isArray(ev.pubmedIds.L)) {
      for (const item of ev.pubmedIds.L) {
        if (item.S) {
          pubmedIds.push(item.S);
        }
      }
    }

    evidence = {
      studyCount: ev.studyCount && 'N' in ev.studyCount ? parseInt(ev.studyCount.N || '0', 10) : 0,
      pubmedIds,
      source: ev.source && 'S' in ev.source ? ev.source.S || 'unknown' : 'unknown',
    };
  }

  return {
    supplement: partnerSupplement,
    type: synergyType,
    mechanism: extractString(item.mechanism, 'Synergistic combination'),
    effect: extractString(item.effect, 'Enhanced effectiveness'),
    score: extractNumber(item.synergy_score, '70'),
    tier: extractNumber(item.tier, '3'),
    categories,
    direction: isNegative ? 'negative' : 'positive',
    evidence,
  };
}

/**
 * Query synergies from external DynamoDB table
 */
export async function getSynergiesForSupplement(
  supplementName: string
): Promise<TransformedSynergy[]> {
  const startTime = Date.now();
  const normalizedName = normalizeSupplementName(supplementName);

  console.log(JSON.stringify({
    event: 'SYNERGIES_QUERY_START',
    supplementName,
    normalizedName,
    timestamp: new Date().toISOString(),
  }));

  try {
    // Get cross-account credentials
    const credentials = await getCrossAccountCredentials();

    // Create DynamoDB client with cross-account credentials
    const dynamoClient = new DynamoDBClient({
      region: EXTERNAL_REGION,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });
    const docClient = DynamoDBDocumentClient.from(dynamoClient);

    // Query synergies where this supplement is the primary key
    const result = await docClient.send(new QueryCommand({
      TableName: EXTERNAL_TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': normalizedName,
        ':sk': 'SYNERGY',
      },
    }));

    const duration = Date.now() - startTime;

    if (!result.Items || result.Items.length === 0) {
      console.log(JSON.stringify({
        event: 'SYNERGIES_QUERY_EMPTY',
        supplementName,
        normalizedName,
        duration,
        timestamp: new Date().toISOString(),
      }));
      return [];
    }

    // Transform results
    const synergies = result.Items.map(item => transformSynergy(item, normalizedName));

    // Deduplicate synergies (some have duplicate entries with different SK formats)
    const seen = new Set<string>();
    const uniqueSynergies = synergies.filter(s => {
      const key = `${s.supplement.toLowerCase()}-${s.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by score (highest first), then by tier (lowest first)
    uniqueSynergies.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.tier - b.tier;
    });

    console.log(JSON.stringify({
      event: 'SYNERGIES_QUERY_SUCCESS',
      supplementName,
      normalizedName,
      totalFound: result.Items.length,
      uniqueSynergies: uniqueSynergies.length,
      positiveCount: uniqueSynergies.filter(s => s.direction === 'positive').length,
      negativeCount: uniqueSynergies.filter(s => s.direction === 'negative').length,
      duration,
      timestamp: new Date().toISOString(),
    }));

    return uniqueSynergies;
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(JSON.stringify({
      event: 'SYNERGIES_QUERY_ERROR',
      supplementName,
      normalizedName,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
      timestamp: new Date().toISOString(),
    }));

    // Return empty array on error - let the caller handle fallback
    return [];
  }
}

/**
 * Transform Claude's stacksWith array to synergy format (fallback)
 */
export function transformStacksWithFallback(stacksWith?: string[]): TransformedSynergy[] {
  if (!stacksWith || stacksWith.length === 0) return [];

  return stacksWith.map(supplement => ({
    supplement,
    type: 'general_synergy',
    mechanism: 'Complementary supplement combination',
    effect: 'May enhance overall effectiveness',
    score: 70,
    tier: 3,
    categories: [],
    direction: 'positive' as const,
  }));
}
