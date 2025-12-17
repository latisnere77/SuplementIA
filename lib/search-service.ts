
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

// Use OIDC if role role arn is provided (Vercel Production), otherwise default to standard chain (Local Dev)
const credentials = process.env.AWS_ROLE_ARN
    ? awsCredentialsProvider({ roleArn: process.env.AWS_ROLE_ARN })
    : undefined;

const lambda = new LambdaClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials
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
    // try/catch removed to allow error propagation to route.ts
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

    // The LanceDB lambda might return { matches: [...] } or { supplement: {...} }
    let hits: any[] = [];

    if (body.supplement) {
        hits = [body.supplement];
    } else if (Array.isArray(body.matches)) {
        hits = body.matches;
    } else if (Array.isArray(body.results)) {
        hits = body.results;
    } else if (Array.isArray(body)) {
        hits = body;
    }

    if (!Array.isArray(hits) || hits.length === 0) {
        console.warn("[SearchService] Unexpected or empty response format:", body);
        // DEBUG: Return raw body to UI to diagnose Vercel Environment issue
        return [{
            title: "DEBUG_MODE_ACTIVE",
            abstract: `RAW BODY: ${JSON.stringify(body).slice(0, 500)}`,
            ingredients: ["Debug"],
            score: 1,
            study_count: 999,
            evidence_grade: "A"
        }];
    }

    // Map to unified format
    return hits.map((hit: any) => ({
        title: hit.name || hit.title,
        abstract: hit.metadata?.description || `Supplement found with ${hit.metadata?.study_count || 0} studies.`,
        ingredients: hit.commonNames || hit.common_names || hit.ingredients || [],
        score: hit.similarity ?? (hit.score || (hit._distance ? (1 - hit._distance) : 0)),
        study_count: hit.metadata?.study_count || 0,
        evidence_grade: hit.metadata?.evidence_grade || 'C'
    }));
}
