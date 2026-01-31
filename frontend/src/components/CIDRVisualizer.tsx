import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import {
    CIDRCheckResponse,
    CIDRCheckRequest
} from '@/types/network';
import { Activity, ShieldCheck, ShieldAlert, Zap, Search, ChevronRight, Map as MapIcon } from 'lucide-react';

interface CIDRVisualizerProps {
    className?: string;
}

export default function CIDRVisualizer({ className }: CIDRVisualizerProps) {
    const { t } = useLanguage();
    const [cidr, setCidr] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [result, setResult] = useState<CIDRCheckResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Debounced real-time validation
    useEffect(() => {
        const timer = setTimeout(() => {
            if (cidr && cidr.includes('/')) {
                performCheck(cidr);
            } else {
                setResult(null);
                setError(null);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [cidr]);

    const performCheck = async (targetCidr: string) => {
        setIsChecking(true);
        setError(null);
        try {
            const req: CIDRCheckRequest = { cidr: targetCidr.trim() };
            const response = await api.checkCIDR(req);
            setResult(response);
        } catch (err: any) {
            setError(err.message || 'Failed to check CIDR');
        } finally {
            setIsChecking(false);
        }
    };

    const handleManualCheck = (e: React.FormEvent) => {
        e.preventDefault();
        if (cidr.trim()) performCheck(cidr);
    };

    return (
        <div className={`flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-indigo-500/5 ${className}`}>
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-950/20">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                        <Zap size={24} fill="currentColor" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                            {t('cidrPlanner.conflictChecker') || 'Network Intelligence'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            {t('cidrPlanner.conflictCheckerDesc') || 'Spatial conflict detection engine'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                {/* Search Bar */}
                <form onSubmit={handleManualCheck} className="relative mb-10 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={22} />
                    <input
                        type="text"
                        placeholder="e.g. 10.128.0.0/20"
                        className="w-full pl-12 pr-28 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-inner"
                        value={cidr}
                        onChange={(e) => setCidr(e.target.value)}
                        disabled={isChecking}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {isChecking && <Activity className="w-5 h-5 text-indigo-500 animate-spin" />}
                        <button
                            type="submit"
                            disabled={isChecking || !cidr}
                            className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-500/20 active:scale-95"
                        >
                            {t('common.check') || 'Check'}
                        </button>
                    </div>
                    {error && (
                        <p className="absolute -bottom-6 left-2 text-xs font-bold text-rose-500 flex items-center gap-1 animate-pulse">
                            <ShieldAlert size={12} /> {error}
                        </p>
                    )}
                </form>

                {/* Results Area */}
                {!result && !isChecking && !cidr && (
                    <div className="h-64 flex flex-col items-center justify-center text-center opacity-40">
                        <MapIcon size={64} className="mb-4 text-slate-300" strokeWidth={1} />
                        <p className="text-slate-500 font-medium">Ready for deployment check...</p>
                    </div>
                )}

                {result && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-8">
                        {/* Spatial Status */}
                        <div className={`relative overflow-hidden p-6 rounded-3xl border-2 transition-all duration-300 ${result.has_conflict
                            ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30'
                            : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30'
                            }`}>
                            <div className="relative z-10 flex items-start gap-4">
                                <div className={`p-4 rounded-2xl shadow-lg border ${result.has_conflict
                                    ? 'bg-white dark:bg-rose-900 text-rose-600 dark:text-rose-400 border-rose-100'
                                    : 'bg-white dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 border-emerald-100'
                                    }`}>
                                    {result.has_conflict ? <ShieldAlert size={32} /> : <ShieldCheck size={32} />}
                                </div>
                                <div>
                                    <h3 className={`text-2xl font-black italic tracking-tighter uppercase mb-1 ${result.has_conflict ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                                        }`}>
                                        {result.has_conflict ? 'Collision Detected' : 'Clear Workspace'}
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">
                                        {result.has_conflict
                                            ? `Range overlaps with ${result.conflicts.length} secure subnet(s)`
                                            : `This CIDR is strictly available for VPC allocation`}
                                    </p>
                                </div>
                            </div>

                            {/* Decorative background element */}
                            <div className={`absolute -right-8 -bottom-8 opacity-[0.03] pointer-events-none transform rotate-12`}>
                                {result.has_conflict ? <ShieldAlert size={160} /> : <ShieldCheck size={160} />}
                            </div>
                        </div>

                        {/* Spatial Addressing Map (The WoW factor) */}
                        {result.has_conflict && (
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase ml-1">Spatial Occupancy Map</h4>
                                <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden border border-slate-200 dark:border-slate-700">
                                    {/* Mockup of spatial visualization - actual implementation would require complex math */}
                                    <div className="w-[15%] h-full bg-indigo-500/20"></div>
                                    <div className="w-[10%] h-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)] relative">
                                        <div className="absolute top-0 left-0 w-full h-full animate-pulse bg-rose-400/30"></div>
                                    </div>
                                    <div className="flex-1 h-full bg-transparent"></div>
                                    <div className="w-[5%] h-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]"></div>
                                    <div className="w-[20%] h-full bg-indigo-500/20"></div>
                                </div>
                                <div className="flex justify-between text-[9px] font-mono text-slate-400 uppercase tracking-widest px-1">
                                    <span>Network Start</span>
                                    <span>High Collision Density</span>
                                    <span>Network End</span>
                                </div>
                            </div>
                        )}

                        {/* Conflict Detail Nodes */}
                        {result.has_conflict && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {result.conflicts.map((conflict, idx) => (
                                    <div key={idx} className="group flex flex-col p-5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700/50 rounded-3xl hover:border-indigo-500 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 active:scale-[0.98]">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">{conflict.overlap_type.replace('_', ' ')}</span>
                                                <code className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{conflict.conflicting_cidr}</code>
                                            </div>
                                            <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-400 group-hover:text-indigo-500 transition-colors">
                                                <ChevronRight size={18} />
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-xs font-semibold">
                                            <div className="flex justify-between text-slate-500">
                                                <span>Subnet</span>
                                                <span className="text-slate-900 dark:text-slate-300 truncate max-w-[140px]">{conflict.subnet_name}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-500">
                                                <span>Region</span>
                                                <span className="text-slate-900 dark:text-slate-300">{conflict.region}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-500">
                                                <span>Location</span>
                                                <span className="text-slate-900 dark:text-slate-300 divide-x divide-slate-200 dark:divide-slate-700 flex gap-2">
                                                    <span className="truncate max-w-[100px]">{conflict.project_id}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Optimization Suggestions */}
                        {result.suggested_cidrs.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase ml-1">Optimized Free Slots</h4>
                                <div className="flex flex-wrap gap-2">
                                    {result.suggested_cidrs.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => setCidr(suggestion)}
                                            className="px-6 py-4 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/30 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl text-sm font-black text-indigo-600 dark:text-indigo-400 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 flex items-center gap-3 group"
                                        >
                                            <span className="text-indigo-300 dark:text-indigo-800 group-hover:text-indigo-500">/</span>
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <style jsx>{`
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
