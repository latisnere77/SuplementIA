/**
 * Simplified enrichment endpoint for supplement detail pages.
 * Uses IAM Lambda invocation because production Lambda URLs require AWS_IAM.
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { NextRequest, NextResponse } from 'next/server';
import { createJob } from '@/lib/portal/job-store';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const lambdaClient = new LambdaClient({
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    requestHandler: new NodeHttpHandler({
        connectionTimeout: 5000,
        requestTimeout: 25000,
    }),
});

function getContentEnricherFunctionName() {
    return process.env.ENRICHER_LAMBDA || 'production-content-enricher';
}

export async function POST(request: NextRequest) {
    try {
        const { supplementName, category, forceRefresh = false, jobId: requestedJobId } = await request.json();

        if (!supplementName) {
            return NextResponse.json(
                { success: false, error: 'supplementName is required' },
                { status: 400 }
            );
        }

        const jobId = requestedJobId || `supplement_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        await createJob(jobId);

        const command = new InvokeCommand({
            FunctionName: getContentEnricherFunctionName(),
            InvocationType: 'Event',
            Payload: Buffer.from(JSON.stringify({
                httpMethod: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    supplementId: supplementName,
                    category: category || 'general',
                    forceRefresh,
                    jobId,
                }),
            })),
        });

        const lambdaResponse = await lambdaClient.send(command);

        if ((lambdaResponse.StatusCode || 0) < 200 || (lambdaResponse.StatusCode || 0) >= 300) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Content enricher invocation failed',
                    details: {
                        statusCode: lambdaResponse.StatusCode,
                    },
                },
                { status: 502 }
            );
        }

        return NextResponse.json({
            success: true,
            status: 'processing',
            jobId,
            supplementName,
            pollUrl: `/api/portal/enrichment-status/${jobId}?supplement=${encodeURIComponent(supplementName)}`,
            pollInterval: 3000,
        }, { status: 202 });
    } catch (error: any) {
        console.error('Simple enrich error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
