import { NextRequest, NextResponse } from 'next/server';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const ADMIN_API_URL = process.env.WEAVIATE_ADMIN_API_URL || 'https://424nk9ljj7.execute-api.us-east-1.amazonaws.com/prod/admin';

// Cognito JWT Verifier
const verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USER_POOL_ID || 'us-east-1_u4IwDoEbr',
    tokenUse: 'id',
    clientId: process.env.COGNITO_CLIENT_ID || '1l1o4bh4q3v1kkvjmupeek2dl8',
});

// Verify Cognito JWT
async function verifyToken(request: NextRequest): Promise<{ valid: boolean; email?: string }> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return { valid: false };
    }

    const token = authHeader.substring(7);

    try {
        const payload = await verifier.verify(token);
        return { valid: true, email: payload.email as string };
    } catch (error) {
        console.error('JWT verification failed:', error);
        return { valid: false };
    }
}

export async function POST(request: NextRequest) {
    const authResult = await verifyToken(request);

    if (!authResult.valid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`Admin action by: ${authResult.email}`);

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

        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        console.error('Proxy error:', error);
        return NextResponse.json({
            error: 'Failed to communicate with admin API',
            details: error.message
        }, { status: 500 });
    }
}
