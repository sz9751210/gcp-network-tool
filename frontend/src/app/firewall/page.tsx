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

        if (filterText) {
            const lower = filterText.toLowerCase();
            filtered = filtered.filter(r =>
                r.name.toLowerCase().includes(lower) ||
                r.project_id.toLowerCase().includes(lower) ||
                r.vpc_network.toLowerCase().includes(lower) ||
                r.source_ranges.some(s => s.toLowerCase().includes(lower)) ||
                r.destination_ranges.some(d => d.toLowerCase().includes(lower))
            );
        }

        return filtered;
    }, [firewallRules, directionFilter, actionFilter, filterText]);

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
                <div className="card">
                    {/* Toolbar */}
                    <div className="p-6 border-b border-slate-200 space-y-4">
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="text-sm text-slate-600">
                                <span className="font-semibold text-indigo-600">{sortedRules.length}</span> / {' '}
                                <span className="font-semibold">{firewallRules.length}</span> {t('firewall.totalRules').toLowerCase()}
                            </div>

                            {/* Filters */}
                            <div className="flex gap-2 flex-wrap items-center">
                                <select
                                    value={directionFilter}
                                    onChange={(e) => setDirectionFilter(e.target.value)}
                                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">{t('firewall.direction')}</option>
                                    <option value="INGRESS">{t('firewall.ingress')}</option>
                                    <option value="EGRESS">{t('firewall.egress')}</option>
                                </select>

                                <select
                                    value={actionFilter}
                                    onChange={(e) => setActionFilter(e.target.value)}
                                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">{t('firewall.action')}</option>
                                    <option value="ALLOW">{t('firewall.allow')}</option>
                                    <option value="DENY">{t('firewall.deny')}</option>
                                </select>

                                <input
                                    type="text"
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="input-field"
                                    placeholder={t('firewall.searchPlaceholder')}
                                />
                            </div>
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
                                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{rule.name}</td>
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
