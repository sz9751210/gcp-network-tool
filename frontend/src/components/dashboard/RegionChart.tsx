'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface RegionChartProps {
    data: { name: string; value: number }[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

export function RegionChart({ data }: RegionChartProps) {
    const { t } = useLanguage();

    if (!data || data.length === 0) {
        return <div className="h-full flex items-center justify-center text-slate-400">No Data</div>;
    }

    // Sort by value desc
    const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, 8); // Top 8

    return (
        <div className="h-[300px] w-full">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                {t('dashboard.resourceByRegion') || 'Resources by Region'}
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                        itemStyle={{ color: '#f8fafc' }}
                        cursor={{ fill: 'transparent' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                        {sortedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
