'use client';

import { useState, useMemo, Suspense } from 'react';
import { useResources } from '@/lib/useResources';
import { useLanguage } from '@/contexts/LanguageContext';
import { GKEStatefulSet } from '@/types/network';
import {
    Activity,
    Search,
    Filter,
    Database,
    Layers,
    ChevronRight,
    Server,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import Badge from '@/components/Badge';
import Pagination from '@/components/Pagination';
import SlideOver from '@/components/SlideOver';
import YamlViewer from '@/components/YamlViewer';

function GKEStatefulSetContent() {
    const { t } = useLanguage();
    const [search, setSearch] = useState('');
    const { data: statefulsets, loading, error } = useResources<GKEStatefulSet>('gke-statefulsets');
    const [selectedSS, setSelectedSS] = useState<GKEStatefulSet | null>(null);
    const [detailTab, setDetailTab] = useState<'details' | 'yaml'>('details');

    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Filtering State
    const [selectedCluster, setSelectedCluster] = useState('all');
    const [selectedNamespace, setSelectedNamespace] = useState('all');

    // Derived Lists
    const uniqueClusters = useMemo(() => {
        const set = new Set(statefulsets.map(r => r.cluster_name));
        return Array.from(set).sort();
    }, [statefulsets]);

    const uniqueNamespaces = useMemo(() => {
        const set = new Set(statefulsets.map(r => r.namespace));
        return Array.from(set).sort();
    }, [statefulsets]);

    const filteredSS = useMemo(() => {
        return statefulsets.filter(ss => {
            const matchesSearch = ss.name.toLowerCase().includes(search.toLowerCase()) ||
                ss.namespace.toLowerCase().includes(search.toLowerCase()) ||
                ss.cluster_name.toLowerCase().includes(search.toLowerCase());

            const matchesCluster = selectedCluster === 'all' || ss.cluster_name === selectedCluster;
            const matchesNamespace = selectedNamespace === 'all' || ss.namespace === selectedNamespace;

            return matchesSearch && matchesCluster && matchesNamespace;
        });
    }, [statefulsets, search, selectedCluster, selectedNamespace]);

    const paginatedSS = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        return filteredSS.slice(start, start + itemsPerPage);
    }, [filteredSS, page, itemsPerPage]);

    if (loading && statefulsets.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="w-10 h-10 text-indigo-500 animate-spin" />
                    <p className="text-slate-500 font-medium">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1800px] mx-auto">
            <div className="flex flex-col gap-2 mb-8">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-1">
                    <Database size={24} />
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        StatefulSets
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    Manage stateful applications and databases
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                    <p className="font-bold">Error loading StatefulSets:</p>
                    <p>{error}</p>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search StatefulSets..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3">
                        <select
                            value={selectedCluster}
                            onChange={(e) => setSelectedCluster(e.target.value)}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer text-sm font-medium min-w-[160px]"
                        >
                            <option value="all">{t('gke.workloads.allClusters')}</option>
                            {uniqueClusters.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <select
                            value={selectedNamespace}
                            onChange={(e) => setSelectedNamespace(e.target.value)}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer text-sm font-medium min-w-[160px]"
                        >
                            <option value="all">{t('gke.workloads.allNamespaces')}</option>
                            {uniqueNamespaces.map(ns => (
                                <option key={ns} value={ns}>{ns}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Namespace</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Replicas</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Service</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cluster</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {paginatedSS.map((ss, idx) => (
                                <tr
                                    key={`${ss.cluster_name}-${ss.namespace}-${ss.name}-${idx}`}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                                    onClick={() => setSelectedSS(ss)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Database className="text-indigo-500" size={18} />
                                            <span className="font-medium text-slate-900 dark:text-white">{ss.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{ss.namespace}</td>
                                    <td className="px-6 py-4 font-mono text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{ss.ready_replicas}</span>
                                            <span className="text-slate-400">/</span>
                                            <span>{ss.replicas}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{ss.service_name || '-'}</td>
                                    <td className="px-6 py-4 text-slate-500 text-xs font-mono">{ss.cluster_name}</td>
                                </tr>
                            ))}
                            {filteredSS.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No StatefulSets found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(filteredSS.length / itemsPerPage)}
                    onPageChange={setPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    totalItems={statefulsets.length}
                    filteredCount={filteredSS.length}
                />
            </div>

            <SlideOver
                isOpen={!!selectedSS}
                onClose={() => { setSelectedSS(null); setDetailTab('details'); }}
                title="StatefulSet Details"
                width="max-w-3xl"
            >
                {selectedSS && (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedSS.name}</h3>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="indigo" pill>{selectedSS.namespace}</Badge>
                                <Badge variant={selectedSS.ready_replicas === selectedSS.replicas ? 'emerald' : 'amber'} pill>
                                    {selectedSS.ready_replicas}/{selectedSS.replicas} Ready
                                </Badge>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 dark:border-slate-700">
                            <button onClick={() => setDetailTab('details')} className={`px-4 py-2 text-sm font-medium transition-colors relative ${detailTab === 'details' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`}>
                                Details
                                {detailTab === 'details' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />}
                            </button>
                            <button onClick={() => setDetailTab('yaml')} className={`px-4 py-2 text-sm font-medium transition-colors relative ${detailTab === 'yaml' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`}>
                                YAML
                                {detailTab === 'yaml' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />}
                            </button>
                        </div>

                        {detailTab === 'details' ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <div className="text-xs text-slate-500 uppercase mb-1">Replicas</div>
                                        <div className="font-mono font-bold">{selectedSS.replicas}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <div className="text-xs text-slate-500 uppercase mb-1">Ready</div>
                                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{selectedSS.ready_replicas}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <div className="text-xs text-slate-500 uppercase mb-1">Current</div>
                                        <div className="font-mono font-bold">{selectedSS.current_replicas}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <div className="text-xs text-slate-500 uppercase mb-1">Updated</div>
                                        <div className="font-mono font-bold">{selectedSS.updated_replicas}</div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Cluster Info</h4>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Cluster</span>
                                            <span className="font-medium">{selectedSS.cluster_name}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Project</span>
                                            <span className="font-mono">{selectedSS.project_id}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <YamlViewer yaml={selectedSS.yaml_manifest || ''} />
                        )}
                    </div>
                )}
            </SlideOver>
        </div>
    );
}

export default function GKEStatefulSetPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading StatefulSets...</div>}>
            <GKEStatefulSetContent />
        </Suspense>
    );
}
