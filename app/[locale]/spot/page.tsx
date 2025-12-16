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

// Helper Components
const StatusCard = ({ label, value, color }: { label: string, value: string | number, color?: string }) => (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="text-slate-400 text-sm mb-1">{label}</div>
        <div className={`text-xl font-bold ${color || 'text-white'} truncate`} title={String(value)}>
            {value}
        </div>
    </div>
);

export default function AdminControlPanel() {
    const { data: session, status: authStatus } = useSession();
    const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [seedingProgress, setSeedingProgress] = useState<SeedingProgress | null>(null);
    const [dbStats, setDbStats] = useState<{ total: number, items: any[] } | null>(null);

    const fetchStatus = async () => {
        if (!session?.idToken) {
            console.warn('[fetchStatus] No idToken in session');
            if (session) {
                setMessage('Sesión antigua detectada. Por favor cierra sesión y vuelve a entrar.');
                setServiceStatus(null);
            }
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/admin/weaviate-control', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.idToken}`
                },
                body: JSON.stringify({ action: 'status' })
            });

            const data = await response.json();
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

    const fetchDbData = async () => {
        if (!session?.idToken) return;
        try {
            const res = await fetch('/api/admin/weaviate-data', {
                headers: { 'Authorization': `Bearer ${session.idToken}` }
            });
            const data = await res.json();
            if (data.success) {
                setDbStats({
                    total: data.stats.totalObjects,
                    items: data.items
                });
            }
        } catch (e) {
            console.error("Failed to fetch DB data", e);
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

    const startService = () => executeAction('start');
    const stopService = () => executeAction('stop');

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
                fetchSeedingStatus(); // Immediate update
                const pollInterval = setInterval(async () => {
                    await fetchSeedingStatus();
                    await fetchDbData(); // Also refresh DB data while seeding

                    // We need to check the fresh state, but inside interval we might have closure issues 
                    // dependent on how often component re-renders. 
                    // Ideally we rely on the component's useEffect poller, but this button triggers immediate polling too.
                }, 2000);

                // Clear this specific interval after some time to avoid leaks if component unmounts
                setTimeout(() => clearInterval(pollInterval), 60000);
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
            fetchDbData();

            const interval = setInterval(() => {
                fetchStatus();
                fetchSeedingStatus();
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [session]);

    // Refresh DB data periodically if seeding is active
    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (seedingProgress?.isRunning) {
            interval = setInterval(fetchDbData, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [seedingProgress?.isRunning]);

    // Auth Loading State
    if (authStatus === 'loading') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Login Screen
    if (!session) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900 p-8 rounded-xl shadow-xl border border-slate-800 max-w-md w-full text-center">
                    <h1 className="text-2xl font-bold text-white mb-6">Admin Access</h1>
                    <p className="text-slate-400 mb-8">
                        Inicia sesión con tu cuenta autorizada para acceder al panel de administración.
                    </p>
                    <button
                        onClick={() => signIn('cognito')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        Iniciar Sesión con Cognito
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center pb-6 border-b border-slate-800">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                        SuplementIA Admin
                    </h1>
                    <div className="flex items-center gap-6">
                        <span className="text-sm text-slate-400 bg-slate-900 py-1 px-3 rounded-full border border-slate-800">
                            {session?.user?.email}
                        </span>
                        <button
                            onClick={() => signOut()}
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                </div>

                {message && (
                    <div className={`p-4 rounded-lg border ${message.includes('Error') ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-blue-900/20 border-blue-800 text-blue-300'}`}>
                        {message}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Status & Control */}
                    <div className="space-y-8">
                        {/* Weaviate Service Status */}
                        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-lg">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold text-slate-200">System Status</h2>
                                <button
                                    onClick={fetchStatus}
                                    className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider"
                                >
                                    Refresh
                                </button>
                            </div>

                            {!serviceStatus ? (
                                <div className="text-slate-500 animate-pulse py-4 text-center">Checking connectivity...</div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <StatusCard label="Desired Tasks" value={serviceStatus.desired} />
                                    <StatusCard
                                        label="Running Tasks"
                                        value={serviceStatus.running}
                                        color={serviceStatus.running > 0 ? 'text-emerald-400' : 'text-slate-400'}
                                    />
                                    <StatusCard
                                        label="Pending Tasks"
                                        value={serviceStatus.pending}
                                        color={serviceStatus.pending > 0 ? 'text-amber-400' : 'text-slate-400'}
                                    />
                                    <StatusCard label="Public IP" value={serviceStatus.publicIp || 'Not Assigned'} color="text-blue-400" />
                                </div>
                            )}
                        </div>

                        {/* Service Control */}
                        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-lg">
                            <h2 className="text-xl font-semibold text-slate-200 mb-6">Infrastructure Control</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={startService}
                                    className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/50 font-semibold py-3 px-6 rounded-lg transition-all"
                                >
                                    Start Service
                                </button>
                                <button
                                    onClick={stopService}
                                    className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 font-semibold py-3 px-6 rounded-lg transition-all"
                                >
                                    Stop Service
                                </button>
                            </div>
                        </div>

                        {/* Data Seeding */}
                        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-lg">
                            <h2 className="text-xl font-semibold text-slate-200 mb-6">Data Ingestion</h2>

                            {seedingProgress?.isRunning ? (
                                <div className="w-full">
                                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                                        <span>Ingesting: <span className="text-white">{seedingProgress.currentMineral}</span></span>
                                        <span>{seedingProgress.completed} / {seedingProgress.total}</span>
                                    </div>
                                    <div className="w-full bg-slate-800 rounded-full h-2 mb-6">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                                            style={{ width: `${(seedingProgress.completed / Math.max(seedingProgress.total, 1)) * 100}%` }}
                                        ></div>
                                    </div>

                                    <div className="space-y-2">
                                        {seedingProgress.history.slice(0, 3).map((entry, i) => (
                                            <div key={i} className="flex justify-between text-xs border-b border-slate-800 pb-2">
                                                <span className="text-slate-400">{entry.mineral}</span>
                                                <span className={entry.status === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                                                    {entry.status === 'success' ? 'Indexed' : 'Failed'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={startSeeding}
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
                                >
                                    {loading ? 'Starting...' : 'Start Knowledge Base Seeding'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Data Inspector */}
                    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-lg flex flex-col h-full overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-semibold text-slate-200">Knowledge Base</h2>
                                {dbStats && (
                                    <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2 py-1 rounded border border-emerald-500/20">
                                        {dbStats.total} DOCS
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={fetchDbData}
                                className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider"
                            >
                                Refresh Data
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto">
                            {!dbStats ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-600"></div>
                                    <p>Connecting to Vector DB...</p>
                                </div>
                            ) : dbStats.items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-2">
                                    <svg className="w-12 h-12 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                                    <p>Database is empty</p>
                                    <p className="text-xs text-slate-600 p-8 text-center">Run the seeding process to populate the knowledge base with supplements.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left text-slate-400">
                                    <thead className="text-xs uppercase bg-slate-950/50 text-slate-500 sticky top-0 backdrop-blur-sm">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Supplement / Title</th>
                                            <th className="px-6 py-3 font-medium hidden sm:table-cell">Details</th>
                                            <th className="px-6 py-3 font-medium text-right">Year</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {dbStats.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-white group-hover:text-blue-200 transition-colors line-clamp-2">
                                                        {item.title}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden sm:table-cell">
                                                    <div className="text-xs text-slate-500 uppercase mb-1">Ingredients</div>
                                                    <div className="text-slate-300 line-clamp-1 mb-2">{item.ingredients}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-slate-500">
                                                    {item.year}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
