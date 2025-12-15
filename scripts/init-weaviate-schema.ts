
import { getWeaviateClient, WEAVIATE_CLASS_NAME } from '../lib/weaviate-client';

async function initSchema() {
    const client = getWeaviateClient();
    if (!client) {
        console.error('❌ Client not ready');
        return;
    }

    // Check if class exists
    try {
        const exists = await client.schema.classCreator().withClass({
            class: WEAVIATE_CLASS_NAME,
            description: 'Scientific papers about supplements',
            vectorizer: 'text2vec-transformers', // CRITICAL for local OSS
            moduleConfig: {
                'text2vec-transformers': {
                    vectorizeClassName: false,
                },
            },
            properties: [
                { name: 'title', dataType: ['text'] },
                { name: 'abstract', dataType: ['text'] },
                { name: 'ingredients', dataType: ['text'] },
                { name: 'conditions', dataType: ['text'] },
                { name: 'year', dataType: ['int'] },
                { name: 'url', dataType: ['text'] },
                { name: 'type', dataType: ['text'] },
                { name: 'supplementName', dataType: ['text'] },
            ]
        })
            .do();
        console.log('✅ Schema created successfully!');
    } catch (e: any) {
        // If it exists (error 422 usually), we might want to delete and recreate OR just succeed
        if (e.message?.includes('already exists')) {
            console.log('ℹ️ Class already exists. Skipping creation.');
        } else {
            console.error('❌ Schema creation failed:', e);
            // Suggest deleting if it's a mismatch
            console.log('💡 Tip: If vectorizer mismatches, run a cleanup script to delete the class first.');
        }
    }
}

initSchema();
