'use client';

import { useState } from 'react';
import { useScan } from '@/contexts/ScanContext';
import { useLanguage } from '@/contexts/LanguageContext';
import CIDRVisualizer from '@/components/CIDRVisualizer';
import IPPlanner from '@/components/IPPlanner';

export default function CIDRPlannerPage() {
    const { topology } = useScan();
    const { t } = useLanguage();
    const [cidrInput, setCidrInput] = useState('');
    const [cidrInfo, setCidrInfo] = useState<any>(null);
    const [splitPrefix, setSplitPrefix] = useState(24);

    const calculateCIDR = () => {
        if (!cidrInput) return;

        try {
            const [network, prefixStr] = cidrInput.split('/');
            const prefix = parseInt(prefixStr);

            if (prefix < 0 || prefix > 32) {
                alert('Invalid prefix length (0-32)');
                return;
            }

            const networkParts = network.split('.').map(Number);
            if (networkParts.length !== 4 || networkParts.some(p => p < 0 || p > 255)) {
                alert('Invalid IP address');
                return;
            }

            // Calculate network details
            const totalHosts = Math.pow(2, 32 - prefix);
            const usableHosts = prefix === 31 ? 2 : (prefix === 32 ? 1 : totalHosts - 2);

            // Calculate IP range
            const ipToInt = (ip: string) => {
                return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
            };

            const intToIp = (int: number) => {
                return [
                    (int >>> 24) & 255,
                    (int >>> 16) & 255,
                    (int >>> 8) & 255,
                    int & 255
                ].join('.');
            };

            const networkInt = ipToInt(network);
            const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
            const networkAddr = (networkInt & mask) >>> 0;
            const broadcastAddr = (networkAddr | ~mask) >>> 0;
            const firstUsable = prefix === 31 || prefix === 32 ? networkAddr : networkAddr + 1;
            const lastUsable = prefix === 31 || prefix === 32 ? broadcastAddr : broadcastAddr - 1;

            setCidrInfo({
                cidr: cidrInput,
                networkAddress: intToIp(networkAddr),
                broadcastAddress: intToIp(broadcastAddr),
                firstUsable: intToIp(firstUsable),
                lastUsable: intToIp(lastUsable),
                netmask: intToIp(mask),
                wildcardMask: intToIp(~mask >>> 0),
                totalHosts,
                usableHosts,
                prefix,
            });
        } catch (e) {
            alert('Invalid CIDR format');
        }
    };

    const generateSubnetSuggestions = () => {
        if (!cidrInfo) return [];

        const basePrefix = cidrInfo.prefix;
        if (splitPrefix <= basePrefix) return [];

        const ipToInt = (ip: string) => {
            return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
        };

        const intToIp = (int: number) => {
            return [
                (int >>> 24) & 255,
                (int >>> 16) & 255,
                (int >>> 8) & 255,
                int & 255
            ].join('.');
        };

        const networkInt = ipToInt(cidrInfo.networkAddress);
        const subnetSize = Math.pow(2, 32 - splitPrefix);
        const numSubnets = Math.pow(2, splitPrefix - basePrefix);

        const subnets = [];
        for (let i = 0; i < Math.min(numSubnets, 10); i++) {
            const subnetAddr = networkInt + (i * subnetSize);
            const usableHosts = splitPrefix === 31 ? 2 : (splitPrefix === 32 ? 1 : subnetSize - 2);
            subnets.push({
                cidr: `${intToIp(subnetAddr)}/${splitPrefix}`,
                usableHosts,
            });
        }

        return subnets;
    };

    const subnetSuggestions = cidrInfo ? generateSubnetSuggestions() : [];

    return (
        <div className="p-8 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('cidrPlanner.title')}</h1>
                <p className="text-slate-600 dark:text-slate-400">{t('cidrPlanner.subtitle')}</p>
            </div>

            <div className="space-y-6">
                {/* CIDR Conflict Checker */}
                <div className="card">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600 dark:text-rose-400">
                                <circle cx="12" cy="12" r="10" />
                                <path d="m15 9-6 6" />
                                <path d="m9 9 6 6" />
                            </svg>
                            {t('cidrPlanner.conflictChecker')}
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t('cidrPlanner.conflictCheckerDesc')}</p>
                    </div>
                    <div className="p-6">
                        <CIDRVisualizer />
                    </div>
                </div>

                {/* IP Planning Tool (New Feature) */}
                <IPPlanner />

                {/* CIDR Calculator */}
                <div className="card">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 dark:text-indigo-400">
                                <rect x="4" y="2" width="16" height="20" rx="2" />
                                <line x1="8" y1="6" x2="16" y2="6" />
                                <line x1="16" y1="14" x2="16" y2="14.01" />
                                <line x1="12" y1="14" x2="12" y2="14.01" />
                                <line x1="8" y1="14" x2="8" y2="14.01" />
                                <line x1="16" y1="18" x2="16" y2="18.01" />
                                <line x1="12" y1="18" x2="12" y2="18.01" />
                                <line x1="8" y1="18" x2="8" y2="18.01" />
                            </svg>
                            {t('cidrPlanner.calculator')}
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t('cidrPlanner.calculatorDesc')}</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={cidrInput}
                                onChange={(e) => setCidrInput(e.target.value)}
                                className="input-field flex-1 font-mono"
                                placeholder="e.g., 10.0.0.0/16"
                                onKeyDown={(e) => e.key === 'Enter' && calculateCIDR()}
                            />
                            <button onClick={calculateCIDR} className="btn-primary">
                                {t('cidrPlanner.calculate')}
                            </button>
                        </div>

                        {cidrInfo && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('cidrPlanner.networkAddress')}</div>
                                        <div className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-100">{cidrInfo.networkAddress}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('cidrPlanner.broadcastAddress')}</div>
                                        <div className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-100">{cidrInfo.broadcastAddress}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('cidrPlanner.firstUsable')}</div>
                                        <div className="text-sm font-mono font-semibold text-emerald-700 dark:text-emerald-400">{cidrInfo.firstUsable}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('cidrPlanner.lastUsable')}</div>
                                        <div className="text-sm font-mono font-semibold text-emerald-700 dark:text-emerald-400">{cidrInfo.lastUsable}</div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('cidrPlanner.netmask')}</div>
                                        <div className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-100">{cidrInfo.netmask}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('cidrPlanner.wildcardMask')}</div>
                                        <div className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-100">{cidrInfo.wildcardMask}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('cidrPlanner.totalHosts')}</div>
                                        <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">{cidrInfo.totalHosts.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('cidrPlanner.usableHosts')}</div>
                                        <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">{cidrInfo.usableHosts.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Subnet Splitting Suggestions */}
                {cidrInfo && (
                    <div className="card">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
                                    <path d="M3 3h18v18H3z" />
                                    <path d="M3 9h18" />
                                    <path d="M3 15h18" />
                                    <path d="M9 3v18" />
                                    <path d="M15 3v18" />
                                </svg>
                                {t('cidrPlanner.subnetSplitting')}
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t('cidrPlanner.subnetSplittingDesc')} {cidrInfo.cidr}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-3">
                                    {t('cidrPlanner.newPrefix')}: /{splitPrefix}
                                </label>
                                <input
                                    type="range"
                                    min={cidrInfo.prefix + 1}
                                    max={30}
                                    value={splitPrefix}
                                    onChange={(e) => setSplitPrefix(parseInt(e.target.value))}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    <span>/{cidrInfo.prefix + 1}</span>
                                    <span>/30</span>
                                </div>
                            </div>

                            {subnetSuggestions.length > 0 && (
                                <div className="mt-6">
                                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                        {t('cidrPlanner.splittingInto')} <span className="font-semibold text-indigo-600 dark:text-indigo-400">{Math.pow(2, splitPrefix - cidrInfo.prefix)}</span> {t('dashboard.subnets').toLowerCase()}
                                        {Math.pow(2, splitPrefix - cidrInfo.prefix) > 10 && ` (${t('cidrPlanner.showingFirst10')})`}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {subnetSuggestions.map((subnet, idx) => (
                                            <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
                                                <div className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{subnet.cidr}</div>
                                                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                                    {subnet.usableHosts.toLocaleString()} {t('cidrPlanner.usableHosts').toLowerCase()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
