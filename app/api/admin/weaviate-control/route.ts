import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/verification';

const ADMIN_API_URL = process.env.WEAVIATE_ADMIN_API_URL || 'https://424nk9ljj7.execute-api.us-east-1.amazonaws.com/prod/admin';

export async function POST(request: NextRequest) {
    console.log('[weaviate-control] Received request');

    try {
        const authResult = await verifyToken(request);
        console.log('[weaviate-control] Auth result:', authResult);

        if (!authResult.valid) {
            console.log('[weaviate-control] Unauthorized request');
            return NextResponse.json({ error: 'Unauthorized', details: 'Invalid or missing token' }, { status: 401 });
        }

        console.log(`[weaviate-control] Admin action by: ${authResult.email}`);

        try {
            const { action } = await request.json();

            // For local development or when AWS is not configured, return mock data
            if (process.env.NODE_ENV === 'development' && !process.env.WEAVIATE_ADMIN_API_URL) {
                return NextResponse.json({
                    success: true,
                    status: {
                        desired: 1,
                        running: 1,
                        pending: 0,
                        publicIp: '127.0.0.1',
                        url: 'http://localhost:8080'
                    },
                    message: `Action '${action}' executed (dev mode)`
                });
            }

            // Proxy request to AWS Lambda via API Gateway
            // Use the Cognito ID token for AWS authorization
            const authHeader = request.headers.get('authorization');

            const response = await fetch(ADMIN_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader || ''
                },
                body: JSON.stringify({ action })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error(`AWS API Gateway Error (${response.status}):`, JSON.stringify(data));
            }

            return NextResponse.json(data, { status: response.status });
        } catch (error: any) {
            console.error('Proxy error:', error);
            return NextResponse.json({
                error: 'Failed to communicate with admin API',
                details: error.message
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error('[weaviate-control] Unexpected error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}
