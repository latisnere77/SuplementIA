'use client';

import { useState } from 'react';

export default function DebugEnrichPage() {
    const [status, setStatus] = useState('idle');
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1]} - ${msg}`]);

    const runTest = async () => {
        setStatus('running');
        setError(null);
        setResult(null);
        setLogs([]);

        addLog('Starting test...');

        const FUNCTION_URL = 'https://l7mve4qnytdpxfcyu46cyly5le0vdqgx.lambda-url.us-east-1.on.aws/';
        addLog(`Target URL: ${FUNCTION_URL}`);

        try {
            const payload = {
                supplementId: 'creatine', // Use a known supplement
                category: 'muscle',
                forceRefresh: true,
                studies: [] // Empty studies to force Lambda to fetch/generate
            };

            addLog('Sending request...');
            const startTime = Date.now();

            const response = await fetch(FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const duration = (Date.now() - startTime) / 1000;
            addLog(`Response received in ${duration}s`);
            addLog(`Status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP Error ${response.status}: ${text}`);
            }

            const data = await response.json();
            addLog('JSON parsed successfully');
            setResult(data);
            setStatus('success');

        } catch (err: any) {
            addLog(`ERROR: ${err.message}`);
            setError(err.message);
            setStatus('error');
            console.error(err);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Debug Content Enricher</h1>

            <button
                onClick={runTest}
                disabled={status === 'running'}
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
                {status === 'running' ? 'Running...' : 'Run Test'}
            </button>

            <div className="mt-8 grid grid-cols-2 gap-4">
                <div>
                    <h2 className="font-bold mb-2">Logs</h2>
                    <div className="bg-gray-100 p-4 rounded h-96 overflow-auto font-mono text-xs">
                        {logs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="font-bold mb-2">Result</h2>
                    <div className="bg-gray-100 p-4 rounded h-96 overflow-auto font-mono text-xs">
                        {error && <div className="text-red-600">{error}</div>}
                        {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
                    </div>
                </div>
            </div>
        </div>
    );
}
