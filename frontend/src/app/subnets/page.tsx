'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useScan } from '@/contexts/ScanContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Subnet } from '@/types/network';
import Pagination from '@/components/Pagination';

interface SubnetRow {
    projectName: string;
    vpcName: string;
    subnetName: string;
    region: string;
    ipCidrRange: string;
}

function SubnetsContent() {
    const { topology, metadata, refreshData } = useScan();
    const { t } = useLanguage();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<keyof SubnetRow>('subnetName');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Initialize from search params
    const initialVpc = searchParams.get('vpc') || 'all';
    const initialQuery = searchParams.get('q') || '';

    const [filterText, setFilterText] = useState(initialQuery);
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [vpcFilter, setVpcFilter] = useState<string>(initialVpc);
    const [regionFilter, setRegionFilter] = useState<string>('all');

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

    // Transform nested structure to flat table rows
    const subnetRows = useMemo(() => {
        if (!topology?.projects) return [];

        const rows: SubnetRow[] = [];
        topology.projects.forEach(project => {
            project.vpc_networks.forEach(vpc => {
                vpc.subnets.forEach(subnet => {
                    rows.push({
                        projectName: project.project_id,
                        vpcName: vpc.name,
                        subnetName: subnet.name,
                        region: subnet.region,
                        ipCidrRange: subnet.ip_cidr_range,
                    });
                });
            });
        });
        return rows;
    }, [topology]);

    // Filter options with counts
    const projectOptions = useMemo(() => {
        const counts = new Map<string, number>();
        subnetRows.forEach(row => {
            counts.set(row.projectName, (counts.get(row.projectName) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([value, count]) => ({ value, count }));
    }, [subnetRows]);

    const vpcOptions = useMemo(() => {
        const counts = new Map<string, number>();
        subnetRows.forEach(row => {
            counts.set(row.vpcName, (counts.get(row.vpcName) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([value, count]) => ({ value, count }));
    }, [subnetRows]);

    const regionOptions = useMemo(() => {
        const counts = new Map<string, number>();
        subnetRows.forEach(row => {
            counts.set(row.region, (counts.get(row.region) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([value, count]) => ({ value, count }));
    }, [subnetRows]);

    // Apply filters
    const filteredRows = useMemo(() => {
        let filtered = [...subnetRows];

        if (projectFilter !== 'all') {
            filtered = filtered.filter(row => row.projectName === projectFilter);
        }
        if (vpcFilter !== 'all') {
            filtered = filtered.filter(row => row.vpcName === vpcFilter);
        }
        if (regionFilter !== 'all') {
            filtered = filtered.filter(row => row.region === regionFilter);
        }

        if (filterText) {
            const lower = filterText.toLowerCase();
            filtered = filtered.filter(
                (row) =>
                    row.subnetName.toLowerCase().includes(lower) ||
                    row.ipCidrRange.toLowerCase().includes(lower) ||
                    row.vpcName.toLowerCase().includes(lower)
            );
        }

        return filtered;
    }, [subnetRows, projectFilter, vpcFilter, regionFilter, filterText]);

    // Sort rows
    const sortedRows = useMemo(() => {
        return [...filteredRows].sort((a, b) => {
            const aVal = a[sortBy] ?? '';
            const bVal = b[sortBy] ?? '';

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredRows, sortBy, sortOrder]);

    // Paginated rows
    const totalPages = Math.ceil(sortedRows.length / itemsPerPage);
    const paginatedRows = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedRows.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedRows, currentPage, itemsPerPage]);

    const handleSort = (column: keyof SubnetRow) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterText, projectFilter, vpcFilter, regionFilter, itemsPerPage]);

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
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('subnets.title')}</h1>
                <p className="text-slate-600 dark:text-slate-400">
                    {metadata
                        ? `${t('subnets.subtitle')} - ${metadata.totalProjects} ${t('dashboard.projects')}`
                        : t('subnets.noData')}
                </p>
            </div>

            {!topology || subnetRows.length === 0 ? (
                <div className="card p-12 text-center">
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{t('subnets.noData')}</h3>
                    <p className="text-slate-600 dark:text-slate-400">{t('subnets.noDataDesc')}</p>
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
                                    placeholder={t('subnets.searchPlaceholder')}
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
                                    value={vpcFilter}
                                    onChange={(e) => setVpcFilter(e.target.value)}
                                    className="input-select w-40"
                                >
                                    <option value="all">All VPCs</option>
                                    {vpcOptions.map(v => (
                                        <option key={v.value} value={v.value}>{v.value} ({v.count})</option>
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
                            <thead className="bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    {[
                                        { key: 'projectName', label: t('publicIps.project') },
                                        { key: 'vpcName', label: 'VPC' },
                                        { key: 'subnetName', label: t('subnets.subnetName') },
                                        { key: 'region', label: t('publicIps.region') },
                                        { key: 'ipCidrRange', label: t('subnets.cidrRange') },
                                    ].map((col) => (
                                        <th
                                            key={col.key}
                                            onClick={() => handleSort(col.key as keyof SubnetRow)}
                                            className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
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
                                {paginatedRows.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{row.projectName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300 font-medium">{row.vpcName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-100">{row.subnetName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{row.region}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-indigo-700 dark:text-indigo-400">{row.ipCidrRange}</td>
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
                        totalItems={subnetRows.length}
                        filteredCount={sortedRows.length}
                    />
                </div>
            )}
        </div>
    );
}

export default function SubnetsPage() {
    return (
        <Suspense fallback={
            <div className="p-8 max-w-[1800px] mx-auto text-center">
                <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400">Loading subnets...</p>
            </div>
        }>
            <SubnetsContent />
        </Suspense>
    );
}
