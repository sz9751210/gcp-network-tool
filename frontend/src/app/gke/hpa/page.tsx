'use client';

import { useState, useMemo, Suspense } from 'react';
import { useResources } from '@/lib/useResources';
import { useLanguage } from '@/contexts/LanguageContext';
import { GKEHPA } from '@/types/network';
import {
    Activity,
    Search,
    Filter,
    Scale,
    Layers,
    ChevronRight
} from 'lucide-react';
import Badge from '@/components/Badge';
import Pagination from '@/components/Pagination';
import SlideOver from '@/components/SlideOver';

function GKEHPAContent() {
    const { t } = useLanguage();
    const [search, setSearch] = useState('');
    const { data: hpas, loading, error } = useResources<GKEHPA>('gke-hpa');
    const [selectedHPA, setSelectedHPA] = useState<GKEHPA | null>(null);

    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const filteredHPAs = useMemo(() => {
        return hpas.filter(hpa =>
            hpa.name.toLowerCase().includes(search.toLowerCase()) ||
            hpa.namespace.toLowerCase().includes(search.toLowerCase()) ||
            hpa.cluster_name.toLowerCase().includes(search.toLowerCase())
        );
    }, [hpas, search]);

    const paginatedHPAs = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        return filteredHPAs.slice(start, start + itemsPerPage);
    }, [filteredHPAs, page, itemsPerPage]);

    if (loading && hpas.length === 0) {
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
                    <Scale size={24} />
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Horizontal Pod Autoscalers
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    Manage autoscaling policies for your workloads
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                    <p className="font-bold">Error loading HPAs:</p>
                    <p>{error}</p>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search HPAs..."
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
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Namespace</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Targets</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Replicas (Min/Cur/Max)</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cluster</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {paginatedHPAs.map((hpa, idx) => (
                                <tr
                                    key={`${hpa.cluster_name}-${hpa.namespace}-${hpa.name}-${idx}`}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                                    onClick={() => setSelectedHPA(hpa)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Scale className="text-indigo-500" size={18} />
                                            <span className="font-medium text-slate-900 dark:text-white">{hpa.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{hpa.namespace}</td>
                                    <td className="px-6 py-4 font-mono text-xs">
                                        {hpa.target_cpu_utilization_percentage ? `${hpa.target_cpu_utilization_percentage}% CPU` : 'Custom'}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs">
                                        {hpa.min_replicas ?? 1} / <span className="text-indigo-600 dark:text-indigo-400 font-bold">{hpa.current_replicas}</span> / {hpa.max_replicas}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs font-mono">{hpa.cluster_name}</td>
                                </tr>
                            ))}
                            {filteredHPAs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No HPAs found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(filteredHPAs.length / itemsPerPage)}
                    onPageChange={setPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    totalItems={hpas.length}
                    filteredCount={filteredHPAs.length}
                />
            </div>

            <SlideOver
                isOpen={!!selectedHPA}
                onClose={() => setSelectedHPA(null)}
                title="HPA Details"
            >
                {selectedHPA && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedHPA.name}</h3>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="indigo" pill>{selectedHPA.namespace}</Badge>
                                <Badge variant="emerald" pill>{selectedHPA.current_replicas} Replicas</Badge>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 uppercase mb-1">Target CPU</div>
                                <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                    {selectedHPA.target_cpu_utilization_percentage ? `${selectedHPA.target_cpu_utilization_percentage}%` : 'N/A'}
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 uppercase mb-1">Replicas (Min/Max)</div>
                                <div className="font-mono font-bold">{selectedHPA.min_replicas ?? 1} / {selectedHPA.max_replicas}</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 uppercase mb-1">Current Replicas</div>
                                <div className="font-mono font-bold">{selectedHPA.current_replicas}</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 uppercase mb-1">Desired Replicas</div>
                                <div className="font-mono font-bold">{selectedHPA.desired_replicas}</div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Cluster Info</h4>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Cluster</span>
                                    <span className="font-medium">{selectedHPA.cluster_name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Project</span>
                                    <span className="font-mono">{selectedHPA.project_id}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </SlideOver>
        </div>
    );
}

export default function GKEHPAPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading HPAs...</div>}>
            <GKEHPAContent />
        </Suspense>
    );
}
