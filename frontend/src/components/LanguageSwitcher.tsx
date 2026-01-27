'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useRef, useEffect } from 'react';

export default function LanguageSwitcher() {
    const { locale, setLocale, t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const languages = [
        { code: 'en', label: 'English' },
        { code: 'zh-CN', label: '简体中文' },
        { code: 'zh-TW', label: '繁體中文' },
    ] as const;

    const currentLabel = languages.find(l => l.code === locale)?.label || 'English';

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white/80 hover:bg-white backdrop-blur-sm border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-700 transition-all hover:shadow-md hover:text-indigo-600"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span>{currentLabel}</span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => {
                                setLocale(lang.code as any);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${locale === lang.code
                                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            {lang.label}
                            {locale === lang.code && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
