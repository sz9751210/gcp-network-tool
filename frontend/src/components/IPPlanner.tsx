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
        return <div className="p-4 text-tertiary">{t('dashboard.noDataDesc')}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="card p-6 border-t-4 border-indigo-500">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 dark:text-indigo-400"><path d="m11 20 1-1" /><path d="m15 16 1-1" /><path d="m19 12 1-1" /><path d="M20 20v-5" /><path d="M20 4v5" /><path d="m3 4 1 1" /><path d="m7 8 1 1" /><path d="M9 11 4 6" /><path d="M9 13v5" /></svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('ipPlanner.title')}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('sidebar.cidrPlanner')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Source Configuraton */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
                            {t('ipPlanner.sourceConfig')}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('ipPlanner.sourceProject')}</label>
                                <select
                                    className="input-field w-full h-11"
                                    value={sourceProject}
                                    onChange={(e) => setSourceProject(e.target.value)}
                                >
                                    <option value="">{t('common.select') || 'Select Project'}</option>
                                    {projects.map(p => (
                                        <option key={p.project_id} value={p.project_id}>
                                            {p.project_name} ({p.project_id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('ipPlanner.region')}</label>
                                <select
                                    className="input-field w-full h-11"
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
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('ipPlanner.baseCidr')}</label>
                                    <input
                                        type="text"
                                        className="input-field w-full h-11 font-mono"
                                        value={baseCidr}
                                        onChange={(e) => setBaseCidr(e.target.value)}
                                        placeholder="e.g. 10.0.0.0/8"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('ipPlanner.requiredSize')}</label>
                                    <select
                                        className="input-field w-full h-11"
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
                    </div>

                    {/* Peer Selection */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
                            {t('ipPlanner.peeredProjects')}
                        </h3>
                        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 h-64 overflow-y-auto">
                            {projects.filter(p => p.project_id !== sourceProject).map(p => (
                                <div key={p.project_id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer group" onClick={() => togglePeer(p.project_id)}>
                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selectedPeers.includes(p.project_id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`}>
                                        {selectedPeers.includes(p.project_id) && (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                        )}
                                    </div>
                                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                        {p.project_name} <span className="text-slate-400 dark:text-slate-500 text-xs font-normal ml-1">({p.project_id})</span>
                                    </span>
                                </div>
                            ))}
                            {projects.length <= 1 && (
                                <div className="h-full flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 italic">
                                    {t('ipPlanner.noPeers')}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-1">
                            {t('ipPlanner.peerDesc')}
                        </p>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={handleCalculate}
                        disabled={isLoading || !sourceProject}
                        className="btn-primary min-w-[200px] h-11 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {t('ipPlanner.calculating')}
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                {t('ipPlanner.findIps')}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Results */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {result && (
                <div className="card p-6 animate-fade-in border-l-4 border-emerald-500">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-md text-emerald-600 dark:text-emerald-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
                        </div>
                        {t('ipPlanner.results')}
                    </h3>

                    <div className="mb-6 px-4 py-2 bg-slate-50 dark:bg-slate-900/30 rounded-lg text-sm text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                        {t('ipPlanner.checkedCount', { count: result.checked_scope.length })}
                    </div>

                    {result.available_cidrs.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {result.available_cidrs.map((cidr, idx) => (
                                <div key={idx} className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/10 dark:hover:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 flex items-center justify-between group transition-all cursor-pointer hover:shadow-lg shadow-emerald-500/5"
                                    onClick={() => {
                                        navigator.clipboard.writeText(cidr);
                                        // TODO: Toast notification
                                    }}
                                    title="Click to copy"
                                >
                                    <span className="font-mono text-emerald-800 dark:text-emerald-300 font-bold">{cidr}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 dark:text-emerald-600 opacity-40 group-hover:opacity-100 transition-opacity">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                            {t('ipPlanner.noResults')}
                        </div>
                    )}

                    {/* Feature 2: Gcloud Command Generator */}
                    {result.available_cidrs.length > 0 && (
                        <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                                        <polyline points="4 17 10 11 4 5" />
                                        <line x1="12" y1="19" x2="20" y2="19" />
                                    </svg>
                                </div>
                                {t('ipPlanner.cloudSdkCommand')}
                            </h4>
                            <div className="bg-slate-900 shadow-2xl rounded-xl p-5 relative group border border-slate-800">
                                <code className="text-sm text-slate-300 font-mono break-all whitespace-pre-wrap leading-relaxed">
                                    <span className="text-emerald-400">gcloud</span> compute networks subnets create <span className="text-amber-400">SUBNET_NAME</span> \<br />
                                    {'  '}--project={sourceProject} \<br />
                                    {'  '}--region={region} \<br />
                                    {'  '}--network=<span className="text-amber-400">NETWORK_NAME</span> \<br />
                                    {'  '}--range={result.available_cidrs[0]}
                                </code>
                                <button
                                    className="absolute top-4 right-4 p-2.5 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all shadow-lg"
                                    onClick={() => {
                                        const cmd = `gcloud compute networks subnets create SUBNET_NAME --project=${sourceProject} --region=${region} --network=NETWORK_NAME --range=${result.available_cidrs[0]}`;
                                        navigator.clipboard.writeText(cmd);
                                    }}
                                    title="Copy command"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-4 italic">
                                {t('ipPlanner.commandHint')}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
