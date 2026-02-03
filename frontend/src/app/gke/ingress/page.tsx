'use client';

import { useState, useMemo, Suspense } from 'react';
import { useResources } from '@/lib/useResources';
import { useLanguage } from '@/contexts/LanguageContext';
import { GKEIngress } from '@/types/network';
import {
    Globe,
    Search,
    Activity,
    ExternalLink,
    Network,
    Clock,
    Shield
} from 'lucide-react';
import Badge from '@/components/Badge';
import Pagination from '@/components/Pagination';
import SlideOver from '@/components/SlideOver';
import Link from 'next/link';

function GKEIngressContent() {
    const { t } = useLanguage();
    const [search, setSearch] = useState('');
    const { data: ingressList, loading } = useResources<GKEIngress>('gke-ingress');
    const [selectedIngress, setSelectedIngress] = useState<GKEIngress | null>(null);

    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const filtered = useMemo(() => {
        return ingressList.filter(i =>
            i.name.toLowerCase().includes(search.toLowerCase()) ||
            i.namespace.toLowerCase().includes(search.toLowerCase()) ||
            i.cluster_name.toLowerCase().includes(search.toLowerCase()) ||
            (i.address || '').includes(search) ||
            i.hosts.some(h => h.toLowerCase().includes(search.toLowerCase()))
        );
    }, [ingressList, search]);

    const paginated = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
    }, [filtered, page, itemsPerPage]);

    if (loading && ingressList.length === 0) {
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
                    <Globe size={24} />
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {t('gke.ingress.title')}
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    {t('gke.ingress.subtitle')}
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search ingress..."
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
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ingress</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Namespace</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">IP Address</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hosts</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cluster</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {paginated.map((i, idx) => (
                                <tr
                                    key={`${i.cluster_name}-${i.namespace}-${i.name}-${idx}`}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    onClick={() => setSelectedIngress(i)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Globe className="text-indigo-500" size={18} />
                                            <span className="font-medium text-slate-900 dark:text-white">{i.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{i.namespace}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">{i.address || '-'}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-slate-500 max-w-xs truncate">
                                            {i.hosts.join(', ') || '*'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs font-mono">{i.cluster_name}</td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        {t('gke.ingress.noIngress')}
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
                    totalItems={ingressList.length}
                    filteredCount={filtered.length}
                />
            </div>

            <SlideOver
                isOpen={!!selectedIngress}
                onClose={() => setSelectedIngress(null)}
                title="Ingress Details"
            >
                {selectedIngress && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedIngress.name}</h3>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="blue" pill>{selectedIngress.namespace}</Badge>
                                <Badge variant="emerald" pill>{selectedIngress.address ? 'Active' : 'Pending'}</Badge>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Hosts</h4>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg flex flex-col gap-2">
                                    {selectedIngress.hosts.map((host, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <Globe size={14} className="text-slate-400" />
                                            <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{host}</span>
                                            <a href={`http://${host}`} target="_blank" rel="noopener noreferrer" className="ml-auto text-indigo-500 hover:text-indigo-600">
                                                <ExternalLink size={14} />
                                            </a>
                                        </div>
                                    ))}
                                    {selectedIngress.hosts.length === 0 && (
                                        <span className="text-sm text-slate-500 italic">No hosts defined (catch-all)</span>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 uppercase mb-1">Load Balancer IP</div>
                                <div className="font-mono font-bold text-lg text-indigo-600 dark:text-indigo-400">
                                    {selectedIngress.address ? (
                                        <Link href={`/public-ips?q=${selectedIngress.address}`} className="hover:underline">
                                            {selectedIngress.address}
                                        </Link>
                                    ) : 'None'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Rules</h4>
                                <div className="space-y-3">
                                    {selectedIngress.rules.map((r, ri) => (
                                        <div key={ri} className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg">
                                            <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-tight">Host: {r.host || '*'}</div>
                                            <div className="space-y-1">
                                                {r.http?.paths.map((p: any, pi: number) => (
                                                    <div key={pi} className="flex justify-between text-xs font-mono">
                                                        <span className="text-indigo-600 dark:text-indigo-400">{p.path}</span>
                                                        <span className="text-slate-500">→ {p.backend.service.name}:{p.backend.service.port.number}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Metadata</h4>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Cluster</span>
                                        <span className="font-medium">{selectedIngress.cluster_name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Created</span>
                                        <span className="font-mono text-xs">{selectedIngress.creation_timestamp ? new Date(selectedIngress.creation_timestamp).toLocaleString() : 'N/A'}</span>
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

export default function GKEIngressPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading ingress...</div>}>
            <GKEIngressContent />
        </Suspense>
    );
}
