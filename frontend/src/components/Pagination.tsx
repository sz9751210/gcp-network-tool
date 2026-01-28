'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;
    onItemsPerPageChange: (size: number) => void;
    totalItems: number;
    filteredCount: number;
}

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    onItemsPerPageChange,
    totalItems,
    filteredCount,
}: PaginationProps) {
    const { t } = useLanguage();

    if (totalItems === 0) return null;

    return (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                    {t('common.pagination.page')} <span className="font-semibold text-slate-900 dark:text-slate-100">{currentPage}</span> {t('common.pagination.of')} <span className="font-semibold text-slate-900 dark:text-slate-100">{totalPages || 1}</span>
                </div>
                <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 hidden sm:block"></div>
                <div className="text-xs text-slate-500 dark:text-slate-500">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{filteredCount}</span> / {totalItems}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{t('common.pagination.itemsPerPage')}:</span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                        className="input-select py-1 text-xs w-28"
                    >
                        {[10, 20, 50, 100].map((size) => (
                            <option key={size} value={size}>
                                {t('common.pagination.perPage').replace('{count}', size.toString())}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 hidden sm:block"></div>

                <div className="flex gap-2">
                    <button
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                        className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {t('common.pagination.previous')}
                    </button>
                    <button
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages || totalPages === 0}
                        className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {t('common.pagination.next')}
                    </button>
                </div>
            </div>
        </div>
    );
}
