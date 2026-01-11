/**
 * Add Vitamin B Complex to LanceDB
 *
 * This script adds the missing "Vitamin B Complex" supplement to LanceDB
 * with proper embeddings and metadata to fix the "vitamina b" search issue.
 *
 * Usage:
 *   npx ts-node scripts/add-vitamin-b-complex-to-lancedb.ts
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

async function addVitaminBComplex() {
  console.log('🚀 Starting LanceDB update for Vitamin B Complex\n');

  try {
    // 1. Connect to LanceDB
    console.log('📂 Connecting to LanceDB...');
    console.log(`   Path: ${LANCEDB_PATH}\n`);
    const db = await connect(LANCEDB_PATH);
    const table = await db.openTable('supplements');

    const totalCount = await table.countRows();
    console.log(`✅ Connected to LanceDB (${totalCount} supplements)\n`);

    // 2. Check if "Vitamin B Complex" already exists
    console.log('🔍 Checking if Vitamin B Complex already exists...');
    const existingRecords = await table
      .search(await generateEmbedding('Vitamin B Complex'))
      .limit(3)
      .toArray();

    const exactMatch = existingRecords.find((r: any) =>
      r.name.toLowerCase() === 'vitamin b complex'
    );

    if (exactMatch) {
      console.log('⚠️  Vitamin B Complex already exists in LanceDB:');
      console.log(`   Name: ${exactMatch.name}`);
      console.log(`   Common names: ${exactMatch.common_names?.join(', ') || 'none'}`);
      console.log('\n✋ Skipping insertion (already present)\n');

      // Test search
      await testSearch();
      return;
    }

    console.log('✅ Vitamin B Complex not found (will be added)\n');

    // 3. Generate embedding for "Vitamin B Complex"
    console.log('🧮 Generating embedding for "Vitamin B Complex"...');
    const embedding = await generateEmbedding('Vitamin B Complex');
    console.log(`✅ Embedding generated (${embedding.length} dimensions)\n`);

    // 4. Create supplement record
    const vitaminBComplex: SupplementRecord = {
      name: 'Vitamin B Complex',
      scientific_name: 'B Vitamin Complex',
      common_names: [
        'vitamin b',
        'vitamina b',
        'vit b',
        'b complex',
        'complejo b',
        'b vitamins',
        'vitaminas b',
        'complejo vitamina b',
        'vitamin b complex',
        'b-complex',
      ],
      metadata: {
        evidence_grade: 'A',
        category: 'vitamin',
        study_count: 5000, // Estimated based on B vitamin research
      },
      vector: embedding,
    };

    console.log('📋 Supplement record created:');
    console.log(`   Name: ${vitaminBComplex.name}`);
    console.log(`   Scientific name: ${vitaminBComplex.scientific_name}`);
    console.log(`   Common names (${vitaminBComplex.common_names.length}): ${vitaminBComplex.common_names.slice(0, 5).join(', ')}...`);
    console.log(`   Evidence grade: ${vitaminBComplex.metadata.evidence_grade}`);
    console.log(`   Category: ${vitaminBComplex.metadata.category}\n`);

    // 5. Insert into LanceDB
    console.log('💾 Inserting into LanceDB...');
    await table.add([vitaminBComplex]);

    const newCount = await table.countRows();
    console.log(`✅ Successfully added to LanceDB (${totalCount} → ${newCount} supplements)\n`);

    // 6. Verify insertion
    console.log('🔍 Verifying insertion...');
    const verifyResults = await table
      .search(embedding)
      .limit(1)
      .toArray();

    if (verifyResults.length > 0 && verifyResults[0].name === 'Vitamin B Complex') {
      console.log('✅ Verification successful!');
      console.log(`   Found: ${verifyResults[0].name}`);
      console.log(`   Similarity: ${verifyResults[0]._distance || 'N/A'}\n`);
    } else {
      console.log('⚠️  Verification warning: Could not find inserted record\n');
    }

    // 7. Test searches
    await testSearch();

    console.log('🎉 Done! Vitamin B Complex successfully added to LanceDB\n');
    console.log('📌 Next steps:');
    console.log('   1. Commit changes: git add . && git commit -m "fix: add Vitamin B Complex to LanceDB"');
    console.log('   2. Push to deploy: git push origin main');
    console.log('   3. Wait for Amplify deployment (~5 min)');
    console.log('   4. Test on production site: https://suplementai.com/portal\n');

  } catch (error) {
    console.error('❌ Error adding Vitamin B Complex to LanceDB:', error);
    throw error;
  }
}

/**
 * Test search functionality with various queries
 */
async function testSearch() {
  console.log('🧪 Testing search queries:\n');

  const testQueries = [
    'vitamina b',
    'vitamin b',
    'complejo b',
    'b complex',
    'vitamin b complex',
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
  addVitaminBComplex()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { addVitaminBComplex };
