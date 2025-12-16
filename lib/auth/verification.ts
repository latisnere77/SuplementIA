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
