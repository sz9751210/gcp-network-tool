import { Fragment, useEffect } from 'react';

interface SlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function SlideOver({ isOpen, onClose, title, children }: SlideOverProps) {
    // Close on Esc key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            // Slight delay to allow animation to finish if needed, but instant is fine for now
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <div
            className={`fixed inset-0 overflow-hidden z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
            aria-labelledby="slide-over-title"
            role="dialog"
            aria-modal="true"
        >
            <div className="absolute inset-0 overflow-hidden">
                {/* Backdrop */}
                <div
                    className={`absolute inset-0 bg-slate-500/75 transition-opacity duration-500 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                    aria-hidden="true"
                    onClick={onClose}
                />

                <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                    <div
                        className={`pointer-events-auto relative w-screen max-w-md transform transition duration-500 ease-in-out sm:duration-700 ${isOpen ? 'translate-x-0' : 'translate-x-full'
                            }`}
                    >
                        {/* Close button */}
                        <div className={`absolute left-0 top-0 -ml-8 flex pr-2 pt-4 sm:-ml-10 sm:pr-4 ${isOpen ? 'opacity-100' : 'opacity-0'} duration-500 ease-in-out`}>
                            <button
                                type="button"
                                className="relative rounded-md text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                                onClick={onClose}
                            >
                                <span className="absolute -inset-2.5" />
                                <span className="sr-only">Close panel</span>
                                <svg
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Panel content */}
                        <div className="flex h-full flex-col overflow-y-scroll bg-white dark:bg-slate-900 py-6 shadow-xl border-l border-slate-200 dark:border-slate-800">
                            <div className="px-4 sm:px-6">
                                <h2
                                    className="text-base font-semibold leading-6 text-slate-900 dark:text-white"
                                    id="slide-over-title"
                                >
                                    {title}
                                </h2>
                            </div>
                            <div className="relative mt-6 flex-1 px-4 sm:px-6">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
