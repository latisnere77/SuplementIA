/**
 * Import Script: Bulk Insert Supplements into RDS Postgres
 * 
 * This script:
 * 1. Reads the exported supplements JSON
 * 2. Generates embeddings for all supplements (if not already present)
 * 3. Bulk inserts into RDS Postgres with pgvector
 * 4. Verifies vector index creation
 * 5. Tests search accuracy
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

// Database connection configuration
const pool = new Pool({
  host: process.env.RDS_HOST || 'localhost',
  port: parseInt(process.env.RDS_PORT || '5432'),
  database: process.env.RDS_DATABASE || 'supplements',
  user: process.env.RDS_USER || 'postgres',
  password: process.env.RDS_PASSWORD || 'postgres',
  ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

interface MigratedSupplement {
  name: string;
  scientific_name: string | null;
  common_names: string[];
  embedding: number[] | null;
  metadata: any;
  search_count: number;
  last_searched_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Generate embedding using the embedding service
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const embeddingServiceUrl = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:3000/api/embed';
    
    const response = await fetch(embeddingServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) {
      throw new Error(`Embedding service error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error(`Failed to generate embedding for "${text}":`, error);
    // Return a zero vector as placeholder (384 dimensions)
    return new Array(384).fill(0);
  }
}

/**
 * Verify pgvector extension is installed
 */
async function verifyPgVector(): Promise<boolean> {
  try {
    const result = await pool.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector';
    `);
    
    if (result.rows.length === 0) {
      console.log('⚠️  pgvector extension not found. Installing...');
      await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log('✅ pgvector extension installed');
    } else {
      console.log('✅ pgvector extension already installed');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to verify/install pgvector:', error);
    return false;
  }
}

/**
 * Create supplements table if it doesn't exist
 */
async function createTable(): Promise<void> {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS supplements (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      scientific_name TEXT,
      common_names TEXT[],
      embedding vector(384),
      metadata JSONB,
      search_count INTEGER DEFAULT 0,
      last_searched_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;
  
  try {
    await pool.query(createTableSQL);
    console.log('✅ Supplements table created/verified');
  } catch (error) {
    console.error('❌ Failed to create table:', error);
    throw error;
  }
}

/**
 * Create indexes for performance
 */
async function createIndexes(): Promise<void> {
  try {
    // Create HNSW index for vector similarity search
    console.log('Creating HNSW index for vector search...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS supplements_embedding_idx 
      ON supplements 
      USING hnsw (embedding vector_cosine_ops);
    `);
    console.log('✅ HNSW vector index created');
    
    // Create index on search_count for analytics
    await pool.query(`
      CREATE INDEX IF NOT EXISTS supplements_search_count_idx 
      ON supplements (search_count DESC);
    `);
    console.log('✅ Search count index created');
    
    // Create index on name for exact lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS supplements_name_idx 
      ON supplements (name);
    `);
    console.log('✅ Name index created');
    
  } catch (error) {
    console.error('❌ Failed to create indexes:', error);
    throw error;
  }
}

/**
 * Bulk insert supplements
 */
async function bulkInsert(supplements: MigratedSupplement[]): Promise<void> {
  console.log(`\n📥 Inserting ${supplements.length} supplements...`);
  
  let inserted = 0;
  let failed = 0;
  
  for (const supplement of supplements) {
    try {
      // Generate embedding if not present
      let embedding = supplement.embedding;
      if (!embedding || embedding.length === 0) {
        const embeddingText = [
          supplement.name,
          supplement.scientific_name,
          ...supplement.common_names,
        ]
          .filter(Boolean)
          .join(' ');
        
        console.log(`  Generating embedding for: ${supplement.name}`);
        embedding = await generateEmbedding(embeddingText);
      }
      
      // Insert into database
      await pool.query(
        `
        INSERT INTO supplements (
          name, 
          scientific_name, 
          common_names, 
          embedding, 
          metadata, 
          search_count, 
          last_searched_at, 
          created_at, 
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (name) DO UPDATE SET
          scientific_name = EXCLUDED.scientific_name,
          common_names = EXCLUDED.common_names,
          embedding = EXCLUDED.embedding,
          metadata = EXCLUDED.metadata,
          updated_at = EXCLUDED.updated_at
        `,
        [
          supplement.name,
          supplement.scientific_name,
          supplement.common_names,
          `[${embedding.join(',')}]`, // Format as pgvector array
          JSON.stringify(supplement.metadata),
          supplement.search_count,
          supplement.last_searched_at,
          supplement.created_at,
          supplement.updated_at,
        ]
      );
      
      inserted++;
      console.log(`  ✅ Inserted: ${supplement.name}`);
    } catch (error) {
      failed++;
      console.error(`  ❌ Failed to insert ${supplement.name}:`, error);
    }
  }
  
  console.log(`\n📊 Bulk insert complete:`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Failed: ${failed}`);
}

