import weaviate, { WeaviateClient } from 'weaviate-ts-client';
import dotenv from 'dotenv';

dotenv.config();

// Default client instance (lazy loaded or initialized)
let clientInstance: WeaviateClient | null = null;

export const getClient = (): WeaviateClient => {
    if (clientInstance) return clientInstance;

    const scheme = process.env.WEAVIATE_SCHEME || 'https';
    const host = process.env.WEAVIATE_HOST || '';
    const apiKey = process.env.WEAVIATE_API_KEY || '';
    const cohereKey = process.env.COHERE_API_KEY || '';

    // Only enforce keys if we are NOT in a test environment
    if ((!host || !apiKey || !cohereKey)) {
        if (process.env.NODE_ENV === 'test') {
            console.log("⚠️ Test mode detected with missing keys. Using dummy client.");
            // Return a safe dummy object that satisfies the interface enough to load
            // The actual test suite will override this using setClient()
            clientInstance = {
                batch: { objectsBatcher: () => ({ withObject: () => ({}), do: () => Promise.resolve([]) }) },
                graphql: { get: () => ({ withClassName: () => ({ withFields: () => ({ withHybrid: () => ({ withLimit: () => ({ do: () => Promise.resolve({}) }) }) }) }) }) },
                schema: { classCreator: () => ({ withClass: () => ({ do: () => Promise.resolve({}) }) }), classDeleter: () => ({ withClassName: () => ({ do: () => Promise.resolve({}) }) }) }
            } as any;
            return clientInstance!;
        } else {
            console.error('❌ Missing environment variables. Please check .env');
            process.exit(1);
        }
    }

    clientInstance = weaviate.client({
        scheme: scheme,
        host: host,
        apiKey: { apiKey: apiKey },
        headers: { 'X-Cohere-Api-Key': cohereKey },
    });

    console.log(`✅ Weaviate Client initialized connecting to ${host}`);
    return clientInstance!;
};

// Allow injecting a mock client for testing
export const setClient = (mockClient: any) => {
    clientInstance = mockClient;
};

// Export a Proxy that always delegates to the current clientInstance
// This ensures that if we call setClient(), all consumers get the new mock
export const client = new Proxy({}, {
    get: (_target, prop) => {
        const instance = getClient();
        // delegating to the instance
        return (instance as any)[prop];
    }
}) as WeaviateClient;
