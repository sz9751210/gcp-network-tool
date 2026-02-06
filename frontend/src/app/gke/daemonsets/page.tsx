'use client';

import { useState, useMemo, Suspense } from 'react';
import { useResources } from '@/lib/useResources';
import { useLanguage } from '@/contexts/LanguageContext';
import { GKEDaemonSet } from '@/types/network';
import {
    Activity,
    Search,
    Filter,
    Server, // Using Server icon for DaemonSet for now, or Layers
    Layers,
    ChevronRight,
    CheckCircle
} from 'lucide-react';
import Badge from '@/components/Badge';
import Pagination from '@/components/Pagination';
import SlideOver from '@/components/SlideOver';
import YamlViewer from '@/components/YamlViewer';

function GKEDaemonSetContent() {
    const { t } = useLanguage();
    const [search, setSearch] = useState('');
    const { data: daemonsets, loading, error } = useResources<GKEDaemonSet>('gke-daemonsets');
    const [selectedDS, setSelectedDS] = useState<GKEDaemonSet | null>(null);
    const [detailTab, setDetailTab] = useState<'details' | 'yaml'>('details');

    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Filtering State
    const [selectedCluster, setSelectedCluster] = useState('all');
    const [selectedNamespace, setSelectedNamespace] = useState('all');

    // Derived Lists
    const uniqueClusters = useMemo(() => {
        const set = new Set(daemonsets.map(r => r.cluster_name));
        return Array.from(set).sort();
    }, [daemonsets]);

    const uniqueNamespaces = useMemo(() => {
        const set = new Set(daemonsets.map(r => r.namespace));
        return Array.from(set).sort();
    }, [daemonsets]);

    const filteredDS = useMemo(() => {
        return daemonsets.filter(ds => {
            const matchesSearch = ds.name.toLowerCase().includes(search.toLowerCase()) ||
                ds.namespace.toLowerCase().includes(search.toLowerCase()) ||
                ds.cluster_name.toLowerCase().includes(search.toLowerCase());

            const matchesCluster = selectedCluster === 'all' || ds.cluster_name === selectedCluster;
            const matchesNamespace = selectedNamespace === 'all' || ds.namespace === selectedNamespace;

            return matchesSearch && matchesCluster && matchesNamespace;
        });
    }, [daemonsets, search, selectedCluster, selectedNamespace]);

    const paginatedDS = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        return filteredDS.slice(start, start + itemsPerPage);
    }, [filteredDS, page, itemsPerPage]);

    if (loading && daemonsets.length === 0) {
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
                    <Layers size={24} />
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        DaemonSets
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    Manage system daemons and per-node workloads
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                    <p className="font-bold">Error loading DaemonSets:</p>
                    <p>{error}</p>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search DaemonSets..."
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
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Desired/Ready</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Available</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cluster</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {paginatedDS.map((ds, idx) => (
                                <tr
                                    key={`${ds.cluster_name}-${ds.namespace}-${ds.name}-${idx}`}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                                    onClick={() => setSelectedDS(ds)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Layers className="text-indigo-500" size={18} />
                                            <span className="font-medium text-slate-900 dark:text-white">{ds.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{ds.namespace}</td>
                                    <td className="px-6 py-4 font-mono text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{ds.desired_number_scheduled}</span>
                                            <span className="text-slate-400">/</span>
                                            <span className="text-emerald-600 dark:text-emerald-400">{ds.number_ready}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs">{ds.number_available}</td>
                                    <td className="px-6 py-4 text-slate-500 text-xs font-mono">{ds.cluster_name}</td>
                                </tr>
                            ))}
                            {filteredDS.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No DaemonSets found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(filteredDS.length / itemsPerPage)}
                    onPageChange={setPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    totalItems={daemonsets.length}
                    filteredCount={filteredDS.length}
                />
            </div>

            <SlideOver
                isOpen={!!selectedDS}
                onClose={() => { setSelectedDS(null); setDetailTab('details'); }}
                title="DaemonSet Details"
                width="max-w-3xl"
            >
                {selectedDS && (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedDS.name}</h3>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="indigo" pill>{selectedDS.namespace}</Badge>
                                <Badge variant="emerald" pill>
                                    {selectedDS.number_ready}/{selectedDS.desired_number_scheduled} Ready
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
                                        <div className="text-xs text-slate-500 uppercase mb-1">Desired</div>
                                        <div className="font-mono font-bold">{selectedDS.desired_number_scheduled}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <div className="text-xs text-slate-500 uppercase mb-1">Ready</div>
                                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{selectedDS.number_ready}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <div className="text-xs text-slate-500 uppercase mb-1">Available</div>
                                        <div className="font-mono font-bold">{selectedDS.number_available}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <div className="text-xs text-slate-500 uppercase mb-1">Updated</div>
                                        <div className="font-mono font-bold">{selectedDS.updated_number_scheduled}</div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Cluster Info</h4>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Cluster</span>
                                            <span className="font-medium">{selectedDS.cluster_name}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Project</span>
                                            <span className="font-mono">{selectedDS.project_id}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <YamlViewer yaml={selectedDS.yaml_manifest || ''} />
                        )}
                    </div>
                )}
            </SlideOver>
        </div>
    );
}

export default function GKEDaemonSetPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading DaemonSets...</div>}>
            <GKEDaemonSetContent />
        </Suspense>
    );
}
