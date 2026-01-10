/**
 * Test LanceDB connection and basic search
 */

const { connect } = require('@lancedb/lancedb');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const LANCEDB_PATH = '/tmp/lancedb-pristine';
const BEDROCK_REGION = 'us-east-1';
const EMBEDDING_MODEL = 'amazon.titan-embed-text-v2:0';

async function test() {
  console.log('[Test] Starting LanceDB connection test...');
  console.log(`[Test] Path: ${LANCEDB_PATH}`);

  try {
    // Test 1: Connect to LanceDB
    console.log('\n[Test 1] Connecting to LanceDB...');
    const db = await connect(LANCEDB_PATH);
    console.log('✅ Connected to LanceDB');

    // Test 2: Open supplements table
    console.log('\n[Test 2] Opening supplements table...');
    const table = await db.openTable('supplements');
    console.log('✅ Table opened');

    // Test 3: Count rows
    console.log('\n[Test 3] Counting rows...');
    const count = await table.countRows();
    console.log(`✅ Found ${count} supplements`);

    // Test 4: Generate embedding
    console.log('\n[Test 4] Generating embedding with Bedrock...');
    const bedrockClient = new BedrockRuntimeClient({ region: BEDROCK_REGION });

    const response = await bedrockClient.send(new InvokeModelCommand({
      modelId: EMBEDDING_MODEL,
      body: JSON.stringify({
        inputText: "magnesium for sleep",
        dimensions: 512,
        normalize: true
      })
    }));

    const bodyText = new TextDecoder().decode(response.body);
    const result = JSON.parse(bodyText);
    const embedding = result.embedding;

    console.log(`✅ Generated ${embedding.length}D embedding`);

    // Test 5: Vector search
    console.log('\n[Test 5] Performing vector search...');
    const results = await table
      .search(embedding)
      .limit(3)
      .toArray();

    console.log(`✅ Found ${results.length} results`);

    // Print results
    console.log('\n📊 Search Results:');
    results.forEach((r, i) => {
      const similarity = r._distance !== undefined ? (1 - r._distance) : 0;
      console.log(`\n${i + 1}. ${r.name}`);
      console.log(`   Grade: ${r.metadata?.evidence_grade || '?'}`);
      console.log(`   Studies: ${r.metadata?.study_count || 0}`);
      console.log(`   Similarity: ${similarity.toFixed(3)}`);
    });

    console.log('\n\n✅ ALL TESTS PASSED!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

test();
