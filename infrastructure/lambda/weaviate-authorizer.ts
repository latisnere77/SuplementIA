// Lambda Authorizer for API Gateway
// Validates Cognito JWT tokens using JWKS

import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

interface CognitoJWTPayload extends JWTPayload {
    email?: string;
    sub?: string;
    'cognito:username'?: string;
    token_use?: string;
}

const COGNITO_REGION = process.env.COGNITO_REGION || 'us-east-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_u4IwDoEbr';
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || '1l1o4bh4q3v1kkvjmupeek2dl8';
const COGNITO_ISSUER = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;
const JWKS_URI = `${COGNITO_ISSUER}/.well-known/jwks.json`;

// Create JWKS client (cached after first call)
const JWKS = createRemoteJWKSet(new URL(JWKS_URI));

export const handler = async (event: any) => {
    const headers = event.headers;
    const authHeader = headers?.authorization || headers?.Authorization;

    // Audit log helper
    const auditLog = (authorized: boolean, reason?: string, email?: string) => {
        console.log(JSON.stringify({
            type: 'authorization_attempt',
            routeArn: event.routeArn,
            timestamp: new Date().toISOString(),
            authorized,
            reason,
            email
        }));
    };

    // Check for Bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        auditLog(false, 'missing_or_invalid_auth_header');
        return { isAuthorized: false };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
        // Verify JWT signature and validate claims
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: COGNITO_ISSUER,
            audience: COGNITO_CLIENT_ID,
        });

        const cognitoPayload = payload as CognitoJWTPayload;

        // Validate token use (should be 'id' for ID tokens)
        if (cognitoPayload.token_use !== 'id') {
            auditLog(false, 'invalid_token_use', cognitoPayload.email);
            return { isAuthorized: false };
        }

        // Token is valid
        auditLog(true, 'jwt_verified', cognitoPayload.email);

        return {
            isAuthorized: true,
            context: {
                email: cognitoPayload.email || '',
                sub: cognitoPayload.sub || '',
                username: cognitoPayload['cognito:username'] || ''
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'unknown_error';
        auditLog(false, `jwt_verification_failed: ${errorMessage}`);
        return { isAuthorized: false };
    }
};
