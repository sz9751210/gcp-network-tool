'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useScan } from '@/contexts/ScanContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PublicIP, UsedInternalIP, LoadBalancerDetails, BackendService } from '@/types/network';
import DomainTopology from '@/components/DomainTopology';

interface ResolveResponse {
    domain: string;
    ips: string[];
    error?: string;
}

interface IPResult {
    ip: string;
    type: 'Public' | 'Internal' | 'External';
    resourceName?: string;
    resourceType?: string;
    project?: string;
    region?: string;
    loadBalancer?: {
        name: string;
        link: string;
    };
    cloudArmor?: {
        policies: string[];
        link: string;
    };
    detailsLink?: string;
}

export default function DomainSearchPage() {
    const { topology } = useScan();
    const { t } = useLanguage();
    const [domain, setDomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<IPResult[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!domain.trim()) return;

        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/resolve-domain`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ domain: domain.trim() }),
            });

            if (!res.ok) {
                throw new Error('Failed to resolve domain');
            }

            const data: ResolveResponse = await res.json();

            if (data.error) {
                setError(data.error);
                setLoading(false);
                return;
            }

            if (!data.ips || data.ips.length === 0) {
                setError(t('domainSearch.noIpFound'));
                setLoading(false);
                return;
            }

            // Process results
            const processedResults: IPResult[] = data.ips.map(ip => {
                let result: IPResult = {
                    ip,
                    type: 'External'
                };

                // 1. Identify IP Resource (Public or Internal)
                let matchingResource: PublicIP | UsedInternalIP | undefined;

                const publicIpMatch = topology?.public_ips.find(p => p.ip_address === ip);
                if (publicIpMatch) {
                    result.type = 'Public';
                    result.resourceName = publicIpMatch.resource_name;
                    result.resourceType = publicIpMatch.resource_type;
                    result.project = publicIpMatch.project_id;
                    result.region = publicIpMatch.region;
                    result.detailsLink = `/public-ips?q=${ip}`;
                    matchingResource = publicIpMatch;
                } else {
                    const internalIpMatch = topology?.used_internal_ips.find(i => i.ip_address === ip);
                    if (internalIpMatch) {
                        result.type = 'Internal';
                        result.resourceName = internalIpMatch.resource_name;
                        result.resourceType = internalIpMatch.resource_type;
                        result.project = internalIpMatch.project_id;
                        result.region = internalIpMatch.region;
                        result.detailsLink = `/internal-ips?q=${ip}`;
                        matchingResource = internalIpMatch;
                    }
                }

                // 2. Identify Load Balancer & Cloud Armor
                // Strategy: 
                // A. Check if the matched resource (Public/Internal IP) has LB Details (routing rules -> backend service)
                // B. Fallback: Search all backend services for "associated_ips" matching this IP

                let associatedBS: BackendService[] = [];

                if (topology?.backend_services) {
                    // Strategy A: Use explicit details from the resource
                    if (matchingResource?.details?.routing_rules && matchingResource.details.routing_rules.length > 0) {
                        const bsNames = new Set(matchingResource.details.routing_rules.map(r => r.backend_service));

                        associatedBS = topology.backend_services.filter(bs =>
                            bsNames.has(bs.name) &&
                            // Ensure project match to avoid name collisions (though BS names are usually unique per project)
                            (matchingResource?.project_id ? bs.project_id === matchingResource.project_id : true)
                        );
                    }

                    // Strategy B: Fallback to IP association if A found nothing
                    if (associatedBS.length === 0) {
                        associatedBS = topology.backend_services.filter(bs =>
                            bs.associated_ips && bs.associated_ips.some(associatedIp => {
                                // Split by ':' to handle "IP:Port" format and compare just the IP part
                                const cleanIp = associatedIp.split(':')[0];
                                return cleanIp === ip;
                            })
                        );
                    }

                    if (associatedBS.length > 0 || matchingResource?.resource_type?.includes('LoadBalancer') || matchingResource?.resource_type?.includes('Forwarding')) {
                        // Determine LB Name
                        // Priority: URL Map name (from details.url_map, matching `gcloud compute url-maps list`) > Backend Service Name > Resource Name > Default
                        const urlMapName = matchingResource?.details?.url_map;
                        const lbName = urlMapName || (associatedBS.length > 0 ? associatedBS[0].name : (matchingResource?.resource_name || 'Unknown Load Balancer'));

                        result.loadBalancer = {
                            name: lbName,
                            link: `/load-balancers?q=${ip}`
                        };

                        // 3. Cloud Armor Policies (from Backends)
                        const policies = new Set<string>();
                        associatedBS.forEach(bs => {
                            if (bs.backends) {
                                bs.backends.forEach(b => {
                                    if (b.security_policy) {
                                        policies.add(b.security_policy);
                                    }
                                });
                            }
                            // Also check if the BS itself has one (sometimes common in recent API versions?)
                            // Note: backend model might have it on the service level too?
                            // Currently specific to backends list in our model, but let's check our BS type if we added it?
                            // Checked models.py: BackendService doesn't have direct security_policy field at top level, only in backends.
                            // BUT our gcp_scanner might have put it there? No, it puts it in backends list items.
                        });

                        if (policies.size > 0) {
                            result.cloudArmor = {
                                policies: Array.from(policies),
                                link: `/cloud-armor?q=${Array.from(policies)[0]}`
                            };
                        }
                    }
                }

                return result;
            });

            setResults(processedResults);

        } catch (err) {
            console.error(err);
            setError(t('domainSearch.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-[1800px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('domainSearch.title')}</h1>
                <p className="text-slate-600 dark:text-slate-400">
                    {t('domainSearch.subtitle')}
                </p>
            </div>

            {/* Search Box */}
            <div className="card p-8 mb-8">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder={t('domainSearch.searchPlaceholder')}
                            className="input-field text-lg py-3"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={loading || !domain.trim()}
                        className="btn-primary py-3 px-8 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                {t('domainSearch.resolving')}
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.3-4.3" />
                                </svg>
                                {t('domainSearch.searchButton')}
                            </>
                        )}
                    </button>
                </div>
                {error && (
                    <div className="mt-4 p-4 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                        {error}
                    </div>
                )}
            </div>

            {/* Results Table */}
            {results && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('domainSearch.results')}</h2>

                    {results.length === 0 ? (
                        <div className="text-slate-500 italic">{t('domainSearch.noIpFound')}</div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-left border-collapse bg-white dark:bg-slate-900">
                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t('domainSearch.ipAddress')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t('domainSearch.loadBalancer')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t('domainSearch.cloudArmor')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {results.map((result, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            {/* IP Address Column */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    {result.detailsLink ? (
                                                        <Link
                                                            href={result.detailsLink}
                                                            className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline flex items-center gap-1.5"
                                                        >
                                                            {result.ip}
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                                <polyline points="15 3 21 3 21 9" />
                                                                <line x1="10" x2="21" y1="14" y2="3" />
                                                            </svg>
                                                        </Link>
                                                    ) : (
                                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{result.ip}</span>
                                                    )}
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${result.type === 'Public' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                                        result.type === 'Internal' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                        }`}>
                                                        {result.type}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Load Balancer Column */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {result.loadBalancer ? (
                                                    <Link
                                                        href={result.loadBalancer.link}
                                                        className="group flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 dark:text-indigo-400">
                                                            <rect width="18" height="18" x="3" y="3" rx="2" />
                                                            <path d="M3 9h18" />
                                                            <path d="M3 15h18" />
                                                        </svg>
                                                        <span className="font-medium text-indigo-700 dark:text-indigo-300 group-hover:underline">{result.loadBalancer.name}</span>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 dark:text-indigo-500">
                                                            <path d="M5 12h14" />
                                                            <path d="m12 5 7 7-7 7" />
                                                        </svg>
                                                    </Link>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>

                                            {/* Cloud Armor Column */}
                                            <td className="px-6 py-4">
                                                {result.cloudArmor && result.cloudArmor.policies.length > 0 ? (
                                                    <div className="flex flex-col gap-2">
                                                        {result.cloudArmor.policies.map((policy, pIdx) => (
                                                            <Link
                                                                key={pIdx}
                                                                href={`/cloud-armor?q=${policy}`}
                                                                className="group flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
                                                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                                                                </svg>
                                                                <span className="font-medium text-amber-700 dark:text-amber-300 group-hover:underline">{policy}</span>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 dark:text-amber-500">
                                                                    <path d="M5 12h14" />
                                                                    <path d="m12 5 7 7-7 7" />
                                                                </svg>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {/* Topology Graph */}
                    {results && results.length > 0 && (
                        <div className="mt-8">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">{t('domainSearch.topology')}</h2>
                            <div className="h-[700px] bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <DomainTopology
                                    domain={domain}
                                    resolvedIps={results.map(r => r.ip)}
                                    topology={topology}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
