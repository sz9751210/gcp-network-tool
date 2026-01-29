'use client';

import { useState, useEffect, useMemo } from 'react';
import { useScan } from '@/contexts/ScanContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Pagination from '@/components/Pagination';

interface LoadBalancer {
    ip: string;
    name: string;
    type: string;
    scope: 'Global' | 'Regional';
    network: string; // VPC or Region
    project: string;
    source: 'Public' | 'Internal';
}

export default function LoadBalancersPage() {
    const { topology, metadata, refreshData } = useScan();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterText, setFilterText] = useState('');
    const [projectFilter, setProjectFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [scopeFilter, setScopeFilter] = useState('all');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const load = async () => {
            await refreshData();
            setLoading(false);
        };
        load();
    }, [refreshData]);

    const loadBalancers = useMemo(() => {
        if (!topology) return [];

        const lbs: LoadBalancer[] = [];

        // 1. Process Public IPs
        if (topology.public_ips) {
            topology.public_ips.forEach(ip => {
                const type = ip.resource_type || '';
                const upperType = type.toUpperCase();

                // Check if it's a Load Balancer related resource
                if (upperType.includes('LOAD_BALANCER') || upperType.includes('FORWARDING_RULE') || upperType === 'LOADBALANCER') {
                    lbs.push({
                        ip: ip.ip_address,
                        name: ip.resource_name,
                        type: type.replace(/_/g, ' '),
                        scope: ip.region === 'global' ? 'Global' : 'Regional',
                        network: ip.region,
                        project: ip.project_id,
                        source: 'Public'
                    });
                }
            });
        }

        // 2. Process Internal IPs
        if (topology.used_internal_ips) {
            topology.used_internal_ips.forEach(ip => {
                const type = ip.resource_type || '';
                const upperType = type.toUpperCase();

                // Check if it's a Load Balancer related resource (Internal LB usually)
                if (upperType.includes('LOAD_BALANCER') || upperType.includes('FORWARDING_RULE') || upperType.includes('ILB')) {
                    lbs.push({
                        ip: ip.ip_address,
                        name: ip.resource_name,
                        type: type.replace(/_/g, ' '),
                        scope: 'Regional', // Internal LBs are typically regional
                        network: `${ip.vpc} / ${ip.subnet}`,
                        project: ip.project_id,
                        source: 'Internal'
                    });
                }
            });
        }

        return lbs;
    }, [topology]);

    // Apply filters
    const filteredLbs = useMemo(() => {
        return loadBalancers.filter(lb => {
            const matchesText = filterText === '' ||
                lb.name.toLowerCase().includes(filterText.toLowerCase()) ||
                lb.ip.includes(filterText) ||
                lb.project.toLowerCase().includes(filterText.toLowerCase());

            const matchesProject = projectFilter === 'all' || lb.project === projectFilter;
            const matchesType = typeFilter === 'all' || lb.type === typeFilter;
            const matchesScope = scopeFilter === 'all' || lb.scope === scopeFilter;

            return matchesText && matchesProject && matchesType && matchesScope;
        });
    }, [loadBalancers, filterText, projectFilter, typeFilter, scopeFilter]);

    // Pagination logic
    const totalPages = Math.ceil(filteredLbs.length / itemsPerPage);
    const paginatedLbs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredLbs.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredLbs, currentPage, itemsPerPage]);

    // Unique values for filters
    const projectOptions = useMemo(() => Array.from(new Set(loadBalancers.map(lb => lb.project))).sort(), [loadBalancers]);
    const typeOptions = useMemo(() => Array.from(new Set(loadBalancers.map(lb => lb.type))).sort(), [loadBalancers]);
    const scopeOptions = ['Global', 'Regional'];

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterText, projectFilter, typeFilter, scopeFilter, itemsPerPage]);

    if (loading) {
        return (
            <div className="p-8 max-w-[1800px] mx-auto">
                <div className="card p-12 text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1800px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('loadBalancers.title')}</h1>
                <p className="text-slate-600 dark:text-slate-400">
                    {metadata
                        ? `${t('loadBalancers.subtitle')} - ${metadata.totalProjects} ${t('dashboard.projects')}`
                        : t('loadBalancers.noData')}
                </p>
            </div>

            {!topology || loadBalancers.length === 0 ? (
                <div className="card p-12 text-center">
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{t('loadBalancers.noData')}</h3>
                    <p className="text-slate-600 dark:text-slate-400">{t('loadBalancers.noDataDesc')}</p>
                </div>
            ) : (
                <div className="card shadow-sm overflow-hidden">
                    {/* Controls */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                            {/* Search */}
                            <div className="relative w-full xl:w-72">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                </div>
                                <input
                                    type="text"
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="input-field pl-10"
                                    placeholder={t('loadBalancers.searchPlaceholder')}
                                />
                            </div>

                            {/* Filters */}
                            <div className="flex flex-wrap gap-2 items-center w-full xl:w-auto">
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="input-select w-40"
                                >
                                    <option value="all">All Types</option>
                                    {typeOptions.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>

                                <select
                                    value={projectFilter}
                                    onChange={(e) => setProjectFilter(e.target.value)}
                                    className="input-select w-40"
                                >
                                    <option value="all">All Projects</option>
                                    {projectOptions.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>

                                <select
                                    value={scopeFilter}
                                    onChange={(e) => setScopeFilter(e.target.value)}
                                    className="input-select w-32"
                                >
                                    <option value="all">All Scopes</option>
                                    {scopeOptions.map(s => (
                                        <option key={s} value={s}>{s === 'Global' ? t('loadBalancers.global') : t('loadBalancers.regional')}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('loadBalancers.ipAddress')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('loadBalancers.name')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('loadBalancers.type')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('loadBalancers.scope')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('loadBalancers.network')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('loadBalancers.project')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {paginatedLbs.map((lb, idx) => (
                                    <tr key={`${lb.ip}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-slate-800 dark:text-slate-100">{lb.ip}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{lb.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex px-2 py-1 text-xs font-bold rounded uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                {lb.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${lb.scope === 'Global'
                                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                }`}>
                                                {lb.scope === 'Global' ? t('loadBalancers.global') : t('loadBalancers.regional')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{lb.network}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{lb.project}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={setItemsPerPage}
                        totalItems={filteredLbs.length}
                        filteredCount={filteredLbs.length}
                    />

                    {/* Summary Footer */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                        <span>{t('loadBalancers.totalLbs')}: <span className="font-semibold text-slate-700 dark:text-slate-300">{loadBalancers.length}</span></span>
                        <span className="flex gap-4">
                            <span>Public: <span className="font-semibold">{loadBalancers.filter(l => l.source === 'Public').length}</span></span>
                            <span>Internal: <span className="font-semibold">{loadBalancers.filter(l => l.source === 'Internal').length}</span></span>
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
