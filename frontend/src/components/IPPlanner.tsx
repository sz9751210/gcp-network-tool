'use client';

import { useState } from 'react';
import { useScan } from '@/contexts/ScanContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { IPPlanRequest, IPPlanResponse } from '@/types/network';

export default function IPPlanner() {
    const { topology } = useScan();
    const { t } = useLanguage();

    const [sourceProject, setSourceProject] = useState<string>('');
    const [region, setRegion] = useState<string>('asia-east1');
    const [baseCidr, setBaseCidr] = useState<string>('10.0.0.0/8');
    const [cidrMask, setCidrMask] = useState<number>(24);
    const [selectedPeers, setSelectedPeers] = useState<string[]>([]);

    const [result, setResult] = useState<IPPlanResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Get list of projects
    const projects = topology?.projects || [];
    const regions = ['asia-east1', 'asia-northeast1', 'us-central1', 'europe-west1']; // Add more or fetch dynamically if possible

    const handleCalculate = async () => {
        if (!sourceProject) {
            setError(t('ipPlanner.errorSelectProject') || 'Please select a source project');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const request: IPPlanRequest = {
                source_project_id: sourceProject,
                region: region,
                peer_projects: selectedPeers,
                cidr_mask: cidrMask,
                base_cidr: baseCidr
            };

            const response = await fetch('http://localhost:8000/api/plan-ip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error('Failed to calculate IP plan');
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePeer = (projectId: string) => {
        if (selectedPeers.includes(projectId)) {
            setSelectedPeers(prev => prev.filter(p => p !== projectId));
        } else {
            setSelectedPeers(prev => [...prev, projectId]);
        }
    };

    if (!topology) {
        return <div className="p-4 text-slate-500">{t('dashboard.noDataDesc')}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="card p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">{t('sidebar.cidrPlanner') || 'IP Network Planner'}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Source Configuraton */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-slate-700">Source Configuration</h3>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Source Project</label>
                            <select
                                className="input-field w-full"
                                value={sourceProject}
                                onChange={(e) => setSourceProject(e.target.value)}
                            >
                                <option value="">Select Project</option>
                                {projects.map(p => (
                                    <option key={p.project_id} value={p.project_id}>
                                        {p.project_name} ({p.project_id})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Region</label>
                            <select
                                className="input-field w-full"
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                            >
                                {regions.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Base CIDR Scope</label>
                                <input
                                    type="text"
                                    className="input-field w-full"
                                    value={baseCidr}
                                    onChange={(e) => setBaseCidr(e.target.value)}
                                    placeholder="e.g. 10.0.0.0/8"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Required Size</label>
                                <select
                                    className="input-field w-full"
                                    value={cidrMask}
                                    onChange={(e) => setCidrMask(Number(e.target.value))}
                                >
                                    {[16, 20, 22, 24, 26, 28].map(mask => (
                                        <option key={mask} value={mask}>/{mask}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Peer Selection */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-slate-700">Peered Projects (Conflict Check)</h3>
                        <div className="border rounded-lg p-4 h-64 overflow-y-auto bg-slate-50">
                            {projects.filter(p => p.project_id !== sourceProject).map(p => (
                                <div key={p.project_id} className="flex items-center gap-2 mb-2">
                                    <input
                                        type="checkbox"
                                        id={`peer-${p.project_id}`}
                                        checked={selectedPeers.includes(p.project_id)}
                                        onChange={() => togglePeer(p.project_id)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <label htmlFor={`peer-${p.project_id}`} className="text-sm text-slate-700 cursor-pointer select-none">
                                        {p.project_name} <span className="text-slate-400 text-xs">({p.project_id})</span>
                                    </label>
                                </div>
                            ))}
                            {projects.length <= 1 && (
                                <p className="text-sm text-slate-400 italic">No other projects available to peer.</p>
                            )}
                        </div>
                        <p className="text-xs text-slate-500">
                            Select projects that will be peered with the source. The system will ensure the planned IP does not overlap with any subnets in these projects.
                        </p>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleCalculate}
                        disabled={isLoading || !sourceProject}
                        className="btn-primary flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Calculating...
                            </>
                        ) : (
                            'Find Available IPs'
                        )}
                    </button>
                </div>
            </div>

            {/* Results */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {result && (
                <div className="card p-6 animate-fade-in">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Available Network Segments</h3>

                    <div className="mb-4 text-sm text-slate-600">
                        Checked against <strong>{result.checked_scope.length}</strong> project(s).
                    </div>

                    {result.available_cidrs.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {result.available_cidrs.map((cidr, idx) => (
                                <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between group hover:shadow-md transition-all cursor-pointer"
                                    onClick={() => navigator.clipboard.writeText(cidr)}
                                    title="Click to copy"
                                >
                                    <span className="font-mono text-green-800 font-medium">{cidr}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-slate-500 italic">
                            No available CIDRs found within the specified range. Try reducing the prefix size or expanding the base scope.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
