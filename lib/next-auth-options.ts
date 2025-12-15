import { NextAuthOptions } from 'next-auth';
import CognitoProvider from 'next-auth/providers/cognito';

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
        async jwt({ token, account }) {
            // Persist the OAuth access_token to the token right after signin
            if (account) {
                token.accessToken = account.access_token;
                token.idToken = account.id_token;
            }
            return token;
        },
        async session({ session, token }) {
            // Send properties to the client
            session.accessToken = token.accessToken as string;
            session.idToken = token.idToken as string;
            return session;
        },
    },
    pages: {
        signIn: '/spot/login',
        error: '/spot/error',
    },
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60, // 24 hours
    },
    secret: process.env.NEXTAUTH_SECRET,
};
