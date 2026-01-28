'use client';

import { useState, useEffect, useMemo } from 'react';
import { useScan } from '@/contexts/ScanContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { FirewallRule } from '@/types/network';

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

    const handleSort = (column: keyof FirewallRule) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
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
                <h1 className="text-3xl font-bold text-slate-800 mb-2">{t('firewall.title')}</h1>
                <p className="text-slate-600">
                    {metadata
                        ? `${t('firewall.subtitle')} - ${metadata.totalProjects} ${t('dashboard.projects')}`
                        : t('firewall.noData')}
                </p>
            </div>

            {!topology || firewallRules.length === 0 ? (
                <div className="card p-12 text-center">
                    <h3 className="text-xl font-bold text-slate-700 mb-2">{t('firewall.noData')}</h3>
                    <p className="text-slate-600">{t('firewall.noDataDesc')}</p>
                </div>
            ) : (
                <div className="card shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
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

                        <div className="mt-4 text-xs text-slate-500">
                            <span className="font-semibold text-indigo-600">{sortedRules.length}</span> / {' '}
                            <span className="font-semibold">{firewallRules.length}</span> {t('firewall.totalRules').toLowerCase()}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th onClick={() => handleSort('priority')} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100">
                                        {t('firewall.priority')} {sortBy === 'priority' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('name')} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100">
                                        {t('firewall.ruleName')} {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{t('firewall.direction')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{t('firewall.action')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{t('firewall.sourceRanges')}</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{t('firewall.protocols')}</th>
                                    <th onClick={() => handleSort('vpc_network')} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100">
                                        {t('firewall.network')} {sortBy === 'vpc_network' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('project_id')} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100">
                                        {t('publicIps.project')} {sortBy === 'project_id' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {sortedRules.map((rule, idx) => {
                                    const protocols = [...rule.allowed, ...rule.denied].map(p => {
                                        const ports = p.ports?.length ? `:${p.ports.join(',')}` : '';
                                        return `${p.IPProtocol}${ports}`;
                                    }).join(', ');

                                    const ranges = rule.direction === 'INGRESS'
                                        ? rule.source_ranges
                                        : rule.destination_ranges;

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3 whitespace-nowrap text-sm font-mono text-slate-700">{rule.priority}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-800">
                                                <div className="flex items-center gap-2">
                                                    {isRisky(rule) && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200" title="Risky: Details allows traffic from 0.0.0.0/0">
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
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-purple-100 text-purple-800'
                                                    }`}>
                                                    {rule.direction === 'INGRESS' ? t('firewall.ingress') : t('firewall.egress')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${rule.action === 'ALLOW'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {rule.action === 'ALLOW' ? t('firewall.allow') : t('firewall.deny')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="max-w-xs">
                                                    {ranges.length > 0 ? (
                                                        <div className="font-mono text-xs text-slate-600">
                                                            {ranges.slice(0, 2).map((r, i) => (
                                                                <div key={i}>{r}</div>
                                                            ))}
                                                            {ranges.length > 2 && (
                                                                <div className="text-slate-400">+{ranges.length - 2} more</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">Any</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-mono text-slate-600">
                                                {protocols || 'All'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{rule.vpc_network}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{rule.project_id}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
