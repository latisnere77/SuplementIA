'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

interface ServiceStatus {
    desired: number;
    running: number;
    pending: number;
    publicIp: string | null;
    url: string | null;
}

interface SeedingProgress {
    isRunning: boolean;
    currentMineral: string;
    completed: number;
    total: number;
    history: Array<{
        timestamp: string;
        mineral: string;
        status: 'success' | 'error';
        count?: number;
    }>;
}

export default function AdminControlPanel() {
    const { data: session, status: authStatus } = useSession();
    const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [seedingProgress, setSeedingProgress] = useState<SeedingProgress | null>(null);

    const fetchStatus = async () => {
        console.log('[fetchStatus] Session:', { exists: !!session, hasIdToken: !!session?.idToken });

        if (!session?.idToken) {
            console.warn('[fetchStatus] No idToken in session, skipping fetch');
            return;
        }

        setLoading(true);
        try {
            console.log('[fetchStatus] Making request with token');
            const response = await fetch('/api/admin/weaviate-control', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.idToken}`
                },
                body: JSON.stringify({ action: 'status' })
            });

            console.log('[fetchStatus] Response status:', response.status);
            const data = await response.json();
            console.log('[fetchStatus] Response data:', data);

            if (data.success) {
                setServiceStatus(data.status);
                setMessage('');
            } else {
                setMessage('Error: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('[fetchStatus] Request failed:', error);
            setMessage('Error fetching status');
        } finally {
            setLoading(false);
        }
    };

    const fetchSeedingStatus = async () => {
        if (!session?.idToken) return;

        try {
            const response = await fetch('/api/admin/seed-weaviate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.idToken}`
                },
                body: JSON.stringify({ action: 'status' })
            });

            const data = await response.json();
            if (data.success) {
                setSeedingProgress(data.progress);
            }
        } catch (error) {
            console.error('Error fetching seeding status:', error);
        }
    };

    const executeAction = async (action: 'start' | 'stop') => {
        if (!session?.idToken) return;

        setLoading(true);
        setMessage('');
        try {
            const response = await fetch('/api/admin/weaviate-control', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.idToken}`
                },
                body: JSON.stringify({ action })
            });

            const data = await response.json();
            if (data.success) {
                setMessage(data.message);
                setTimeout(fetchStatus, 2000);
            } else {
                setMessage('Error: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            setMessage('Error executing action');
        } finally {
            setLoading(false);
        }
    };

    const startSeeding = async () => {
        if (!session?.idToken) return;

        try {
            const response = await fetch('/api/admin/seed-weaviate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.idToken}`
                },
                body: JSON.stringify({ action: 'start' })
            });

            const data = await response.json();
            if (data.success) {
                setMessage('Seeding started!');
                const pollInterval = setInterval(async () => {
                    await fetchSeedingStatus();
                    if (seedingProgress && !seedingProgress.isRunning) {
                        clearInterval(pollInterval);
                    }
                }, 2000);
            } else {
                setMessage('Error: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            setMessage('Error starting seeding');
        }
    };

    useEffect(() => {
        if (session?.idToken) {
            fetchStatus();
            fetchSeedingStatus();
            const interval = setInterval(() => {
                fetchStatus();
                fetchSeedingStatus();
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [session]);

    // Loading auth state
    if (authStatus === 'loading') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    // Not authenticated - show login
    if (!session) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full text-center">
                    <h1 className="text-2xl font-bold text-white mb-6">Admin Access</h1>
                    <p className="text-gray-400 mb-6">
                        Inicia sesión con tu cuenta autorizada para acceder al panel de administración.
                    </p>
                    <button
                        onClick={() => signIn('cognito')}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        Iniciar Sesión con Cognito
                    </button>
                </div>
            </div>
        );
    }

    // Authenticated - show admin panel
    return (
        <div className="min-h-screen bg-gray-900 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">SuplementIA Admin</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-400 text-sm">{session.user?.email}</span>
                        <button
                            onClick={() => signOut()}
                            className="text-gray-400 hover:text-white text-sm underline"
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                </div>

                {/* Status Card */}
                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-white">Weaviate Service Status</h2>
                        <button
                            onClick={fetchStatus}
                            disabled={loading}
                            className="text-emerald-400 hover:text-emerald-300 text-sm"
                        >
                            {loading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>

                    {serviceStatus ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-700 rounded p-4">
                                <div className="text-gray-400 text-sm">Desired</div>
                                <div className="text-2xl font-bold text-white">{serviceStatus.desired}</div>
                            </div>
                            <div className="bg-gray-700 rounded p-4">
                                <div className="text-gray-400 text-sm">Running</div>
                                <div className={`text-2xl font-bold ${serviceStatus.running > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {serviceStatus.running}
                                </div>
                            </div>
                            <div className="bg-gray-700 rounded p-4">
                                <div className="text-gray-400 text-sm">Pending</div>
                                <div className="text-2xl font-bold text-yellow-400">{serviceStatus.pending}</div>
                            </div>
                            <div className="bg-gray-700 rounded p-4">
                                <div className="text-gray-400 text-sm">Public IP</div>
                                <div className="text-sm font-mono text-white truncate">
                                    {serviceStatus.publicIp || 'N/A'}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-400">Loading status...</div>
                    )}
                </div>

                {/* Control Buttons */}
                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Service Control</h2>
                    <div className="flex gap-4">
                        <button
                            onClick={() => executeAction('start')}
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                        >
                            Start Service
                        </button>
                        <button
                            onClick={() => executeAction('stop')}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                        >
                            Stop Service
                        </button>
                    </div>
                    {message && (
                        <div className={`mt-4 p-3 rounded ${message.includes('Error') ? 'bg-red-900/50 text-red-300' : 'bg-emerald-900/50 text-emerald-300'}`}>
                            {message}
                        </div>
                    )}
                </div>

                {/* Seeding Section */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Data Seeding</h2>

                    {seedingProgress?.isRunning ? (
                        <div className="mb-4">
                            <div className="flex justify-between text-sm text-gray-400 mb-2">
                                <span>Seeding: {seedingProgress.currentMineral}</span>
                                <span>{seedingProgress.completed}/{seedingProgress.total}</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-emerald-500 h-2 rounded-full transition-all"
                                    style={{ width: `${(seedingProgress.completed / seedingProgress.total) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={startSeeding}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                        >
                            Start Seeding (Minerals)
                        </button>
                    )}

                    {/* Seeding History */}
                    {seedingProgress?.history && seedingProgress.history.length > 0 && (
                        <div className="mt-4">
                            <h3 className="text-sm font-semibold text-gray-400 mb-2">Recent Activity</h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {seedingProgress.history.slice(0, 5).map((entry, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span className="text-gray-300">{entry.mineral}</span>
                                        <span className={entry.status === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                                            {entry.status === 'success' ? `✓ ${entry.count} indexed` : '✗ Failed'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