/**
 * Test search accuracy
 */
async function testSearchAccuracy(): Promise<void> {
  console.log('\n🔍 Testing search accuracy...\n');
  
  const testQueries = [
    { query: 'Reishi', expected: 'Ganoderma lucidum' },
    { query: 'Vitamin B12', expected: 'Vitamin B12' },
    { query: 'Magnesium', expected: 'Magnesium' },
    { query: 'Ashwagandha', expected: 'Ashwagandha' },
    { query: 'Omega 3', expected: 'Omega-3' },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testQueries) {
    try {
      // Generate embedding for query
      const queryEmbedding = await generateEmbedding(test.query);
      
      // Search using vector similarity
      const result = await pool.query(
        `
        SELECT 
          name,
          scientific_name,
          1 - (embedding <=> $1) as similarity
        FROM supplements
        WHERE 1 - (embedding <=> $1) > 0.5
        ORDER BY similarity DESC
        LIMIT 1
        `,
        [`[${queryEmbedding.join(',')}]`]
      );
      
      if (result.rows.length > 0) {
        const topResult = result.rows[0];
        const isCorrect = topResult.name === test.expected || 
                         topResult.name.toLowerCase().includes(test.expected.toLowerCase()) ||
                         test.expected.toLowerCase().includes(topResult.name.toLowerCase());
        
        if (isCorrect) {
          console.log(`  ✅ "${test.query}" → "${topResult.name}" (similarity: ${topResult.similarity.toFixed(3)})`);
          passed++;
        } else {
          console.log(`  ❌ "${test.query}" → "${topResult.name}" (expected: "${test.expected}", similarity: ${topResult.similarity.toFixed(3)})`);
          failed++;
        }
      } else {
        console.log(`  ❌ "${test.query}" → No results found`);
        failed++;
      }
    } catch (error) {
      console.error(`  ❌ Error testing "${test.query}":`, error);
      failed++;
    }
  }
  
  console.log(`\n📊 Search accuracy test:`);
  console.log(`   Passed: ${passed}/${testQueries.length}`);
  console.log(`   Failed: ${failed}/${testQueries.length}`);
  console.log(`   Accuracy: ${((passed / testQueries.length) * 100).toFixed(1)}%`);
}

/**
 * Verify database state
 */
async function verifyDatabase(): Promise<void> {
  console.log('\n🔍 Verifying database state...\n');
  
  // Count total supplements
  const countResult = await pool.query('SELECT COUNT(*) FROM supplements');
  console.log(`  Total supplements: ${countResult.rows[0].count}`);
  
  // Count supplements with embeddings
  const embeddingCountResult = await pool.query(
    'SELECT COUNT(*) FROM supplements WHERE embedding IS NOT NULL'
  );
  console.log(`  With embeddings: ${embeddingCountResult.rows[0].count}`);
  
  // Check index exists
  const indexResult = await pool.query(`
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'supplements' AND indexname = 'supplements_embedding_idx'
  `);
  
  if (indexResult.rows.length > 0) {
    console.log(`  ✅ HNSW vector index exists`);
  } else {
    console.log(`  ⚠️  HNSW vector index not found`);
  }
  
  // Sample a few supplements
  const sampleResult = await pool.query(`
    SELECT name, scientific_name, array_length(common_names, 1) as common_names_count
    FROM supplements
    LIMIT 5
  `);
  
  console.log('\n  Sample supplements:');
  sampleResult.rows.forEach(row => {
    console.log(`    - ${row.name} (${row.scientific_name}) [${row.common_names_count} common names]`);
  });
}

/**
 * Main import function
 */
async function importToRDS(): Promise<void> {
  console.log('🚀 Starting RDS import...\n');
  
  try {
    // Test database connection
    console.log('Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');
    
    // Verify pgvector extension
    const pgvectorOk = await verifyPgVector();
    if (!pgvectorOk) {
      throw new Error('pgvector extension not available');
    }
    
    // Create table
    await createTable();
    
    // Read exported supplements
    const exportPath = path.join(__dirname, '../infrastructure/migrations/supplements-export.json');
    const supplementsData = fs.readFileSync(exportPath, 'utf-8');
    const supplements: MigratedSupplement[] = JSON.parse(supplementsData);
    
    console.log(`\n📊 Loaded ${supplements.length} supplements from export\n`);
    
    // Bulk insert
    await bulkInsert(supplements);
    
    // Create indexes
    await createIndexes();
    
    // Verify database state
    await verifyDatabase();
    
    // Test search accuracy
    await testSearchAccuracy();
    
    console.log('\n✅ RDS import completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run import if called directly
if (require.main === module) {
  importToRDS()
    .then(() => {
      console.log('\n✅ Import script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Import script failed:', error);
      process.exit(1);
    });
}

export { importToRDS, generateEmbedding, verifyPgVector, createTable, createIndexes };
