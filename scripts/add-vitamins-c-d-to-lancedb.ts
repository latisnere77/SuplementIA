/**
 * Add Vitamin C and Vitamin D to LanceDB
 *
 * This script adds the missing "Vitamin C" and "Vitamin D" supplements to LanceDB
 * with proper embeddings and metadata to fix the "vitamina c" and "vitamina d" search issues.
 *
 * Usage:
 *   npx tsx scripts/add-vitamins-c-d-to-lancedb.ts
 */

import { connect } from '@lancedb/lancedb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const LANCEDB_PATH = process.env.LANCEDB_PATH || '/tmp/lancedb-pristine';
const BEDROCK_REGION = process.env.AWS_REGION || 'us-east-1';
const EMBEDDING_MODEL = 'amazon.titan-embed-text-v2:0';
const EMBEDDING_DIMENSIONS = 512;

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({ region: BEDROCK_REGION });

interface SupplementRecord {
  name: string;
  scientific_name: string;
  common_names: string[];
  metadata: {
    evidence_grade: 'A' | 'B' | 'C';
    category: string;
    study_count?: number;
  };
  vector: number[];
  [key: string]: unknown; // Index signature for LanceDB compatibility
}

/**
 * Generate embedding using Bedrock Titan V2
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await bedrockClient.send(new InvokeModelCommand({
      modelId: EMBEDDING_MODEL,
      body: JSON.stringify({
        inputText: text,
        dimensions: EMBEDDING_DIMENSIONS,
        normalize: true
      })
    }));

    const bodyText = new TextDecoder().decode(response.body);
    const result = JSON.parse(bodyText);
    return result.embedding;
  } catch (error) {
    console.error('❌ Bedrock embedding error:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function addVitaminsCAndD() {
  console.log('🚀 Starting LanceDB update for Vitamin C and Vitamin D\n');

  try {
    // 1. Connect to LanceDB
    console.log('📂 Connecting to LanceDB...');
    console.log(`   Path: ${LANCEDB_PATH}\n`);
    const db = await connect(LANCEDB_PATH);
    const table = await db.openTable('supplements');

    const totalCount = await table.countRows();
    console.log(`✅ Connected to LanceDB (${totalCount} supplements)\n`);

    const vitaminsToAdd: SupplementRecord[] = [];

    // 2. Check and prepare Vitamin C
    console.log('🔍 Checking if Vitamin C already exists...');
    const vitaminCResults = await table
      .search(await generateEmbedding('Vitamin C'))
      .limit(3)
      .toArray();

    const vitaminCExists = vitaminCResults.find((r: any) =>
      r.name.toLowerCase() === 'vitamin c'
    );

    if (vitaminCExists) {
      console.log('⚠️  Vitamin C already exists in LanceDB:');
      console.log(`   Name: ${vitaminCExists.name}`);
      const commonNames = Array.isArray(vitaminCExists.common_names)
        ? vitaminCExists.common_names.join(', ')
        : 'none';
      console.log(`   Common names: ${commonNames}\n`);
    } else {
      console.log('✅ Vitamin C not found (will be added)\n');

      // Generate embedding for Vitamin C
      console.log('🧮 Generating embedding for "Vitamin C"...');
      const vitaminCEmbedding = await generateEmbedding('Vitamin C');
      console.log(`✅ Embedding generated (${vitaminCEmbedding.length} dimensions)\n`);

      const vitaminC: SupplementRecord = {
        name: 'Vitamin C',
        scientific_name: 'Ascorbic Acid',
        common_names: [
          'vitamin c',
          'vitamina c',
          'vit c',
          'ascorbic acid',
          'ácido ascórbico',
          'acido ascorbico',
          'ascorbato',
          'ascorbate',
        ],
        metadata: {
          evidence_grade: 'A',
          category: 'vitamin',
          study_count: 8000,
        },
        vector: vitaminCEmbedding,
      };

      vitaminsToAdd.push(vitaminC);
      console.log('📋 Vitamin C record created');
    }

    // 3. Check and prepare Vitamin D
    console.log('🔍 Checking if Vitamin D already exists...');
    const vitaminDResults = await table
      .search(await generateEmbedding('Vitamin D'))
      .limit(3)
      .toArray();

    const vitaminDExists = vitaminDResults.find((r: any) =>
      r.name.toLowerCase() === 'vitamin d'
    );

    if (vitaminDExists) {
      console.log('⚠️  Vitamin D already exists in LanceDB:');
      console.log(`   Name: ${vitaminDExists.name}`);
      const commonNames = Array.isArray(vitaminDExists.common_names)
        ? vitaminDExists.common_names.join(', ')
        : 'none';
      console.log(`   Common names: ${commonNames}\n`);
    } else {
      console.log('✅ Vitamin D not found (will be added)\n');

      // Generate embedding for Vitamin D
      console.log('🧮 Generating embedding for "Vitamin D"...');
      const vitaminDEmbedding = await generateEmbedding('Vitamin D');
      console.log(`✅ Embedding generated (${vitaminDEmbedding.length} dimensions)\n`);

      const vitaminD: SupplementRecord = {
        name: 'Vitamin D',
        scientific_name: 'Cholecalciferol',
        common_names: [
          'vitamin d',
          'vitamina d',
          'vit d',
          'vitamin d3',
          'd3',
          'cholecalciferol',
          'colecalciferol',
          'sunshine vitamin',
          'vitamina del sol',
        ],
        metadata: {
          evidence_grade: 'A',
          category: 'vitamin',
          study_count: 10000,
        },
        vector: vitaminDEmbedding,
      };

      vitaminsToAdd.push(vitaminD);
      console.log('📋 Vitamin D record created');
    }

    // 4. Insert into LanceDB
    if (vitaminsToAdd.length > 0) {
      console.log(`\n💾 Inserting ${vitaminsToAdd.length} vitamin(s) into LanceDB...`);
      await table.add(vitaminsToAdd);

      const newCount = await table.countRows();
      console.log(`✅ Successfully added to LanceDB (${totalCount} → ${newCount} supplements)\n`);

      // 5. Verify insertions
      for (const vitamin of vitaminsToAdd) {
        console.log(`🔍 Verifying ${vitamin.name}...`);
        const verifyResults = await table
          .search(vitamin.vector)
          .limit(1)
          .toArray();

        if (verifyResults.length > 0 && verifyResults[0].name === vitamin.name) {
          console.log(`✅ Verification successful for ${vitamin.name}`);
          console.log(`   Found: ${verifyResults[0].name}`);
          console.log(`   Similarity: ${verifyResults[0]._distance !== undefined ? (1 - verifyResults[0]._distance).toFixed(3) : 'N/A'}\n`);
        } else {
          console.log(`⚠️  Verification warning: Could not find ${vitamin.name}\n`);
        }
      }
    } else {
      console.log('\n✋ No vitamins to add (all already present)\n');
    }

    // 6. Test searches
    await testSearch();

    console.log('🎉 Done! Vitamins successfully processed in LanceDB\n');
    console.log('📌 Next steps:');
    console.log('   1. Record the human GO, target LanceDB path, smoke, rollback, and audit artifact.');
    console.log('   2. Commit any code/doc changes on a feature branch and open a PR against main.');
    console.log('   3. Do not push main, deploy, or test production without a separate human GO.');
    console.log('   4. Treat Bedrock, LanceDB mutation, Amplify, and production smoke as gated actions.\n');

  } catch (error) {
    console.error('❌ Error adding vitamins to LanceDB:', error);
    throw error;
  }
}

/**
 * Test search functionality with various queries
 */
async function testSearch() {
  console.log('🧪 Testing search queries:\n');

  const testQueries = [
    'vitamina c',
    'vitamin c',
    'vit c',
    'vitamina d',
    'vitamin d',
    'vit d',
  ];

  try {
    const db = await connect(LANCEDB_PATH);
    const table = await db.openTable('supplements');

    for (const query of testQueries) {
      const embedding = await generateEmbedding(query);
      const results = await table
        .search(embedding)
        .limit(3)
        .toArray();

      console.log(`Query: "${query}"`);
      console.log(`  Top result: ${results[0]?.name || 'none'}`);

      if (results[0]) {
        const distance = results[0]._distance;
        const similarity = distance !== undefined ? (1 - distance).toFixed(3) : 'N/A';
        console.log(`  Similarity: ${similarity}`);
      }

      console.log('');
    }
  } catch (error) {
    console.log('⚠️  Could not run test searches:', error);
  }
}

// Run the script
if (require.main === module) {
  addVitaminsCAndD()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { addVitaminsCAndD };
