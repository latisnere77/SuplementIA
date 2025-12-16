import { NextAuthOptions } from 'next-auth';
import CognitoProvider from 'next-auth/providers/cognito';

const COGNITO_REGION = process.env.COGNITO_REGION || 'us-east-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_u4IwDoEbr';
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || '1l1o4bh4q3v1kkvjmupeek2dl8';
const COGNITO_CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET || '';
const COGNITO_ISSUER = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;

/**
 * Refresh the access token using Cognito refresh token
 */
async function refreshAccessToken(token: any) {
    try {
        const url = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
            },
            body: JSON.stringify({
                AuthFlow: 'REFRESH_TOKEN_AUTH',
                ClientId: COGNITO_CLIENT_ID,
                AuthParameters: {
                    REFRESH_TOKEN: token.refreshToken,
                    SECRET_HASH: COGNITO_CLIENT_SECRET,
                },
            }),
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            throw refreshedTokens;
        }

        return {
            ...token,
            accessToken: refreshedTokens.AuthenticationResult.AccessToken,
            idToken: refreshedTokens.AuthenticationResult.IdToken,
            accessTokenExpires: Date.now() + 60 * 60 * 1000, // 1 hour
        };
    } catch (error) {
        console.error('Error refreshing access token:', error);
        return {
            ...token,
            error: 'RefreshAccessTokenError',
        };
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        CognitoProvider({
            clientId: COGNITO_CLIENT_ID,
            clientSecret: COGNITO_CLIENT_SECRET,
            issuer: COGNITO_ISSUER,
        }),
    ],
    callbacks: {
        async jwt({ token, account, user }) {
            // Initial sign in
            if (account && user) {
                return {
                    accessToken: account.access_token,
                    idToken: account.id_token,
                    refreshToken: account.refresh_token,
                    accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 60 * 60 * 1000,
                    user,
                };
            }

            // Return previous token if the access token has not expired yet
            if (Date.now() < (token.accessTokenExpires as number)) {
                return token;
            }

            // Access token has expired, try to update it
            console.log('[NextAuth] Access token expired, refreshing...');
            return refreshAccessToken(token);
        },
        async session({ session, token }) {
            if (token.error) {
                // Force re-login if refresh failed
                throw new Error('RefreshAccessTokenError');
            }

            session.accessToken = token.accessToken as string;
            session.idToken = token.idToken as string;
            session.user = token.user as any;

            return session;
        },
    },
    pages: {
        signIn: '/spot/login',
        error: '/spot/error',
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
};
