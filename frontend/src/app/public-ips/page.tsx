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
    const uniqueProjects = useMemo(() => Array.from(new Set(publicIps.map(ip => ip.project_id))).sort(), [publicIps]);
    const uniqueTypes = useMemo(() => Array.from(new Set(publicIps.map(ip => ip.resource_type))).sort(), [publicIps]);
    const uniqueRegions = useMemo(() => Array.from(new Set(publicIps.map(ip => ip.region))).sort(), [publicIps]);

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
                    {/* Toolbar */}
                    <div className="p-6 border-b border-slate-200 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="text-sm text-slate-600">
                                {t('cloudArmor.showing')} <span className="font-semibold text-indigo-600">{sortedIps.length}</span> / {' '}
                                <span className="font-semibold">{publicIps.length}</span> {t('publicIps.totalIps').toLowerCase()}
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <input
                                    type="text"
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="input-field flex-1 sm:w-64"
                                    placeholder={t('publicIps.searchPlaceholder')}
                                />
                                <button onClick={exportToCSV} className="btn-primary whitespace-nowrap">
                                    {t('common.download')} CSV
                                </button>
                            </div>
                        </div>

                        {/* Filters Row */}
                        <div className="flex flex-wrap gap-4 items-center">
                            <select
                                value={projectFilter}
                                onChange={(e) => setProjectFilter(e.target.value)}
                                className="input-select max-w-xs"
                            >
                                <option value="all">All Projects</option>
                                {uniqueProjects.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>

                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="input-select max-w-xs"
                            >
                                <option value="all">All Types</option>
                                {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>

                            <select
                                value={regionFilter}
                                onChange={(e) => setRegionFilter(e.target.value)}
                                className="input-select max-w-xs"
                            >
                                <option value="all">All Regions</option>
                                {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 hover:text-slate-900 select-none">
                                <input
                                    type="checkbox"
                                    checked={showUnusedOnly}
                                    onChange={(e) => setShowUnusedOnly(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                <span className="flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="8" x2="12" y2="12"></line>
                                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                    </svg>
                                    Show Unused Only (Cost Saving)
                                </span>
                            </label>
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
