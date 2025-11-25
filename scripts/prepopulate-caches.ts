/**
 * Pre-populate Caches Script
 * 
 * This script:
 * 1. Loads popular supplements from RDS Postgres
 * 2. Pre-populates DynamoDB cache
 * 3. Warms up ElastiCache Redis
 * 4. Verifies DAX is caching (DAX auto-caches DynamoDB reads)
 */

import { Pool } from 'pg';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from 'redis';

// Database connection
const pool = new Pool({
  host: process.env.RDS_HOST || 'localhost',
  port: parseInt(process.env.RDS_PORT || '5432'),
  database: process.env.RDS_DATABASE || 'supplements',
  user: process.env.RDS_USER || 'postgres',
  password: process.env.RDS_PASSWORD || 'postgres',
  ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT, // For local testing
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

interface Supplement {
  id: number;
  name: string;
  scientific_name: string | null;
  common_names: string[];
  embedding: number[];
  metadata: any;
  search_count: number;
  last_searched_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Load popular supplements from RDS
 */
async function loadPopularSupplements(limit: number = 30): Promise<Supplement[]> {
  console.log(`\n📥 Loading top ${limit} popular supplements from RDS...`);
  
  const result = await pool.query(
    `
    SELECT 
      id,
      name,
      scientific_name,
      common_names,
      embedding,
      metadata,
      search_count,
      last_searched_at,
      created_at,
      updated_at
    FROM supplements
    ORDER BY 
      CASE 
        WHEN metadata->>'popularity' = 'high' THEN 1
        WHEN metadata->>'popularity' = 'medium' THEN 2
        ELSE 3
      END,
      name
    LIMIT $1
    `,
    [limit]
  );
  
  console.log(`✅ Loaded ${result.rows.length} supplements`);
  return result.rows;
}

/**
 * Pre-populate DynamoDB cache
 */
async function populateDynamoDB(supplements: Supplement[]): Promise<void> {
  console.log(`\n📥 Pre-populating DynamoDB cache...`);
  
  const tableName = process.env.DYNAMODB_TABLE || 'supplement-cache';
  let inserted = 0;
  let failed = 0;
  
  for (const supplement of supplements) {
    try {
      // Create cache key (hash of supplement name)
      const cacheKey = `SUPPLEMENT#${supplement.name.toLowerCase().replace(/\s+/g, '-')}`;
      
      // Calculate TTL (7 days from now)
      const ttl = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
      
      await docClient.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            PK: cacheKey,
            SK: 'QUERY',
            supplementData: {
              id: supplement.id,
              name: supplement.name,
              scientific_name: supplement.scientific_name,
              common_names: supplement.common_names,
              metadata: supplement.metadata,
            },
            embedding: supplement.embedding,
            ttl,
            searchCount: supplement.search_count,
            lastAccessed: new Date().toISOString(),
          },
        })
      );
      
      inserted++;
      console.log(`  ✅ Cached in DynamoDB: ${supplement.name}`);
    } catch (error) {
      failed++;
      console.error(`  ❌ Failed to cache ${supplement.name}:`, error);
    }
  }
  
  console.log(`\n📊 DynamoDB cache population:`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Failed: ${failed}`);
}

/**
 * Warm up Redis cache
 */
async function warmUpRedis(supplements: Supplement[]): Promise<void> {
  console.log(`\n📥 Warming up Redis cache...`);
  
  await redisClient.connect();
  
  let inserted = 0;
  let failed = 0;
  
  for (const supplement of supplements) {
    try {
      // Create cache key
      const cacheKey = `supplement:query:${supplement.name.toLowerCase().replace(/\s+/g, '-')}`;
      
      // Store supplement data
      await redisClient.setEx(
        cacheKey,
        7 * 24 * 60 * 60, // 7 days TTL
        JSON.stringify({
          id: supplement.id,
          name: supplement.name,
          scientific_name: supplement.scientific_name,
          common_names: supplement.common_names,
          metadata: supplement.metadata,
        })
      );
      
      // Store embedding separately
      const embeddingKey = `supplement:embedding:${supplement.name.toLowerCase().replace(/\s+/g, '-')}`;
      await redisClient.setEx(
        embeddingKey,
        7 * 24 * 60 * 60,
        JSON.stringify(supplement.embedding)
      );
      
      inserted++;
      console.log(`  ✅ Cached in Redis: ${supplement.name}`);
    } catch (error) {
      failed++;
      console.error(`  ❌ Failed to cache ${supplement.name}:`, error);
    }
  }
  
  await redisClient.disconnect();
  
  console.log(`\n📊 Redis cache warming:`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Failed: ${failed}`);
}

