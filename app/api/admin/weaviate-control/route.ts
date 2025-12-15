import { NextRequest, NextResponse } from 'next/server';

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

    // Return helpful message about AWS credentials
    return NextResponse.json({
        error: 'AWS credentials not configured in Vercel',
        message: 'Use the local script: ./scripts/weaviate-control.sh',
        instructions: {
            status: './scripts/weaviate-control.sh status',
            start: './scripts/weaviate-control.sh start',
            stop: './scripts/weaviate-control.sh stop'
        }
    }, { status: 503 });
}
