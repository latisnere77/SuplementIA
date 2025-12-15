// Lambda Authorizer for API Gateway
// Validates Bearer token against ADMIN_API_KEY

interface AuthorizerEvent {
    type: string;
    methodArn: string;
    headers?: {
        authorization?: string;
    };
}

export const handler = async (event: AuthorizerEvent) => {
    const token = event.headers?.authorization?.replace('Bearer ', '');
    const validToken = process.env.ADMIN_API_KEY || 'dev-key-change-me';

    // Audit log
    console.log(JSON.stringify({
        type: 'authorization_attempt',
        methodArn: event.methodArn,
        timestamp: new Date().toISOString(),
        authorized: token === validToken
    }));

    if (token === validToken) {
        return generatePolicy('user', 'Allow', event.methodArn);
    }

    return generatePolicy('user', 'Deny', event.methodArn);
};

function generatePolicy(principalId: string, effect: string, resource: string) {
    return {
        principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: resource
                }
            ]
        }
    };
}
