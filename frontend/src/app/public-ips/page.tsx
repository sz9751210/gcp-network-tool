'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useScan } from '@/contexts/ScanContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PublicIP } from '@/types/network';
import Pagination from '@/components/Pagination';
import Badge from '@/components/Badge';

function PublicIPsContent() {
    const { topology, metadata, refreshData } = useScan();
    const { t } = useLanguage();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<keyof PublicIP>('ip_address');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [filterText, setFilterText] = useState(searchParams.get('q') || '');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [regionFilter, setRegionFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const load = async () => {
            await refreshData();
            setLoading(false);
        };
        load();
    }, [refreshData]);

    const publicIPs = useMemo(() => {
        if (!topology?.public_ips) return [];
        return topology.public_ips;
    }, [topology]);

    // Filter options with counts
    const projectOptions = useMemo(() => {
        const counts = new Map<string, number>();
        publicIPs.forEach(ip => {
            counts.set(ip.project_id, (counts.get(ip.project_id) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([value, count]) => ({ value, count }));
    }, [publicIPs]);

    const regionOptions = useMemo(() => {
        const counts = new Map<string, number>();
        publicIPs.forEach(ip => {
            counts.set(ip.region, (counts.get(ip.region) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([value, count]) => ({ value, count }));
    }, [publicIPs]);

    const statusOptions = useMemo(() => {
        const counts = new Map<string, number>();
        publicIPs.forEach(ip => {
            counts.set(ip.status, (counts.get(ip.status) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([value, count]) => ({ value, count }));
    }, [publicIPs]);

    const typeOptions = useMemo(() => {
        const counts = new Map<string, number>();
        publicIPs.forEach(ip => {
            counts.set(ip.resource_type, (counts.get(ip.resource_type) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([value, count]) => ({ value, count }));
    }, [publicIPs]);

    // Apply filters
    const filteredIPs = useMemo(() => {
        let filtered = [...publicIPs];

        if (statusFilter !== 'all') {
            filtered = filtered.filter(ip => ip.status === statusFilter);
        }
        if (projectFilter !== 'all') {
            filtered = filtered.filter(ip => ip.project_id === projectFilter);
        }
        if (regionFilter !== 'all') {
            filtered = filtered.filter(ip => ip.region === regionFilter);
        }
        if (typeFilter !== 'all') {
            filtered = filtered.filter(ip => ip.resource_type === typeFilter);
        }

        if (filterText) {
            const lower = filterText.toLowerCase();
            filtered = filtered.filter(
                (ip) =>
                    ip.ip_address.toLowerCase().includes(lower) ||
                    ip.resource_name.toLowerCase().includes(lower) ||
                    ip.project_id.toLowerCase().includes(lower) ||
                    ip.region.toLowerCase().includes(lower)
            );
        }

        return filtered;
    }, [publicIPs, statusFilter, projectFilter, regionFilter, typeFilter, filterText]);

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

    const handleSort = (column: keyof PublicIP) => {
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
    }, [filterText, statusFilter, projectFilter, regionFilter, typeFilter, itemsPerPage]);

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
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('publicIps.title')}</h1>
                <p className="text-slate-600 dark:text-slate-400">
                    {metadata
                        ? `${t('publicIps.subtitle')} - ${metadata.totalProjects} ${t('dashboard.projects')}`
                        : t('publicIps.noData')}
                </p>
            </div>

            {!topology || publicIPs.length === 0 ? (
                <div className="card p-12 text-center">
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{t('publicIps.noData')}</h3>
                    <p className="text-slate-600 dark:text-slate-400">{t('publicIps.noDataDesc')}</p>
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
                                    placeholder={t('publicIps.searchPlaceholder')}
                                />
                            </div>

                            {/* Filters */}
                            <div className="flex flex-wrap gap-2 items-center w-full xl:w-auto">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="input-select w-36"
                                >
                                    <option value="all">{t('publicIps.status')} (All)</option>
                                    {statusOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.value} ({opt.count})</option>
                                    ))}
                                </select>

                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="input-select w-36"
                                >
                                    <option value="all">Type (All)</option>
                                    {typeOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.value} ({opt.count})</option>
                                    ))}
                                </select>

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
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    {[
                                        { key: 'ip_address', label: t('publicIps.ipAddress') },
                                        { key: 'resource_name', label: t('publicIps.resourceName') },
                                        { key: 'resource_type', label: t('publicIps.resourceType') },
                                        { key: 'status', label: t('publicIps.status') },
                                        { key: 'region', label: t('publicIps.region') },
                                        { key: 'project_id', label: t('publicIps.project') },
                                    ].map((col) => (
                                        <th
                                            key={col.key}
                                            onClick={() => handleSort(col.key as keyof PublicIP)}
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{ip.resource_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {(() => {
                                                let variant: any = 'default';
                                                const type = ip.resource_type?.toUpperCase() || '';
                                                if (type === 'VM') variant = 'info';
                                                else if (type.includes('LOAD_BALANCER') || type.includes('FORWARDING_RULE')) variant = 'indigo';
                                                else if (type === 'CLOUD_NAT') variant = 'amber';
                                                else if (type.includes('VPN')) variant = 'purple';

                                                return (
                                                    <Badge variant={variant}>
                                                        {ip.resource_type?.replace(/_/g, ' ')}
                                                    </Badge>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge variant={ip.status === 'IN_USE' ? 'success' : 'warning'} pill>
                                                {ip.status}
                                            </Badge>
                                        </td>
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
                        totalItems={publicIPs.length}
                        filteredCount={sortedIPs.length}
                    />
                </div>
            )}
        </div>
    );
}

export default function PublicIPsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
            <PublicIPsContent />
        </Suspense>
    );
}
