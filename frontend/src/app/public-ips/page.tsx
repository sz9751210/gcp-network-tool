'use client';

import { useState, useEffect, useMemo } from 'react';
import { useScan } from '@/contexts/ScanContext';
import { PublicIP } from '@/types/network';

export default function PublicIPsPage() {
    const { topology, metadata, refreshData } = useScan();
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<keyof PublicIP>('ip_address');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [filterText, setFilterText] = useState('');

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
        if (!filterText) return publicIps;
        const lower = filterText.toLowerCase();
        return publicIps.filter(
            (ip) =>
                ip.ip_address.toLowerCase().includes(lower) ||
                ip.resource_name.toLowerCase().includes(lower) ||
                ip.project_id.toLowerCase().includes(lower) ||
                ip.region.toLowerCase().includes(lower) ||
                ip.resource_type.toLowerCase().includes(lower)
        );
    }, [publicIps, filterText]);

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
                    <p className="text-slate-600">Loading public IPs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1800px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Public IPs</h1>
                <p className="text-slate-600">
                    {metadata
                        ? `Viewing external IP addresses across ${metadata.totalProjects} projects`
                        : 'No scan data available. Go to Settings to start a scan.'}
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
                    <h3 className="text-xl font-bold text-slate-700 mb-2">No Public IPs Found</h3>
                    <p className="text-slate-600">
                        {!topology
                            ? 'Run a scan from Settings to discover public IPs'
                            : 'No public IP addresses were found in the scanned projects'}
                    </p>
                </div>
            ) : (
                <div className="card">
                    {/* Toolbar */}
                    <div className="p-6 border-b border-slate-200 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="text-sm text-slate-600">
                                Showing <span className="font-semibold text-indigo-600">{sortedIps.length}</span> of{' '}
                                <span className="font-semibold">{publicIps.length}</span> public IPs
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <input
                                    type="text"
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="input-field flex-1 sm:w-64"
                                    placeholder="Filter by IP, resource, project..."
                                />
                                <button onClick={exportToCSV} className="btn-primary whitespace-nowrap">
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
                                        { key: 'ip_address', label: 'IP Address' },
                                        { key: 'resource_type', label: 'Type' },
                                        { key: 'resource_name', label: 'Resource' },
                                        { key: 'project_id', label: 'Project' },
                                        { key: 'region', label: 'Region' },
                                        { key: 'zone', label: 'Zone' },
                                        { key: 'status', label: 'Status' },
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
                                                {ip.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
