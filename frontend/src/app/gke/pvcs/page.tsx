'use client';

import { useState, useMemo, Suspense } from 'react';
import { useResources } from '@/lib/useResources';
import { useLanguage } from '@/contexts/LanguageContext';
import { GKEPVC } from '@/types/network';
import {
    HardDrive,
    Search,
    Activity,
    Database,
    Tag,
    Clock,
    Layers,
    Activity as ActivityIcon
} from 'lucide-react';
import Badge from '@/components/Badge';
import Pagination from '@/components/Pagination';
import SlideOver from '@/components/SlideOver';

function GKEPvcsContent() {
    const { t } = useLanguage();
    const [search, setSearch] = useState('');
    const { data: pvcs, loading } = useResources<GKEPVC>('gke-pvcs');
    const [selectedPVC, setSelectedPVC] = useState<GKEPVC | null>(null);

    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const filtered = useMemo(() => {
        return pvcs.filter(pvc =>
            pvc.name.toLowerCase().includes(search.toLowerCase()) ||
            pvc.namespace.toLowerCase().includes(search.toLowerCase()) ||
            pvc.cluster_name.toLowerCase().includes(search.toLowerCase()) ||
            (pvc.volume_name || '').toLowerCase().includes(search.toLowerCase())
        );
    }, [pvcs, search]);

    const paginated = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
    }, [filtered, page, itemsPerPage]);

    if (loading && pvcs.length === 0) {
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
                    <HardDrive size={24} />
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {t('gke.pvcs.title')}
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    {t('gke.pvcs.subtitle')}
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={t('gke.pvcs.searchPlaceholder')}
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
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('common.name')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('common.namespace')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('common.status')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('gke.pvcs.capacity')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('gke.pvcs.storageClass')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('common.cluster')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {paginated.map((pvc, idx) => (
                                <tr
                                    key={`${pvc.cluster_name}-${pvc.namespace}-${pvc.name}-${idx}`}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    onClick={() => setSelectedPVC(pvc)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Database className="text-rose-500" size={18} />
                                            <span className="font-medium text-slate-900 dark:text-white">{pvc.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{pvc.namespace}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant={pvc.status === 'Bound' ? 'emerald' : pvc.status === 'Pending' ? 'amber' : 'error'} pill>
                                            {pvc.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {pvc.capacity || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500 italic">
                                        {pvc.storage_class || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs font-mono">{pvc.cluster_name}</td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        {t('gke.pvcs.noPvcs')}
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
                    totalItems={pvcs.length}
                    filteredCount={filtered.length}
                />
            </div>

            <SlideOver
                isOpen={!!selectedPVC}
                onClose={() => setSelectedPVC(null)}
                title={t('gke.pvcs.details')}
            >
                {selectedPVC && (
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Database className="text-rose-500" size={20} />
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedPVC.name}</h3>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="blue" pill>{selectedPVC.namespace}</Badge>
                                <Badge variant={selectedPVC.status === 'Bound' ? 'emerald' : 'amber'} pill>{selectedPVC.status}</Badge>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex flex-col gap-1 border border-slate-200 dark:border-slate-800">
                                <div className="text-xs text-slate-500 uppercase">{t('gke.pvcs.capacity')}</div>
                                <div className="text-lg font-bold text-slate-900 dark:text-white">{selectedPVC.capacity || 'N/A'}</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex flex-col gap-1 border border-slate-200 dark:border-slate-800">
                                <div className="text-xs text-slate-500 uppercase">{t('gke.pvcs.accessModes')}</div>
                                <div className="flex flex-wrap gap-1">
                                    {selectedPVC.access_modes.map(mode => (
                                        <Badge key={mode} variant="secondary" className="text-[9px] py-0">{mode}</Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{t('gke.pvcs.volumeInfo')}</h4>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-3 border border-slate-200 dark:border-slate-800">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">{t('gke.pvcs.volumeName')}</span>
                                        <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">{selectedPVC.volume_name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">{t('gke.pvcs.storageClass')}</span>
                                        <span className="text-xs font-medium">{selectedPVC.storage_class || 'Default'}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{t('gke.pvcs.location')}</h4>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-2 border border-slate-200 dark:border-slate-800">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">{t('common.cluster')}</span>
                                        <span className="font-medium text-xs font-mono">{selectedPVC.cluster_name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">{t('publicIps.project')}</span>
                                        <span className="font-medium text-xs font-mono">{selectedPVC.project_id}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            <Layers className="text-indigo-600 dark:text-indigo-400" size={16} />
                            <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">{t('gke.pvcs.comingSoon')}</span>
                        </div>
                    </div>
                )}
            </SlideOver>
        </div>
    );
}

export default function GKEPvcsPage() {
    const { t } = useLanguage();
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">{t('common.loading')}...</div>}>
            <GKEPvcsContent />
        </Suspense>
    );
}
