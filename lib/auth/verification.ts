import { NextRequest } from 'next/server';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Cognito JWT Verifier
const verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USER_POOL_ID || 'us-east-1_u4IwDoEbr',
    tokenUse: 'id',
    clientId: process.env.COGNITO_CLIENT_ID || '1l1o4bh4q3v1kkvjmupeek2dl8',
});

// Verify Cognito JWT
export async function verifyToken(request: NextRequest): Promise<{ valid: boolean; email?: string }> {
    const authHeader = request.headers.get('authorization');

    console.log('[verifyToken] Auth header present:', !!authHeader);

    if (!authHeader?.startsWith('Bearer ')) {
        console.log('[verifyToken] Invalid auth header format');
        return { valid: false };
    }

    const token = authHeader.substring(7);
    console.log('[verifyToken] Token length:', token.length);
    console.log('[verifyToken] Token preview:', token.substring(0, 20) + '...');

    try {
        const payload = await verifier.verify(token);
        console.log('[verifyToken] Verification successful, email:', payload.email);
        return { valid: true, email: payload.email as string };
    } catch (error) {
        console.error('[verifyToken] JWT verification failed:', error);
        if (error instanceof Error) {
            console.error('[verifyToken] Error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack?.split('\n').slice(0, 3)
            });
        }
        return { valid: false };
    }
}
