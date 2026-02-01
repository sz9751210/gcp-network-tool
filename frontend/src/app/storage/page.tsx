'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useResources } from '@/lib/useResources';
import { useLanguage } from '@/contexts/LanguageContext';
import { GCSBucket } from '@/types/network';
import {
    Database,
    Search,
    Filter,
    Activity,
    ShieldAlert,
    Lock,
    Unlock,
    History,
    Calendar,
    HardDrive
} from 'lucide-react';
import Pagination from '@/components/Pagination';

function StorageContent() {
    const { data: allBuckets, loading, refresh } = useResources<GCSBucket & { project_name?: string }>('storage-buckets');
    const { t } = useLanguage();
    const [search, setSearch] = useState('');

    const [sortBy, setSortBy] = useState<keyof GCSBucket>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const filteredBuckets = useMemo(() => {
        return allBuckets.filter(bucket =>
            bucket.name.toLowerCase().includes(search.toLowerCase()) ||
            bucket.project_id.toLowerCase().includes(search.toLowerCase()) ||
            bucket.location.toLowerCase().includes(search.toLowerCase())
        );
    }, [allBuckets, search]);

    // Sort buckets
    const sortedBuckets = useMemo(() => {
        return [...filteredBuckets].sort((a, b) => {
            const aVal = a[sortBy] ?? '';
            const bVal = b[sortBy] ?? '';

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredBuckets, sortBy, sortOrder]);

    // Paginated buckets
    const totalPages = Math.ceil(sortedBuckets.length / itemsPerPage);
    const paginatedBuckets = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedBuckets.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedBuckets, currentPage, itemsPerPage]);

    const handleSort = (column: keyof GCSBucket) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, itemsPerPage]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="w-10 h-10 text-indigo-500 animate-spin" />
                    <p className="text-slate-500 font-medium">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <header className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                        <Database size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {t('storage.title')}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            {t('storage.subtitle')}
                        </p>
                    </div>
                </div>
            </header>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={t('publicIps.searchPlaceholder')}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Filter size={16} />
                        <span>{filteredBuckets.length} {t('sidebar.storage')}</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                {[
                                    { key: 'name', label: t('ipAddress.name') || 'Bucket Name' },
                                    { key: 'is_public', label: 'Access Control' },
                                    { key: 'storage_class', label: 'Storage Info' },
                                    { key: 'versioning_enabled', label: 'Configuration' },
                                    { key: 'is_public', label: 'Security' },
                                ].map((col, idx) => (
                                    <th
                                        key={`${col.key}-${idx}`}
                                        onClick={() => handleSort(col.key as keyof GCSBucket)}
                                        className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            {col.label}
                                            {sortBy === col.key && (
                                                <span className="text-amber-600 dark:text-amber-400">
                                                    {sortOrder === 'asc' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {paginatedBuckets.map((bucket, idx) => (
                                <tr key={`${bucket.project_id}-${bucket.name}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-50 dark:bg-amber-900/40 rounded-md text-amber-600 dark:text-amber-400">
                                                <Database size={18} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900 dark:text-white">{bucket.name}</div>
                                                <div className="text-xs text-slate-500 font-mono">{bucket.project_id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {bucket.is_public ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 shadow-sm animate-pulse-slow">
                                                <Unlock size={14} />
                                                PUBLIC ACCESS
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                <Lock size={14} />
                                                Private
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm">
                                                <HardDrive size={12} className="text-slate-400" />
                                                <span className="text-slate-600 dark:text-slate-400 capitalize">{bucket.storage_class.toLowerCase()}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono uppercase">
                                                {bucket.location}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col gap-1">
                                                <span className={`flex items-center gap-1 text-[11px] ${bucket.versioning_enabled ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                                                    <History size={12} />
                                                    Versioning: {bucket.versioning_enabled ? 'ON' : 'OFF'}
                                                </span>
                                                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                    <Calendar size={12} />
                                                    {bucket.creation_time ? new Date(bucket.creation_time).toLocaleDateString() : 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {bucket.is_public ? (
                                            <div className="flex items-center gap-2 text-red-500 font-medium text-xs">
                                                <ShieldAlert size={14} />
                                                High Risk
                                            </div>
                                        ) : (
                                            <div className="text-emerald-500 text-xs font-medium">
                                                Compliant
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {paginatedBuckets.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-500">
                                            <Database size={40} className="text-slate-300 mb-2" />
                                            <p className="font-medium">No storage buckets found</p>
                                            <p className="text-sm text-slate-400">Try adjusting your search or filters</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    totalItems={allBuckets.length}
                    filteredCount={filteredBuckets.length}
                />
            </div>

            <style jsx>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.8; }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        </div>
    );
}

export default function StoragePage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading buckets...</div>}>
            <StorageContent />
        </Suspense>
    );
}
