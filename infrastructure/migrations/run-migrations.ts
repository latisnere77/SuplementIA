#!/usr/bin/env ts-node

/**
 * Migration Runner for RDS Postgres
 * 
 * Runs SQL migrations in order to set up the database schema.
 * Tracks applied migrations in a migrations table.
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

interface Migration {
  id: number;
  filename: string;
  applied_at: Date;
}

async function createMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<Migration>(
    'SELECT filename FROM schema_migrations ORDER BY id'
  );
  return new Set(result.rows.map(row => row.filename));
}

async function applyMigration(
  pool: Pool,
  filename: string,
  sql: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Run the migration SQL
    await client.query(sql);
    
    // Record the migration
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    );
    
    await client.query('COMMIT');
    console.log(`✓ Applied migration: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function runMigrations(): Promise<void> {
  // Database connection configuration
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DATABASE || 'supplements',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔄 Connecting to database...');
    await pool.query('SELECT 1');
    console.log('✓ Connected to database');

    // Create migrations tracking table
    await createMigrationsTable(pool);
    console.log('✓ Migrations table ready');

    // Get list of applied migrations
    const appliedMigrations = await getAppliedMigrations(pool);
    console.log(`✓ Found ${appliedMigrations.size} applied migrations`);

    // Get list of migration files
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`✓ Found ${files.length} migration files`);

    // Apply pending migrations
    let appliedCount = 0;
    for (const filename of files) {
      if (appliedMigrations.has(filename)) {
        console.log(`⊘ Skipping (already applied): ${filename}`);
        continue;
      }

      const filepath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filepath, 'utf-8');
      
      console.log(`🔄 Applying migration: ${filename}`);
      await applyMigration(pool, filename, sql);
      appliedCount++;
    }

    if (appliedCount === 0) {
      console.log('✓ No new migrations to apply');
    } else {
      console.log(`✓ Applied ${appliedCount} new migration(s)`);
    }

    console.log('✓ Migration complete');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { runMigrations };
