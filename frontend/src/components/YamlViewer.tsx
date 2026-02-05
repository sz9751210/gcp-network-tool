'use client';

import { useState, useMemo } from 'react';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface YamlViewerProps {
    yaml: string;
    className?: string;
    defaultExpanded?: boolean;
    collapsedLines?: number;
}

// Simple YAML syntax highlighting
function highlightYaml(yaml: string): React.ReactNode[] {
    const lines = yaml.split('\n');
    return lines.map((line, index) => {
        // Match key: value patterns
        const keyMatch = line.match(/^(\s*)([^:\s#][^:#]*?)(:)(.*)$/);
        if (keyMatch) {
            const [, indent, key, colon, value] = keyMatch;
            // Check if value is a comment
            const commentMatch = value.match(/^(\s*)(#.*)$/);
            if (commentMatch) {
                return (
                    <span key={index}>
                        {indent}
                        <span className="text-cyan-400">{key}</span>
                        <span className="text-slate-400">{colon}</span>
                        <span className="text-slate-500">{commentMatch[1]}{commentMatch[2]}</span>
                        {'\n'}
                    </span>
                );
            }
            // Check for string values
            const stringMatch = value.match(/^(\s*)(["'].*["']|[^#\n]*)(\s*#.*)?$/);
            if (stringMatch) {
                const [, space, val, comment] = stringMatch;
                const trimmedVal = val.trim();
                let valueClass = 'text-green-400';
                // Numbers
                if (/^-?\d+(\.\d+)?$/.test(trimmedVal)) {
                    valueClass = 'text-orange-400';
                }
                // Booleans
                else if (/^(true|false|yes|no|on|off)$/i.test(trimmedVal)) {
                    valueClass = 'text-purple-400';
                }
                // null
                else if (/^(null|~)$/i.test(trimmedVal)) {
                    valueClass = 'text-slate-500';
                }
                return (
                    <span key={index}>
                        {indent}
                        <span className="text-cyan-400">{key}</span>
                        <span className="text-slate-400">{colon}</span>
                        {space}
                        <span className={valueClass}>{val}</span>
                        {comment && <span className="text-slate-500">{comment}</span>}
                        {'\n'}
                    </span>
                );
            }
            return (
                <span key={index}>
                    {indent}
                    <span className="text-cyan-400">{key}</span>
                    <span className="text-slate-400">{colon}</span>
                    <span className="text-green-400">{value}</span>
                    {'\n'}
                </span>
            );
        }
        // List items
        const listMatch = line.match(/^(\s*)(-)(\s*)(.*)$/);
        if (listMatch) {
            const [, indent, dash, space, rest] = listMatch;
            return (
                <span key={index}>
                    {indent}
                    <span className="text-yellow-400">{dash}</span>
                    {space}
                    <span className="text-green-400">{rest}</span>
                    {'\n'}
                </span>
            );
        }
        // Comments
        if (line.trim().startsWith('#')) {
            return (
                <span key={index} className="text-slate-500">
                    {line}{'\n'}
                </span>
            );
        }
        // Default
        return <span key={index}>{line}{'\n'}</span>;
    });
}

export default function YamlViewer({
    yaml,
    className = '',
    defaultExpanded = true,
    collapsedLines = 50
}: YamlViewerProps) {
    const [copied, setCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const lines = useMemo(() => yaml?.split('\n') || [], [yaml]);
    const totalLines = lines.length;
    const shouldShowToggle = totalLines > collapsedLines;

    const displayedYaml = useMemo(() => {
        if (!yaml) return '';
        if (isExpanded || !shouldShowToggle) return yaml;
        return lines.slice(0, collapsedLines).join('\n');
    }, [yaml, isExpanded, shouldShowToggle, lines, collapsedLines]);

    const highlightedContent = useMemo(() => highlightYaml(displayedYaml), [displayedYaml]);

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
            {/* Header with actions */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 rounded-t-lg border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-400">
                        YAML Manifest
                    </span>
                    <span className="text-xs text-slate-500">
                        {totalLines} lines
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {shouldShowToggle && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all flex items-center gap-1 text-xs font-medium"
                        >
                            {isExpanded ? (
                                <>
                                    <ChevronUp size={14} />
                                    Collapse
                                </>
                            ) : (
                                <>
                                    <ChevronDown size={14} />
                                    Expand ({totalLines - collapsedLines} more)
                                </>
                            )}
                        </button>
                    )}
                    <button
                        onClick={handleCopy}
                        className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all flex items-center gap-1 text-xs font-medium"
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
                </div>
            </div>

            {/* YAML Content with line numbers */}
            <div className="relative bg-slate-900 rounded-b-lg overflow-hidden">
                <div className={`overflow-auto ${isExpanded ? 'max-h-[80vh]' : 'max-h-[400px]'}`}>
                    <table className="w-full">
                        <tbody>
                            {(isExpanded || !shouldShowToggle ? lines : lines.slice(0, collapsedLines)).map((line, index) => (
                                <tr key={index} className="hover:bg-slate-800/50">
                                    <td className="select-none text-right pr-4 pl-4 py-0 text-xs text-slate-600 font-mono border-r border-slate-800 w-12">
                                        {index + 1}
                                    </td>
                                    <td className="pl-4 pr-4 py-0 text-xs font-mono whitespace-pre">
                                        {highlightYaml(line + '\n')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Collapsed indicator */}
                {!isExpanded && shouldShowToggle && (
                    <div
                        className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 to-transparent flex items-end justify-center pb-2 cursor-pointer"
                        onClick={() => setIsExpanded(true)}
                    >
                        <span className="text-xs text-slate-400 flex items-center gap-1 hover:text-white transition-colors">
                            <ChevronDown size={14} />
                            Show {totalLines - collapsedLines} more lines
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
