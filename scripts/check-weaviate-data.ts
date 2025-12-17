import { getWeaviateClient, WEAVIATE_CLASS_NAME } from '../lib/weaviate-client';

async function checkData() {
    const client = getWeaviateClient();
    if (!client) {
        console.error('❌ Weaviate client not configured (missing env vars)');
        process.exit(1);
    }

    try {
        // 1. Check if class exists
        const schema = await client.schema.getter().do();
        const classExists = schema.classes?.some(c => c.class === WEAVIATE_CLASS_NAME);

        if (!classExists) {
            console.log(`❌ Class '${WEAVIATE_CLASS_NAME}' does NOT exist.`);
            return;
        }
        console.log(`✅ Class '${WEAVIATE_CLASS_NAME}' exists.`);

        // 2. Count objects
        const countRes = await client.graphql
            .aggregate()
            .withClassName(WEAVIATE_CLASS_NAME)
            .withFields('meta { count }')
            .do();

        const count = countRes.data.Aggregate[WEAVIATE_CLASS_NAME][0].meta.count;
        console.log(`📊 Total objects: ${count}`);

        // 3. Search for Q10 explicitly to see if it's there
        const q10Res = await client.graphql
            .get()
            .withClassName(WEAVIATE_CLASS_NAME)
            .withFields('title')
            .withNearText({ concepts: ['Q10', 'Coenzyme Q10'] })
            .withLimit(3)
            .do();

        const q10Hits = q10Res.data.Get[WEAVIATE_CLASS_NAME];
        console.log('🔍 Q10 Search Results:', JSON.stringify(q10Hits, null, 2));

    } catch (e) {
        console.error('❌ Error checking Weaviate:', e);
    }
}

checkData();
