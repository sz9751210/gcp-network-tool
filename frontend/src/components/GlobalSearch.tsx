'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    Server,
    Box,
    Database,
    Globe,
    Network as NetworkIcon,
    Command,
    X,
    ArrowRight
} from 'lucide-react';
import { useResources } from '@/lib/useResources';

interface SearchResult {
    id: string;
    name: string;
    type: 'instance' | 'gke-cluster' | 'storage-bucket' | 'vpc' | 'public-ip';
    subtitle: string;
    url: string;
}

export default function GlobalSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const router = useRouter();

    // Fetch all resource types for global index
    const { data: instances } = useResources<any>('instances');
    const { data: clusters } = useResources<any>('gke-clusters');
    const { data: buckets } = useResources<any>('storage-buckets');
    const { data: vpcs } = useResources<any>('vpcs');
    const { data: publicIps } = useResources<any>('public-ips');

    // Toggle on Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const results = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        const searchResults: SearchResult[] = [];

        // Instances
        instances?.forEach(i => {
            if (i.name.toLowerCase().includes(q) || i.project_id.toLowerCase().includes(q)) {
                searchResults.push({
                    id: i.name + i.project_id,
                    name: i.name,
                    type: 'instance',
                    subtitle: `GCE Instance • ${i.project_id} • ${i.internal_ip || 'No IP'}`,
                    url: '/gce'
                });
            }
        });

        // Clusters
        clusters?.forEach(c => {
            if (c.name.toLowerCase().includes(q) || c.project_id.toLowerCase().includes(q)) {
                searchResults.push({
                    id: c.name + c.project_id,
                    name: c.name,
                    type: 'gke-cluster',
                    subtitle: `GKE Cluster • ${c.project_id} • ${c.location}`,
                    url: '/gke'
                });
            }
        });

        // Buckets
        buckets?.forEach(b => {
            if (b.name.toLowerCase().includes(q) || b.project_id.toLowerCase().includes(q)) {
                searchResults.push({
                    id: b.name + b.project_id,
                    name: b.name,
                    type: 'storage-bucket',
                    subtitle: `Storage Bucket • ${b.project_id} • ${b.location}`,
                    url: '/storage'
                });
            }
        });

        // Public IPs
        publicIps?.forEach(p => {
            if (p.ip_address.includes(q) || p.resource_name.toLowerCase().includes(q)) {
                searchResults.push({
                    id: p.ip_address,
                    name: p.ip_address,
                    type: 'public-ip',
                    subtitle: `Public IP • ${p.resource_name} • ${p.project_id}`,
                    url: `/public-ips?q=${p.ip_address}`
                });
            }
        });

        // VPCs
        vpcs?.forEach(v => {
            if (v.name.toLowerCase().includes(q) || v.project_id.toLowerCase().includes(q)) {
                searchResults.push({
                    id: v.name + v.project_id,
                    name: v.name,
                    type: 'vpc',
                    subtitle: `VPC Network • ${v.project_id}`,
                    url: '/networks'
                });
            }
        });

        return searchResults.slice(0, 8); // Limit to top 8
    }, [query, instances, clusters, buckets, vpcs, publicIps]);

    const navigateTo = (url: string) => {
        router.push(url);
        setIsOpen(false);
        setQuery('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 pointer-events-auto"
                onClick={() => setIsOpen(false)}
            />

            {/* Dialog */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
                <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={24} />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search resources, IPs, or CIDRs... (Cmd+K)"
                        className="w-full pl-16 pr-8 py-6 bg-transparent text-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute right-6 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-all"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Results Section */}
                <div className="border-t border-slate-100 dark:border-slate-800 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {query.trim() === '' ? (
                        <div className="p-8 text-center">
                            <div className="inline-flex p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-full text-indigo-500 mb-4 animate-bounce-slow">
                                <Command size={32} />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Type to start searching your entire GCP footprint</p>
                            <div className="mt-6 flex justify-center gap-4">
                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest">Instances</span>
                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest">Clusters</span>
                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest">IPs</span>
                            </div>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-slate-400 italic">No resources matched your query</p>
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {results.map((result) => (
                                <button
                                    key={result.id}
                                    onClick={() => navigateTo(result.url)}
                                    className="w-full flex items-center gap-4 p-4 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-2xl transition-all group border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/40"
                                >
                                    <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:text-indigo-500 transition-all shadow-sm`}>
                                        {result.type === 'instance' && <Server size={20} />}
                                        {result.type === 'gke-cluster' && <Box size={20} />}
                                        {result.type === 'storage-bucket' && <Database size={20} />}
                                        {result.type === 'vpc' && <NetworkIcon size={20} />}
                                        {result.type === 'public-ip' && <Globe size={20} />}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-bold text-slate-900 dark:text-white tracking-tight">{result.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{result.subtitle}</div>
                                    </div>
                                    <ArrowRight className="text-slate-300 group-hover:text-indigo-500 translate-x-[-10px] opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" size={18} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold text-slate-400">ESC</kbd>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Close</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                        <span>Powered by Network Intelligence</span>
                        <Zap size={10} fill="currentColor" />
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 2s ease-in-out infinite;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 20px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                }
            `}</style>
        </div>
    );
}

// Re-using Lucide Zap for consistency if not imported
function Zap({ size, fill, className }: { size: number, fill?: string, className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fill || "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    );
}
