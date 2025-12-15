
import { config } from 'dotenv';
config({ path: '.env.local' });
import weaviate from 'weaviate-ts-client';

async function testAwsWeaviate(host: string) {
    console.log(`📡 Connecting to AWS Weaviate at: ${host}`);

    const client = weaviate.client({
        scheme: 'http', // Use https if LB is configured with cert, usually http for direct IP/ALB initially
        host: host,
    });

    try {
        // 1. Check Meta
        const meta = await client.misc.metaGetter().do();
        console.log('✅ Meta Check:', meta.version);

        // 2. Check Schema
        const schema = await client.schema.getter().do();
        console.log('✅ Schema Check:', schema.classes?.map(c => c.class).join(', '));

        // 3. Simple Search
        // Note: Data might be empty initially unless EFS persisted from previous (unlikely) or we run seed against IP
        console.log('ℹ️ Attempting search (might be empty)...');
        const res = await client.graphql
            .get()
            .withClassName('SupplementPaper')
            .withFields('title')
            .withLimit(1)
            .do();

        console.log('✅ Search Result:', JSON.stringify(res, null, 2));

    } catch (e: any) {
        console.error('❌ AWS Weaviate Test Failed:', e.message);
    }
}

// Allow passing host via CLI or env
const targetHost = process.argv[2] || process.env.WEAVIATE_AWS_HOST;
if (!targetHost) {
    console.error('Please provide host: npx tsx scripts/test-aws-weaviate.ts <HOST_OR_IP:PORT>');
} else {
    testAwsWeaviate(targetHost);
}