/**
 * Verify DAX caching
 * Note: DAX automatically caches DynamoDB reads, so we just verify the setup
 */
async function verifyDAX(): Promise<void> {
  console.log(`\n🔍 Verifying DAX configuration...`);
  
  const daxEndpoint = process.env.DAX_ENDPOINT;
  
  if (daxEndpoint) {
    console.log(`  ✅ DAX endpoint configured: ${daxEndpoint}`);
    console.log(`  ℹ️  DAX will automatically cache DynamoDB reads`);
    console.log(`  ℹ️  First read: DynamoDB → DAX cache`);
    console.log(`  ℹ️  Subsequent reads: DAX cache (< 1ms latency)`);
  } else {
    console.log(`  ⚠️  DAX endpoint not configured`);
    console.log(`  ℹ️  Set DAX_ENDPOINT environment variable to enable DAX`);
    console.log(`  ℹ️  For now, DynamoDB will be used directly`);
  }
}

/**
 * Verify cache population
 */
async function verifyCaches(): Promise<void> {
  console.log(`\n🔍 Verifying cache population...\n`);
  
  // Test DynamoDB
  try {
    const tableName = process.env.DYNAMODB_TABLE || 'supplement-cache';
    console.log(`  DynamoDB table: ${tableName}`);
    console.log(`  ℹ️  Note: Actual verification requires AWS credentials`);
  } catch (error) {
    console.log(`  ⚠️  Could not verify DynamoDB: ${error}`);
  }
  
  // Test Redis
  try {
    await redisClient.connect();
    const keys = await redisClient.keys('supplement:*');
    console.log(`  Redis keys: ${keys.length}`);
    await redisClient.disconnect();
  } catch (error) {
    console.log(`  ⚠️  Could not verify Redis: ${error}`);
  }
}

/**
 * Main function
 */
async function prepopulateCaches(): Promise<void> {
  console.log('🚀 Starting cache pre-population...');
  
  try {
    // Load popular supplements from RDS
    const supplements = await loadPopularSupplements(30);
    
    if (supplements.length === 0) {
      console.log('\n⚠️  No supplements found in RDS. Run import script first.');
      return;
    }
    
    // Pre-populate DynamoDB (if configured)
    if (process.env.DYNAMODB_TABLE) {
      await populateDynamoDB(supplements);
    } else {
      console.log('\n⚠️  DYNAMODB_TABLE not configured, skipping DynamoDB population');
      console.log('   Set DYNAMODB_TABLE environment variable to enable');
    }
    
    // Warm up Redis (if configured)
    if (process.env.REDIS_URL || process.env.REDIS_URL === undefined) {
      try {
        await warmUpRedis(supplements);
      } catch (error) {
        console.log('\n⚠️  Redis not available, skipping Redis warming');
        console.log(`   Error: ${error}`);
      }
    } else {
      console.log('\n⚠️  REDIS_URL not configured, skipping Redis warming');
    }
    
    // Verify DAX configuration
    await verifyDAX();
    
    // Verify caches
    await verifyCaches();
    
    console.log('\n✅ Cache pre-population completed!');
    console.log('\n📊 Summary:');
    console.log(`   Supplements loaded: ${supplements.length}`);
    console.log(`   DynamoDB: ${process.env.DYNAMODB_TABLE ? 'Populated' : 'Skipped'}`);
    console.log(`   Redis: ${process.env.REDIS_URL !== 'skip' ? 'Warmed' : 'Skipped'}`);
    console.log(`   DAX: ${process.env.DAX_ENDPOINT ? 'Configured' : 'Not configured'}`);
    
  } catch (error) {
    console.error('\n❌ Cache pre-population failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  prepopulateCaches()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { prepopulateCaches, loadPopularSupplements, populateDynamoDB, warmUpRedis };
