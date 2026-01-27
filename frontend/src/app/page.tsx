'use client';

import { useEffect } from 'react';
import { useScan } from '@/contexts/ScanContext';
import NetworkTree from '@/components/NetworkTree';

export default function Home() {
    const { topology, metadata, refreshData } = useScan();

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    return (
        <div className="p-8 max-w-[1800px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Dashboard</h1>
                <p className="text-slate-600">
                    {metadata
                        ? `Viewing ${metadata.totalProjects} projects • Last scanned: ${new Date(metadata.timestamp).toLocaleString()}`
                        : 'No scan data available. Go to Settings to start a scan.'}
                </p>
            </div>

            {!topology ? (
                <div className="card p-12 text-center">
                    <div className="max-w-md mx-auto">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="64"
                            height="64"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mx-auto mb-4 text-slate-300"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">No Network Data</h3>
                        <p className="text-slate-600 mb-6">
                            Start by running a network scan in the Settings page
                        </p>
                        <a
                            href="/settings"
                            className="inline-block btn-primary"
                        >
                            Go to Settings
                        </a>
                    </div>
                </div>
            ) : (
                <div className="card p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-indigo-600"
                        >
                            <path d="M3 3v18h18" />
                            <path d="m19 9-5 5-4-4-3 3" />
                        </svg>
                        Network Hierarchy
                    </h2>
                    <NetworkTree data={topology} isLoading={false} />
                </div>
            )}
        </div>
    );
}
