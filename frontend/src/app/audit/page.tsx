
'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SecurityReport, SecurityIssue } from '@/types/network';

export default function AuditPage() {
    const { t } = useLanguage();
    const [report, setReport] = useState<SecurityReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'risks' | 'certs' | 'cost'>('risks');

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/audit/latest');
            if (res.ok) {
                const data = await res.json();
                setReport(data);
            }
        } catch (error) {
            console.error('Failed to fetch audit report:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-[1800px] mx-auto">
                <div className="card p-12 text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Loading Security Audit...</p>
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="p-8 max-w-[1800px] mx-auto">
                <div className="card p-12 text-center">
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">No Audit Data</h3>
                    <p className="text-slate-600 dark:text-slate-400">Please run a network scan first to generate a security report.</p>
                </div>
            </div>
        );
    }

    const risks = report.issues.filter(i => i.category === 'FIREWALL' || i.category === 'SECURITY');
    const certs = report.issues.filter(i => i.title.includes('SSL')); // Or use category if cleaner, but SSL is subset of SECURITY
    // Actually, my backend puts SSL in SECURITY. To distinguish Firewall vs SSL, I can use title or metadata.
    // Let's rely on category. FIREWALL is separate. SECURITY has SSL.
    // Let's split: 
    // - Risks: Firewall + High/Critical Security (non-SSL?)
    // - Certs: SSL related (search "SSL" in title)
    // - Cost: COST category

    const firewallIssues = report.issues.filter(i => i.category === 'FIREWALL');
    const sslIssues = report.issues.filter(i => i.title.includes('SSL'));
    const costIssues = report.issues.filter(i => i.category === 'COST');

    // Summary Cards
    const StatCard = ({ title, count, color }: { title: string, count: number, color: string }) => (
        <div className={`p-6 rounded-lg shadow-sm border ${color} bg-white dark:bg-slate-800`}>
            <div className="text-3xl font-bold mb-1">{count}</div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</div>
        </div>
    );

    return (
        <div className="p-8 max-w-[1800px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Security & Compliance Audit</h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Generated at {new Date(report.generated_at).toLocaleString()}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard title="Critical Issues" count={report.summary.critical} color="border-l-4 border-l-red-500" />
                <StatCard title="High Risks" count={report.summary.high} color="border-l-4 border-l-orange-500" />
                <StatCard title="Medium Risks" count={report.summary.medium} color="border-l-4 border-l-yellow-500" />
                <StatCard title="Optimization Ops" count={report.summary.by_category['COST'] || 0} color="border-l-4 border-l-green-500" />
            </div>

            {/* Tabs */}
            <div className="card shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => setActiveTab('risks')}
                            className={`px-8 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'risks'
                                ? 'border-red-500 text-red-600 dark:text-red-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                                }`}
                        >
                            Firewall Risks ({firewallIssues.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('certs')}
                            className={`px-8 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'certs'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                                }`}
                        >
                            SSL Certificates ({sslIssues.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('cost')}
                            className={`px-8 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'cost'
                                ? 'border-green-500 text-green-600 dark:text-green-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                                }`}
                        >
                            Cost Optimization ({costIssues.length})
                        </button>
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'risks' && <IssueList issues={firewallIssues} emptyMsg="No high-risk firewall rules found." />}
                    {activeTab === 'certs' && <IssueList issues={sslIssues} emptyMsg="No SSL certificate issues found." />}
                    {activeTab === 'cost' && <IssueList issues={costIssues} emptyMsg="No cost optimization opportunities found." />}
                </div>
            </div>
        </div>
    );
}

function IssueList({ issues, emptyMsg }: { issues: SecurityIssue[], emptyMsg: string }) {
    if (issues.length === 0) {
        return <div className="text-center py-12 text-slate-500 dark:text-slate-400">{emptyMsg}</div>;
    }

    return (
        <div className="space-y-4">
            {issues.map((issue) => (
                <div key={issue.id} className="flex flex-col md:flex-row gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Severity Badge */}
                    <div className="flex-shrink-0">
                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider w-24 justify-center ${issue.severity === 'CRITICAL' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                issue.severity === 'HIGH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                    issue.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                            {issue.severity}
                        </span>
                    </div>

                    {/* Content */}
                    <div className="flex-grow">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{issue.title}</h4>
                        <p className="text-slate-600 dark:text-slate-300 mb-2">{issue.description}</p>

                        <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 mt-3">
                            <span className="flex items-center gap-1">
                                <span className="font-semibold">Resource:</span> {issue.resource_name}
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="font-semibold">Project:</span> {issue.project_id}
                            </span>
                        </div>
                    </div>

                    {/* Remediation */}
                    <div className="md:w-1/3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded text-sm border border-slate-100 dark:border-slate-800">
                        <div className="font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs uppercase">Remediation</div>
                        <p className="text-slate-600 dark:text-slate-400">{issue.remediation}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
