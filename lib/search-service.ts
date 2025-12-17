
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambda = new LambdaClient({
    region: process.env.AWS_REGION || "us-east-1",
    // Credentials are automatically loaded from env vars in Vercel or ~/.aws/credentials locally
});

const FUNCTION_NAME = "production-search-api-lancedb";

export interface SearchResult {
    title?: string;
    name?: string; // LanceDB might use 'name'
    abstract?: string;
    description?: string; // Mapped from metadata
    mechanisms?: string;
    ingredients?: string[]; // or string
    conditions?: string[];
    year?: number;
    score?: number;
    study_count?: number;
    evidence_grade?: string;
}

export async function searchSupplements(query: string, limit: number = 5): Promise<SearchResult[]> {
    try {
        const payload = {
            queryStringParameters: {
                q: query,
                limit: limit.toString()
            }
        };

        console.log(`[SearchService] Invoking Lambda ${FUNCTION_NAME} with query: "${query}"`);

        const command = new InvokeCommand({
            FunctionName: FUNCTION_NAME,
            Payload: Buffer.from(JSON.stringify(payload)),
        });

        const response = await lambda.send(command);

        if (response.FunctionError) {
            throw new Error(`Lambda execution error: ${response.FunctionError}`);
        }

        const responsePayload = JSON.parse(Buffer.from(response.Payload!).toString());

        // Lambda returns APIGatewayProxyResponse format: { statusCode: 200, body: "..." }
        if (responsePayload.statusCode !== 200) {
            throw new Error(`Lambda returned status ${responsePayload.statusCode}: ${responsePayload.body}`);
        }

        const body = typeof responsePayload.body === 'string'
            ? JSON.parse(responsePayload.body)
            : responsePayload.body;

        // The LanceDB lambda might return { matches: [...] } or just [...] or { study_count: ..., ... }
        // Based on 'test-local.py' output in thought trace, it likely returns { matches: [...] }
        const hits = body.matches || body.results || body;

        if (!Array.isArray(hits)) {
            console.warn("[SearchService] Unexpected response format:", body);
            return [];
        }

        // Map to unified format
        return hits.map((hit: any) => ({
            title: hit.name || hit.title,
            abstract: hit.metadata?.description || hit.abstract || "",
            ingredients: hit.common_names || hit.ingredients || [],
            score: hit.score || hit._distance ? (1 - (hit._distance || 0)) : 0, // conversion if needed
            study_count: hit.metadata?.study_count || 0,
            evidence_grade: hit.metadata?.evidence_grade || 'C'
        }));

    } catch (error) {
        console.error("[SearchService] Error invoking search lambda:", error);
        // Fallback? Or just rethrow?
        // For now return empty to avoid crashing UI
        return [];
    }
}
