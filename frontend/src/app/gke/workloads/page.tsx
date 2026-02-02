'use client';

import { useState, useMemo, Suspense } from 'react';
import { useResources } from '@/lib/useResources';
import { useLanguage } from '@/contexts/LanguageContext';
import { GKEPod, GKEDeployment } from '@/types/network';
import {
    Boxes,
    Search,
    Filter,
    Activity,
    Cpu,
    Layers,
    Clock,
    Tag,
    ChevronRight,
    ExternalLink
} from 'lucide-react';
import Badge from '@/components/Badge';
import Pagination from '@/components/Pagination';
import SlideOver from '@/components/SlideOver';
import Link from 'next/link';

function GKEWorkloadsContent() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'deployments' | 'pods'>('deployments');
    const [search, setSearch] = useState('');

    // Fetch Data
    const { data: deployments, loading: loadingDeps, error: errorDeps } = useResources<GKEDeployment>('gke-deployments');
    const { data: pods, loading: loadingPods, error: errorPods } = useResources<GKEPod>('gke-pods');

    const [selectedPod, setSelectedPod] = useState<GKEPod | null>(null);
    const [selectedDep, setSelectedDep] = useState<GKEDeployment | null>(null);

    // Pagination state
    const [depPage, setDepPage] = useState(1);
    const [podPage, setPodPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Filtering State
    const [selectedCluster, setSelectedCluster] = useState('all');
    const [selectedNamespace, setSelectedNamespace] = useState('all');

    // Derived Lists
    const uniqueClusters = useMemo(() => {
        const set = new Set([...deployments, ...pods].map(r => r.cluster_name));
        return Array.from(set).sort();
    }, [deployments, pods]);

    const uniqueNamespaces = useMemo(() => {
        const set = new Set([...deployments, ...pods].map(r => r.namespace));
        return Array.from(set).sort();
    }, [deployments, pods]);

    // Filtering Logic
    const filteredDeployments = useMemo(() => {
        return deployments.filter(dep => {
            const matchesSearch = dep.name.toLowerCase().includes(search.toLowerCase()) ||
                dep.namespace.toLowerCase().includes(search.toLowerCase()) ||
                dep.cluster_name.toLowerCase().includes(search.toLowerCase());

            const matchesCluster = selectedCluster === 'all' || dep.cluster_name === selectedCluster;
            const matchesNamespace = selectedNamespace === 'all' || dep.namespace === selectedNamespace;

            return matchesSearch && matchesCluster && matchesNamespace;
        });
    }, [deployments, search, selectedCluster, selectedNamespace]);

    const filteredPods = useMemo(() => {
        return pods.filter(pod => {
            const matchesSearch = pod.name.toLowerCase().includes(search.toLowerCase()) ||
                pod.namespace.toLowerCase().includes(search.toLowerCase()) ||
                pod.cluster_name.toLowerCase().includes(search.toLowerCase()) ||
                (pod.pod_ip || '').includes(search);

            const matchesCluster = selectedCluster === 'all' || pod.cluster_name === selectedCluster;
            const matchesNamespace = selectedNamespace === 'all' || pod.namespace === selectedNamespace;

            return matchesSearch && matchesCluster && matchesNamespace;
        });
    }, [pods, search, selectedCluster, selectedNamespace]);

    const paginatedDeployments = useMemo(() => {
        const start = (depPage - 1) * itemsPerPage;
        return filteredDeployments.slice(start, start + itemsPerPage);
    }, [filteredDeployments, depPage, itemsPerPage]);

    const paginatedPods = useMemo(() => {
        const start = (podPage - 1) * itemsPerPage;
        return filteredPods.slice(start, start + itemsPerPage);
    }, [filteredPods, podPage, itemsPerPage]);

    const isLoading = loadingDeps || loadingPods;

    if (isLoading && deployments.length === 0 && pods.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="w-10 h-10 text-indigo-500 animate-spin" />
                    <p className="text-slate-500 font-medium">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1800px] mx-auto">
            <div className="flex flex-col gap-2 mb-8">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-1">
                    <Boxes size={24} />
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {t('gke.workloads.title')}
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    {t('gke.workloads.subtitle')}
                </p>
            </div>

            {(errorDeps || errorPods) && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                    <p className="font-bold">Error loading workloads:</p>
                    <ul className="list-disc list-inside">
                        {errorDeps && <li>Deployments: {errorDeps}</li>}
                        {errorPods && <li>Pods: {errorPods}</li>}
                    </ul>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
                <button
                    onClick={() => setActiveTab('deployments')}
                    className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'deployments'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    {t('gke.workloads.deploymentsTab')}
                    {activeTab === 'deployments' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('pods')}
                    className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'pods'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    {t('gke.workloads.podsTab')}
                    {activeTab === 'pods' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                    )}
                </button>
            </div>

            {/* Toolbar */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search workloads..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3">
                        <select
                            value={selectedCluster}
                            onChange={(e) => setSelectedCluster(e.target.value)}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer text-sm font-medium min-w-[160px]"
                        >
                            <option value="all">All Clusters</option>
                            {uniqueClusters.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <select
                            value={selectedNamespace}
                            onChange={(e) => setSelectedNamespace(e.target.value)}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer text-sm font-medium min-w-[160px]"
                        >
                            <option value="all">All Namespaces</option>
                            {uniqueNamespaces.map(ns => (
                                <option key={ns} value={ns}>{ns}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {activeTab === 'deployments' ? (
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Deployment</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Namespace</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Replicas</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cluster</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {paginatedDeployments.map((dep, idx) => (
                                    <tr
                                        key={`${dep.cluster_name}-${dep.namespace}-${dep.name}-${idx}`}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedDep(dep)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Layers className="text-indigo-500" size={18} />
                                                <span className="font-medium text-slate-900 dark:text-white">{dep.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{dep.namespace}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant={dep.available_replicas === dep.replicas ? 'emerald' : 'amber'} pill>
                                                {dep.available_replicas}/{dep.replicas} Ready
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {dep.replicas}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs font-mono">{dep.cluster_name}</td>
                                    </tr>
                                ))}
                                {filteredDeployments.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            {t('gke.workloads.noDeployments')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pod</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Namespace</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">IP Address</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Node</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {paginatedPods.map((pod, idx) => (
                                    <tr
                                        key={`${pod.cluster_name}-${pod.namespace}-${pod.name}-${idx}`}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        onClick={() => setSelectedPod(pod)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Cpu className="text-emerald-500" size={18} />
                                                <span className="font-medium text-slate-900 dark:text-white">{pod.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{pod.namespace}</td>
                                        <td className="px-6 py-4">
                                            <Badge
                                                variant={
                                                    pod.status === 'Running' ? 'emerald' :
                                                        pod.status === 'Pending' ? 'amber' : 'error'
                                                }
                                                pill
                                            >
                                                {pod.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                                            {pod.pod_ip || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs font-mono">{pod.node_name}</td>
                                    </tr>
                                ))}
                                {filteredPods.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            {t('gke.workloads.noPods')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                <Pagination
                    currentPage={activeTab === 'deployments' ? depPage : podPage}
                    totalPages={activeTab === 'deployments' ? Math.ceil(filteredDeployments.length / itemsPerPage) : Math.ceil(filteredPods.length / itemsPerPage)}
                    onPageChange={activeTab === 'deployments' ? setDepPage : setPodPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    totalItems={activeTab === 'deployments' ? deployments.length : pods.length}
                    filteredCount={activeTab === 'deployments' ? filteredDeployments.length : filteredPods.length}
                />
            </div>

            {/* Pod Details */}
            <SlideOver
                isOpen={!!selectedPod}
                onClose={() => setSelectedPod(null)}
                title="Pod Details"
            >
                {selectedPod && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedPod.name}</h3>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="blue" pill>{selectedPod.namespace}</Badge>
                                <Badge variant={selectedPod.status === 'Running' ? 'emerald' : 'amber'} pill>{selectedPod.status}</Badge>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 uppercase mb-1">Pod IP</div>
                                <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedPod.pod_ip || 'None'}</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 uppercase mb-1">Host IP</div>
                                <div className="font-mono font-bold">{selectedPod.host_ip || 'None'}</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 uppercase mb-1">Restarts</div>
                                <div className="font-mono font-bold">{selectedPod.restart_count}</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 uppercase mb-1">QoS Class</div>
                                <div className="font-mono font-bold">{selectedPod.qos_class || 'N/A'}</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Cluster Info</h4>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Cluster</span>
                                        <span className="font-medium">{selectedPod.cluster_name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Node</span>
                                        <span className="font-mono">{selectedPod.node_name}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedPod.labels && Object.keys(selectedPod.labels).length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Labels</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(selectedPod.labels).map(([k, v]) => (
                                            <Badge key={k} variant="secondary" pill className="text-[10px] py-0.5">{k}: {v}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Containers</h4>
                                <div className="space-y-2">
                                    {selectedPod.containers.map(c => (
                                        <div key={c.name} className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-medium text-sm">{c.name}</span>
                                                <Badge variant={c.ready ? 'emerald' : 'error'} pill>
                                                    {c.ready ? 'Ready' : 'Not Ready'}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-slate-500 font-mono truncate">{c.image}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </SlideOver>

            {/* Deployment Details */}
            <SlideOver
                isOpen={!!selectedDep}
                onClose={() => setSelectedDep(null)}
                title="Deployment Details"
            >
                {selectedDep && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedDep.name}</h3>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="indigo" pill>{selectedDep.namespace}</Badge>
                                <Badge variant="emerald" pill>{selectedDep.available_replicas}/{selectedDep.replicas} Ready</Badge>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                            <h4 className="text-xs text-slate-500 uppercase mb-3">Replica Status</h4>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 transition-all duration-500"
                                            style={{ width: `${(selectedDep.available_replicas / selectedDep.replicas) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="text-sm font-bold">{selectedDep.available_replicas} / {selectedDep.replicas}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 uppercase mb-1">Strategy</div>
                                <div className="font-mono font-bold">{selectedDep.strategy || 'N/A'}</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="text-xs text-slate-500 uppercase mb-1">Min Ready Seconds</div>
                                <div className="font-mono font-bold">{selectedDep.min_ready_seconds}s</div>
                            </div>
                        </div>

                        {selectedDep.conditions && selectedDep.conditions.length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Conditions</h4>
                                <div className="space-y-2">
                                    {selectedDep.conditions.map((cond, i) => (
                                        <div key={i} className="bg-slate-50 dark:bg-slate-900 p-2 rounded text-xs border border-slate-200 dark:border-slate-800">
                                            <div className="flex justify-between font-medium">
                                                <span>{cond.type}</span>
                                                <span className={cond.status === 'True' ? 'text-green-500' : 'text-red-500'}>{cond.status}</span>
                                            </div>
                                            {cond.reason && <div className="text-slate-500 mt-1">{cond.reason}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Selector</h4>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(selectedDep.selector).map(([k, v]) => (
                                        <Badge key={k} variant="secondary" pill className="text-[10px]">{k}: {v}</Badge>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                                    Associated Pods
                                    <span className="text-[10px] text-slate-400 font-normal italic">(Filtered from Pods list)</span>
                                </h4>
                                <div className="space-y-2">
                                    {pods.filter(p => p.namespace === selectedDep.namespace && Object.entries(selectedDep.selector).every(([k, v]) => p.labels[k] === v)).slice(0, 5).map(p => (
                                        <div
                                            key={p.name}
                                            className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                            onClick={() => {
                                                setSelectedDep(null);
                                                setSelectedPod(p);
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Cpu size={14} className="text-emerald-500" />
                                                <span className="text-sm font-medium">{p.name}</span>
                                            </div>
                                            <ChevronRight size={14} className="text-slate-400" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </SlideOver>
        </div>
    );
}

export default function GKEWorkloadsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading workloads...</div>}>
            <GKEWorkloadsContent />
        </Suspense>
    );
}
