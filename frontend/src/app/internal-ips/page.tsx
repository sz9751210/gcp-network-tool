'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useScan } from '@/contexts/ScanContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { UsedInternalIP } from '@/types/network';
import Pagination from '@/components/Pagination';
import Badge from '@/components/Badge';

function InternalIPsContent() {
    const { topology, metadata, refreshData } = useScan();
    const { t } = useLanguage();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<keyof UsedInternalIP>('ip_address');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [filterText, setFilterText] = useState(searchParams.get('q') || '');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [regionFilter, setRegionFilter] = useState<string>('all');
    const [vpcFilter, setVpcFilter] = useState<string>('all');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Sync filter with URL params
    useEffect(() => {
        setFilterText(searchParams.get('q') || '');
    }, [searchParams]);

    useEffect(() => {
        const load = async () => {
            await refreshData();
            setLoading(false);
        };
        load();
    }, [refreshData]);

    const internalIPs = useMemo(() => {
        if (!topology?.used_internal_ips) return [];
        return topology.used_internal_ips;
    }, [topology]);

    // Filter options with counts
    const projectOptions = useMemo(() => {
        const counts = new Map<string, number>();
        internalIPs.forEach(ip => {
            counts.set(ip.project_id, (counts.get(ip.project_id) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([value, count]) => ({ value, count }));
    }, [internalIPs]);

    const regionOptions = useMemo(() => {
        const counts = new Map<string, number>();
        internalIPs.forEach(ip => {
            counts.set(ip.region, (counts.get(ip.region) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([value, count]) => ({ value, count }));
    }, [internalIPs]);

    const vpcOptions = useMemo(() => {
        const counts = new Map<string, number>();
        internalIPs.forEach(ip => {
            counts.set(ip.vpc, (counts.get(ip.vpc) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([value, count]) => ({ value, count }));
    }, [internalIPs]);

    // Apply filters
    const filteredIPs = useMemo(() => {
        let filtered = [...internalIPs];

        if (projectFilter !== 'all') {
            filtered = filtered.filter(ip => ip.project_id === projectFilter);
        }
        if (regionFilter !== 'all') {
            filtered = filtered.filter(ip => ip.region === regionFilter);
        }
        if (vpcFilter !== 'all') {
            filtered = filtered.filter(ip => ip.vpc === vpcFilter);
        }

        if (filterText) {
            const lower = filterText.toLowerCase();
            filtered = filtered.filter(
                (ip) =>
                    ip.ip_address.toLowerCase().includes(lower) ||
                    ip.resource_name?.toLowerCase().includes(lower) ||
                    ip.vpc?.toLowerCase().includes(lower) ||
                    ip.subnet?.toLowerCase().includes(lower)
            );
        }

        return filtered;
    }, [internalIPs, projectFilter, regionFilter, vpcFilter, filterText]);

    // Sort IPs
    const sortedIPs = useMemo(() => {
        return [...filteredIPs].sort((a, b) => {
            const aVal = a[sortBy] ?? '';
            const bVal = b[sortBy] ?? '';

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredIPs, sortBy, sortOrder]);

    // Paginated IPs
    const totalPages = Math.ceil(sortedIPs.length / itemsPerPage);
    const paginatedIPs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedIPs.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedIPs, currentPage, itemsPerPage]);

    const handleSort = (column: keyof UsedInternalIP) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    // Reset pagination
    useEffect(() => {
        setCurrentPage(1);
    }, [filterText, projectFilter, regionFilter, vpcFilter, itemsPerPage]);

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
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('internalIps.title')}</h1>
                <p className="text-slate-600 dark:text-slate-400">
                    {metadata
                        ? `${t('internalIps.subtitle')} - ${metadata.totalProjects} ${t('dashboard.projects')}`
                        : t('internalIps.noData')}
                </p>
            </div>

            {!topology || internalIPs.length === 0 ? (
                <div className="card p-12 text-center">
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{t('internalIps.noData')}</h3>
                    <p className="text-slate-600 dark:text-slate-400">{t('internalIps.noDataDesc')}</p>
                </div>
            ) : (
                <div className="card shadow-sm overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                            {/* Search */}
                            <div className="relative w-full xl:w-64">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                </div>
                                <input
                                    type="text"
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="input-field pl-10"
                                    placeholder={t('internalIps.searchPlaceholder')}
                                />
                            </div>

                            {/* Filters */}
                            <div className="flex flex-wrap gap-2 items-center w-full xl:w-auto">
                                <select
                                    value={projectFilter}
                                    onChange={(e) => setProjectFilter(e.target.value)}
                                    className="input-select w-40"
                                >
                                    <option value="all">All Projects</option>
                                    {projectOptions.map(p => (
                                        <option key={p.value} value={p.value}>{p.value} ({p.count})</option>
                                    ))}
                                </select>

                                <select
                                    value={regionFilter}
                                    onChange={(e) => setRegionFilter(e.target.value)}
                                    className="input-select w-40"
                                >
                                    <option value="all">All Regions</option>
                                    {regionOptions.map(r => (
                                        <option key={r.value} value={r.value}>{r.value} ({r.count})</option>
                                    ))}
                                </select>

                                <select
                                    value={vpcFilter}
                                    onChange={(e) => setVpcFilter(e.target.value)}
                                    className="input-select w-40"
                                >
                                    <option value="all">All VPCs</option>
                                    {vpcOptions.map(v => (
                                        <option key={v.value} value={v.value}>{v.value} ({v.count})</option>
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
                                    {[
                                        { key: 'ip_address', label: t('internalIps.ipAddress') },
                                        { key: 'resource_name', label: t('internalIps.resourceName') },
                                        { key: 'resource_type', label: t('internalIps.resourceType') },
                                        { key: 'vpc', label: t('internalIps.vpc') },
                                        { key: 'subnet', label: t('internalIps.subnet') },
                                        { key: 'region', label: t('internalIps.region') },
                                        { key: 'project_id', label: t('publicIps.project') },
                                    ].map((col) => (
                                        <th
                                            key={col.key}
                                            onClick={() => handleSort(col.key as keyof UsedInternalIP)}
                                            className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <div className="flex items-center gap-1">
                                                {col.label}
                                                {sortBy === col.key && (
                                                    <span className="text-indigo-600 dark:text-indigo-400">
                                                        {sortOrder === 'asc' ? '↑' : '↓'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {paginatedIPs.map((ip, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-slate-800 dark:text-slate-100">{ip.ip_address}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{ip.resource_name || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {(() => {
                                                const type = ip.resource_type?.toUpperCase() || '';
                                                let variant: any = 'default';

                                                if (type === 'VM') variant = 'info';
                                                else if (type.includes('GKE')) variant = 'emerald';
                                                else if (type.includes('SQL')) variant = 'indigo'; // Using indigo instead of cyan as cyan isn't in my Badge default variants, or I could add it.
                                                // Actually 'cyan' fits 'info' or I can add 'cyan'. 
                                                // Let's check Badge.tsx again. I didn't add cyan. 
                                                // I'll stick to 'info' (blue) or 'indigo' for now to be safe, or 'emerald' if appropriate.
                                                // UsedInternalIP had 'bg-cyan-100'. 'info' is 'bg-blue-100'.
                                                // I will use 'info' for now or 'primary' (indigo).

                                                if (type.includes('SQL')) variant = 'info';

                                                return (
                                                    <Badge variant={variant}>
                                                        {ip.resource_type?.replace(/_/g, ' ') || 'Unknown'}
                                                    </Badge>
                                                )
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{ip.vpc}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 max-w-sm truncate">{ip.subnet || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{ip.region}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{ip.project_id}</td>
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
                        totalItems={internalIPs.length}
                        filteredCount={sortedIPs.length}
                    />
                </div>
            )}
        </div>
    );
}

export default function InternalIPsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
            <InternalIPsContent />
        </Suspense>
    );
}
