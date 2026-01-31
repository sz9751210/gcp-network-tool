'use client';

import { useState, useMemo } from 'react';
import { useResources } from '@/lib/useResources';
import { useLanguage } from '@/contexts/LanguageContext';
import { GCEInstance } from '@/types/network';
import {
    Server,
    Search,
    Filter,
    Activity,
    ExternalLink,
    Shield,
    Cpu,
    Network as NetworkIcon,
    Clock,
    Tag,
    UserCircle,
    Globe
} from 'lucide-react';
import SlideOver from '@/components/SlideOver';
import Badge from '@/components/Badge';
import Link from 'next/link';

export default function GCEInstancesPage() {
    const { data: allInstances, loading, refresh } = useResources<GCEInstance & { project_name?: string }>('instances');
    const { t } = useLanguage();
    const [search, setSearch] = useState('');
    const [selectedInstance, setSelectedInstance] = useState<GCEInstance | null>(null);

    const filteredInstances = useMemo(() => {
        return allInstances.filter(inst =>
            inst.name.toLowerCase().includes(search.toLowerCase()) ||
            inst.project_id.toLowerCase().includes(search.toLowerCase()) ||
            (inst.internal_ip || '').includes(search) ||
            (inst.external_ip || '').includes(search)
        );
    }, [allInstances, search]);

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
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <Server size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {t('gce.title')}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            {t('gce.subtitle')}
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
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Filter size={16} />
                        <span>{filteredInstances.length} {t('sidebar.gce')}</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('ipAddress.name') || 'Instance Name'}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('publicIps.status') || 'Status'}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Network Info</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('publicIps.project') || 'Project'}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('publicIps.region') || 'Zone'}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Machine Type</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredInstances.map((inst, idx) => (
                                <tr
                                    key={`${inst.project_id}-${inst.name}-${idx}`}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group cursor-pointer"
                                    onClick={() => setSelectedInstance(inst)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-md text-slate-600 dark:text-slate-400">
                                                <Server size={18} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900 dark:text-white">{inst.name}</div>
                                                <div className="text-xs text-slate-500 font-mono">{inst.project_id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${inst.status === 'RUNNING'
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${inst.status === 'RUNNING' ? 'bg-emerald-500' : 'bg-slate-400'
                                                }`} />
                                            {inst.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-slate-400 w-16">Internal:</span>
                                                <span className="font-mono text-slate-700 dark:text-slate-300">{inst.internal_ip || 'N/A'}</span>
                                            </div>
                                            {inst.external_ip && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-slate-400 w-16">External:</span>
                                                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{inst.external_ip}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-600 dark:text-slate-400">
                                            {inst.project_name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                            <Activity size={14} className="text-slate-400" />
                                            {inst.zone}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-mono text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                            <Cpu size={14} className="text-slate-400" />
                                            {inst.machine_type}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredInstances.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-500">
                                            <Server size={40} className="text-slate-300 mb-2" />
                                            <p className="font-medium">No instances found</p>
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
                isOpen={!!selectedInstance}
                onClose={() => setSelectedInstance(null)}
                title={t('gce.title')}
                width="max-w-2xl"
            >
                {selectedInstance && (
                    <div className="space-y-6">
                        {/* Header Info */}
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white break-all">{selectedInstance.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                <span>{selectedInstance.project_id}</span>
                                <span>•</span>
                                <Badge variant={selectedInstance.status === 'RUNNING' ? 'emerald' : 'secondary'} pill>
                                    {selectedInstance.status}
                                </Badge>
                            </p>
                        </div>

                        {/* Main Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                    <NetworkIcon size={12} /> Internal IP
                                </div>
                                <div className="font-mono font-semibold text-slate-800 dark:text-slate-100 italic">
                                    {selectedInstance.internal_ip ? (
                                        <Link href={`/internal-ips?q=${selectedInstance.internal_ip}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                                            {selectedInstance.internal_ip}
                                        </Link>
                                    ) : 'N/A'}
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                    <Globe size={12} /> External IP
                                </div>
                                <div className="font-mono font-semibold">
                                    {selectedInstance.external_ip ? (
                                        <Link href={`/public-ips?q=${selectedInstance.external_ip}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                                            {selectedInstance.external_ip}
                                        </Link>
                                    ) : (
                                        <span className="text-slate-400">None</span>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                    <Cpu size={12} /> Machine Type
                                </div>
                                <div className="font-semibold text-slate-800 dark:text-slate-100">{selectedInstance.machine_type}</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                    <Activity size={12} /> Zone
                                </div>
                                <div className="font-semibold text-slate-800 dark:text-slate-100">{selectedInstance.zone}</div>
                            </div>
                        </div>

                        {/* Network Details */}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Network Configuration</h4>
                            <dl className="space-y-4">
                                <div>
                                    <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">VPC Network</dt>
                                    <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 p-2 rounded break-all font-mono text-xs">
                                        <Link
                                            href={`/subnets?vpc=${selectedInstance.network.split('/').pop()}`}
                                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                                        >
                                            {selectedInstance.network.split('/').pop()}
                                        </Link>
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Subnet</dt>
                                    <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 p-2 rounded break-all font-mono text-xs">
                                        <Link
                                            href={`/subnets?q=${selectedInstance.subnet.split('/').pop()}`}
                                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                                        >
                                            {selectedInstance.subnet.split('/').pop()}
                                        </Link>
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        {/* Metadata Details */}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-6">
                            {selectedInstance.tags && selectedInstance.tags.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Tag size={16} className="text-slate-400" /> Network Tags
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedInstance.tags.map(tag => (
                                            <Badge key={tag} variant="indigo" pill>
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedInstance.labels && Object.keys(selectedInstance.labels).length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Tag size={16} className="text-slate-400" /> Labels
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(selectedInstance.labels).map(([k, v]) => (
                                            <Badge key={k} variant="blue" pill className="normal-case">
                                                {k}: {v}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedInstance.service_accounts && selectedInstance.service_accounts.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <UserCircle size={16} className="text-slate-400" /> Service Accounts
                                    </h4>
                                    <div className="space-y-1">
                                        {selectedInstance.service_accounts.map(sa => (
                                            <div key={sa} className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2 rounded">
                                                {sa}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedInstance.creation_timestamp && (
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                        <Clock size={16} className="text-slate-400" /> Created
                                    </h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {new Date(selectedInstance.creation_timestamp).toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </SlideOver>
        </div>
    );
}
