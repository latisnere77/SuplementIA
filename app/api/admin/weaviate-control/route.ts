import { NextRequest, NextResponse } from 'next/server';

const ADMIN_API_URL = process.env.WEAVIATE_ADMIN_API_URL || 'https://424nk9ljj7.execute-api.us-east-1.amazonaws.com/prod/admin';

// Simple auth check
function isAuthorized(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization');
    const adminKey = process.env.ADMIN_API_KEY || 'dev-key-change-me';
    return authHeader === `Bearer ${adminKey}`;
}

export async function POST(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { action } = await request.json();

        // Proxy request to AWS Lambda via API Gateway
        // We use the same ADMIN_API_KEY for both Vercel auth and AWS Authorizer
        const adminKey = process.env.ADMIN_API_KEY || 'dev-key-change-me';

        const response = await fetch(ADMIN_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminKey}`
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
