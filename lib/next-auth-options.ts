import { NextAuthOptions } from 'next-auth';
import CognitoProvider from 'next-auth/providers/cognito';
import { JWT } from 'next-auth/jwt';

const COGNITO_REGION = process.env.COGNITO_REGION || 'us-east-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_u4IwDoEbr';
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || '1l1o4bh4q3v1kkvjmupeek2dl8';
const COGNITO_CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET || '';
const COGNITO_ISSUER = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;

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
                console.log('[NextAuth] Initial sign in, storing tokens');
                return {
                    accessToken: account.access_token,
                    idToken: account.id_token,
                    refreshToken: account.refresh_token,
                    expiresAt: account.expires_at,
                    user,
                };
            }

            // Token is still valid
            const expiresAt = token.expiresAt as number;
            if (Date.now() < expiresAt * 1000 - 5 * 60 * 1000) { // Refresh 5 min before expiry
                return token;
            }

            // Token expired or about to expire - use the refresh token
            console.log('[NextAuth] Token expiring soon, refreshing...');

            try {
                const response = await fetch(`${COGNITO_ISSUER}/oauth2/token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        grant_type: 'refresh_token',
                        client_id: COGNITO_CLIENT_ID,
                        client_secret: COGNITO_CLIENT_SECRET,
                        refresh_token: token.refreshToken as string,
                    }),
                });

                const refreshedTokens = await response.json();

                if (!response.ok) {
                    console.error('[NextAuth] Failed to refresh token:', refreshedTokens);
                    throw new Error('RefreshAccessTokenError');
                }

                console.log('[NextAuth] Token refreshed successfully');

                return {
                    ...token,
                    accessToken: refreshedTokens.access_token,
                    idToken: refreshedTokens.id_token,
                    expiresAt: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
                    refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
                };
            } catch (error) {
                console.error('[NextAuth] Error refreshing token:', error);
                return {
                    ...token,
                    error: 'RefreshAccessTokenError',
                };
            }
        },
        async session({ session, token }) {
            if (token.error) {
                console.error('[NextAuth] Token error in session:', token.error);
                // Session is invalid, user needs to re-login
                return session;
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
