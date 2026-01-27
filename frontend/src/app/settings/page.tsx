'use client';

import { useState, useEffect, useCallback } from 'react';
import { useScan } from '@/contexts/ScanContext';
import { useLanguage } from '@/contexts/LanguageContext';

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
    const { metadata, isScanning, scanStatus, error, startScan } = useScan();
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
                <h1 className="text-3xl font-bold text-slate-800 mb-2">{t('settings.title')}</h1>
                <p className="text-slate-600">{t('settings.subtitle')}</p>
            </div>

            {/* Credentials Management Card */}
            <div className="card mb-6">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">{t('settings.credentials')}</h2>
                    <p className="text-sm text-slate-600 mt-1">
                        {t('settings.credentialsDesc')}
                    </p>
                </div>

                <div className="p-6">
                    {/* Upload Section */}
                    <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('settings.uploadCredential')}</h3>
                        <div className="flex flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-xs text-slate-500 block mb-1">{t('settings.credentialName')}</label>
                                <input
                                    type="text"
                                    value={uploadName}
                                    onChange={(e) => setUploadName(e.target.value)}
                                    className="input-field"
                                    placeholder="e.g., Production Account"
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-xs text-slate-500 block mb-1">JSON File</label>
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
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
                        <div className="text-center py-8 text-slate-500">{t('common.loading')}</div>
                    ) : credentials.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">{t('settings.noCredentials')}</div>
                    ) : (
                        <div className="space-y-3">
                            {credentials.map((cred) => (
                                <div
                                    key={cred.id}
                                    className={`p-4 rounded-lg border transition-all ${cred.is_active
                                            ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200'
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-slate-800">{cred.name}</span>
                                                {cred.is_active && (
                                                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-600 text-white">
                                                        {t('common.active')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-slate-500">
                                                <span className="font-mono">{cred.client_email}</span>
                                                {cred.project_id && (
                                                    <span className="ml-2 text-slate-400">({cred.project_id})</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">
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
                                                        className="text-red-600 hover:text-red-700 text-sm font-medium"
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
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">{t('settings.scanConfig')}</h2>
                    <p className="text-sm text-slate-600 mt-1">
                        {t('settings.scanConfigDesc')}
                    </p>
                </div>

                <form onSubmit={handleScan} className="p-6 space-y-6">
                    {/* Source Type Selection */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
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
                                        ? 'border-indigo-600 bg-indigo-50 shadow-md'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                >
                                    <div className="font-semibold text-slate-800">{option.label}</div>
                                    <div className="text-xs text-slate-600 mt-1">{option.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Source ID Input */}
                    {sourceType !== 'all_accessible' && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
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
                                <p className="text-xs text-slate-500 mt-2">{t('settings.projectIdsHint')}</p>
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
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="sharedVpc" className="text-sm text-slate-700 cursor-pointer">
                            {t('settings.includeSharedVpc')}
                        </label>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isScanning}
                        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isScanning ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>{t('settings.scanning')}</span>
                            </div>
                        ) : (
                            t('settings.startScan')
                        )}
                    </button>
                </form>
            </div>

            {/* Status Messages */}
            {scanStatus && (
                <div className="card p-4 mb-6 bg-indigo-50 border border-indigo-200">
                    <div className="flex items-center gap-2 text-indigo-700">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                        <span className="font-medium">{scanStatus}</span>
                    </div>
                </div>
            )}

            {error && (
                <div className="card p-4 mb-6 bg-rose-50 border border-rose-200">
                    <div className="flex items-center gap-2 text-rose-700">
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
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800">{t('settings.latestScan')}</h2>
                    </div>
                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t('settings.source')}</div>
                            <div className="text-lg font-semibold text-slate-800 capitalize">{metadata.sourceType.replace('_', ' ')}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t('dashboard.projects')}</div>
                            <div className="text-lg font-semibold text-indigo-600">{metadata.totalProjects}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t('dashboard.vpcs')}</div>
                            <div className="text-lg font-semibold text-emerald-600">{metadata.totalVpcs}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t('dashboard.subnets')}</div>
                            <div className="text-lg font-semibold text-sky-600">{metadata.totalSubnets}</div>
                        </div>
                        <div className="col-span-2 md:col-span-4 pt-4 border-t border-slate-200">
                            <div className="text-xs text-slate-500">
                                {t('settings.lastScanned')}: {new Date(metadata.timestamp).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
