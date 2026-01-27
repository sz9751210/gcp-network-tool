'use client';

import { useState, useEffect, useMemo } from 'react';
import { NetworkTopology, Subnet as SubnetType } from '@/types/network';
import { useScan } from '@/contexts/ScanContext';

interface SubnetRow {
    projectId: string;
    projectName: string;
    vpcName: string;
    subnetName: string;
    region: string;
    cidr: string;
    gatewayIp: string | null;
    privateGoogleAccess: boolean;
}

export default function SubnetsPage() {
    const { topology, metadata, refreshData } = useScan();
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<keyof SubnetRow>('cidr');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [filterText, setFilterText] = useState('');

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
                    });
                });
            });
        });

        return rows;
    }, [topology]);

    const filteredAndSortedSubnets = useMemo(() => {
        let result = subnets.filter((subnet) => {
            const searchText = filterText.toLowerCase();
            return (
                subnet.projectName.toLowerCase().includes(searchText) ||
                subnet.vpcName.toLowerCase().includes(searchText) ||
                subnet.subnetName.toLowerCase().includes(searchText) ||
                subnet.cidr.includes(searchText)
            );
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
    }, [subnets, sortBy, sortOrder, filterText]);

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
                    <p className="text-slate-600">Loading subnet data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Subnet Planner</h1>
                <p className="text-slate-600">View and analyze all subnets across your GCP projects</p>
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
                                placeholder="Filter by project, VPC, subnet, or CIDR..."
                            />
                        </div>
                    </div>
                    <button
                        onClick={exportToCSV}
                        disabled={filteredAndSortedSubnets.length === 0}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Export CSV
                    </button>
                </div>
                <div className="mt-4 text-sm text-slate-600">
                    Showing <span className="font-semibold text-indigo-600">{filteredAndSortedSubnets.length}</span> of{' '}
                    <span className="font-semibold">{subnets.length}</span> subnets
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-100 border-b border-slate-200">
                            <tr>
                                {[
                                    { key: 'projectName', label: 'Project' },
                                    { key: 'vpcName', label: 'VPC' },
                                    { key: 'subnetName', label: 'Subnet' },
                                    { key: 'region', label: 'Region' },
                                    { key: 'cidr', label: 'CIDR' },
                                    { key: 'gatewayIp', label: 'Gateway' },
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
                            {filteredAndSortedSubnets.map((subnet, idx) => (
                                <tr
                                    key={`${subnet.projectId}-${subnet.vpcName}-${subnet.subnetName}`}
                                    className="hover:bg-slate-50 transition-colors"
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                        {subnet.projectName}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-700">{subnet.vpcName}</td>
                                    <td className="px-6 py-4 text-sm text-slate-700">{subnet.subnetName}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{subnet.region}</td>
                                    <td className="px-6 py-4 text-sm font-mono text-indigo-600">{subnet.cidr}</td>
                                    <td className="px-6 py-4 text-sm font-mono text-slate-600">
                                        {subnet.gatewayIp || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredAndSortedSubnets.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        No subnets found. Try adjusting your filter or run a network scan.
                    </div>
                )}
            </div>
        </div>
    );
}
