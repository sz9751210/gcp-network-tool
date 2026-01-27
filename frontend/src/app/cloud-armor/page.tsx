'use client';

import { useState, useEffect, useMemo } from 'react';
import { useScan } from '@/contexts/ScanContext';
import { CloudArmorPolicy } from '@/types/network';

export default function CloudArmorPage() {
    const { topology, metadata, refreshData } = useScan();
    const [loading, setLoading] = useState(true);
    const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set());
    const [filterText, setFilterText] = useState('');

    useEffect(() => {
        const load = async () => {
            await refreshData();
            setLoading(false);
        };
        load();
    }, [refreshData]);

    const policies = useMemo(() => {
        if (!topology?.cloud_armor_policies) return [];
        return topology.cloud_armor_policies;
    }, [topology]);

    const filteredPolicies = useMemo(() => {
        if (!filterText) return policies;
        const lower = filterText.toLowerCase();
        return policies.filter(p =>
            p.name.toLowerCase().includes(lower) ||
            p.project_id.toLowerCase().includes(lower) ||
            (p.description && p.description.toLowerCase().includes(lower))
        );
    }, [policies, filterText]);

    const togglePolicy = (policyName: string) => {
        const newExpanded = new Set(expandedPolicies);
        if (newExpanded.has(policyName)) {
            newExpanded.delete(policyName);
        } else {
            newExpanded.add(policyName);
        }
        setExpandedPolicies(newExpanded);
    };

    if (loading) {
        return (
            <div className="p-8 max-w-[1800px] mx-auto">
                <div className="card p-12 text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading Cloud Armor policies...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Cloud Armor Policies</h1>
                <p className="text-slate-600">
                    {metadata
                        ? `Security policies across ${metadata.totalProjects} projects`
                        : 'No scan data available.'}
                </p>
            </div>

            {!topology || policies.length === 0 ? (
                <div className="card p-12 text-center">
                    <h3 className="text-xl font-bold text-slate-700 mb-2">No Cloud Armor Policies Found</h3>
                    <p className="text-slate-600">No Cloud Armor security policies were found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="card p-4">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-slate-600">
                                <span className="font-semibold text-indigo-600">{filteredPolicies.length}</span> {' '}
                                {filteredPolicies.length === 1 ? 'policy' : 'policies'}
                            </div>
                            <input
                                type="text"
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="input-field flex-1 max-w-md"
                                placeholder="Search policies..."
                            />
                        </div>
                    </div>

                    {/* Policies List */}
                    {filteredPolicies.map((policy) => {
                        const isExpanded = expandedPolicies.has(policy.name);
                        const allowRules = policy.rules.filter(r => r.action === 'allow').length;
                        const denyRules = policy.rules.filter(r => r.action.startsWith('deny')).length;

                        return (
                            <div key={policy.name} className="card overflow-hidden">
                                {/* Policy Header */}
                                <div
                                    onClick={() => togglePolicy(policy.name)}
                                    className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-bold text-slate-800">{policy.name}</h3>
                                                {policy.adaptive_protection_enabled && (
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                                        Adaptive Protection
                                                    </span>
                                                )}
                                            </div>
                                            {policy.description && (
                                                <p className="text-sm text-slate-600 mb-3">{policy.description}</p>
                                            )}
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-slate-500">
                                                    Project: <span className="font-medium text-slate-700">{policy.project_id}</span>
                                                </span>
                                                <span className="text-slate-500">
                                                    Rules: <span className="font-medium text-green-700">{allowRules} allow</span>,
                                                    <span className="font-medium text-red-700 ml-1">{denyRules} deny</span>
                                                </span>
                                            </div>
                                        </div>
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
                                            className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        >
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Expanded Rules */}
                                {isExpanded && policy.rules.length > 0 && (
                                    <div className="border-t border-slate-200 bg-slate-50">
                                        <div className="p-6">
                                            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Rules</h4>
                                            <div className="space-y-3">
                                                {policy.rules
                                                    .sort((a, b) => a.priority - b.priority)
                                                    .map((rule, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="bg-white rounded-lg p-4 border border-slate-200"
                                                        >
                                                            <div className="flex items-start gap-4">
                                                                <div className="flex-shrink-0 w-16 text-center">
                                                                    <div className="text-xs text-slate-500 uppercase mb-1">Priority</div>
                                                                    <div className="font-mono font-bold text-slate-800">{rule.priority}</div>
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${rule.action === 'allow'
                                                                                ? 'bg-green-100 text-green-800'
                                                                                : 'bg-red-100 text-red-800'
                                                                            }`}>
                                                                            {rule.action.toUpperCase()}
                                                                        </span>
                                                                        {rule.preview && (
                                                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                                                Preview
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {rule.description && (
                                                                        <p className="text-sm text-slate-700 mb-2">{rule.description}</p>
                                                                    )}
                                                                    {rule.match_expression && (
                                                                        <div className="mt-2">
                                                                            <div className="text-xs text-slate-500 uppercase mb-1">Match Expression</div>
                                                                            <code className="block text-xs font-mono bg-slate-100 p-2 rounded border border-slate-200 overflow-x-auto">
                                                                                {rule.match_expression}
                                                                            </code>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
