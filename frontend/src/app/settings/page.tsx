'use client';

import { useState } from 'react';
import { useScan } from '@/contexts/ScanContext';

export default function SettingsPage() {
    const { metadata, isScanning, scanStatus, error, startScan } = useScan();
    const [sourceType, setSourceType] = useState<'folder' | 'organization' | 'project' | 'all_accessible'>('all_accessible');
    const [sourceId, setSourceId] = useState('');
    const [includeSharedVpc, setIncludeSharedVpc] = useState(true);

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (sourceType !== 'all_accessible' && !sourceId) return;

        await startScan({
            source_type: sourceType,
            source_id: sourceType === 'all_accessible' ? 'all_accessible' : sourceId,
            include_shared_vpc: includeSharedVpc,
        });
    };

    return (
        <div className="p-8 max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Settings</h1>
                <p className="text-slate-600">Configure and manage network scans</p>
            </div>

            {/* Scan Configuration Card */}
            <div className="card mb-6">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Network Scan Configuration</h2>
                    <p className="text-sm text-slate-600 mt-1">
                        Scan your GCP infrastructure to discover projects, VPCs, and subnets
                    </p>
                </div>

                <form onSubmit={handleScan} className="p-6 space-y-6">
                    {/* Source Type Selection */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
                            Source Type
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {[
                                { value: 'all_accessible', label: 'Auto Discover', desc: 'Scan all accessible projects' },
                                { value: 'folder', label: 'Folder', desc: 'Scan projects in a folder' },
                                { value: 'organization', label: 'Organization', desc: 'Scan entire organization' },
                                { value: 'project', label: 'Project(s)', desc: 'Scan specific projects' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        setSourceType(option.value as any);
                                        if (option.value === 'all_accessible') {
                                            setSourceId('all_accessible');
                                        } else {
                                            setSourceId('');
                                        }
                                    }}
                                    className={`flex-1 min-w-[200px] p-4 rounded-lg border-2 transition-all text-left ${sourceType === option.value
                                            ? 'border-indigo-600 bg-indigo-50 shadow-md'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                >
                                    <div className="font-semibold text-slate-800">{option.label}</div>
                                    <div className="text-xs text-slate-600 mt-1">{option.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Source ID Input */}
                    {sourceType !== 'all_accessible' && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
                                {sourceType === 'folder' ? 'Folder ID' : sourceType === 'organization' ? 'Organization ID' : 'Project ID(s)'}
                            </label>
                            <input
                                type="text"
                                value={sourceId}
                                onChange={(e) => setSourceId(e.target.value)}
                                className="input-field font-mono"
                                placeholder={sourceType === 'project' ? 'proj-a, proj-b, proj-c' : `Enter ${sourceType} ID...`}
                                required
                            />
                            {sourceType === 'project' && (
                                <p className="text-xs text-slate-500 mt-2">Separate multiple project IDs with commas</p>
                            )}
                        </div>
                    )}

                    {/* Shared VPC Option */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="sharedVpc"
                            checked={includeSharedVpc}
                            onChange={(e) => setIncludeSharedVpc(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="sharedVpc" className="text-sm text-slate-700 cursor-pointer">
                            Include Shared VPC relationships
                        </label>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isScanning}
                        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isScanning ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Scanning...</span>
                            </div>
                        ) : (
                            'Start Scan'
                        )}
                    </button>
                </form>
            </div>

            {/* Status Messages */}
            {scanStatus && (
                <div className="card p-4 mb-6 bg-indigo-50 border border-indigo-200">
                    <div className="flex items-center gap-2 text-indigo-700">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                        <span className="font-medium">{scanStatus}</span>
                    </div>
                </div>
            )}

            {error && (
                <div className="card p-4 mb-6 bg-rose-50 border border-rose-200">
                    <div className="flex items-center gap-2 text-rose-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span className="font-medium">{error}</span>
                    </div>
                </div>
            )}

            {/* Latest Scan Metadata */}
            {metadata && (
                <div className="card">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800">Latest Scan</h2>
                    </div>
                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Source</div>
                            <div className="text-lg font-semibold text-slate-800 capitalize">{metadata.sourceType.replace('_', ' ')}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Projects</div>
                            <div className="text-lg font-semibold text-indigo-600">{metadata.totalProjects}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">VPCs</div>
                            <div className="text-lg font-semibold text-emerald-600">{metadata.totalVpcs}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Subnets</div>
                            <div className="text-lg font-semibold text-sky-600">{metadata.totalSubnets}</div>
                        </div>
                        <div className="col-span-2 md:col-span-4 pt-4 border-t border-slate-200">
                            <div className="text-xs text-slate-500">
                                Last scanned: {new Date(metadata.timestamp).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
