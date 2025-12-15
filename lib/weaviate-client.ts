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

    // Priority 1: Cloud/Env Config
    if (host) {
        const clientConfig: any = {
            scheme: scheme,
            host: host,
        };

        if (apiKey) {
            clientConfig.apiKey = { apiKey: apiKey };
        }

        if (cohereKey) {
            clientConfig.headers = { 'X-Cohere-Api-Key': cohereKey };
        }

        clientInstance = weaviate.client(clientConfig);
        return clientInstance;
    }

    // FALLBACK: Local Weaviate OSS (Docker)
    console.log('⚠️ using LOCAL Weaviate (http://localhost:8080) for OSS search');
    clientInstance = weaviate.client({
        scheme: 'http',
        host: 'localhost:8080',
    });
    return clientInstance;
}
