'use client';

import { useState, useEffect, useMemo } from 'react';
import { useScan } from '@/contexts/ScanContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { LoadBalancerDetails } from '@/types/network';
import Pagination from '@/components/Pagination';
import SlideOver from '@/components/SlideOver';

interface LoadBalancer {
    ip: string;
    name: string;
    originalName: string; // The raw resource name (often an ID)
    type: string;
    scope: 'Global' | 'Regional';
    network: string; // VPC or Region
    project: string;
    source: 'Public' | 'Internal';
    description?: string;
    labels?: Record<string, string>;
    details?: LoadBalancerDetails;
}

export default function LoadBalancersPage() {
    const { topology, metadata, refreshData } = useScan();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterText, setFilterText] = useState('');
    const [projectFilter, setProjectFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [scopeFilter, setScopeFilter] = useState('all');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Details Drawer
    const [selectedLB, setSelectedLB] = useState<LoadBalancer | null>(null);

    useEffect(() => {
        const load = async () => {
            await refreshData();
            setLoading(false);
        };
        load();
    }, [refreshData]);

    const loadBalancers = useMemo(() => {
        if (!topology || !topology.backend_services) return [];

        return topology.backend_services.map(bs => {
            const ips = bs.associated_ips || [];
            const ipDisplay = ips.length > 0 ? ips[0] + (ips.length > 1 ? ` (+${ips.length - 1})` : '') : 'No IP';

            // Determine Scope
            const scope: 'Global' | 'Regional' = bs.region ? 'Regional' : 'Global';
            const network = bs.region || 'Global';

            // Determine Source (Public/Internal) based on Scheme
            let source: 'Public' | 'Internal' = 'Internal';
            const scheme = bs.load_balancing_scheme || '';
            if (scheme.includes('EXTERNAL')) {
                source = 'Public';
            }

            // Construct Details object for the Side Drawer
            const details: LoadBalancerDetails = {
                frontend: {
                    protocol: bs.protocol,
                    ip_port: ips.join(', '),
                    network_tier: undefined,
                    certificate: undefined,
                    ssl_policy: undefined
                },
                routing_rules: [], // Not applicable for Backend Service view (it IS the target)
                backends: bs.backends
            };

            return {
                ip: ipDisplay,
                name: bs.name,
                originalName: bs.name,
                type: bs.protocol,
                scope: scope,
                network: network,
                project: bs.project_id,
                source: source,
                description: bs.description,
                labels: {}, // Backend Services don't always have labels mapped in our scanner yet, but existing UI supports it
                details: details
            };
        });
    }, [topology]);

    // Apply filters
    const filteredLbs = useMemo(() => {
        return loadBalancers.filter(lb => {
            const matchesText = filterText === '' ||
                lb.name.toLowerCase().includes(filterText.toLowerCase()) ||
                lb.ip.includes(filterText) ||
                lb.project.toLowerCase().includes(filterText.toLowerCase());

            const matchesProject = projectFilter === 'all' || lb.project === projectFilter;
            const matchesType = typeFilter === 'all' || lb.type === typeFilter;
            const matchesScope = scopeFilter === 'all' || lb.scope === scopeFilter;

            return matchesText && matchesProject && matchesType && matchesScope;
        });
    }, [loadBalancers, filterText, projectFilter, typeFilter, scopeFilter]);

    // Pagination logic
    const totalPages = Math.ceil(filteredLbs.length / itemsPerPage);
    const paginatedLbs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredLbs.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredLbs, currentPage, itemsPerPage]);

    // Unique values for filters
    const projectOptions = useMemo(() => Array.from(new Set(loadBalancers.map(lb => lb.project))).sort(), [loadBalancers]);
    const typeOptions = useMemo(() => Array.from(new Set(loadBalancers.map(lb => lb.type))).sort(), [loadBalancers]);
    const scopeOptions = ['Global', 'Regional'];

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterText, projectFilter, typeFilter, scopeFilter, itemsPerPage]);

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
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('loadBalancers.title')}</h1>
                <p className="text-slate-600 dark:text-slate-400">
                    {metadata
                        ? `${t('loadBalancers.subtitle')} - ${metadata.totalProjects} ${t('dashboard.projects')}`
                        : t('loadBalancers.noData')}
                </p>
            </div>

            {!topology || loadBalancers.length === 0 ? (
                <div className="card p-12 text-center">
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{t('loadBalancers.noData')}</h3>
                    <p className="text-slate-600 dark:text-slate-400">{t('loadBalancers.noDataDesc')}</p>
                </div>
            ) : (
                <div className="card shadow-sm overflow-hidden">
                    {/* Controls */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                            {/* Search */}
                            <div className="relative w-full xl:w-72">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                </div>
                                <input
                                    type="text"
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="input-field pl-10"
                                    placeholder={t('loadBalancers.searchPlaceholder')}
                                />
                            </div>

                            {/* Filters */}
                            <div className="flex flex-wrap gap-2 items-center w-full xl:w-auto">
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="input-select w-40"
                                >
                                    <option value="all">All Types</option>
                                    {typeOptions.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>

                                <select
                                    value={projectFilter}
                                    onChange={(e) => setProjectFilter(e.target.value)}
                                    className="input-select w-40"
                                >
                                    <option value="all">All Projects</option>
                                    {projectOptions.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>

                                <select
                                    value={scopeFilter}
                                    onChange={(e) => setScopeFilter(e.target.value)}
                                    className="input-select w-32"
                                >
                                    <option value="all">All Scopes</option>
                                    {scopeOptions.map(s => (
                                        <option key={s} value={s}>{s === 'Global' ? t('loadBalancers.global') : t('loadBalancers.regional')}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('loadBalancers.ipAddress')}</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('loadBalancers.name')}</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('loadBalancers.type')}</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('loadBalancers.scope')}</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('loadBalancers.network')}</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('loadBalancers.project')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {paginatedLbs.map((lb, idx) => (
                                    <tr
                                        key={`${lb.ip}-${idx}`}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedLB(lb)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{lb.ip}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{lb.name}</span>
                                                {lb.name !== lb.originalName && (
                                                    <span className="text-xs text-slate-400">{lb.originalName.substring(0, 12)}...</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex px-2 py-1 text-xs font-bold rounded uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                {lb.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${lb.scope === 'Global'
                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                }`}>
                                                {lb.scope === 'Global' ? t('loadBalancers.global') : t('loadBalancers.regional')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{lb.network}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{lb.project}</td>
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
                        totalItems={filteredLbs.length}
                        filteredCount={filteredLbs.length}
                    />

                    {/* Summary Footer */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                        <span>{t('loadBalancers.totalLbs')}: <span className="font-semibold text-slate-700 dark:text-slate-300">{loadBalancers.length}</span></span>
                        <span className="flex gap-4">
                            <span>Public: <span className="font-semibold">{loadBalancers.filter(l => l.source === 'Public').length}</span></span>
                            <span>Internal: <span className="font-semibold">{loadBalancers.filter(l => l.source === 'Internal').length}</span></span>
                        </span>
                    </div>
                </div>
            )}

            {/* Details SlideOver */}
            <SlideOver
                isOpen={!!selectedLB}
                onClose={() => setSelectedLB(null)}
                title={t('loadBalancers.title')}
                width="max-w-2xl"
            >
                {selectedLB && (
                    <div className="space-y-6">
                        {/* Header Info */}
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white break-all">{selectedLB.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                <span>{selectedLB.project}</span>
                                <span>•</span>
                                <span className={selectedLB.source === 'Public' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600'}>
                                    {selectedLB.source}
                                </span>
                            </p>
                        </div>

                        {/* Main Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">IP Address</div>
                                <div className="font-mono font-semibold text-slate-800 dark:text-slate-100">{selectedLB.ip}</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Type</div>
                                <div className="font-semibold text-slate-800 dark:text-slate-100">{selectedLB.type}</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Scope</div>
                                <div className="font-semibold text-slate-800 dark:text-slate-100">{selectedLB.scope}</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Network / Region</div>
                                <div className="font-semibold text-slate-800 dark:text-slate-100">{selectedLB.network}</div>
                            </div>
                        </div>

                        {/* Raw Details */}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Technical Details</h4>

                            <dl className="space-y-4">
                                <div>
                                    <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Resource ID / Name</dt>
                                    <dd className="mt-1 text-sm font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 p-2 rounded break-all">
                                        {selectedLB.originalName}
                                    </dd>
                                </div>

                                {selectedLB.labels && Object.keys(selectedLB.labels).length > 0 && (
                                    <div>
                                        <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Labels</dt>
                                        <dd className="mt-1">
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(selectedLB.labels).map(([k, v]) => (
                                                    <span key={k} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                        {k}: {v}
                                                    </span>
                                                ))}
                                            </div>
                                        </dd>
                                    </div>
                                )}

                                {selectedLB.description && (
                                    <div>
                                        <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Description</dt>
                                        <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 p-2 rounded whitespace-pre-wrap font-mono text-xs">
                                            {selectedLB.description}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        {/* Deep Details (Frontend, Routing, Backends) */}
                        {selectedLB.details && (
                            <div className="space-y-6 border-t border-slate-200 dark:border-slate-700 pt-6">
                                {/* Frontend */}
                                {selectedLB.details.frontend && (
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Frontend</h4>
                                        <div className="overflow-hidden bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 rounded-lg">
                                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                                                <thead className="bg-slate-50 dark:bg-slate-800">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400">Protocol</th>
                                                        <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400">IP:Port</th>
                                                        <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400">Certificate</th>
                                                        <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400">SSL Policy</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                                                    <tr>
                                                        <td className="px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">{selectedLB.details.frontend.protocol}</td>
                                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300 font-mono">
                                                            {selectedLB.details.frontend.ip_port.split(',').map((ipPort, idx) => {
                                                                const ip = ipPort.trim().split(':')[0]; // Extract IP if port is attached in string, though data usually is just IP or comma separated
                                                                // The raw data from scanner might include port in global LB? 
                                                                // Looking at models.py/gcp_scanner.py: "ip_port" is "34.1.1.1:443" or "34.1.1.1, 35.1.1.1" etc?
                                                                // Actually scanner says: ip_port = f"{forwarding_rule.I_p_address}:{port}"
                                                                // But if there are multiple IPs? 
                                                                // The scanner code: `ips = bs.associated_ips || []` then `const ipDisplay = ips.length > 0 ? ips[0]...`
                                                                // But details.frontend.ip_port comes from `_resolve_lb_details`.
                                                                // In `_resolve_lb_details`: `ip_port = f"{forwarding_rule.I_p_address}:{port}"`.
                                                                // Wait, if it's a list? The user screenshot shows comma separated list: "34.8.15.247, 34.149.230.149, ..."
                                                                // That suggests `ip_port` field contains multiple IPs. 
                                                                // Let's assume it's comma separated.

                                                                // Clean up potential port for link (we just want IP for search)
                                                                // If string is "1.2.3.4:80", search q=1.2.3.4.
                                                                // If string is "1.2.3.4", search q=1.2.3.4.

                                                                const cleanIp = ip.split(':')[0];
                                                                const targetPath = selectedLB.source === 'Public' ? '/public-ips' : '/internal-ips';

                                                                return (
                                                                    <div key={idx} className={idx > 0 ? "mt-1" : ""}>
                                                                        <Link
                                                                            href={`${targetPath}?q=${cleanIp}`}
                                                                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                                                                        >
                                                                            {ipPort.trim()}
                                                                        </Link>
                                                                    </div>
                                                                );
                                                            })}
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">
                                                            {selectedLB.details.frontend.certificate ? (
                                                                <div className="flex flex-col gap-1">
                                                                    {selectedLB.details.frontend.certificate.split(',').map((cert, i) => (
                                                                        <span key={i} className="text-blue-600 hover:underline cursor-pointer">{cert.trim()}</span>
                                                                    ))}
                                                                </div>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">
                                                            {selectedLB.details.frontend.ssl_policy ? (
                                                                <a href="#" className="text-blue-600 hover:underline">{selectedLB.details.frontend.ssl_policy}</a>
                                                            ) : 'Default'}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Routing Rules */}
                                {selectedLB.details.routing_rules.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Routing Rules (Forwarding Rules)</h4>
                                        <div className="overflow-hidden bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 rounded-lg">
                                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                                                <thead className="bg-slate-50 dark:bg-slate-800">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400">Hosts</th>
                                                        <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400">Path</th>
                                                        <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400">Backend Service</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                                                    {selectedLB.details.routing_rules.map((rule, i) => (
                                                        <tr key={i}>
                                                            <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{rule.hosts.join(', ')}</td>
                                                            <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{rule.path}</td>
                                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{rule.backend_service}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Backends */}
                                {selectedLB.details.backends.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Backends</h4>
                                        <div className="space-y-3">
                                            {selectedLB.details.backends.map((backend, i) => (
                                                <div key={i} className="bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 rounded-lg p-3">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-medium text-slate-900 dark:text-slate-100 text-sm">{backend.name}</span>
                                                        <span className="text-xs text-slate-500">{backend.type}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                                            <span className="text-slate-500">Cloud CDN</span>
                                                            <span className={backend.cdn_enabled ? "text-green-600 font-medium" : "text-slate-400"}>
                                                                {backend.cdn_enabled ? 'Enabled' : 'Disabled'}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                                            <span className="text-slate-500">Security Policy</span>
                                                            <span className="text-slate-700 dark:text-slate-300">
                                                                {backend.security_policy ? (
                                                                    <Link
                                                                        href={`/cloud-armor?q=${backend.security_policy}`}
                                                                        className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                                                                    >
                                                                        {backend.security_policy}
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                                            <polyline points="15 3 21 3 21 9"></polyline>
                                                                            <line x1="10" y1="14" x2="21" y2="3"></line>
                                                                        </svg>
                                                                    </Link>
                                                                ) : '-'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </SlideOver>
        </div>
    );
}
