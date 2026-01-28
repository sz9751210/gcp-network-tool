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

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const handleCheckIp = async () => {
        if (!checkIp) return;
        setIsChecking(true);
        setCheckError('');
        setCheckResult(null);

        try {
            const response = await fetch(`${API_BASE}/api/check-ip`, {
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
            const response = await fetch(`${API_BASE}/api/find-suffix-ips`, {
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
        <div className="p-8 max-w-[1400px] mx-auto space-y-8">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                    {t('ipTools.title')}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
                    {t('ipTools.subtitle')}
                </p>
            </header>

            {/* Tabs Navigation */}
            <div className="flex space-x-1 p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('check')}
                    className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === 'check'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    {t('ipTools.ipChecker')}
                </button>
                <button
                    onClick={() => setActiveTab('suffix')}
                    className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === 'suffix'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    {t('ipTools.suffixFinder')}
                </button>
            </div>

            {/* Main Content Area */}
            <div className="card p-6 md:p-8">
                {activeTab === 'check' && (
                    <div className="space-y-8">
                        <div className="flex flex-col md:flex-row md:items-end gap-6 border-b border-slate-100 dark:border-slate-700 pb-8">
                            <div className="flex-1 max-w-xl space-y-3">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('ipTools.ipChecker')}</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('ipTools.ipCheckerDesc')}</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        {t('ipTools.ipAddress')}
                                    </label>
                                    <input
                                        type="text"
                                        value={checkIp}
                                        onChange={(e) => setCheckIp(e.target.value)}
                                        placeholder="e.g., 10.128.0.5"
                                        className="input-field text-lg font-mono py-3"
                                        onKeyDown={(e) => e.key === 'Enter' && handleCheckIp()}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleCheckIp}
                                disabled={isChecking || !checkIp}
                                className="btn-primary flex items-center justify-center gap-2 min-w-[140px] py-3 text-lg"
                            >
                                {isChecking ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    t('ipTools.checkIp')
                                )}
                            </button>
                        </div>

                        {checkError && (
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                {checkError}
                            </div>
                        )}

                        {checkResult && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-slate-700 pb-2">
                                    {t('ipTools.result')}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t('ipTools.status')}</div>
                                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-base font-bold shadow-sm ${checkResult.is_used
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800'
                                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800'
                                                }`}>
                                                <div className={`w-2 h-2 rounded-full ${checkResult.is_used ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                                {checkResult.is_used ? t('ipTools.used') : t('ipTools.available')}
                                            </div>

                                            {checkResult.is_used && checkResult.used_by && (
                                                <div className="mt-6 space-y-2">
                                                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('ipTools.usedBy')}</div>
                                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                                                        <div className="font-bold text-slate-800 dark:text-slate-200">{checkResult.used_by.resource_name}</div>
                                                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-1 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded inline-block uppercase font-bold tracking-tight">
                                                            {checkResult.used_by.resource_type}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {!checkResult.is_used && checkResult.subnet && (
                                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800 text-sm font-medium flex gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                                                {t('ipTools.noConflicts')}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-8">
                                        {checkResult.subnet ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-4">
                                                <div className="space-y-1">
                                                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('ipTools.subnet')}</div>
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{checkResult.subnet.name}</div>
                                                    <div className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded inline-block">
                                                        {checkResult.subnet.ip_cidr_range}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('ipTools.vpc')}</div>
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{checkResult.vpc?.name}</div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('ipTools.project')}</div>
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{checkResult.project?.project_id}</div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('ipTools.region')}</div>
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{checkResult.subnet.region}</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 mb-2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                                <div className="text-slate-600 dark:text-slate-400 font-medium">{t('ipTools.notInSubnet')}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'suffix' && (
                    <div className="space-y-8">
                        <div className="space-y-6 border-b border-slate-100 dark:border-slate-700 pb-8">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('ipTools.suffixFinder')}</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('ipTools.suffixFinderDesc')}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        {t('ipTools.suffix')}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="255"
                                        value={suffix}
                                        onChange={(e) => setSuffix(e.target.value === '' ? '' : Number(e.target.value))}
                                        placeholder="e.g., 16"
                                        className="input-field text-lg font-mono py-3"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        {t('ipTools.filterByProject')}
                                    </label>
                                    <input
                                        type="text"
                                        value={filterProject}
                                        onChange={(e) => setFilterProject(e.target.value)}
                                        placeholder="project-id-1, project-id-2"
                                        className="input-field text-sm py-3"
                                    />
                                </div>

                                <button
                                    onClick={handleSearchSuffix}
                                    disabled={isSearching || suffix === ''}
                                    className="btn-primary flex items-center justify-center gap-2 py-3 text-lg"
                                >
                                    {isSearching ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        t('ipTools.findIps')
                                    )}
                                </button>
                            </div>
                        </div>

                        {searchError && (
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                {searchError}
                            </div>
                        )}

                        {suffixResults.length > 0 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                        {t('ipTools.result')}
                                    </h3>
                                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full">
                                        {suffixResults.length} {t('ipTools.available').toUpperCase()}
                                    </span>
                                </div>

                                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                                <tr>
                                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">{t('ipTools.ipAddress')}</th>
                                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">{t('ipTools.project')}</th>
                                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">{t('ipTools.vpc')}</th>
                                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">{t('ipTools.subnet')}</th>
                                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">{t('ipTools.region')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900/50">
                                                {suffixResults.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-1 rounded-lg">
                                                                {item.ip_address}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">{item.project}</td>
                                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{item.vpc}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-slate-800 dark:text-slate-200 font-medium">{item.subnet}</span>
                                                                <span className="text-[10px] font-mono text-slate-400">{item.cidr}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-500">{item.region}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isSearching && suffixResults.length === 0 && suffix !== '' && !searchError && (
                            <div className="text-center p-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 dark:text-slate-700 mx-auto mb-4"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">No available IPs found with suffix .{suffix}</p>
                                <p className="text-slate-400 dark:text-slate-600 text-sm mt-1">Try a different suffix or check your project filters.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
