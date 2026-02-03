'use client';


import { useState, useEffect, useCallback } from 'react';
import { useScan } from '@/contexts/ScanContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Clock } from 'lucide-react';


interface Credential {
    id: string;
    name: string;
    filename: string;
    project_id?: string;
    client_email?: string;
    upload_date: string;
    is_active: boolean;
}

export default function SettingsPage() {
    const { metadata, isScanning, scanStatus, error, startScan, topology, scanHistory, loadScan } = useScan();
    const { t } = useLanguage();
    const [sourceType, setSourceType] = useState<'folder' | 'organization' | 'project' | 'all_accessible'>('all_accessible');
    const [sourceId, setSourceId] = useState('');
    const [includeSharedVpc, setIncludeSharedVpc] = useState(true);

    // Credentials state
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [credLoading, setCredLoading] = useState(true);
    const [uploadName, setUploadName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // Scan Timer
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isScanning) {
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [isScanning]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };



    // Scan History
    // Scan History
    const [restoringId, setRestoringId] = useState<string | null>(null);



    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // Load credentials
    const loadCredentials = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/credentials`);
            if (res.ok) {
                const data = await res.json();
                setCredentials(data);
            }
        } catch (e) {
            console.error('Failed to load credentials:', e);
        } finally {
            setCredLoading(false);
        }
    }, [API_BASE]);

    useEffect(() => {
        loadCredentials();
    }, [loadCredentials]);

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (sourceType !== 'all_accessible' && !sourceId) return;

        await startScan({
            source_type: sourceType,
            source_id: sourceType === 'all_accessible' ? 'all_accessible' : sourceId,
            include_shared_vpc: includeSharedVpc,
        });
    };

    const handleUploadCredential = async () => {
        if (!selectedFile || !uploadName.trim()) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('name', uploadName.trim());

            const res = await fetch(`${API_BASE}/api/credentials/upload`, {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                setSelectedFile(null);
                setUploadName('');
                await loadCredentials();
            } else {
                const err = await res.json();
                alert(err.detail || 'Upload failed');
            }
        } catch (e) {
            console.error('Upload error:', e);
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleActivate = async (credId: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/credentials/${credId}/activate`, {
                method: 'POST',
            });
            if (res.ok) {
                await loadCredentials();
            }
        } catch (e) {
            console.error('Activate error:', e);
        }
    };

    const handleDelete = async (credId: string) => {
        if (!confirm(t('settings.deleteConfirm'))) return;

        try {
            const res = await fetch(`${API_BASE}/api/credentials/${credId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                await loadCredentials();
            } else {
                const err = await res.json();
                alert(err.detail || 'Delete failed');
            }
        } catch (e) {
            console.error('Delete error:', e);
        }
    };

    return (
        <div className="p-8 max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('settings.title')}</h1>
                <p className="text-slate-600 dark:text-slate-400">{t('settings.subtitle')}</p>
            </div>

            {/* Scan History Card */}
            <div className="card mb-6">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Scan History</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        View and restore previous network scans.
                    </p>
                </div>
                <div className="p-0">
                    {scanHistory.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400 italic">No scan history available.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase text-xs font-semibold">
                                    <tr>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Source</th>
                                        <th className="px-6 py-3">Stats</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {scanHistory.map((scan, idx) => (
                                        <tr key={`${scan.scanId}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400">
                                                {new Date(scan.timestamp).toLocaleString()}
                                                {scan.status === 'failed' && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold">FAILED</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-800 dark:text-slate-200">{scan.sourceId}</span>
                                                    <span className="text-xs text-slate-400 dark:text-slate-500 capitalize">{scan.sourceType}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                                                    <span title="Projects">{scan.totalProjects} Proj</span>
                                                    <span title="VPCs">{scan.totalVpcs} VPC</span>
                                                    <span title="Subnets">{scan.totalSubnets} Subnet</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={async () => {
                                                        if (scan.status === 'completed') {
                                                            setRestoringId(scan.scanId);
                                                            await loadScan(scan.scanId);
                                                            setRestoringId(null);
                                                        }
                                                    }}
                                                    disabled={scan.status !== 'completed' || isScanning}
                                                    className="btn-secondary text-xs py-1.5 px-3"
                                                >
                                                    {restoringId === scan.scanId ? (
                                                        <span className="flex items-center gap-1">
                                                            <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                                                            Loading...
                                                        </span>
                                                    ) : 'Restore'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>



            {/* Credentials Management Card */}
            <div className="card mb-6">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('settings.credentials')}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {t('settings.credentialsDesc')}
                    </p>
                </div>

                <div className="p-6">
                    {/* Upload Section */}
                    <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t('settings.uploadCredential')}</h3>
                        <div className="flex flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">{t('settings.credentialName')}</label>
                                <input
                                    type="text"
                                    value={uploadName}
                                    onChange={(e) => setUploadName(e.target.value)}
                                    className="input-field"
                                    placeholder="e.g., Production Account"
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">JSON File</label>
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/30 file:text-indigo-700 dark:file:text-indigo-400 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50"
                                />
                            </div>
                            <button
                                onClick={handleUploadCredential}
                                disabled={!selectedFile || !uploadName.trim() || uploading}
                                className="btn-primary disabled:opacity-50"
                            >
                                {uploading ? t('common.loading') : t('common.upload')}
                            </button>
                        </div>
                    </div>

                    {/* Credentials List */}
                    {credLoading ? (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">{t('common.loading')}</div>
                    ) : credentials.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">{t('settings.noCredentials')}</div>
                    ) : (
                        <div className="space-y-3">
                            {credentials.map((cred) => (
                                <div
                                    key={cred.id}
                                    className={`p-4 rounded-lg border transition-all ${cred.is_active
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-200 dark:ring-indigo-800'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-slate-800 dark:text-slate-100">{cred.name}</span>
                                                {cred.is_active && (
                                                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-600 text-white">
                                                        {t('common.active')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                                <span className="font-mono">{cred.client_email}</span>
                                                {cred.project_id && (
                                                    <span className="ml-2 text-slate-400 dark:text-slate-500">({cred.project_id})</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                                {t('settings.uploadDate')}: {new Date(cred.upload_date).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!cred.is_active && (
                                                <>
                                                    <button
                                                        onClick={() => handleActivate(cred.id)}
                                                        className="btn-secondary text-sm"
                                                    >
                                                        {t('settings.setActive')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(cred.id)}
                                                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                                                    >
                                                        {t('common.delete')}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Scan Configuration Card */}
            <div className="card mb-6">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('settings.scanConfig')}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {t('settings.scanConfigDesc')}
                    </p>
                </div>

                <form onSubmit={handleScan} className="p-6 space-y-6">
                    {/* Source Type Selection */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-3">
                            {t('settings.sourceType')}
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {[
                                { value: 'all_accessible', label: t('settings.autoDiscover'), desc: t('settings.autoDiscoverDesc') },
                                { value: 'folder', label: t('settings.folder'), desc: t('settings.folderDesc') },
                                { value: 'organization', label: t('settings.organization'), desc: t('settings.organizationDesc') },
                                { value: 'project', label: t('settings.projects'), desc: t('settings.projectsDesc') },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        setSourceType(option.value as any);
                                        if (option.value === 'all_accessible') {
                                            setSourceId('all_accessible');
                                        } else {
                                            setSourceId('');
                                        }
                                    }}
                                    className={`flex-1 min-w-[200px] p-4 rounded-lg border-2 transition-all text-left ${sourceType === option.value
                                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                                        }`}
                                >
                                    <div className="font-semibold text-slate-800 dark:text-slate-100">{option.label}</div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">{option.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Source ID Input */}
                    {sourceType !== 'all_accessible' && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-3">
                                {sourceType === 'folder' ? t('settings.folderId') : sourceType === 'organization' ? t('settings.organizationId') : t('settings.projectIds')}
                            </label>
                            <input
                                type="text"
                                value={sourceId}
                                onChange={(e) => setSourceId(e.target.value)}
                                className="input-field font-mono"
                                placeholder={sourceType === 'project' ? 'proj-a, proj-b, proj-c' : `Enter ${sourceType} ID...`}
                                required
                            />
                            {sourceType === 'project' && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{t('settings.projectIdsHint')}</p>
                            )}
                        </div>
                    )}

                    {/* Shared VPC Option */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="sharedVpc"
                            checked={includeSharedVpc}
                            onChange={(e) => setIncludeSharedVpc(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="sharedVpc" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                            {t('settings.includeSharedVpc')}
                        </label>
                    </div>

                    {/* Submit Button or Status Card */}
                    {isScanning ? (
                        <div className="card p-6 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 shadow-sm relative overflow-hidden animate-fade-in">
                            {/* Background decoration */}
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl animate-pulse"></div>
                            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl animate-pulse delay-700"></div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{t('settings.scanning')}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {scanStatus.includes('0/0')
                                                    ? 'Initializing project discovery...'
                                                    : 'Please wait while we explore your GCP network...'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="font-mono text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                            <Clock size={12} />
                                            <span>
                                                {formatTime(elapsedTime)}
                                            </span>
                                        </div>
                                        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                                            {scanStatus.replace('Scanning... ', '')}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
                                    {/* Striped Background */}
                                    <div className="absolute inset-0 w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-progress-stripes z-10 pointer-events-none opacity-30"></div>

                                    {/* Gradient Bar */}
                                    <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 w-1/3 rounded-full animate-progress-indeterminate relative">
                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Success Message if recently scanned */}
                            {!isScanning && scanStatus === 'Scan completed!' && (
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-3 animate-fade-in">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Scan Completed Successfully</h3>
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400">Your network structure has been updated.</p>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isScanning}
                                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('settings.startScan')}
                            </button>
                        </div>
                    )}
                </form>
            </div>

            {error && (
                <div className="card p-4 mb-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span className="font-medium">{error}</span>
                    </div>
                </div>
            )}

            {/* Latest Scan Metadata */}
            {metadata && (
                <div className="card">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('settings.latestScan')}</h2>
                    </div>
                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('settings.source')}</div>
                            <div className="text-lg font-semibold text-slate-800 dark:text-slate-100 capitalize">{metadata.sourceType.replace('_', ' ')}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('dashboard.projects')}</div>
                            <div className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">{metadata.totalProjects}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('dashboard.vpcs')}</div>
                            <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{metadata.totalVpcs}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('dashboard.subnets')}</div>
                            <div className="text-lg font-semibold text-sky-600 dark:text-sky-400">{metadata.totalSubnets}</div>
                        </div>
                        <div className="col-span-2 md:col-span-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                {t('settings.lastScanned')}: {new Date(metadata.timestamp).toLocaleString()}
                            </div>
                            <button
                                onClick={() => {
                                    if (!topology) return;
                                    const blob = new Blob([JSON.stringify(topology, null, 2)], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `gcp-network-topology-${new Date().toISOString().split('T')[0]}.json`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                }}
                                className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium flex items-center gap-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                {t('common.download')} JSON
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Scanned Projects List */}
            {topology && topology.projects.length > 0 && (
                <div className="card mt-6">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('settings.scannedProjects')}</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                    <th className="p-4 font-semibold">{t('dashboard.projects')}</th>
                                    <th className="p-4 font-semibold">ID</th>
                                    <th className="p-4 font-semibold">{t('publicIps.status')}</th>
                                    <th className="p-4 font-semibold">{t('dashboard.vpcs')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {topology.projects.map((p, idx) => (
                                    <tr key={`${p.project_id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{p.project_name}</td>
                                        <td className="p-4 font-mono text-sm text-slate-600 dark:text-slate-400">{p.project_id}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.scan_status === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                p.scan_status === 'error' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                                }`}>
                                                {p.scan_status}
                                            </span>
                                            {p.error_message && (
                                                <div className="text-xs text-rose-600 dark:text-rose-400 mt-1">{p.error_message}</div>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-600 dark:text-slate-400">{p.vpc_networks.length}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
