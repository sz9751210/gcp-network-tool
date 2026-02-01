'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Cpu, Boxes } from 'lucide-react';

export default function GKEWorkloadsPage() {
    const { t } = useLanguage();

    return (
        <div className="p-8 max-w-[1800px] mx-auto">
            <div className="flex flex-col gap-2 mb-8">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-1">
                    <Boxes size={24} />
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {t('sidebar.gkeWorkloads')}
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    Manage and monitor Kubernetes workloads (Deployments, StatefulSets, DaemonSets)
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 shadow-sm">
                <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                        <Cpu size={32} />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                        Workloads View Coming Soon
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        We are currently integrating deeper GKE workload visualization. This page will display your pods, deployments, and their relationships to the network.
                    </p>
                </div>
            </div>
        </div>
    );
}
