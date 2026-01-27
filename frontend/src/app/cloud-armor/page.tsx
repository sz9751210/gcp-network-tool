'use client';

import { useState, useEffect, useMemo } from 'react';
import { useScan } from '@/contexts/ScanContext';
import { CloudArmorPolicy } from '@/types/network';

export default function CloudArmorPage() {
    const { topology, metadata, refreshData } = useScan();
    const [loading, setLoading] = useState(true);
    const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set());
    const [filterText, setFilterText] = useState('');
    const [testInput, setTestInput] = useState('');

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

    // Helper: IP to Int
    const ipToInt = (ip: string) => {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    };

    // Helper: Check if IPv4 is in CIDR
    const isIpInCidr = (ip: string, cidr: string) => {
        try {
            const [range, bits] = cidr.split('/');
            const mask = ~((1 << (32 - parseInt(bits, 10))) - 1);
            return (ipToInt(ip) & mask) === (ipToInt(range) & mask);
        } catch {
            return false;
        }
    };

    // Extract IPs/CIDRs from CEL expression
    const extractCidrs = (expr: string) => {
        const cidrs: string[] = [];
        if (!expr) return cidrs;

        const ipRangeRegex = /inIpRange\s*\(\s*origin\.ip\s*,\s*['"]([^'"]+)['"]\s*\)/g;
        const ipExactRegex = /origin\.ip\s*==\s*['"]([^'"]+)['"]/g;

        let match;
        while ((match = ipRangeRegex.exec(expr)) !== null) {
            cidrs.push(match[1]);
        }
        while ((match = ipExactRegex.exec(expr)) !== null) {
            cidrs.push(match[1]);
        }
        return cidrs;
    };

    // Helper: Check if rule matches input (IP or Text)
    const checkRuleMatch = (rule: any, input: string) => {
        if (!input) return false;

        // Text Match
        if (rule.match_expression?.toLowerCase().includes(input.toLowerCase()) ||
            rule.description?.toLowerCase().includes(input.toLowerCase())) {
            return true;
        }

        // IP Match
        const cidrs = extractCidrs(rule.match_expression);
        for (const cidr of cidrs) {
            if (cidr.includes('/')) {
                if (isIpInCidr(input, cidr)) return true;
            } else {
                if (cidr === input) return true;
            }
        }

        return false;
    };

    // Filter policies
    const displayPolicies = useMemo(() => {
        if (!testInput) {
            if (!filterText) return policies;
            const lower = filterText.toLowerCase();
            return policies.filter(p =>
                p.name.toLowerCase().includes(lower) ||
                p.project_id.toLowerCase().includes(lower) ||
                (p.description && p.description.toLowerCase().includes(lower))
            );
        }

        // Simulation Mode
        return policies.map(policy => {
            const matchingRules = policy.rules.filter(rule => checkRuleMatch(rule, testInput));
            return {
                ...policy,
                hasMatch: matchingRules.length > 0,
                matchingRules
            };
        }).filter(p => p.hasMatch);

    }, [policies, filterText, testInput]);

    // Auto-expand policies with matches
    useEffect(() => {
        if (testInput && displayPolicies.length > 0) {
            const newExpanded = new Set<string>();
            displayPolicies.forEach((p: any) => p.hasMatch && newExpanded.add(p.name));
            setExpandedPolicies(newExpanded);
        }
    }, [testInput, displayPolicies]);

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
                <div className="space-y-6">
                    {/* Rule Simulator & Toolbar */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Simulation Panel */}
                        <div className="lg:col-span-2 card p-6 bg-gradient-to-r from-indigo-50 to-white border-indigo-100">
                            <h3 className="text-lg font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                                    <path d="M2 12h20" />
                                    <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6" />
                                    <path d="M10 2 2 12" />
                                    <path d="M22 12 14 2" />
                                </svg>
                                Rule Simulator
                            </h3>
                            <p className="text-sm text-indigo-700 mb-4">
                                Enter a <strong>Test IP</strong> to see which rules would apply.
                            </p>
                            <div className="flex gap-4">
                                <input
                                    type="text"
                                    value={testInput}
                                    onChange={(e) => setTestInput(e.target.value)}
                                    className="input-field flex-1 text-lg font-mono"
                                    placeholder="Enter IP to simulate match..."
                                />
                                {testInput && (
                                    <button
                                        onClick={() => setTestInput('')}
                                        className="btn-secondary text-sm"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Standard Filter */}
                        <div className="card p-6 flex flex-col justify-center">
                            <label className="text-sm font-semibold text-slate-700 mb-2">Filter Policies</label>
                            <input
                                type="text"
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="input-field"
                                placeholder="Filter by policy name..."
                                disabled={!!testInput}
                            />
                            {testInput && (
                                <p className="text-xs text-orange-600 mt-2">
                                    *Filtering disabled during simulation
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Results Status */}
                    <div className="flex items-center justify-between text-sm text-slate-600 px-1">
                        <div>
                            {testInput ? (
                                <span>
                                    Found matches in <span className="font-bold text-indigo-600">{displayPolicies.length}</span> policies
                                </span>
                            ) : (
                                <span>
                                    Showing <span className="font-semibold text-indigo-600">{displayPolicies.length}</span> policies
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Policies List */}
                    {displayPolicies.length === 0 ? (
                        <div className="card p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50">
                            <p className="text-slate-500 font-medium">No matches found for your input.</p>
                        </div>
                    ) : (
                        displayPolicies.map((policy: any) => {
                            const isExpanded = expandedPolicies.has(policy.name);
                            const allowRules = policy.rules.filter((r: any) => r.action === 'allow').length;
                            const denyRules = policy.rules.filter((r: any) => r.action.startsWith('deny')).length;

                            return (
                                <div key={policy.name} className={`card overflow-hidden transition-all duration-300 ${policy.hasMatch ? 'ring-2 ring-indigo-500 shadow-md' : ''}`}>
                                    {/* Policy Header */}
                                    <div
                                        onClick={() => togglePolicy(policy.name)}
                                        className={`p-6 cursor-pointer transition-colors ${policy.hasMatch ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-bold text-slate-800">{policy.name}</h3>
                                                    {policy.adaptive_protection_enabled && (
                                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-violet-100 text-violet-800">
                                                            Adaptive Protection
                                                        </span>
                                                    )}
                                                    {policy.hasMatch && (
                                                        <span className="inline-flex px-2 py-1 text-xs font-bold rounded-full bg-indigo-600 text-white shadow-sm animate-pulse">
                                                            MATCH FOUND
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
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Rules</h4>
                                                    <div className="text-xs text-slate-500">
                                                        Showing {policy.rules.length} rules
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    {policy.rules
                                                        .sort((a: any, b: any) => a.priority - b.priority)
                                                        .map((rule: any, idx: number) => {
                                                            const isRuleMatched = testInput && checkRuleMatch(rule, testInput);
                                                            const cidrs = extractCidrs(rule.match_expression);

                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className={`rounded-lg border transition-all duration-300 ${isRuleMatched
                                                                        ? 'bg-white border-indigo-400 ring-2 ring-indigo-200 shadow-lg'
                                                                        : 'bg-white border-slate-200'
                                                                        }`}
                                                                >
                                                                    <div className="flex">
                                                                        {/* Priority Column */}
                                                                        <div className={`flex-shrink-0 w-24 p-4 text-center border-r ${isRuleMatched ? 'border-indigo-100 bg-indigo-50' : 'border-slate-100 bg-slate-50'} rounded-l-lg`}>
                                                                            <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Priority</div>
                                                                            <div className={`font-mono font-bold break-all ${isRuleMatched ? 'text-indigo-700 text-lg' : 'text-slate-800'}`}>
                                                                                {rule.priority}
                                                                            </div>
                                                                        </div>

                                                                        {/* Main Content */}
                                                                        <div className="flex-1 p-4 overflow-hidden">
                                                                            {/* Top Row: Action & Description */}
                                                                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                                                                <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded border uppercase tracking-wide ${rule.action === 'allow'
                                                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                                                    : 'bg-red-50 text-red-700 border-red-200'
                                                                                    }`}>
                                                                                    {rule.action}
                                                                                </span>

                                                                                {rule.description && (
                                                                                    <span className="text-sm text-slate-600">
                                                                                        {rule.description}
                                                                                    </span>
                                                                                )}

                                                                                {isRuleMatched && (
                                                                                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-600 text-white">
                                                                                        MATCHED
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            {/* IP Pills - Clean GCP Style */}
                                                                            {cidrs.length > 0 && (
                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                    {cidrs.map((cidr, i) => {
                                                                                        const isCidrMatched = testInput && (
                                                                                            cidr.includes('/') ? isIpInCidr(testInput, cidr) : testInput === cidr
                                                                                        );
                                                                                        return (
                                                                                            <span
                                                                                                key={i}
                                                                                                className={`inline-block px-2 py-0.5 rounded text-xs font-mono border ${isCidrMatched
                                                                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                                                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                                                                                    }`}
                                                                                            >
                                                                                                {cidr}
                                                                                            </span>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
