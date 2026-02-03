'use client';

import { useState, useMemo, Suspense } from 'react';
import { useResources } from '@/lib/useResources';
import { useLanguage } from '@/contexts/LanguageContext';
import { GKEConfigMap } from '@/types/network';
import {
    Settings2,
    Search,
    Activity,
    Tag,
    Clock,
    FileText,
    Boxes
} from 'lucide-react';
import Badge from '@/components/Badge';
import Pagination from '@/components/Pagination';
import SlideOver from '@/components/SlideOver';

function GKEConfigMapsContent() {
    const { t } = useLanguage();
    const [search, setSearch] = useState('');
    const { data: configMaps, loading } = useResources<GKEConfigMap>('gke-configmaps');
    const [selectedCM, setSelectedCM] = useState<GKEConfigMap | null>(null);

    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const filtered = useMemo(() => {
        return configMaps.filter(cm =>
            cm.name.toLowerCase().includes(search.toLowerCase()) ||
            cm.namespace.toLowerCase().includes(search.toLowerCase()) ||
            cm.cluster_name.toLowerCase().includes(search.toLowerCase())
        );
    }, [configMaps, search]);

    const paginated = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
    }, [filtered, page, itemsPerPage]);

    if (loading && configMaps.length === 0) {
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
                    <Settings2 size={24} />
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {t('gke.configmaps.title')}
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    {t('gke.configmaps.subtitle')}
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search ConfigMaps..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ConfigMap</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Namespace</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data Keys</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cluster</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Age</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {paginated.map((cm, idx) => (
                                <tr
                                    key={`${cm.cluster_name}-${cm.namespace}-${cm.name}-${idx}`}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    onClick={() => setSelectedCM(cm)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <FileText className="text-amber-500" size={18} />
                                            <span className="font-medium text-slate-900 dark:text-white">{cm.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{cm.namespace}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant="secondary" pill>
                                            {cm.data_keys.length} Keys
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs font-mono">{cm.cluster_name}</td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">
                                        {cm.creation_timestamp ? new Date(cm.creation_timestamp).toLocaleDateString() : 'N/A'}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        {t('gke.configmaps.noConfigMaps')}
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
                    totalItems={configMaps.length}
                    filteredCount={filtered.length}
                />
            </div>

            <SlideOver
                isOpen={!!selectedCM}
                onClose={() => setSelectedCM(null)}
                title="ConfigMap Details"
            >
                {selectedCM && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedCM.name}</h3>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="blue" pill>{selectedCM.namespace}</Badge>
                                <Badge variant="amber" pill>ConfigMap</Badge>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Data Keys</h4>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg flex flex-wrap gap-2">
                                    {selectedCM.data_keys.length > 0 ? (
                                        selectedCM.data_keys.map(key => (
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                                        <div className="text-xs text-slate-500 uppercase mb-1">Cluster</div>
                                        <div className="font-mono font-medium text-sm">{selectedCM.cluster_name}</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                                        <div className="text-xs text-slate-500 uppercase mb-1">Project</div>
                                        <div className="font-mono font-medium text-sm">{selectedCM.project_id}</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg col-span-2">
                                        <div className="text-xs text-slate-500 uppercase mb-1">Created At</div>
                                        <div className="font-mono font-medium text-sm">
                                            {selectedCM.creation_timestamp ? new Date(selectedCM.creation_timestamp).toLocaleString() : 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </SlideOver>
        </div>
    );
}

export default function GKEConfigMapsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading ConfigMaps...</div>}>
            <GKEConfigMapsContent />
        </Suspense>
    );
}
