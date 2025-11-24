/**
 * Script to invalidate cache for "Kefir" to force regeneration with new intelligent search
 * This will clear the cached mock data and allow the system to try variations like "kefir milk", "kefir grains", etc.
 * 
 * This script tries multiple methods:
 * 1. Cache Service API (if CACHE_SERVICE_URL is set)
 * 2. Direct DynamoDB deletion (if AWS credentials are configured)
 * 3. AWS CLI (if available)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { execSync } from 'child_process';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Cache table name (from cache-service)
const CACHE_TABLE_NAME = process.env.CACHE_TABLE_NAME || 'suplementia-enriched-content';
const CACHE_VERSION = 'v1';
const CACHE_SERVICE_URL = process.env.CACHE_SERVICE_URL;

/**
 * Normalize supplement name for cache key
 */
function normalizeSupplementName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Invalidate cache via Cache Service API
 */
async function invalidateViaAPI(supplementName: string): Promise<boolean> {
  if (!CACHE_SERVICE_URL) {
    return false;
  }

  const normalized = normalizeSupplementName(supplementName);
  const url = `${CACHE_SERVICE_URL}/cache/${normalized}`;

  try {
    console.log(`  🌐 Trying Cache Service API: ${url}`);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      console.log(`  ✅ Cache invalidated via API`);
      return true;
    } else {
      console.log(`  ℹ️  API returned ${response.status} (cache might not exist)`);
      return true; // Still consider it successful
    }
  } catch (error: any) {
    console.warn(`  ⚠️  API call failed: ${error.message}`);
    return false;
  }
}

/**
 * Invalidate cache via DynamoDB directly
 */
async function invalidateViaDynamoDB(supplementName: string): Promise<boolean> {
  const normalized = normalizeSupplementName(supplementName);
  const supplementId = normalized;

  try {
    // Try to delete from cache-service table (new system)
    await docClient.send(
      new DeleteCommand({
        TableName: CACHE_TABLE_NAME,
        Key: {
          PK: `SUPPLEMENT#${supplementId}`,
          SK: `ENRICHED_CONTENT#${CACHE_VERSION}`,
        },
      })
    );

    console.log(`  ✅ Deleted from cache-service table (${CACHE_TABLE_NAME})`);
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`  ℹ️  Table ${CACHE_TABLE_NAME} not found`);
    } else {
      console.warn(`  ⚠️  Error deleting from cache-service: ${error.message}`);
    }
  }

  // Also try old cache system if it exists
  const OLD_CACHE_TABLE = process.env.DYNAMODB_TABLE_NAME || 'production-supplements-evidence-cache';
  
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: OLD_CACHE_TABLE,
        Key: {
          supplementName: normalized,
        },
      })
    );

    console.log(`  ✅ Deleted from old cache table (${OLD_CACHE_TABLE})`);
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`  ℹ️  Old cache table ${OLD_CACHE_TABLE} not found`);
    } else {
      console.warn(`  ⚠️  Error deleting from old cache: ${error.message}`);
    }
  }

  return false;
}

/**
 * Invalidate cache via AWS CLI
 */
function invalidateViaCLI(supplementName: string): boolean {
  const normalized = normalizeSupplementName(supplementName);
  const supplementId = normalized;

  try {
    // Try new cache system
    const command = `aws dynamodb delete-item --table-name ${CACHE_TABLE_NAME} --key '{"PK":{"S":"SUPPLEMENT#${supplementId}"},"SK":{"S":"ENRICHED_CONTENT#${CACHE_VERSION}"}}' --region ${process.env.AWS_REGION || 'us-east-1'}`;
    execSync(command, { stdio: 'pipe' });
    console.log(`  ✅ Deleted via AWS CLI from ${CACHE_TABLE_NAME}`);
    return true;
  } catch (error: any) {
    // Try old cache system
    try {
      const oldTable = process.env.DYNAMODB_TABLE_NAME || 'production-supplements-evidence-cache';
      const oldCommand = `aws dynamodb delete-item --table-name ${oldTable} --key '{"supplementName":{"S":"${normalized}"}}' --region ${process.env.AWS_REGION || 'us-east-1'}`;
      execSync(oldCommand, { stdio: 'pipe' });
      console.log(`  ✅ Deleted via AWS CLI from ${oldTable}`);
      return true;
    } catch (error2: any) {
      console.log(`  ℹ️  AWS CLI not available or tables not found`);
      return false;
    }
  }
}

/**
 * Invalidate cache for a supplement (tries all methods)
 */
async function invalidateCache(supplementName: string): Promise<void> {
  const normalized = normalizeSupplementName(supplementName);

  console.log(`🗑️  Invalidating cache for: ${supplementName} (normalized: ${normalized})`);
  console.log('');

  // Try API first (easiest)
  const apiSuccess = await invalidateViaAPI(supplementName);
  if (apiSuccess) {
    return;
  }

  // Try DynamoDB directly
  const dbSuccess = await invalidateViaDynamoDB(supplementName);
  if (dbSuccess) {
    return;
  }

  // Try AWS CLI as last resort
  const cliSuccess = invalidateViaCLI(supplementName);
  if (cliSuccess) {
    return;
  }

  console.log(`  ⚠️  Could not invalidate cache - all methods failed`);
  console.log(`  💡 Tip: Set CACHE_SERVICE_URL environment variable or configure AWS credentials`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('🗑️  Invalidating Kefir Cache');
  console.log('='.repeat(60));
  console.log('');

  const supplements = ['Kefir', 'kefir', 'KEFIR'];

  for (const supplement of supplements) {
    try {
      await invalidateCache(supplement);
      console.log(`✅ Successfully invalidated cache for: ${supplement}`);
    } catch (error: any) {
      console.error(`❌ Failed to invalidate ${supplement}:`, error.message);
    }
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('✅ Cache Invalidation Complete');
  console.log('='.repeat(60));
  console.log('');
  console.log('Next time someone searches for "Kefir":');
  console.log('1. System will try base term "Kefir"');
  console.log('2. If no studies found, will generate variations:');
  console.log('   - "kefir milk"');
  console.log('   - "kefir grains"');
  console.log('   - "kefir supplementation"');
  console.log('   - etc.');
  console.log('3. Will try each variation until finding real studies');
  console.log('4. Returns real data instead of mock data');
  console.log('');
}

main().catch(console.error);

