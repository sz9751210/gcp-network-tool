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
    Layers,
    Cpu,
    Shield,
    Clock,
    Tag,
    UserCircle,
    Server,
    Zap
} from 'lucide-react';
import SlideOver from '@/components/SlideOver';
import Badge from '@/components/Badge';
import Link from 'next/link';

export default function GKEClustersPage() {
    const { data: allClusters, loading, refresh } = useResources<GKECluster & { project_name?: string }>('gke-clusters');
    const { t } = useLanguage();
    const [search, setSearch] = useState('');
    const [selectedCluster, setSelectedCluster] = useState<GKECluster | null>(null);

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
                                <tr
                                    key={`${cluster.project_id}-${cluster.name}-${idx}`}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group cursor-pointer"
                                    onClick={() => setSelectedCluster(cluster)}
                                >
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

            {/* Details SlideOver */}
            <SlideOver
                isOpen={!!selectedCluster}
                onClose={() => setSelectedCluster(null)}
                title={t('gke.title')}
                width="max-w-2xl"
            >
                {selectedCluster && (
                    <div className="space-y-6">
                        {/* Header Info */}
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white break-all">{selectedCluster.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                <span>{selectedCluster.project_id}</span>
                                <span>•</span>
                                <Badge variant={selectedCluster.status === 'RUNNING' ? 'emerald' : 'secondary'} pill>
                                    {selectedCluster.status}
                                </Badge>
                            </p>
                        </div>

                        {/* Main Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                    <Zap size={12} /> Version
                                </div>
                                <div className="font-semibold text-slate-800 dark:text-slate-100">v{selectedCluster.version}</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                    <Server size={12} /> Nodes
                                </div>
                                <div className="font-semibold text-slate-800 dark:text-slate-100">{selectedCluster.node_count} instances</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg col-span-2">
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                    <Share2 size={12} /> Control Plane Endpoint
                                </div>
                                <div className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 break-all">{selectedCluster.endpoint}</div>
                            </div>
                        </div>

                        {/* Network Configuration */}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Network Connectivity</h4>
                            <dl className="space-y-4">
                                <div>
                                    <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">VPC Network</dt>
                                    <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 p-2 rounded break-all font-mono text-xs">
                                        <Link
                                            href={`/subnets?vpc=${selectedCluster.network.split('/').pop()}`}
                                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                                        >
                                            {selectedCluster.network.split('/').pop()}
                                        </Link>
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Subnet</dt>
                                    <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 p-2 rounded break-all font-mono text-xs">
                                        <Link
                                            href={`/subnets?q=${selectedCluster.subnet.split('/').pop()}`}
                                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                                        >
                                            {selectedCluster.subnet.split('/').pop()}
                                        </Link>
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        {/* CIDR Blocks */}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">IP Address Management (IPAM)</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="info">PODS</Badge>
                                        <span className="text-xs text-slate-500 uppercase tracking-wide">Pod CIDR</span>
                                    </div>
                                    <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedCluster.pods_ipv4_cidr || 'Disabled'}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="blue">SERVICES</Badge>
                                        <span className="text-xs text-slate-500 uppercase tracking-wide">Service CIDR</span>
                                    </div>
                                    <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedCluster.services_ipv4_cidr || 'Disabled'}</span>
                                </div>
                                {selectedCluster.master_ipv4_cidr && (
                                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="indigo">MASTER</Badge>
                                            <span className="text-xs text-slate-500 uppercase tracking-wide">Master CIDR</span>
                                        </div>
                                        <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedCluster.master_ipv4_cidr}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Metadata Details */}
                        {selectedCluster.labels && Object.keys(selectedCluster.labels).length > 0 && (
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                    <Tag size={16} className="text-slate-400" /> Labels
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(selectedCluster.labels).map(([k, v]) => (
                                        <Badge key={k} variant="blue" pill className="normal-case">
                                            {k}: {v}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                <Globe size={16} className="text-slate-400" /> Location
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                {selectedCluster.location} Cluster
                            </p>
                        </div>
                    </div>
                )}
            </SlideOver>
        </div>
    );
}
