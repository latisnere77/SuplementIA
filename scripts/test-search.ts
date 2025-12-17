
import { getWeaviateClient, WEAVIATE_CLASS_NAME } from '../lib/weaviate-client';
import dotenv from 'dotenv';
dotenv.config();

async function testSearch() {
    const client = getWeaviateClient();
    if (!client) {
        console.error('❌ Client failed to initialize');
        return;
    }

    const searchTerm = "Baya Goji";
    console.log(`🔍 Searching for: ${searchTerm} with alpha 0.25...`);

    try {
        const result = await client.graphql
            .get()
            .withClassName(WEAVIATE_CLASS_NAME)
            .withFields('title abstract ingredients conditions year _additional { score }')
            .withHybrid({ query: searchTerm, alpha: 0.25 })
            .withLimit(5)
            .do();

        // console.log(JSON.stringify(result, null, 2));

        const hits = result.data?.Get?.[WEAVIATE_CLASS_NAME];
        if (hits && hits.length > 0) {
            console.log(`✅ Hits Found: ${hits.length}`);
            hits.forEach((h: any) => {
                console.log(` - [${h._additional.score}] ${h.title}`);
            });
        } else {
            console.error('❌ No hits found via Client.');
            console.log('Raw Result:', JSON.stringify(result, null, 2));
        }

    } catch (e: any) {
        console.error('❌ Error executing search:', e);
    }
}

testSearch();
