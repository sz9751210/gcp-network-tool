'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Globe, Boxes } from 'lucide-react';

export default function GKEIngressPage() {
    const { t } = useLanguage();

    return (
        <div className="p-8 max-w-[1800px] mx-auto">
            <div className="flex flex-col gap-2 mb-8">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-1">
                    <Boxes size={24} />
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {t('sidebar.gkeIngress')}
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    Monitor Ingress resources and associated HTTP(S) Load Balancers
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 shadow-sm">
                <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                        <Globe size={32} />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                        Ingress View Coming Soon
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        Visualize your Ingress rules, backends, and associated Google Cloud HTTP(S) Load Balancers.
                    </p>
                </div>
            </div>
        </div>
    );
}
