
import weaviate from 'weaviate-ts-client';

const client = weaviate.client({
    scheme: process.env.WEAVIATE_SCHEME || 'http',
    host: process.env.WEAVIATE_HOST || 'localhost:8080',
});

async function testSearch() {
    console.log(`Connecting to ${process.env.WEAVIATE_HOST}...`);
    try {
        const res = await client.graphql
            .get()
            .withClassName('SupplementPaper')
            .withFields('title _additional { distance }')
            .withNearText({ concepts: ['copper anemia'] })
            .withLimit(3)
            .do();

        console.log(JSON.stringify(res, null, 2));

        if (res.data?.Get?.SupplementPaper?.length > 0) {
            console.log('✅ Found seeded Copper papers!');
        } else {
            console.error('❌ No results found. Seeding might have failed or vectorizer issue.');
            process.exit(1);
        }
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

testSearch();
