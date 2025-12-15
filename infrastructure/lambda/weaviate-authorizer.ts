// Lambda Authorizer for API Gateway
// Validates Bearer token against ADMIN_API_KEY

interface AuthorizerEvent {
    type: string;
    methodArn: string;
    headers?: {
        authorization?: string;
    };
}

export const handler = async (event: any) => {
    // Handle both v2 payload (headers) and v1 (headers)
    const headers = event.headers;
    const authHeader = headers?.authorization || headers?.Authorization;
    const token = authHeader?.replace('Bearer ', '');
    const validToken = process.env.ADMIN_API_KEY || 'dev-key-change-me';

    const isAuthorized = token === validToken;

    // Audit log
    console.log(JSON.stringify({
        type: 'authorization_attempt',
        routeArn: event.routeArn,
        timestamp: new Date().toISOString(),
        authorized: isAuthorized
    }));

    return {
        isAuthorized: isAuthorized
    };
};
