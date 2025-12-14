import { client } from './client';

export const CLASS_NAME = 'SupplementPaper';

export async function createSchema() {
    // Delete existing class if it exists (for PoC cleanup)
    try {
        await client.schema.classDeleter().withClassName(CLASS_NAME).do();
        console.log(`🗑️  Deleted existing class: ${CLASS_NAME}`);
    } catch (e) {
        // Ignore error if class doesn't exist
    }

    const schemaConfig = {
        class: CLASS_NAME,
        description: 'A scientific paper about supplements',
        vectorizer: 'text2vec-cohere', // Use Cohere for embeddings
        moduleConfig: {
            'text2vec-cohere': {
                model: 'embed-multilingual-v3.0', // SOTA multilingual model
                truncate: 'RIGHT',
            },
            'generative-cohere': {
                model: 'command-r', // For RAG generation
            }
        },
        properties: [
            {
                name: 'title',
                dataType: ['text'],
                description: 'Title of the paper',
                moduleConfig: {
                    'text2vec-cohere': { skip: false, vectorizePropertyName: false },
                },
            },
            {
                name: 'abstract',
                dataType: ['text'],
                description: 'Abstract of the paper',
                moduleConfig: {
                    'text2vec-cohere': { skip: false, vectorizePropertyName: false },
                },
            },
            {
                name: 'ingredients', // Derived from NER (e.g., ["Panax Ginseng"])
                dataType: ['text[]'],
                description: 'Normalized ingredients mentioned',
                tokenization: 'whitespace', // Precise matching for ingredients
            },
            {
                name: 'conditions', // Derived from NER (e.g., ["Fatigue"])
                dataType: ['text[]'],
                description: 'Conditions mentioned',
            },
            {
                name: 'year',
                dataType: ['int'],
            },
        ],
    };

    await client.schema.classCreator().withClass(schemaConfig).do();
    console.log(`✨ Created schema for class: ${CLASS_NAME}`);
}
