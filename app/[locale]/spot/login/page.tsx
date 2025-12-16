'use client';

import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Suspense, useEffect } from 'react';

function LoginContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    useEffect(() => {
        // Auto-redirect to Cognito
        if (!error) {
            signIn('cognito', { callbackUrl: '/spot' });
        }
    }, [error]);

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full text-center">
                <h1 className="text-2xl font-bold text-white mb-6">Admin Login</h1>

                {error && (
                    <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
                        <p className="font-semibold">Authentication Error</p>
                        <p className="text-sm opacity-80">{error}</p>
                    </div>
                )}

                <div className="animate-pulse space-y-4">
                    <p className="text-gray-400">Redirecting to secure login...</p>
                    <div className="h-2 bg-gray-700 rounded w-3/4 mx-auto"></div>
                </div>

                <button
                    onClick={() => signIn('cognito', { callbackUrl: '/spot' })}
                    className="mt-8 text-emerald-400 hover:text-emerald-300 text-sm underline"
                >
                    Click here if not redirected
                </button>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
