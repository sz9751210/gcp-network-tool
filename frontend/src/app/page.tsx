"use client";

import { useEffect, useState } from 'react';
import { api, pollScanStatus, APIError } from '@/lib/api';
import { NetworkTopology } from '@/types/network';
import NetworkTree from '@/components/NetworkTree';
import CIDRVisualizer from '@/components/CIDRVisualizer';

export default function Home() {
    const [sourceId, setSourceId] = useState('');
    const [sourceType, setSourceType] = useState<'folder' | 'organization' | 'project' | 'all_accessible'>('project');
    const [isScanning, setIsScanning] = useState(false);
    const [topology, setTopology] = useState<NetworkTopology | null>(null);
    const [scanStatus, setScanStatus] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [includeSharedVpc, setIncludeSharedVpc] = useState(true);

    // Load initial data
    useEffect(() => {
        loadCachedTopology();
    }, []);

    const loadCachedTopology = async () => {
        try {
            const data = await api.getLatestTopology();
            if (data) {
                setTopology(data);
            }
        } catch (e) {
            console.error("Failed to load cached topology", e);
        }
    };

    const startScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sourceId) return;

        setIsScanning(true);
        setError(null);
        setScanStatus('Initiating scan...');

        try {
            const { scan_id } = await api.startScan({
                source_type: sourceType,
                source_id: sourceId,
                include_shared_vpc: includeSharedVpc
            });

            // Poll for completion
            const result = await pollScanStatus(
                scan_id,
                (status) => setScanStatus(`Scanning... ${status.projects_scanned} projects examined`),
                1500
            );

            setTopology(result);
            setScanStatus('');

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Scan failed');
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <main className="min-h-screen font-sans text-slate-800 bg-slate-50">
            {/* Top Navigation Bar */}
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">GCP Network Planner</h1>
                            <p className="text-xs text-slate-500 font-medium">Topology & CIDR Manager</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                        <div className={`w-2 h-2 rounded-full ${topology ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-400'}`}></div>
                        <span className="text-xs font-medium text-slate-600">
                            {topology
                                ? `Updated: ${new Date(topology.scan_timestamp).toLocaleString()}`
                                : 'No Data Loaded'}
                        </span>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-6 space-y-6">

                {/* Control Panel */}
                <div className="card p-6">
                    <form onSubmit={startScan} className="flex flex-col lg:flex-row gap-6 items-end">
                        <div className="flex-1 space-y-3 w-full">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Source Type</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                                {['folder', 'organization', 'project', 'all_accessible'].map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => {
                                            setSourceType(type as any);
                                            // Clear source ID for auto-discovery
                                            if (type === 'all_accessible') {
                                                setSourceId('all_accessible');
                                            } else {
                                                setSourceId('');
                                            }
                                        }}
                                        className={`flex-1 py-1.5 text-xs lg:text-sm font-medium rounded-md transition-all whitespace-nowrap px-2 ${sourceType === type
                                            ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                            }`}
                                    >
                                        {type === 'all_accessible' ? 'Auto Discover' : type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-[2] space-y-3 w-full">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {sourceType === 'all_accessible'
                                    ? 'Auto Discovery'
                                    : sourceType === 'folder' ? 'Folder ID'
                                        : sourceType === 'organization' ? 'Organization ID'
                                            : 'Project ID(s)'}
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                </div>
                                <input
                                    type="text"
                                    value={sourceType === 'all_accessible' ? 'Scanning all accessible projects' : sourceId}
                                    onChange={(e) => setSourceId(e.target.value)}
                                    disabled={sourceType === 'all_accessible'}
                                    className={`input-field pl-10 font-mono text-slate-700 ${sourceType === 'all_accessible' ? 'bg-slate-50 text-slate-500 italic cursor-not-allowed' : ''}`}
                                    placeholder={sourceType === 'project' ? 'proj-a, proj-b, proj-c' : `Enter ${sourceType} ID...`}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pb-3 px-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeSharedVpc}
                                    onChange={(e) => setIncludeSharedVpc(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors"
                                />
                                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                                    Scan Shared VPC
                                </span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isScanning || !sourceId}
                            className="btn-primary min-w-[140px] h-[42px] flex items-center justify-center gap-2"
                        >
                            {isScanning && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>}
                            {isScanning ? 'Scanning...' : 'Start Scan'}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-6 p-4 bg-rose-50 text-rose-700 text-sm rounded-lg border border-rose-200 flex items-start gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            <div>
                                <span className="font-semibold block mb-1">Scan Failed</span>
                                {error}
                            </div>
                        </div>
                    )}

                    {isScanning && (
                        <div className="mt-6">
                            <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
                                <span>Status</span>
                                <span>{scanStatus}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 animate-progress-indeterminate"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)] min-h-[600px]">
                    {/* Left: Network Tree */}
                    <div className="lg:col-span-2 h-full flex flex-col">
                        <NetworkTree data={topology} isLoading={isScanning} />
                    </div>

                    {/* Right: CIDR Tools */}
                    <div className="lg:col-span-1 h-full flex flex-col">
                        <CIDRVisualizer className="h-full" />
                    </div>
                </div>
            </div>
        </main>
    );
}
