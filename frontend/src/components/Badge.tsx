import React from 'react';

export type BadgeVariant =
    | 'default'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'indigo'
    | 'purple'
    | 'amber'
    | 'emerald'
    | 'blue'
    | 'cyan';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    pill?: boolean;
    className?: string;
}

export default function Badge({ children, variant = 'default', pill = false, className = '' }: BadgeProps) {
    const variants: Record<BadgeVariant, string> = {
        default: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
        primary: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        secondary: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
        success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',

        // Color-specific aliases used in the app
        indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', // Matches Label style
        cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    };

    return (
        <span className={`inline-flex px-2 py-1 text-xs font-bold uppercase tracking-wider ${pill ? 'rounded-full' : 'rounded'} ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
}
