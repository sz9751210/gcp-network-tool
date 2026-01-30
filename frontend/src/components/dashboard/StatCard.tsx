import React from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface StatCardProps {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
    color?: 'indigo' | 'rose' | 'amber' | 'emerald' | 'sky' | 'violet';
}

export function StatCard({ title, value, subtitle, icon: Icon, className, color = 'indigo' }: StatCardProps) {
    const colorStyles = {
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
        rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
        amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
        emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
        sky: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',
        violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400',
    };

    return (
        <div className={twMerge("card p-6 flex items-start justify-between", className)}>
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{value}</h3>
                {subtitle && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>
                )}
            </div>
            <div className={clsx("p-3 rounded-lg", colorStyles[color])}>
                <Icon size={24} />
            </div>
        </div>
    );
}
