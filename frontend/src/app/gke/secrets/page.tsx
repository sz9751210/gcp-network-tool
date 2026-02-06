'use client';

import { useState, useMemo, Suspense } from 'react';
import { useResources } from '@/lib/useResources';
import { useLanguage } from '@/contexts/LanguageContext';
import { GKESecret } from '@/types/network';
import {
    Lock,
    Search,
    Activity,
    Tag,
    Clock,
    ShieldCheck,
    Key
} from 'lucide-react';
import Badge from '@/components/Badge';
import Pagination from '@/components/Pagination';
import SlideOver from '@/components/SlideOver';
import YamlViewer from '@/components/YamlViewer';

function GKESecretsContent() {
    const { t } = useLanguage();
    const [search, setSearch] = useState('');
    const { data: secrets, loading } = useResources<GKESecret>('gke-secrets');
    const [selectedSecret, setSelectedSecret] = useState<GKESecret | null>(null);
    const [detailTab, setDetailTab] = useState<'details' | 'yaml'>('details');

    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Filtering State
    const [selectedCluster, setSelectedCluster] = useState('all');
    const [selectedNamespace, setSelectedNamespace] = useState('all');

    // Derived Lists
    const uniqueClusters = useMemo(() => {
        const set = new Set(secrets.map(r => r.cluster_name));
        return Array.from(set).sort();
    }, [secrets]);

    const uniqueNamespaces = useMemo(() => {
        const set = new Set(secrets.map(r => r.namespace));
        return Array.from(set).sort();
    }, [secrets]);

    const filtered = useMemo(() => {
        return secrets.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                s.namespace.toLowerCase().includes(search.toLowerCase()) ||
                s.cluster_name.toLowerCase().includes(search.toLowerCase()) ||
                s.type.toLowerCase().includes(search.toLowerCase());

            const matchesCluster = selectedCluster === 'all' || s.cluster_name === selectedCluster;
            const matchesNamespace = selectedNamespace === 'all' || s.namespace === selectedNamespace;

            return matchesSearch && matchesCluster && matchesNamespace;
        });
    }, [secrets, search, selectedCluster, selectedNamespace]);

    const paginated = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
    }, [filtered, page, itemsPerPage]);

    if (loading && secrets.length === 0) {
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
                    <Lock size={24} />
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {t('gke.secrets.title')}
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    {t('gke.secrets.subtitle')}
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search secrets..."
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
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Secret Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Namespace</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data Keys</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cluster</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {paginated.map((s, idx) => (
                                <tr
                                    key={`${s.cluster_name}-${s.namespace}-${s.name}-${idx}`}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    onClick={() => setSelectedSecret(s)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Key className="text-indigo-500" size={18} />
                                            <span className="font-medium text-slate-900 dark:text-white">{s.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.namespace}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-slate-500 max-w-[200px] truncate" title={s.type}>
                                            {s.type.split('/').pop()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="secondary" pill>
                                            {s.data_keys.length} Keys
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs font-mono">{s.cluster_name}</td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        {t('gke.secrets.noSecrets')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(filtered.length / itemsPerPage)}
                    onPageChange={setPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    totalItems={secrets.length}
                    filteredCount={filtered.length}
                />
            </div>

            <SlideOver
                isOpen={!!selectedSecret}
                onClose={() => { setSelectedSecret(null); setDetailTab('details'); }}
                title="Secret Details"
                width="max-w-3xl"
            >
                {selectedSecret && (
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Lock className="text-indigo-500" size={20} />
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedSecret.name}</h3>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="blue" pill>{selectedSecret.namespace}</Badge>
                                <Badge variant="emerald" pill>Secret</Badge>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setDetailTab('details')}
                                className={`px-4 py-2 text-sm font-medium transition-colors relative ${detailTab === 'details' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Details
                                {detailTab === 'details' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />}
                            </button>
                            <button
                                onClick={() => setDetailTab('yaml')}
                                className={`px-4 py-2 text-sm font-medium transition-colors relative ${detailTab === 'yaml' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                YAML
                                {detailTab === 'yaml' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />}
                            </button>
                        </div>

                        {detailTab === 'details' ? (
                            <>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                                    <div className="text-xs text-slate-500 uppercase mb-2">Secret Type</div>
                                    <div className="font-mono text-sm break-all font-medium text-slate-700 dark:text-slate-300">
                                        {selectedSecret.type}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Data Keys</h4>
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg flex flex-wrap gap-2 border border-slate-200 dark:border-slate-800">
                                            {selectedSecret.data_keys.length > 0 ? (
                                                selectedSecret.data_keys.map(key => (
                                                    <Badge key={key} variant="secondary" pill className="text-[10px] font-mono">
                                                        {key}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-xs text-slate-500 italic">No data keys found</span>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Metadata</h4>
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Cluster</span>
                                                <span className="font-medium text-xs font-mono">{selectedSecret.cluster_name}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Project</span>
                                                <span className="font-medium text-xs font-mono">{selectedSecret.project_id}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Created At</span>
                                                <span className="font-mono text-xs">{selectedSecret.creation_timestamp ? new Date(selectedSecret.creation_timestamp).toLocaleString() : 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-lg">
                                        <ShieldCheck className="text-amber-600 dark:text-amber-400 mt-0.5" size={16} />
                                        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                                            Secret content is encrypted and not retrieved during network scans for security reasons. Only metadata and key names are shown.
                                        </p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <YamlViewer yaml={selectedSecret.yaml_manifest || ''} />
                        )}
                    </div>
                )}
            </SlideOver>
        </div>
    );
}

export default function GKESecretsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Secrets...</div>}>
            <GKESecretsContent />
        </Suspense>
    );
}
