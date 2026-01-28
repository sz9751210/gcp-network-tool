import React, { useState, useMemo } from 'react';
import {
    NetworkTopology,
    Project,
    VPCNetwork,
    Subnet
} from '@/types/network';

interface NetworkTreeProps {
    data: NetworkTopology | null;
    isLoading: boolean;
}

// Premium Icons
const ChevronDown = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>;
const ChevronRight = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>;
const FolderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></svg>;
const NetworkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>;
const SubnetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500"><circle cx="12" cy="12" r="10" /><path d="m4.93 4.93 14.14 14.14" /></svg>;
const ExternalLinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>;

export default function NetworkTree({ data, isLoading }: NetworkTreeProps) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const expandAll = () => {
        if (!data) return;
        const newExpanded: Record<string, boolean> = {};
        data.projects.forEach(p => {
            newExpanded[p.project_id] = true;
            p.vpc_networks.forEach(v => {
                newExpanded[`${p.project_id}-${v.name}`] = true;
            });
        });
        setExpanded(newExpanded);
    };

    const collapseAll = () => setExpanded({});

    // Filter logic
    const filteredProjects = useMemo(() => {
        if (!data) return [];
        if (!filter && statusFilter === 'all') return data.projects;

        const lowerFilter = filter.toLowerCase();

        return data.projects.filter(p => {
            // Status Filter
            if (statusFilter === 'error') {
                if (p.scan_status !== 'error' && p.scan_status !== 'permission_denied') return false;
            } else if (statusFilter === 'success') {
                if (p.scan_status !== 'success') return false;
            }

            // Text Filter
            if (p.project_name.toLowerCase().includes(lowerFilter) ||
                p.project_id.toLowerCase().includes(lowerFilter)) {
                return true;
            }
            return p.vpc_networks.some(v =>
                v.name.toLowerCase().includes(lowerFilter) ||
                v.subnets.some(s =>
                    s.name.toLowerCase().includes(lowerFilter) ||
                    s.ip_cidr_range.includes(lowerFilter) ||
                    s.region.toLowerCase().includes(lowerFilter)
                )
            );
        });
    }, [data, filter, statusFilter]);

    if (isLoading) {
        return (
            <div className="card w-full h-full min-h-[400px] flex items-center justify-center text-slate-400">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    <span className="text-sm font-medium">Scanning network structure...</span>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="card w-full h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 p-8 border-dashed">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></svg>
                </div>
                <p className="text-lg font-medium text-slate-600">No Data Available</p>
                <p className="text-sm">Initiate a scan to visualize your network topology.</p>
            </div>
        );
    }

    return (
        <div className="card flex flex-col h-full overflow-hidden">
            {/* Header Controls */}
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <div className="relative w-full md:w-auto flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search resources..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 items-center w-full md:w-auto">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="input-select w-32 py-2"
                    >
                        <option value="all">All Status</option>
                        <option value="success">Success</option>
                        <option value="error">Error</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 text-sm w-full md:w-auto">
                    <button onClick={expandAll} className="flex-1 md:flex-none px-3 py-1.5 text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-md transition-all">
                        Expand All
                    </button>
                    <button onClick={collapseAll} className="flex-1 md:flex-none px-3 py-1.5 text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-md transition-all">
                        Collapse All
                    </button>
                </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-100/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <div className="col-span-5">Resource Hierarchy</div>
                <div className="col-span-3">CIDR Block</div>
                <div className="col-span-2">Region</div>
                <div className="col-span-2 text-right">Details</div>
            </div>

            {/* Tree Content */}
            <div className="overflow-auto flex-1 bg-white scroll-smooth relative">
                {filteredProjects.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 italic">
                        No resources match your search.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filteredProjects.map((project) => (
                            <ProjectRow
                                key={project.project_id}
                                project={project}
                                expanded={expanded}
                                onToggle={toggleExpand}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex flex-wrap gap-x-6 gap-y-2 font-medium">
                <span>Projects: <b className="text-slate-800">{data.total_projects}</b></span>
                <span>VPCs: <b className="text-slate-800">{data.total_vpcs}</b></span>
                <span>Subnets: <b className="text-slate-800">{data.total_subnets}</b></span>
                {data.failed_projects > 0 && (
                    <span className="text-rose-600">Failed: <b>{data.failed_projects}</b></span>
                )}
            </div>
        </div>
    );
}

// Sub-components
function ProjectRow({ project, expanded, onToggle }: {
    project: Project,
    expanded: Record<string, boolean>,
    onToggle: (id: string) => void
}) {
    const isExpanded = expanded[project.project_id];
    const hasError = project.scan_status === 'error' || project.scan_status === 'permission_denied';

    return (
        <div className="group">
            <div
                className={`grid grid-cols-12 gap-4 px-6 py-3 hover:bg-slate-50 cursor-pointer transition-colors border-l-4 ${isExpanded ? 'border-indigo-500 bg-slate-50' : 'border-transparent'}`}
                onClick={() => onToggle(project.project_id)}
            >
                <div className="col-span-5 flex items-center gap-3 overflow-hidden">
                    <div className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                        <ChevronRight />
                    </div>
                    <FolderIcon />
                    <div className="flex flex-col truncate group/link">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800 truncate">{project.project_name}</span>
                            <a
                                href={`https://console.cloud.google.com/home/dashboard?project=${project.project_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover/link:opacity-100 transition-all"
                                onClick={(e) => e.stopPropagation()}
                                title="Open in GCP Console"
                            >
                                <ExternalLinkIcon />
                            </a>
                        </div>
                        <span className="text-[10px] text-slate-400 truncate uppercase tracking-widest">{project.project_id}</span>
                    </div>
                    {project.is_shared_vpc_host && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">HOST</span>
                    )}
                    {hasError && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">ERROR</span>
                    )}
                </div>
                <div className="col-span-7 flex items-center justify-end text-xs text-slate-400">
                    {project.vpc_networks.length} Networks
                </div>
            </div>

            {/* Expanded Content with indentation line */}
            <div className={`grid grid-cols-12 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="col-span-12 relative">
                    {/* Hierarchy Line */}
                    <div className="absolute left-[34px] top-0 bottom-0 w-px bg-slate-200 z-0"></div>

                    {hasError ? (
                        <div className="ml-12 p-3 text-xs text-rose-600 bg-rose-50/50 rounded-md my-2 mr-6 border border-rose-100">
                            Scan Failed: {project.error_message || "Unknown error"}
                        </div>
                    ) : project.vpc_networks.length === 0 ? (
                        <div className="ml-12 py-3 text-xs text-slate-400 italic">No VPC Networks found</div>
                    ) : (
                        project.vpc_networks.map(vpc => (
                            <VPCRow
                                key={vpc.self_link}
                                vpc={vpc}
                                projectId={project.project_id}
                                expanded={expanded}
                                onToggle={onToggle}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function VPCRow({ vpc, projectId, expanded, onToggle }: {
    vpc: VPCNetwork,
    projectId: string,
    expanded: Record<string, boolean>,
    onToggle: (id: string) => void
}) {
    const rowId = `${projectId}-${vpc.name}`;
    const isExpanded = expanded[rowId];

    return (
        <div className="relative">
            <div
                className="grid grid-cols-12 gap-4 px-6 py-2.5 hover:bg-slate-50 cursor-pointer ml-6 relative z-10"
                onClick={() => onToggle(rowId)}
            >
                <div className="col-span-5 flex items-center gap-3 pl-2 group/link">
                    <div className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                        <ChevronRight />
                    </div>
                    <NetworkIcon />
                    <span className="text-sm text-slate-700 font-medium truncate">{vpc.name}</span>
                    <a
                        href={`https://console.cloud.google.com/networking/networks/details/${vpc.name}?project=${projectId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover/link:opacity-100 transition-all"
                        onClick={(e) => e.stopPropagation()}
                        title="Open in GCP Console"
                    >
                        <ExternalLinkIcon />
                    </a>
                    {vpc.is_shared_vpc_host && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-purple-100 text-purple-700 font-medium">Shared</span>
                    )}
                </div>
                <div className="col-span-3 flex items-center">
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{vpc.routing_mode}</span>
                </div>
                <div className="col-span-2"></div>
                <div className="col-span-2 flex items-center justify-end text-xs text-slate-400">
                    {vpc.subnets.length} Subnets
                </div>
            </div>

            {/* Subnets container */}
            {isExpanded && (
                <div className="ml-12 pl-6 relative">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200"></div>
                    {vpc.subnets.length === 0 ? (
                        <div className="py-2 pl-6 text-xs text-slate-400 italic">No Subnets found</div>
                    ) : (
                        vpc.subnets.map(subnet => (
                            <SubnetRow key={subnet.self_link} subnet={subnet} projectId={projectId} />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

function SubnetRow({ subnet, projectId }: { subnet: Subnet, projectId: string }) {
    return (
        <div className="grid grid-cols-12 gap-4 px-6 py-2 hover:bg-sky-50 transition-colors group relative">
            <div className="col-span-5 flex items-center gap-3 pl-2 group/link">
                <div className="w-4 flex justify-center"><div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-sky-400"></div></div>
                <span className="text-sm text-slate-600 truncate group-hover:text-slate-900 transition-colors">{subnet.name}</span>
                <a
                    href={`https://console.cloud.google.com/networking/subnetworks/details/${subnet.region}/${subnet.name}?project=${projectId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover/link:opacity-100 transition-all"
                    onClick={(e) => e.stopPropagation()}
                    title="Open in GCP Console"
                >
                    <ExternalLinkIcon />
                </a>
            </div>

            <div className="col-span-3 flex flex-col justify-center text-xs">
                <span className="font-mono text-slate-700 group-hover:text-sky-700 font-medium cursor-text select-all">
                    {subnet.ip_cidr_range}
                </span>
                {subnet.secondary_ip_ranges.length > 0 && (
                    <div className="mt-1 flex flex-col gap-0.5">
                        {subnet.secondary_ip_ranges.map(sec => (
                            <span key={sec.range_name} className="font-mono text-slate-500 text-[10px] pl-2 border-l-2 border-slate-200">
                                + {sec.ip_cidr_range}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="col-span-2 flex items-center text-xs text-slate-500">
                {subnet.region}
            </div>

            <div className="col-span-2 flex flex-col justify-center items-end text-xs gap-1">
                {subnet.private_ip_google_access && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 font-medium">
                        PGA ON
                    </span>
                )}
                {subnet.gateway_ip && (
                    <span className="text-slate-400 overflow-hidden text-ellipsis max-w-full" title={`GW: ${subnet.gateway_ip}`}>
                        {subnet.gateway_ip}
                    </span>
                )}
            </div>
        </div>
    );
}
