/**
 * Content Enricher Lambda Handler
 *
 * Generates enriched supplement content using AWS Bedrock (Claude)
 * Integrates with Cache Service for performance
 */
import { Context } from 'aws-lambda';
/**
 * Lambda event type with headers and body
 */
interface LambdaEvent {
    httpMethod?: string;
    body?: string;
    headers?: Record<string, string>;
    requestContext?: {
        requestId?: string;
    };
}
interface LambdaEvent {
    httpMethod?: string;
    body?: string;
    queryStringParameters?: Record<string, string>;
}
interface LambdaResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}
/**
 * Main Lambda handler
 */
export declare function handler(event: LambdaEvent, context: Context): Promise<LambdaResponse>;
export {};
//# sourceMappingURL=index.d.ts.map