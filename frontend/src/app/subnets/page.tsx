'use client';

import { useState, useEffect, useMemo } from 'react';
import { NetworkTopology, Subnet as SubnetType } from '@/types/network';
import { useScan } from '@/contexts/ScanContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface SubnetRow {
    projectId: string;
    projectName: string;
    vpcName: string;
    subnetName: string;
    region: string;
    cidr: string;
    gatewayIp: string | null;
    privateGoogleAccess: boolean;
    selfLink: string;
}

const calculateHosts = (cidr: string) => {
    try {
        const prefix = parseInt(cidr.split('/')[1], 10);
        return Math.pow(2, 32 - prefix) - 2;
    } catch {
        return 0;
    }
};

export default function SubnetsPage() {
    const { topology, metadata, refreshData } = useScan();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<keyof SubnetRow>('cidr');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [filterText, setFilterText] = useState('');

    // New Filters
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [regionFilter, setRegionFilter] = useState<string>('all');

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

    const subnets = useMemo(() => {
        if (!topology) return [];

        const rows: SubnetRow[] = [];
        topology.projects.forEach((project) => {
            project.vpc_networks.forEach((vpc) => {
                vpc.subnets.forEach((subnet) => {
                    rows.push({
                        projectId: project.project_id,
                        projectName: project.project_name,
                        vpcName: vpc.name,
                        subnetName: subnet.name,
                        region: subnet.region,
                        cidr: subnet.ip_cidr_range,
                        gatewayIp: subnet.gateway_ip,
                        privateGoogleAccess: subnet.private_ip_google_access,
                        selfLink: subnet.self_link,
                    });
                });
            });
        });

        return rows;
    }, [topology]);

    const filteredAndSortedSubnets = useMemo(() => {
        let result = subnets.filter((subnet) => {
            const searchText = filterText.toLowerCase();
            const matchesSearch = (
                subnet.projectName.toLowerCase().includes(searchText) ||
                subnet.vpcName.toLowerCase().includes(searchText) ||
                subnet.subnetName.toLowerCase().includes(searchText) ||
                subnet.cidr.includes(searchText)
            );

            const matchesProject = projectFilter === 'all' || subnet.projectId === projectFilter;
            const matchesRegion = regionFilter === 'all' || subnet.region === regionFilter;

            return matchesSearch && matchesProject && matchesRegion;
        });

        // Sort subnets with null handling
        result.sort((a, b) => {
            let aVal: string | boolean | null = a[sortBy];
            let bVal: string | boolean | null = b[sortBy];

            // Handle null values
            if (aVal === null) return sortOrder === 'asc' ? 1 : -1;
            if (bVal === null) return sortOrder === 'asc' ? -1 : 1;

            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [subnets, sortBy, sortOrder, filterText, projectFilter, regionFilter]);

    // Derived unique values for dropdowns
    const uniqueProjects = useMemo(() => {
        const projects = new Map<string, string>();
        subnets.forEach(s => projects.set(s.projectId, s.projectName));
        return Array.from(projects.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    }, [subnets]);

    const uniqueRegions = useMemo(() => {
        return Array.from(new Set(subnets.map(s => s.region))).sort();
    }, [subnets]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredAndSortedSubnets.length / itemsPerPage);
    const paginatedSubnets = filteredAndSortedSubnets.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterText, projectFilter, regionFilter, itemsPerPage]);

    const handleSort = (column: keyof SubnetRow) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const exportToCSV = () => {
        const headers = ['Project', 'VPC', 'Subnet', 'Region', 'CIDR', 'Gateway', 'Private Google Access'];
        const rows = filteredAndSortedSubnets.map((s) => [
            s.projectName,
            s.vpcName,
            s.subnetName,
            s.region,
            s.cidr,
            s.gatewayIp || '',
            s.privateGoogleAccess ? 'Yes' : 'No',
        ]);

        const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gcp-subnets.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">{t('subnets.title')}</h1>
                <p className="text-slate-600">{t('subnets.subtitle')}</p>
            </div>

            {/* Controls */}
            <div className="card mb-6 p-6">
                <div className="flex gap-4 items-center flex-wrap">
                    <div className="flex-1 min-w-[300px]">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.3-4.3" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="input-field pl-10"
                                placeholder={t('subnets.searchPlaceholder')}
                            />
                        </div>
                    </div>
                    <button
                        onClick={exportToCSV}
                        disabled={filteredAndSortedSubnets.length === 0}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('common.download')} CSV
                    </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 items-center justify-between text-sm text-slate-600">
                    <div className="flex gap-4">
                        <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            className="input-select w-48"
                        >
                            <option value="all">All Projects</option>
                            {uniqueProjects.map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                        <select
                            value={regionFilter}
                            onChange={(e) => setRegionFilter(e.target.value)}
                            className="input-select w-40"
                        >
                            <option value="all">All Regions</option>
                            {uniqueRegions.map(region => (
                                <option key={region} value={region}>{region}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        {t('cloudArmor.showing')} <span className="font-semibold text-indigo-600">{filteredAndSortedSubnets.length}</span> / {' '}
                        <span className="font-semibold">{subnets.length}</span> {t('dashboard.subnets').toLowerCase()}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-100 border-b border-slate-200">
                            <tr>
                                {[
                                    { key: 'projectName', label: t('publicIps.project') },
                                    { key: 'vpcName', label: 'VPC' },
                                    { key: 'subnetName', label: t('dashboard.subnets') },
                                    { key: 'region', label: t('subnets.region') },
                                    { key: 'cidr', label: t('subnets.cidr') },

                                    { key: 'capacity', label: 'Capacity' },
                                    { key: 'gatewayIp', label: t('subnets.gateway') },
                                    { key: 'actions', label: 'Actions' },
                                ].map((col) => (
                                    <th
                                        key={col.key}
                                        onClick={() => handleSort(col.key as keyof SubnetRow)}
                                        className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-200 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            {col.label}
                                            {sortBy === col.key && (
                                                <span className="text-indigo-600">
                                                    {sortOrder === 'asc' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {paginatedSubnets.map((subnet, idx) => (
                                <tr
                                    key={`${subnet.projectId}-${subnet.vpcName}-${subnet.subnetName}-${idx}`}
                                    className="hover:bg-slate-50 transition-colors"
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                        {subnet.projectName}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-700">{subnet.vpcName}</td>
                                    <td className="px-6 py-4 text-sm text-slate-700">{subnet.subnetName}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{subnet.region}</td>
                                    <td className="px-6 py-4 text-sm font-mono text-indigo-600">{subnet.cidr}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        <div className="flex flex-col gap-1 w-24">
                                            <div className="text-xs font-mono">{calculateHosts(subnet.cidr).toLocaleString()} IP</div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-400"
                                                    style={{ width: `${Math.min(100, Math.max(5, (32 - parseInt(subnet.cidr.split('/')[1])) * 5))}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-slate-600">
                                        {subnet.gatewayIp || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        <a
                                            href={`https://console.cloud.google.com/networking/subnetworks/details/${subnet.region}/${subnet.subnetName}?project=${subnet.projectId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                                            title="Open in GCP Console"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                <polyline points="15 3 21 3 21 9"></polyline>
                                                <line x1="10" y1="14" x2="21" y2="3"></line>
                                            </svg>
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredAndSortedSubnets.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        {t('subnets.noData')}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {filteredAndSortedSubnets.length > 0 && (
                <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span>Show</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="input-select py-1 px-2"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span>per page</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <span className="text-sm text-slate-600">
                            Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
