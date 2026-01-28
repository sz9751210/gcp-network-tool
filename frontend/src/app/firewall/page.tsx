'use client';

import { useState, useEffect, useMemo } from 'react';
import { useScan } from '@/contexts/ScanContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { FirewallRule } from '@/types/network';
import Pagination from '@/components/Pagination';

export default function FirewallPage() {
    const { topology, metadata, refreshData } = useScan();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<keyof FirewallRule>('priority');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [filterText, setFilterText] = useState('');
    const [directionFilter, setDirectionFilter] = useState<string>('all');
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [vpcFilter, setVpcFilter] = useState<string>('all');
    const [protocolFilter, setProtocolFilter] = useState<string>('all');
    const [selectedRule, setSelectedRule] = useState<FirewallRule | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const isRisky = (rule: FirewallRule) => {
        if (rule.direction !== 'INGRESS' || rule.action !== 'ALLOW' || rule.disabled) return false;
        return rule.source_ranges.includes('0.0.0.0/0');
    };

    useEffect(() => {
        const load = async () => {
            await refreshData();
            setLoading(false);
        };
        load();
    }, [refreshData]);

    const firewallRules = useMemo(() => {
        if (!topology?.firewall_rules) return [];
        return topology.firewall_rules;
    }, [topology]);

    // Apply filters
    const filteredRules = useMemo(() => {
        let filtered = [...firewallRules];

        if (directionFilter !== 'all') {
            filtered = filtered.filter(r => r.direction === directionFilter);
        }

        if (actionFilter !== 'all') {
            filtered = filtered.filter(r => r.action === actionFilter);
        }

        if (projectFilter !== 'all') {
            filtered = filtered.filter(rule => rule.project_id === projectFilter);
        }

        if (vpcFilter !== 'all') {
            filtered = filtered.filter(rule => rule.vpc_network === vpcFilter);
        }

        if (protocolFilter !== 'all') {
            filtered = filtered.filter(rule => {
                const combined = [...rule.allowed, ...rule.denied];
                return combined.some(p => p.IPProtocol === protocolFilter || p.IPProtocol === 'all');
            });
        }

        if (filterText) {
            const lower = filterText.toLowerCase();
            filtered = filtered.filter(
                (rule) =>
                    rule.name.toLowerCase().includes(lower) ||
                    rule.source_ranges.some((range) => range.includes(filterText)) ||
                    rule.destination_ranges.some((range) => range.includes(filterText))
            );
        }

        return filtered;
    }, [firewallRules, directionFilter, actionFilter, filterText, projectFilter, vpcFilter, protocolFilter]);

    // Unique values and counts
    const projectOptions = useMemo(() => {
        const counts = new Map<string, number>();
        firewallRules.forEach(r => {
            counts.set(r.project_id, (counts.get(r.project_id) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([value, count]) => ({ value, count }));
    }, [firewallRules]);

    const vpcOptions = useMemo(() => {
        const counts = new Map<string, number>();
        firewallRules.forEach(r => {
            counts.set(r.vpc_network, (counts.get(r.vpc_network) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([value, count]) => ({ value, count }));
    }, [firewallRules]);

    // Available protocols (simplified list)
    const availableProtocols = ['tcp', 'udp', 'icmp', 'esp', 'ah', 'sctp', 'ipip'];
    const protocolOptions = useMemo(() => {
        return availableProtocols.map(proto => {
            const count = firewallRules.filter(r => {
                const combined = [...r.allowed, ...r.denied];
                return combined.some(p => p.IPProtocol === proto || p.IPProtocol === 'all');
            }).length;
            return { value: proto, count };
        });
    }, [firewallRules]);

    const directionOptions = useMemo(() => {
        const counts = new Map<string, number>();
        firewallRules.forEach(r => {
            counts.set(r.direction, (counts.get(r.direction) || 0) + 1);
        });
        return [
            { value: 'INGRESS', label: t('firewall.ingress'), count: counts.get('INGRESS') || 0 },
            { value: 'EGRESS', label: t('firewall.egress'), count: counts.get('EGRESS') || 0 }
        ];
    }, [firewallRules, t]);

    const actionOptions = useMemo(() => {
        const counts = new Map<string, number>();
        firewallRules.forEach(r => {
            counts.set(r.action, (counts.get(r.action) || 0) + 1);
        });
        return [
            { value: 'ALLOW', label: 'Allow', count: counts.get('ALLOW') || 0 },
            { value: 'DENY', label: 'Deny', count: counts.get('DENY') || 0 }
        ];
    }, [firewallRules]);

    // Sort rules
    const sortedRules = useMemo(() => {
        return [...filteredRules].sort((a, b) => {
            const aVal = a[sortBy] ?? '';
            const bVal = b[sortBy] ?? '';

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredRules, sortBy, sortOrder]);

    // Paginated rules
    const totalPages = Math.ceil(sortedRules.length / itemsPerPage);
    const paginatedRules = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedRules.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedRules, currentPage, itemsPerPage]);

    const handleSort = (column: keyof FirewallRule) => {
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
    }, [filterText, directionFilter, actionFilter, projectFilter, vpcFilter, protocolFilter, itemsPerPage]);

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
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('firewall.title')}</h1>
                <p className="text-slate-600 dark:text-slate-400">
                    {metadata
                        ? `${t('firewall.subtitle')} - ${metadata.totalProjects} ${t('dashboard.projects')}`
                        : t('firewall.noData')}
                </p>
            </div>

            {!topology || firewallRules.length === 0 ? (
                <div className="card p-12 text-center">
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{t('firewall.noData')}</h3>
                    <p className="text-slate-600 dark:text-slate-400">{t('firewall.noDataDesc')}</p>
                </div>
            ) : (
                <div className="card shadow-sm overflow-hidden">
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
                                    placeholder={t('firewall.searchPlaceholder')}
                                />
                            </div>

                            {/* Filters Group */}
                            <div className="flex flex-wrap gap-2 items-center w-full xl:w-auto">
                                <select
                                    value={directionFilter}
                                    onChange={(e) => setDirectionFilter(e.target.value)}
                                    className="input-select w-36"
                                >
                                    <option value="all">{t('firewall.direction')}</option>
                                    {directionOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label} ({opt.count})</option>
                                    ))}
                                </select>

                                <select
                                    value={actionFilter}
                                    onChange={(e) => setActionFilter(e.target.value)}
                                    className="input-select w-32"
                                >
                                    <option value="all">Action (All)</option>
                                    {actionOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label} ({opt.count})</option>
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
                                    value={protocolFilter}
                                    onChange={(e) => setProtocolFilter(e.target.value)}
                                    className="input-select w-32"
                                >
                                    <option value="all">All Proto</option>
                                    {protocolOptions.map(p => (
                                        <option key={p.value} value={p.value}>{p.value.toUpperCase()} ({p.count})</option>
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
                                    <th onClick={() => handleSort('priority')} className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                        {t('firewall.priority')} {sortBy === 'priority' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('name')} className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                        {t('firewall.ruleName')} {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('firewall.direction')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('firewall.action')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('firewall.sourceRanges')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('firewall.protocols')}</th>
                                    <th onClick={() => handleSort('vpc_network')} className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                        {t('firewall.network')} {sortBy === 'vpc_network' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('project_id')} className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                        {t('publicIps.project')} {sortBy === 'project_id' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Details
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {paginatedRules.map((rule, idx) => {
                                    const protocols = [...rule.allowed, ...rule.denied].map(p => {
                                        const ports = p.ports?.length ? `:${p.ports.join(',')}` : '';
                                        return `${p.IPProtocol}${ports}`;
                                    }).join(', ');

                                    const ranges = rule.direction === 'INGRESS'
                                        ? rule.source_ranges
                                        : rule.destination_ranges;

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-3 whitespace-nowrap text-sm font-mono text-slate-700 dark:text-slate-300">{rule.priority}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100">
                                                <div className="flex items-center gap-2">
                                                    {isRisky(rule) && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800" title="Risky: Details allows traffic from 0.0.0.0/0">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                                                <line x1="12" y1="9" x2="12" y2="13" />
                                                                <line x1="12" y1="17" x2="12.01" y2="17" />
                                                            </svg>
                                                            Risk
                                                        </span>
                                                    )}
                                                    {rule.name}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${rule.direction === 'INGRESS'
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                                    }`}>
                                                    {rule.direction === 'INGRESS' ? t('firewall.ingress') : t('firewall.egress')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${rule.action === 'ALLOW'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}>
                                                    {rule.action === 'ALLOW' ? t('firewall.allow') : t('firewall.deny')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="max-w-xs">
                                                    {ranges.length > 0 ? (
                                                        <div className="font-mono text-xs text-slate-600 dark:text-slate-400">
                                                            {ranges.slice(0, 2).map((r, i) => (
                                                                <div key={i}>{r}</div>
                                                            ))}
                                                            {ranges.length > 2 && (
                                                                <div className="text-slate-400 dark:text-slate-500">+{ranges.length - 2} more</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-500">Any</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-400">
                                                {protocols || 'All'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{rule.vpc_network}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{rule.project_id}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => setSelectedRule(rule)}
                                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
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
                        totalItems={firewallRules.length}
                        filteredCount={sortedRules.length}
                    />
                </div>
            )}

            {/* Detail Modal (Selected rule code is omitted for brevity as it remains unchanged) */}
            {selectedRule && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setSelectedRule(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${selectedRule.action === 'ALLOW' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                    {selectedRule.name}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono">{selectedRule.project_id} / {selectedRule.vpc_network}</p>
                            </div>
                            <button
                                onClick={() => setSelectedRule(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Key Properties */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Direction</span>
                                    <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${selectedRule.direction === 'INGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                                        {selectedRule.direction}
                                    </span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Priority</span>
                                    <span className="font-mono text-lg font-semibold text-slate-700 dark:text-slate-200">{selectedRule.priority}</span>
                                </div>
                            </div>

                            {/* Ranges */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><circle cx="12" cy="12" r="10" /><path d="M22 12h-4" /><path d="M6 12H2" /><path d="m12 6 2-2 4 4" /><path d="m10 18-2 2-4-4" /></svg>
                                        Source Ranges
                                    </h4>
                                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600 h-40 overflow-y-auto p-2">
                                        {selectedRule.source_ranges.length > 0 ? (
                                            selectedRule.source_ranges.map((r, i) => (
                                                <div key={i} className="font-mono text-xs py-0.5 px-2 hover:bg-white dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-100 dark:hover:border-slate-500">{r}</div>
                                            ))
                                        ) : (
                                            <div className="text-xs text-slate-400 dark:text-slate-500 italic p-2">None</div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><circle cx="12" cy="12" r="10" /><path d="m12 16-4-4 4-4" /><path d="m16 12-4 4-4-4" /></svg>
                                        Destination Ranges
                                    </h4>
                                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600 h-40 overflow-y-auto p-2">
                                        {selectedRule.destination_ranges.length > 0 ? (
                                            selectedRule.destination_ranges.map((r, i) => (
                                                <div key={i} className="font-mono text-xs py-0.5 px-2 hover:bg-white dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-100 dark:hover:border-slate-500">{r}</div>
                                            ))
                                        ) : (
                                            <div className="text-xs text-slate-400 dark:text-slate-500 italic p-2">None</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Protocols & Ports */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Protocols & Ports</h4>
                                <div className="space-y-2">
                                    {[...selectedRule.allowed, ...selectedRule.denied].map((p, i) => (
                                        <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                                            <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase w-16">{p.IPProtocol}</span>
                                            <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
                                            <div className="flex-1 font-mono text-xs text-slate-600 dark:text-slate-400 break-all">
                                                {p.ports && p.ports.length > 0 ? p.ports.join(', ') : 'All ports'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Target Tags</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedRule.target_tags && selectedRule.target_tags.length > 0 ? (
                                            selectedRule.target_tags.map(tag => (
                                                <span key={tag} className="px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs border border-amber-200 dark:border-amber-800 rounded-md font-medium">
                                                    {tag}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">No target tags (Applies to all instances)</span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Target Service Accounts</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedRule.target_service_accounts && selectedRule.target_service_accounts.length > 0 ? (
                                            selectedRule.target_service_accounts.map(sa => (
                                                <span key={sa} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs border border-indigo-200 dark:border-indigo-800 rounded-md font-medium">
                                                    {sa}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">No target service accounts</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Raw Logic Warning if Risky */}
                            {isRisky(selectedRule) && (
                                <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg flex items-start gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600 dark:text-rose-400 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                    <div>
                                        <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400">Security Risk Detected</h4>
                                        <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                                            This rule allows ingress traffic from any source (0.0.0.0/0). Ensure this is intended (e.g., for public web servers).
                                        </p>
                                    </div>
                                </div>
                            )}

                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <button
                                onClick={() => setSelectedRule(null)}
                                className="btn-secondary"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
