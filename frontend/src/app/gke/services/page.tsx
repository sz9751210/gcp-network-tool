'use client';

import { useState, useMemo, Suspense } from 'react';
import { useResources } from '@/lib/useResources';
import { useLanguage } from '@/contexts/LanguageContext';
import { GKEService } from '@/types/network';
import {
    Server,
    Search,
    Activity,
    ExternalLink,
    Globe,
    Network,
    Tag,
    Clock
} from 'lucide-react';
import Badge from '@/components/Badge';
import Pagination from '@/components/Pagination';
import SlideOver from '@/components/SlideOver';
import YamlViewer from '@/components/YamlViewer';
import Link from 'next/link';

function GKEServicesContent() {
    const { t } = useLanguage();
    const [search, setSearch] = useState('');
    const { data: services, loading } = useResources<GKEService>('gke-services');
    const [selectedService, setSelectedService] = useState<GKEService | null>(null);
    const [detailTab, setDetailTab] = useState<'details' | 'yaml'>('details');

    // Pagination
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const filtered = useMemo(() => {
        return services.filter(s =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.namespace.toLowerCase().includes(search.toLowerCase()) ||
            s.cluster_name.toLowerCase().includes(search.toLowerCase()) ||
            (s.cluster_ip || '').includes(search) ||
            (s.external_ip || '').includes(search)
        );
    }, [services, search]);

    const paginated = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
    }, [filtered, page, itemsPerPage]);

    if (loading && services.length === 0) {
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
                    <Server size={24} />
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {t('gke.services.title')}
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    {t('gke.services.subtitle')}
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={t('gke.services.searchPlaceholder')}
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
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('common.service')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('common.namespace')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('common.type')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('gke.services.clusterIp')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('gke.services.externalIp')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('common.cluster')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {paginated.map((s, idx) => (
                                <tr
                                    key={`${s.cluster_name}-${s.namespace}-${s.name}-${idx}`}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    onClick={() => setSelectedService(s)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Server className="text-indigo-500" size={18} />
                                            <span className="font-medium text-slate-900 dark:text-white">{s.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.namespace}</td>
                                    <td className="px-6 py-4 text-xs font-medium uppercase tracking-wider">{s.type}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.cluster_ip || '-'}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">{s.external_ip || '-'}</td>
                                    <td className="px-6 py-4 text-slate-500 text-xs font-mono">{s.cluster_name}</td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        {t('gke.services.noServices')}
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
                    totalItems={services.length}
                    filteredCount={filtered.length}
                />
            </div>

            <SlideOver
                isOpen={!!selectedService}
                onClose={() => { setSelectedService(null); setDetailTab('details'); }}
                title={t('gke.services.details')}
            >
                {selectedService && (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedService.name}</h3>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="blue" pill>{selectedService.namespace}</Badge>
                                <Badge variant="indigo" pill>{selectedService.type}</Badge>
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
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Connectivity</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                            <div className="text-xs text-slate-500 uppercase mb-1">{t('gke.services.clusterIp')}</div>
                                            <div className="font-mono font-bold">{selectedService.cluster_ip || t('common.none')}</div>
                                        </div>
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                            <div className="text-xs text-slate-500 uppercase mb-1">{t('gke.services.externalIp')}</div>
                                            <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                {selectedService.external_ip ? (
                                                    <Link href={`/public-ips?q=${selectedService.external_ip}`} className="hover:underline">
                                                        {selectedService.external_ip}
                                                    </Link>
                                                ) : t('common.none')}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{t('gke.services.ports')}</h4>
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-2">
                                            {selectedService.ports.map((p, i) => (
                                                <div key={i} className="flex justify-between text-sm">
                                                    <span className="text-slate-500">{p.name || 'default'}</span>
                                                    <span className="font-mono">{p.port}:{p.target_port} / {p.protocol}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {selectedService.selector && Object.keys(selectedService.selector).length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{t('gke.workloads.selector')}</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(selectedService.selector).map(([k, v]) => (
                                                    <Badge key={k} variant="secondary" pill className="text-[10px]">{k}: {v}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{t('gke.services.metadata')}</h4>
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">{t('common.cluster')}</span>
                                                <span className="font-medium">{selectedService.cluster_name}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">{t('common.created')}</span>
                                                <span className="font-mono text-xs">{selectedService.creation_timestamp ? new Date(selectedService.creation_timestamp).toLocaleString() : 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <YamlViewer yaml={selectedService.yaml_manifest || ''} />
                        )}
                    </div>
                )}
            </SlideOver>
        </div>
    );
}

export default function GKEServicesPage() {
    const { t } = useLanguage();
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">{t('common.loading')}...</div>}>
            <GKEServicesContent />
        </Suspense>
    );
}
