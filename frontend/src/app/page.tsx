'use client';

import { useEffect } from 'react';
import { useScan } from '@/contexts/ScanContext';
import { useLanguage } from '@/contexts/LanguageContext';
import NetworkTree from '@/components/NetworkTree';

export default function Home() {
    const { topology, metadata, refreshData } = useScan();
    const { t } = useLanguage();

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const stats = topology ? {
        riskyFirewalls: topology.firewall_rules.filter(r => r.direction === 'INGRESS' && r.action === 'ALLOW' && r.source_ranges.includes('0.0.0.0/0')).length,
        unusedIps: topology.public_ips.filter(ip => ip.status !== 'IN_USE').length,
        totalIps: topology.public_ips.length,
        totalSubnets: topology.total_subnets
    } : null;

    return (
        <div className="p-8 max-w-[1800px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">{t('sidebar.dashboard')}</h1>
                <p className="text-slate-600">
                    {metadata
                        ? `${metadata.totalProjects} ${t('dashboard.projects')} • ${t('dashboard.lastScan')}: ${new Date(metadata.timestamp).toLocaleString()}`
                        : t('dashboard.noDataDesc')}
                </p>
            </div>

            {!topology ? (
                <div className="card p-12 text-center">
                    <div className="max-w-md mx-auto">
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
                        <h3 className="text-xl font-bold text-slate-700 mb-2">{t('dashboard.noData')}</h3>
                        <p className="text-slate-600 mb-6">
                            {t('dashboard.noDataDesc')}
                        </p>
                        <a
                            href="/settings"
                            className="inline-block btn-primary"
                        >
                            {t('dashboard.goToSettings')}
                        </a>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Feature 9: Dashboard Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="card p-5 border-l-4 border-indigo-500">
                            <div className="text-sm font-medium text-slate-500 mb-1">Total Projects</div>
                            <div className="text-2xl font-bold text-slate-800">{metadata?.totalProjects || 0}</div>
                        </div>
                        <div className="card p-5 border-l-4 border-rose-500">
                            <div className="text-sm font-medium text-slate-500 mb-1">Risky Firewalls</div>
                            <div className="text-2xl font-bold text-slate-800">{stats?.riskyFirewalls || 0}</div>
                            <div className="text-xs text-rose-600 mt-1">Open 0.0.0.0/0 access</div>
                        </div>
                        <div className="card p-5 border-l-4 border-yellow-500">
                            <div className="text-sm font-medium text-slate-500 mb-1">Unused Public IPs</div>
                            <div className="text-2xl font-bold text-slate-800">{stats?.unusedIps || 0}</div>
                            <div className="text-xs text-slate-400 mt-1">out of {stats?.totalIps} total</div>
                        </div>
                        <div className="card p-5 border-l-4 border-sky-500">
                            <div className="text-sm font-medium text-slate-500 mb-1">Total Subnets</div>
                            <div className="text-2xl font-bold text-slate-800">{stats?.totalSubnets || 0}</div>
                        </div>
                    </div>

                    <div className="card p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-indigo-600"
                            >
                                <path d="M3 3v18h18" />
                                <path d="m19 9-5 5-4-4-3 3" />
                            </svg>
                            {t('dashboard.title')}
                        </h2>
                        <NetworkTree data={topology} isLoading={false} />
                    </div>
                </div>
            )}
        </div>
    );
}
