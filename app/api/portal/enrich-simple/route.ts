/**
 * Simplified enrichment endpoint for supplement detail pages.
 * Uses IAM Lambda invocation because production Lambda URLs require AWS_IAM.
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 240;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const lambdaClient = new LambdaClient({
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    requestHandler: new NodeHttpHandler({
        connectionTimeout: 5000,
        requestTimeout: 230000,
    }),
});

function getContentEnricherFunctionName() {
    return process.env.ENRICHER_LAMBDA || 'production-content-enricher';
}

function parseLambdaPayload(payload?: Uint8Array) {
    if (!payload) {
        throw new Error('Content enricher returned an empty response');
    }

    const rawPayload = Buffer.from(payload).toString('utf-8');
    const lambdaResult = JSON.parse(rawPayload);
    const responseBody = typeof lambdaResult.body === 'string'
        ? JSON.parse(lambdaResult.body)
        : lambdaResult.body || lambdaResult;

    return {
        statusCode: lambdaResult.statusCode || 200,
        body: responseBody,
    };
}

export async function POST(request: NextRequest) {
    try {
        const { supplementName, category, forceRefresh = false } = await request.json();

        if (!supplementName) {
            return NextResponse.json(
                { success: false, error: 'supplementName is required' },
                { status: 400 }
            );
        }

        const command = new InvokeCommand({
            FunctionName: getContentEnricherFunctionName(),
            InvocationType: 'RequestResponse',
            Payload: Buffer.from(JSON.stringify({
                httpMethod: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    supplementId: supplementName,
                    category: category || 'general',
                    forceRefresh,
                }),
            })),
        });

        const lambdaResponse = await lambdaClient.send(command);

        if (lambdaResponse.FunctionError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Content enricher execution failed',
                    details: lambdaResponse.FunctionError,
                },
                { status: 502 }
            );
        }

        const { statusCode, body } = parseLambdaPayload(lambdaResponse.Payload);

        if (statusCode < 200 || statusCode >= 300 || body?.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    error: body?.error || 'Content enricher failed',
                    details: body,
                },
                { status: statusCode >= 400 ? statusCode : 502 }
            );
        }

        return NextResponse.json({
            success: true,
            ...body,
            metadata: {
                ...body?.metadata,
                functionName: getContentEnricherFunctionName(),
                invocationType: 'RequestResponse',
            },
        });
    } catch (error: any) {
        console.error('Simple enrich error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
