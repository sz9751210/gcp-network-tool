'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
    LayoutDashboard,
    Network,
    Globe,
    Server,
    Shield,
    Database,
    Zap,
    Search,
    Wrench,
    FileText,
    Settings,
    ChevronDown,
    ChevronRight,
    Boxes,
    Cpu,
    Webhook,
    Settings2,
    Lock,
    HardDrive,
    ShieldCheck,
    Scale,
    Layers
} from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();
    const { locale, setLocale, t } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const [gkeExpanded, setGkeExpanded] = useState(true);

    const navItems = [
        { key: 'sidebar.dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
        { key: 'sidebar.subnetPlanner', path: '/subnets', icon: <Network size={20} /> },
        { key: 'sidebar.publicIps', path: '/public-ips', icon: <Globe size={20} /> },
        { key: 'sidebar.internalIps', path: '/internal-ips', icon: <Server size={20} /> },
        { key: 'sidebar.loadBalancers', path: '/load-balancers', icon: <Zap size={20} /> },
        { key: 'sidebar.firewallRules', path: '/firewall', icon: <Shield size={20} /> },
        { key: 'sidebar.cloudArmor', path: '/cloud-armor', icon: <ShieldCheck size={20} /> },
        { key: 'sidebar.gce', path: '/gce', icon: <Cpu size={20} /> },
    ];

    const gkeItems = [
        { key: 'sidebar.gke', path: '/gke', icon: <Boxes size={18} /> },
        { key: 'sidebar.gkeWorkloads', path: '/gke/workloads', icon: <Cpu size={18} /> },
        { key: 'sidebar.gkeServices', path: '/gke/services', icon: <Server size={18} /> },
        { key: 'sidebar.gkeIngress', path: '/gke/ingress', icon: <Globe size={18} /> },
        { key: 'sidebar.gkeConfigMaps', path: '/gke/configmaps', icon: <Settings2 size={18} /> },
        { key: 'sidebar.gkeSecrets', path: '/gke/secrets', icon: <Lock size={18} /> },
        { key: 'sidebar.gkePvcs', path: '/gke/pvcs', icon: <HardDrive size={18} /> },
        { key: 'sidebar.gkePvcs', path: '/gke/pvcs', icon: <HardDrive size={18} /> },
        { key: 'nav.gke.statefulsets', path: '/gke/statefulsets', icon: <Database size={18} /> },
        { key: 'nav.gke.daemonsets', path: '/gke/daemonsets', icon: <Layers size={18} /> },
        { key: 'HPA', path: '/gke/hpa', icon: <Scale size={18} /> },
    ];

    const bottomItems = [
        { key: 'sidebar.cidrPlanner', path: '/cidr-planner', icon: <Wrench size={20} /> },
        { key: 'sidebar.domainSearch', path: '/domain-search', icon: <Search size={20} /> },
        { key: 'sidebar.ipTools', path: '/ip-tools', icon: <Zap size={20} /> },
        { key: 'sidebar.securityAudit', path: '/audit', icon: <FileText size={20} /> },
        { key: 'sidebar.settings', path: '/settings', icon: <Settings size={20} /> },
    ];

    return (
        <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen sticky top-0 overflow-hidden">
            {/* Logo/Branding */}
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                        <Network size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-tight">GCP Network</h1>
                        <p className="text-xs text-slate-400">Planner</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${isActive
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            {item.icon}
                            <span className="text-sm font-medium">{t(item.key)}</span>
                        </Link>
                    );
                })}

                {/* GKE Collapsible Section */}
                <div className="pt-2">
                    <button
                        onClick={() => setGkeExpanded(!gkeExpanded)}
                        className="w-full flex items-center justify-between px-3 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Boxes size={20} />
                            <span className="text-sm font-medium uppercase tracking-wider text-[11px]">{t('sidebar.gkeResources')}</span>
                        </div>
                        {gkeExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {gkeExpanded && (
                        <div className="mt-1 ml-4 border-l border-slate-700 space-y-1">
                            {gkeItems.map((item) => {
                                const isActive = pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${isActive
                                            ? 'text-indigo-400 bg-indigo-400/10'
                                            : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        <span className="text-sm font-medium">{t(item.key)}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="pt-2 border-t border-slate-800">
                    {bottomItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${isActive
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                {item.icon}
                                <span className="text-sm font-medium">{t(item.key)}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Footer */}
            <div className="p-4 bg-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-indigo-300">GCP</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-medium text-slate-300 truncate">Network Scan</div>
                        <div className="text-xs text-slate-500">v1.1.0</div>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                        title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    >
                        {theme === 'light' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="4" />
                                <path d="M12 2v2" />
                                <path d="M12 20v2" />
                                <path d="m4.93 4.93 1.41 1.41" />
                                <path d="m17.66 17.66 1.41 1.41" />
                                <path d="M2 12h2" />
                                <path d="M20 12h2" />
                                <path d="m6.34 17.66-1.41 1.41" />
                                <path d="m19.07 4.93-1.41 1.41" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </aside>
    );
}
