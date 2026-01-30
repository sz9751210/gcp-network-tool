'use client';

import { useEffect, useMemo } from 'react';
import { useScan } from '@/contexts/ScanContext';
import { useLanguage } from '@/contexts/LanguageContext';
import NetworkTree from '@/components/NetworkTree';
import { StatCard } from '@/components/dashboard/StatCard';
import { RegionChart } from '@/components/dashboard/RegionChart';
import {
    LayoutDashboard,
    ShieldAlert,
    Globe,
    Network,
    Server,
    Activity,
    ExternalLink,
    Lock
} from 'lucide-react';
import { Project, Subnet } from '@/types/network';

export default function Home() {
    const { topology, metadata, refreshData } = useScan();
    const { t } = useLanguage();

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const stats = useMemo(() => {
        if (!topology) return null;

        const riskyFirewalls = topology.firewall_rules.filter(
            r => r.direction === 'INGRESS' && r.action === 'ALLOW' && r.source_ranges.includes('0.0.0.0/0')
        ).length;

        const unusedIps = topology.public_ips.filter(ip => ip.status !== 'IN_USE').length;

        // Group subnets by region for the chart
        const regionCounts: Record<string, number> = {};
        topology.projects.forEach((p: Project) => {
            p.vpc_networks.forEach((v) => {
                v.subnets.forEach((s: Subnet) => {
                    const region = s.region;
                    regionCounts[region] = (regionCounts[region] || 0) + 1;
                });
            });
        });

        const regionData = Object.entries(regionCounts).map(([name, value]) => ({ name, value }));

        return {
            riskyFirewalls,
            unusedIps,
            totalIps: topology.public_ips.length,
            totalSubnets: topology.total_subnets,
            totalVpcs: topology.total_vpcs,
            activeProjects: topology.total_projects,
            regionData
        };
    }, [topology]);

    return (
        <div className="p-8 max-w-[1800px] mx-auto space-y-8 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
                        <LayoutDashboard size={20} />
                        <span className="uppercase tracking-wider text-xs">Overview</span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                        {t('dashboard.title')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
                        {t('dashboard.subtitle')}
                    </p>
                </div>

                {metadata && (
                    <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            {t('dashboard.lastScan')}: {new Date(metadata.timestamp).toLocaleString()}
                        </span>
                    </div>
                )}
            </div>

            {!topology ? (
                <div className="card p-20 text-center flex flex-col items-center border-dashed border-2">
                    <div className="p-5 bg-slate-100 dark:bg-slate-800 rounded-full mb-6">
                        <Network size={48} className="text-slate-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('dashboard.noData')}</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
                        {t('dashboard.noDataDesc')}
                    </p>
                    <a href="/settings" className="btn-primary flex items-center gap-2 h-12 px-8 rounded-xl shadow-lg shadow-indigo-500/20">
                        {t('dashboard.goToSettings')}
                        <ExternalLink size={18} />
                    </a>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title={t('dashboard.projects')}
                            value={stats?.activeProjects || 0}
                            icon={Globe}
                            color="indigo"
                            subtitle="Managed projects"
                        />
                        <StatCard
                            title="Risky Firewall Rules"
                            value={stats?.riskyFirewalls || 0}
                            icon={ShieldAlert}
                            color="rose"
                            subtitle="Open to 0.0.0.0/0"
                        />
                        <StatCard
                            title={t('dashboard.publicIps')}
                            value={stats?.totalIps || 0}
                            icon={Activity}
                            color="amber"
                            subtitle={`${stats?.unusedIps} unused reserved IPs`}
                        />
                        <StatCard
                            title={t('dashboard.subnets')}
                            value={stats?.totalSubnets || 0}
                            icon={Server}
                            color="sky"
                            subtitle={`Across ${stats?.totalVpcs} VPC networks`}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Regional Distribution */}
                        <div className="lg:col-span-1 card p-6">
                            <RegionChart data={stats?.regionData || []} />
                        </div>

                        {/* Recent Alerts / Quick Facts */}
                        <div className="lg:col-span-2 card p-0 overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <Lock size={18} className="text-indigo-500" />
                                    {t('dashboard.connectivity') || 'Resource Map'}
                                </h3>
                                <div className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded font-bold uppercase tracking-wider">
                                    Interactive
                                </div>
                            </div>
                            <div className="p-6 flex-1 bg-slate-50/30 dark:bg-slate-900/10 h-[300px] overflow-y-auto">
                                <NetworkTree data={topology} isLoading={false} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
