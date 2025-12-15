'use client';

import { useState, useEffect } from 'react';

interface ServiceStatus {
    desired: number;
    running: number;
    pending: number;
    publicIp: string | null;
    url: string | null;
}

export default function AdminControlPanel() {
    const [status, setStatus] = useState<ServiceStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [authenticated, setAuthenticated] = useState(false);
    const [apiKey, setApiKey] = useState('');

    const fetchStatus = async () => {
        if (!authenticated) return;

        setLoading(true);
        try {
            const response = await fetch('/api/admin/weaviate-control', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ action: 'status' })
            });

            const data = await response.json();
            if (data.success) {
                setStatus(data.status);
                setMessage('');
            } else {
                setMessage('Error: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            setMessage('Error fetching status');
        } finally {
            setLoading(false);
        }
    };

    const executeAction = async (action: 'start' | 'stop') => {
        if (!authenticated) return;

        setLoading(true);
        setMessage('');
        try {
            const response = await fetch('/api/admin/weaviate-control', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ action })
            });

            const data = await response.json();
            if (data.success) {
                setMessage(data.message);
                // Refresh status after action
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

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault();
        if (apiKey) {
            setAuthenticated(true);
            fetchStatus();
        }
    };

    useEffect(() => {
        if (authenticated) {
            fetchStatus();
            const interval = setInterval(fetchStatus, 30000); // Auto-refresh every 30s
            return () => clearInterval(interval);
        }
    }, [authenticated]);

    if (!authenticated) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
                    <h1 className="text-2xl font-bold text-white mb-6">Admin Access</h1>
                    <form onSubmit={handleAuth}>
                        <input
                            type="password"
                            placeholder="Enter API Key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 text-white rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
                        >
                            Access Panel
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">Weaviate Control Panel</h1>
                    <p className="text-gray-400">Manage your AWS Weaviate instance</p>
                </div>

                {/* Status Card */}
                <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">Service Status</h2>
                        <button
                            onClick={fetchStatus}
                            disabled={loading}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition disabled:opacity-50"
                        >
                            {loading ? '⟳' : '🔄'} Refresh
                        </button>
                    </div>

                    {status && (
                        <div className="space-y-3">
                            <div className="flex justify-between text-gray-300">
                                <span>Desired Count:</span>
                                <span className="font-mono">{status.desired}</span>
                            </div>
                            <div className="flex justify-between text-gray-300">
                                <span>Running:</span>
                                <span className={`font-mono ${status.running > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {status.running}
                                </span>
                            </div>
                            <div className="flex justify-between text-gray-300">
                                <span>Pending:</span>
                                <span className="font-mono">{status.pending}</span>
                            </div>
                            {status.url && (
                                <div className="mt-4 p-3 bg-gray-700 rounded">
                                    <p className="text-sm text-gray-400 mb-1">Weaviate URL:</p>
                                    <a
                                        href={status.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300 font-mono text-sm break-all"
                                    >
                                        {status.url}
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Control Buttons */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                        onClick={() => executeAction('start')}
                        disabled={loading || (status?.running ?? 0) > 0}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition shadow-lg"
                    >
                        🚀 Start Service
                    </button>
                    <button
                        onClick={() => executeAction('stop')}
                        disabled={loading || (status?.desired ?? 0) === 0}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition shadow-lg"
                    >
                        🛑 Stop Service
                    </button>
                </div>

                {/* Message Display */}
                {message && (
                    <div className={`p-4 rounded-lg ${message.includes('Error') ? 'bg-red-900/50 text-red-200' : 'bg-blue-900/50 text-blue-200'}`}>
                        {message}
                    </div>
                )}

                {/* Info Card */}
                <div className="bg-gray-800 rounded-lg shadow-xl p-6 mt-6">
                    <h3 className="text-lg font-bold text-white mb-3">💰 Cost Information</h3>
                    <ul className="text-gray-300 space-y-2 text-sm">
                        <li>• <strong>Running 24/7:</strong> ~$30/month</li>
                        <li>• <strong>Stopped (storage only):</strong> ~$1/month</li>
                        <li>• <strong>Startup time:</strong> ~2-3 minutes</li>
                        <li>• <strong>Data persistence:</strong> EFS keeps all data when stopped</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
