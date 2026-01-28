'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function IPToolsPage() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'check' | 'suffix'>('check');

    // IP Check State
    const [checkIp, setCheckIp] = useState('');
    const [checkResult, setCheckResult] = useState<any>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [checkError, setCheckError] = useState('');

    // Suffix Search State
    const [suffix, setSuffix] = useState<number | ''>('');
    const [suffixResults, setSuffixResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [filterProject, setFilterProject] = useState('');

    const handleCheckIp = async () => {
        if (!checkIp) return;
        setIsChecking(true);
        setCheckError('');
        setCheckResult(null);

        try {
            const response = await fetch('http://localhost:8000/api/check-ip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip_address: checkIp }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to check IP');
            }

            const data = await response.json();
            setCheckResult(data);
        } catch (err: any) {
            setCheckError(err.message);
        } finally {
            setIsChecking(false);
        }
    };

    const handleSearchSuffix = async () => {
        if (suffix === '' || suffix < 0 || suffix > 255) return;
        setIsSearching(true);
        setSearchError('');
        setSuffixResults([]);

        try {
            const response = await fetch('http://localhost:8000/api/find-suffix-ips', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    suffix: Number(suffix),
                    project_ids: filterProject ? filterProject.split(',').map(s => s.trim()) : undefined
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to search IPs');
            }

            const data = await response.json();
            setSuffixResults(data.available_ips || []);
        } catch (err: any) {
            setSearchError(err.message);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    {t('ipTools.title')}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    {t('ipTools.subtitle')}
                </p>
            </header>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('check')}
                    className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'check'
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    {t('ipTools.ipChecker')}
                    {activeTab === 'check' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('suffix')}
                    className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'suffix'
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    {t('ipTools.suffixFinder')}
                    {activeTab === 'suffix' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                    )}
                </button>
            </div>

            {/* Content Active Tab */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">

                {activeTab === 'check' && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('ipTools.ipChecker')}</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('ipTools.ipCheckerDesc')}</p>
                        </div>

                        <div className="flex gap-4 items-end">
                            <div className="flex-1 max-w-md space-y-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {t('ipTools.ipAddress')}
                                </label>
                                <input
                                    type="text"
                                    value={checkIp}
                                    onChange={(e) => setCheckIp(e.target.value)}
                                    placeholder="10.128.0.5"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    onKeyDown={(e) => e.key === 'Enter' && handleCheckIp()}
                                />
                            </div>
                            <button
                                onClick={handleCheckIp}
                                disabled={isChecking || !checkIp}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isChecking ? 'Checking...' : t('ipTools.checkIp')}
                            </button>
                        </div>

                        {checkError && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
                                {checkError}
                            </div>
                        )}

                        {checkResult && (
                            <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-lg font-medium text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                                    {t('ipTools.result')}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('ipTools.isUsed')}</div>
                                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${checkResult.is_used
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                }`}>
                                                {checkResult.is_used ? t('ipTools.used') : t('ipTools.available')}
                                            </div>
                                        </div>

                                        {checkResult.is_used && checkResult.used_by && (
                                            <div>
                                                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('ipTools.usedBy')}</div>
                                                <div className="font-mono text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                                                    <div>{checkResult.used_by.resource_name}</div>
                                                    <div className="text-xs text-slate-500 mt-1">({checkResult.used_by.resource_type})</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        {checkResult.subnet ? (
                                            <>
                                                <div>
                                                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('ipTools.subnet')}</div>
                                                    <div className="font-medium text-slate-900 dark:text-white">
                                                        {checkResult.subnet.name} ({checkResult.subnet.ip_cidr_range})
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('ipTools.vpc')}</div>
                                                    <div className="font-medium text-slate-900 dark:text-white">
                                                        {checkResult.vpc?.name}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('ipTools.project')}</div>
                                                    <div className="font-medium text-slate-900 dark:text-white">
                                                        {checkResult.project?.project_id}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('ipTools.region')}</div>
                                                    <div className="font-medium text-slate-900 dark:text-white">
                                                        {checkResult.subnet.region}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="col-span-2 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-600 dark:text-slate-400">
                                                {t('ipTools.notInSubnet')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {!checkResult.is_used && checkResult.subnet && (
                                    <div className="p-4 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300 rounded-lg border border-green-200 dark:border-green-800 text-sm">
                                        {t('ipTools.noConflicts')}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'suffix' && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('ipTools.suffixFinder')}</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('ipTools.suffixFinderDesc')}</p>
                        </div>

                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="w-40 space-y-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {t('ipTools.suffix')}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="255"
                                    value={suffix}
                                    onChange={(e) => setSuffix(Number(e.target.value))}
                                    placeholder="16"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div className="flex-1 min-w-[200px] space-y-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {t('ipTools.filterByProject')}
                                </label>
                                <input
                                    type="text"
                                    value={filterProject}
                                    onChange={(e) => setFilterProject(e.target.value)}
                                    placeholder="my-project-id, other-project"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <button
                                onClick={handleSearchSuffix}
                                disabled={isSearching || suffix === ''}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSearching ? 'Searching...' : t('ipTools.findIps')}
                            </button>
                        </div>

                        {searchError && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
                                {searchError}
                            </div>
                        )}

                        {suffixResults.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                                    {t('ipTools.result')} ({suffixResults.length})
                                </h3>
                                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                                            <tr>
                                                <th className="px-6 py-3 font-medium">{t('ipTools.ipAddress')}</th>
                                                <th className="px-6 py-3 font-medium">{t('ipTools.project')}</th>
                                                <th className="px-6 py-3 font-medium">{t('ipTools.vpc')}</th>
                                                <th className="px-6 py-3 font-medium">{t('ipTools.subnet')}</th>
                                                <th className="px-6 py-3 font-medium">{t('ipTools.region')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                            {suffixResults.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                    <td className="px-6 py-3 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                                                        {item.ip_address}
                                                    </td>
                                                    <td className="px-6 py-3 text-slate-900 dark:text-white">{item.project}</td>
                                                    <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{item.vpc}</td>
                                                    <td className="px-6 py-3 text-slate-600 dark:text-slate-300">
                                                        {item.subnet} <span className="text-xs text-slate-400">({item.cidr})</span>
                                                    </td>
                                                    <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{item.region}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {!isSearching && suffixResults.length === 0 && suffix !== '' && !searchError && (
                            <div className="text-center p-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                No available IPs found with suffix .{suffix}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
