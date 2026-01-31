'use client';

import { useState, useMemo } from 'react';
import { useResources } from '@/lib/useResources';
import { useLanguage } from '@/contexts/LanguageContext';
import { GKECluster } from '@/types/network';
import {
    Box,
    Search,
    Filter,
    Activity,
    Share2,
    ShieldCheck,
    Globe,
    Network as NetworkIcon,
    Layers
} from 'lucide-react';

export default function GKEClustersPage() {
    const { data: allClusters, loading, refresh } = useResources<GKECluster & { project_name?: string }>('gke-clusters');
    const { t } = useLanguage();
    const [search, setSearch] = useState('');

    const filteredClusters = useMemo(() => {
        return allClusters.filter(cluster =>
            cluster.name.toLowerCase().includes(search.toLowerCase()) ||
            cluster.project_id.toLowerCase().includes(search.toLowerCase()) ||
            cluster.location.toLowerCase().includes(search.toLowerCase()) ||
            (cluster.endpoint || '').includes(search)
        );
    }, [allClusters, search]);

    if (loading) {
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
        <div className="p-8 max-w-[1600px] mx-auto">
            <header className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <Box size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {t('gke.title')}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            {t('gke.subtitle')}
                        </p>
                    </div>
                </div>
            </header>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={t('publicIps.searchPlaceholder')}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Filter size={16} />
                        <span>{filteredClusters.length} {t('sidebar.gke')}</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('ipAddress.name') || 'Cluster Name'}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('publicIps.status') || 'Status'}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Network Configuration</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">CIDR Blocks</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('publicIps.region') || 'Location'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredClusters.map((cluster, idx) => (
                                <tr key={`${cluster.project_id}-${cluster.name}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-md text-blue-600 dark:text-blue-400">
                                                <Box size={18} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900 dark:text-white">{cluster.name}</div>
                                                <div className="text-xs text-slate-500 font-mono">v{cluster.version}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cluster.status === 'RUNNING'
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${cluster.status === 'RUNNING' ? 'bg-emerald-500' : 'bg-amber-500'
                                                }`} />
                                            {cluster.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Share2 size={12} className="text-slate-400" />
                                                <span className="text-slate-600 dark:text-slate-400">Endpoint: {cluster.endpoint}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]" title={cluster.network}>
                                                <NetworkIcon size={12} />
                                                {cluster.network.split('/').pop()}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-[11px]">
                                                <span className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 w-12 text-center">PODS</span>
                                                <span className="font-mono text-slate-700 dark:text-slate-300">{cluster.pods_ipv4_cidr || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px]">
                                                <span className="bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded text-blue-600 w-12 text-center">SVC</span>
                                                <span className="font-mono text-slate-700 dark:text-slate-300">{cluster.services_ipv4_cidr || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                            <Globe size={14} className="text-slate-400" />
                                            {cluster.location}
                                            <span className="text-xs bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded ml-1">
                                                {cluster.node_count} nodes
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredClusters.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-500">
                                            <Layers size={40} className="text-slate-300 mb-2" />
                                            <p className="font-medium">No GKE clusters found</p>
                                            <p className="text-sm text-slate-400">Try adjusting your search or filters</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
