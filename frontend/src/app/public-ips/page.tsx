'use client';

import { useState, useEffect, useMemo } from 'react';
import { useScan } from '@/contexts/ScanContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PublicIP } from '@/types/network';

export default function PublicIPsPage() {
    const { topology, metadata, refreshData } = useScan();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<keyof PublicIP>('ip_address');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [filterText, setFilterText] = useState('');
    const [showUnusedOnly, setShowUnusedOnly] = useState(false);

    // Dropdown Filters
    const [projectFilter, setProjectFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [regionFilter, setRegionFilter] = useState('all');

    useEffect(() => {
        const load = async () => {
            await refreshData();
            setLoading(false);
        };
        load();
    }, [refreshData]);

    const publicIps = useMemo(() => {
        if (!topology?.public_ips) return [];
        return topology.public_ips;
    }, [topology]);

    // Filter public IPs
    const filteredIps = useMemo(() => {
        let filtered = [...publicIps];
        if (showUnusedOnly) {
            filtered = filtered.filter(ip => ip.status !== 'IN_USE');
        }

        if (projectFilter !== 'all') {
            filtered = filtered.filter(ip => ip.project_id === projectFilter);
        }

        if (typeFilter !== 'all') {
            filtered = filtered.filter(ip => ip.resource_type === typeFilter);
        }

        if (regionFilter !== 'all') {
            filtered = filtered.filter(ip => ip.region === regionFilter);
        }

        if (filterText) {
            const lower = filterText.toLowerCase();
            filtered = filtered.filter(
                (ip) =>
                    ip.ip_address.toLowerCase().includes(lower) ||
                    ip.resource_name.toLowerCase().includes(lower) ||
                    ip.project_id.toLowerCase().includes(lower) ||
                    ip.region.toLowerCase().includes(lower) ||
                    ip.resource_type.toLowerCase().includes(lower)
            );
        }
        return filtered;
    }, [publicIps, filterText, showUnusedOnly, projectFilter, typeFilter, regionFilter]);

    // Unique values for dropdowns
    // Unique values and counts
    const projectOptions = useMemo(() => {
        const counts = new Map<string, number>();
        publicIps.forEach(ip => {
            counts.set(ip.project_id, (counts.get(ip.project_id) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([value, count]) => ({ value, count }));
    }, [publicIps]);

    const typeOptions = useMemo(() => {
        const counts = new Map<string, number>();
        publicIps.forEach(ip => {
            counts.set(ip.resource_type, (counts.get(ip.resource_type) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([value, count]) => ({ value, count }));
    }, [publicIps]);

    const regionOptions = useMemo(() => {
        const counts = new Map<string, number>();
        publicIps.forEach(ip => {
            counts.set(ip.region, (counts.get(ip.region) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([value, count]) => ({ value, count }));
    }, [publicIps]);

    // Sort public IPs
    const sortedIps = useMemo(() => {
        const sorted = [...filteredIps].sort((a, b) => {
            const aVal = a[sortBy] ?? '';
            const bVal = b[sortBy] ?? '';

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filteredIps, sortBy, sortOrder]);

    const handleSort = (column: keyof PublicIP) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const exportToCSV = () => {
        const headers = ['IP Address', 'Resource Type', 'Resource Name', 'Project', 'Region', 'Zone', 'Status'];
        const rows = sortedIps.map((ip) => [
            ip.ip_address,
            ip.resource_type,
            ip.resource_name,
            ip.project_id,
            ip.region,
            ip.zone || 'N/A',
            ip.status,
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `public-ips-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="p-8 max-w-[1800px] mx-auto">
                <div className="card p-12 text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1800px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">{t('publicIps.title')}</h1>
                <p className="text-slate-600">
                    {metadata
                        ? `${t('publicIps.subtitle')} - ${metadata.totalProjects} ${t('dashboard.projects')}`
                        : t('publicIps.noData')}
                </p>
            </div>

            {!topology || publicIps.length === 0 ? (
                <div className="card p-12 text-center">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mx-auto mb-4 text-slate-300"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">{t('publicIps.noData')}</h3>
                    <p className="text-slate-600">{t('publicIps.noDataDesc')}</p>
                </div>
            ) : (
                <div className="card">
                    {/* Filters Bar */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">

                            {/* Search */}
                            <div className="relative w-full md:w-64">
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

                            {/* Dropdowns */}
                            <div className="flex flex-wrap gap-2 items-center flex-1 justify-end">
                                <div className="w-full md:w-48">
                                    <select
                                        value={projectFilter}
                                        onChange={(e) => setProjectFilter(e.target.value)}
                                        className="input-select"
                                    >
                                        <option value="all">All Projects ({publicIps.length})</option>
                                        {projectOptions.map(p => <option key={p.value} value={p.value}>{p.value} ({p.count})</option>)}
                                    </select>
                                </div>
                                <div className="w-full md:w-40">
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        className="input-select"
                                    >
                                        <option value="all">All Types</option>
                                        {typeOptions.map(t => <option key={t.value} value={t.value}>{t.value} ({t.count})</option>)}
                                    </select>
                                </div>
                                <div className="w-full md:w-40">
                                    <select
                                        value={regionFilter}
                                        onChange={(e) => setRegionFilter(e.target.value)}
                                        className="input-select"
                                    >
                                        <option value="all">All Regions</option>
                                        {regionOptions.map(r => <option key={r.value} value={r.value}>{r.value} ({r.count})</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Secondary Options */}
                        <div className="flex flex-wrap gap-4 items-center justify-between mt-4 text-sm">
                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-md border border-slate-200 hover:border-slate-300 transition-colors select-none shadow-sm">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${showUnusedOnly ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                                    {showUnusedOnly && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12" /></svg>}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={showUnusedOnly}
                                    onChange={(e) => setShowUnusedOnly(e.target.checked)}
                                    className="hidden"
                                />
                                <span className="flex items-center gap-2 font-medium text-slate-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="8" x2="12" y2="12"></line>
                                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                    </svg>
                                    Only Show Unused IPs
                                </span>
                            </label>

                            <div className="flex gap-4 items-center">
                                <span className="text-slate-500">
                                    Showing <span className="font-bold text-slate-800">{sortedIps.length}</span> results
                                </span>
                                <button onClick={exportToCSV} className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                    Export CSV
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {[
                                        { key: 'ip_address', label: t('publicIps.ipAddress') },
                                        { key: 'resource_type', label: t('publicIps.resourceType') },
                                        { key: 'resource_name', label: t('publicIps.resourceName') },
                                        { key: 'project_id', label: t('publicIps.project') },
                                        { key: 'region', label: t('publicIps.region') },
                                        { key: 'zone', label: 'Zone' },
                                        { key: 'status', label: t('publicIps.status') },
                                    ].map((col) => (
                                        <th
                                            key={col.key}
                                            onClick={() => handleSort(col.key as keyof PublicIP)}
                                            className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-1">
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
                            <tbody className="bg-white divide-y divide-slate-200">
                                {sortedIps.map((ip, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="font-mono text-sm font-semibold text-indigo-700">
                                                {ip.ip_address}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                                {ip.resource_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                                            {ip.resource_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {ip.project_id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {ip.region}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {ip.zone || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ip.status === 'IN_USE'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                    }`}
                                            >
                                                {ip.status === 'IN_USE' ? t('publicIps.inUse') : t('publicIps.reserved')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }
        </div >
    );
}
