import weaviate, { WeaviateClient } from 'weaviate-ts-client';

// Singleton instance
let clientInstance: WeaviateClient | null = null;

export const WEAVIATE_CLASS_NAME = 'SupplementPaper';

export function getWeaviateClient(): WeaviateClient | null {
    if (clientInstance) return clientInstance;

    const scheme = process.env.WEAVIATE_SCHEME || 'https';
    const host = process.env.WEAVIATE_HOST || '';
    const apiKey = process.env.WEAVIATE_API_KEY || '';
    const cohereKey = process.env.COHERE_API_KEY || '';

    // Only initialize if we have the critical keys
    if (host && apiKey && cohereKey) {
        clientInstance = weaviate.client({
            scheme: scheme,
            host: host,
            apiKey: { apiKey: apiKey },
            headers: { 'X-Cohere-Api-Key': cohereKey },
        });
        return clientInstance;
    }

    return null;
}
