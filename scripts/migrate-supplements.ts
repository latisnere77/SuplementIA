/**
 * Migration Script: Export Legacy Supplements to New Schema
 * 
 * This script:
 * 1. Extracts all 70 supplements from supplement-mappings.ts
 * 2. Transforms them to the new RDS Postgres schema format
 * 3. Generates embeddings for all supplements using the embedding service
 * 4. Exports to JSON for bulk import into RDS
 */

import { SUPPLEMENT_MAPPINGS, SupplementMapping } from '../lib/portal/supplement-mappings';
import * as fs from 'fs';
import * as path from 'path';

// New schema interface matching RDS Postgres structure
interface MigratedSupplement {
  name: string;
  scientific_name: string | null;
  common_names: string[];
  embedding: number[] | null; // Will be populated by embedding service
  metadata: {
    category: string;
    popularity: 'high' | 'medium' | 'low';
    evidenceGrade?: 'A' | 'B' | 'C' | 'D';
    studyCount?: number;
    pubmedQuery: string;
    pubmedFilters?: {
      yearFrom?: number;
      rctOnly?: boolean;
      maxStudies?: number;
    };
    cachedData?: {
      lastUpdated: string;
      studyCount: number;
      evidenceGrade: 'A' | 'B' | 'C' | 'D';
      primaryUses: string[];
      safetyProfile: 'safe' | 'caution' | 'unsafe';
    };
  };
  search_count: number;
  last_searched_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Transform legacy mapping to new schema
 */
function transformToNewSchema(mapping: SupplementMapping): MigratedSupplement {
  const now = new Date().toISOString();
  
  return {
    name: mapping.normalizedName,
    scientific_name: mapping.scientificName || null,
    common_names: mapping.commonNames,
    embedding: null, // Will be generated separately
    metadata: {
      category: mapping.category,
      popularity: mapping.popularity,
      evidenceGrade: mapping.cachedData?.evidenceGrade,
      studyCount: mapping.cachedData?.studyCount,
      pubmedQuery: mapping.pubmedQuery,
      pubmedFilters: mapping.pubmedFilters,
      cachedData: mapping.cachedData,
    },
    search_count: 0,
    last_searched_at: null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Generate embedding for a supplement using the embedding service
 * This calls the Lambda function that runs Sentence Transformers
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // In production, this would call the Lambda embedding service
    // For migration, we'll use a local implementation or mock
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
    // Return null embedding - will be generated later
    return [];
  }
}

/**
 * Main migration function
 */
async function migrateSupplement() {
  console.log('🚀 Starting supplement migration...\n');
  
  // Extract all supplements from legacy mappings
  const legacySupplements = Object.values(SUPPLEMENT_MAPPINGS);
  console.log(`📊 Found ${legacySupplements.length} supplements in legacy system\n`);
  
  // Transform to new schema
  const migratedSupplements: MigratedSupplement[] = [];
  
  for (const legacy of legacySupplements) {
    console.log(`Processing: ${legacy.normalizedName}`);
    
    const migrated = transformToNewSchema(legacy);
    
    // Generate embedding using supplement name + scientific name + common names
    const embeddingText = [
      migrated.name,
      migrated.scientific_name,
      ...migrated.common_names,
    ]
      .filter(Boolean)
      .join(' ');
    
    console.log(`  Generating embedding for: "${embeddingText}"`);
    
    try {
      const embedding = await generateEmbedding(embeddingText);
      if (embedding && embedding.length > 0) {
        migrated.embedding = embedding;
        console.log(`  ✅ Generated ${embedding.length}-dimensional embedding`);
      } else {
        console.log(`  ⚠️  No embedding generated (will be created on first search)`);
      }
    } catch (error) {
      console.log(`  ⚠️  Embedding generation failed (will be created on first search)`);
    }
    
    migratedSupplements.push(migrated);
    console.log('');
  }
  
  // Export to JSON
  const outputDir = path.join(__dirname, '../infrastructure/migrations');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'supplements-export.json');
  fs.writeFileSync(outputPath, JSON.stringify(migratedSupplements, null, 2));
  
  console.log(`\n✅ Migration complete!`);
  console.log(`📁 Exported ${migratedSupplements.length} supplements to: ${outputPath}`);
  
  // Generate statistics
  const stats = {
    total: migratedSupplements.length,
    withEmbeddings: migratedSupplements.filter(s => s.embedding && s.embedding.length > 0).length,
    withoutEmbeddings: migratedSupplements.filter(s => !s.embedding || s.embedding.length === 0).length,
    byCategory: {} as Record<string, number>,
    byPopularity: {} as Record<string, number>,
  };
  
  migratedSupplements.forEach(s => {
    stats.byCategory[s.metadata.category] = (stats.byCategory[s.metadata.category] || 0) + 1;
    stats.byPopularity[s.metadata.popularity] = (stats.byPopularity[s.metadata.popularity] || 0) + 1;
  });
  
  console.log('\n📊 Migration Statistics:');
  console.log(`   Total supplements: ${stats.total}`);
  console.log(`   With embeddings: ${stats.withEmbeddings}`);
  console.log(`   Without embeddings: ${stats.withoutEmbeddings}`);
  console.log('\n   By Category:');
  Object.entries(stats.byCategory).forEach(([cat, count]) => {
    console.log(`     ${cat}: ${count}`);
  });
  console.log('\n   By Popularity:');
  Object.entries(stats.byPopularity).forEach(([pop, count]) => {
    console.log(`     ${pop}: ${count}`);
  });
  
  // Export statistics
  const statsPath = path.join(outputDir, 'migration-stats.json');
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  console.log(`\n📊 Statistics saved to: ${statsPath}`);
  
  return migratedSupplements;
}

// Run migration if called directly
if (require.main === module) {
  migrateSupplement()
    .then(() => {
      console.log('\n✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

export { migrateSupplement, transformToNewSchema, generateEmbedding };
