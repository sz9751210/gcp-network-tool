'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface YamlViewerProps {
    yaml: string;
    className?: string;
}

export default function YamlViewer({ yaml, className = '' }: YamlViewerProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(yaml);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    if (!yaml) {
        return (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                No YAML manifest available
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={handleCopy}
                className="absolute top-3 right-3 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all z-10 flex items-center gap-1.5 text-xs font-medium"
            >
                {copied ? (
                    <>
                        <Check size={14} />
                        Copied!
                    </>
                ) : (
                    <>
                        <Copy size={14} />
                        Copy
                    </>
                )}
            </button>
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg overflow-auto text-xs font-mono leading-relaxed max-h-[70vh] whitespace-pre-wrap">
                {yaml}
            </pre>
        </div>
    );
}
