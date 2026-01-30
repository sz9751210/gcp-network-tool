import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import {
    CIDRCheckResponse,
    CIDRCheckRequest
} from '@/types/network';

interface CIDRVisualizerProps {
    className?: string;
}

export default function CIDRVisualizer({ className }: CIDRVisualizerProps) {
    const { t } = useLanguage();
    const [cidr, setCidr] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [result, setResult] = useState<CIDRCheckResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const checkConflict = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cidr.trim()) return;

        setIsChecking(true);
        setError(null);
        setResult(null);

        try {
            // Basic validation
            if (!cidr.includes('/')) {
                throw new Error("Please enter a valid CIDR (e.g., 10.0.0.0/24)");
            }

            const req: CIDRCheckRequest = { cidr: cidr.trim() };
            const response = await api.checkCIDR(req);
            setResult(response);
        } catch (err: any) {
            setError(err.message || 'Failed to check CIDR');
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className={`card flex flex-col h-full overflow-hidden ${className}`}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 dark:text-indigo-400"><circle cx="12" cy="12" r="10" /><path d="m4.93 4.93 14.14 14.14" /></svg>
                    </div>
                    <h2 className="font-bold text-slate-900 dark:text-slate-100">{t('cidrPlanner.conflictChecker') || 'CIDR Conflict Checker'}</h2>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 ml-12">
                    {t('cidrPlanner.conflictCheckerDesc') || 'Check for IP conflicts across your GCP organization before provisioning.'}
                </p>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
                <form onSubmit={checkConflict} className="mb-8">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Proposed CIDR Block
                    </label>
                    <div className="flex gap-2">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" x2="22" y1="12" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                            </div>
                            <input
                                type="text"
                                placeholder="e.g. 10.128.0.0/20"
                                className="input-field pl-10 font-mono text-lg"
                                value={cidr}
                                onChange={(e) => setCidr(e.target.value)}
                                disabled={isChecking}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isChecking || !cidr}
                            className="btn-primary min-w-[100px]"
                        >
                            {isChecking ? '...' : 'Check'}
                        </button>
                    </div>
                    {error && <p className="mt-2 text-sm text-rose-600 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y2="16" /></svg>
                        {error}
                    </p>}
                </form>

                {/* Results Area */}
                {result && (
                    <div className="animate-fade-in space-y-6">
                        {/* Status Card */}
                        <div className={`p-5 rounded-xl border ${result.has_conflict ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'} shadow-sm`}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-full ${result.has_conflict ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {result.has_conflict ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" x2="9" y1="9" y2="15" /><line x1="9" x2="15" y1="9" y2="15" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                    )}
                                </div>
                                <h3 className={`text-lg font-bold ${result.has_conflict ? 'text-rose-800' : 'text-emerald-800'}`}>
                                    {result.has_conflict ? 'Conflict Detected' : 'Available'}
                                </h3>
                            </div>
                            <p className={`text-sm ${result.has_conflict ? 'text-rose-700' : 'text-emerald-700'} ml-1`}>
                                {result.has_conflict
                                    ? `The CIDR ${result.input_cidr} overlaps with ${result.conflicts.length} existing subnets.`
                                    : `The CIDR range ${result.input_cidr} is free to use.`}
                            </p>
                        </div>

                        {/* Conflict List */}
                        {result.has_conflict && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">Conflict Details</h4>
                                <div className="space-y-3">
                                    {result.conflicts.map((conflict, idx) => (
                                        <div key={idx} className="bg-white border border-rose-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">{conflict.conflicting_cidr}</span>
                                                <span className="text-[10px] uppercase font-bold text-rose-500 border border-rose-200 px-1.5 py-0.5 rounded">
                                                    {conflict.overlap_type.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-400 text-[10px]">Subnet</span>
                                                    <span className="font-medium truncate" title={conflict.subnet_name}>{conflict.subnet_name}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-slate-400 text-[10px]">Region</span>
                                                    <span className="font-medium">{conflict.region}</span>
                                                </div>
                                                <div className="col-span-2 flex flex-col mt-1 pt-1 border-t border-slate-50">
                                                    <span className="text-slate-400 text-[10px]">Location</span>
                                                    <span className="font-medium truncate">{conflict.project_id}</span>
                                                    <span className="text-[10px] text-slate-400 truncate">{conflict.vpc_name}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Suggestions */}
                        {result.suggested_cidrs.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" /></svg>
                                    Suggestions
                                </h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {result.suggested_cidrs.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => setCidr(suggestion)}
                                            className="w-full text-left px-4 py-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-sm font-mono text-amber-900 transition-all flex justify-between items-center group relative overflow-hidden"
                                        >
                                            <span className="relative z-10">{suggestion}</span>
                                            <span className="text-xs font-bold text-amber-600 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all relative z-10">
                                                Apply
                                            </span>
                                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
