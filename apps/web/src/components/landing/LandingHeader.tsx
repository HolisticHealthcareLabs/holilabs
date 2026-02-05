'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/hooks/useTheme';

function ThemeToggle({ theme, toggleTheme }: { theme: 'light' | 'dark'; toggleTheme: () => void }) {
    return (
        <button
            onClick={toggleTheme}
            className="ml-4 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ease-out border focus:outline-none relative overflow-hidden"
            aria-label="Toggle Theme"
            style={{
                background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                boxShadow: theme === 'dark' ? '0 0 15px rgba(0,122,255,0.1)' : 'none',
            }}
        >
            <div className="relative w-5 h-5">
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`absolute inset-0 transform transition-transform duration-500 ${theme === 'dark' ? 'rotate-0 opacity-100 text-[#007AFF]' : 'rotate-90 opacity-0'
                        }`}
                >
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`absolute inset-0 transform transition-transform duration-500 ${theme === 'dark' ? '-rotate-90 opacity-0' : 'rotate-0 opacity-100 text-gray-700'
                        }`}
                >
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
            </div>
        </button>
    );
}

export function LandingHeader() {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="fixed top-4 left-0 right-0 z-50 px-4">
            <nav className="container mx-auto max-w-[1400px] bg-background/90 backdrop-blur-xl rounded-2xl shadow-lg border border-border px-8 py-4 flex items-center justify-between">

                {/* LOGO */}
                <Link href="/" className="flex items-center gap-3">
                    <img
                        src="/logos/holilabs-helix-blue-dark.svg"
                        alt="Holi Labs"
                        className="w-10 h-10 hidden dark:block"
                    />
                    <img
                        src="/logos/holilabs-helix-blue-dark.svg"
                        alt="Holi Labs"
                        className="w-10 h-10 dark:hidden"
                    />
                    <span className="text-xl font-semibold tracking-tight text-foreground">
                        Holi Labs
                    </span>
                    <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        Beta
                    </span>
                </Link>

                {/* DESKTOP LINKS */}
                <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
                    <a href="#platform" className="text-muted-foreground hover:text-primary transition-colors">Platform</a>
                    <a href="#security" className="text-muted-foreground hover:text-primary transition-colors">Security</a>
                    <a href="#enterprise" className="text-muted-foreground hover:text-primary transition-colors">Enterprise</a>
                </div>

                {/* RIGHT ACTIONS */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/auth/login"
                        className="hidden md:flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors px-4 py-2"
                    >
                        <span>Partner Login</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                    </Link>

                    <a
                        href="/download"
                        className="hidden md:flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors px-4 py-2"
                    >
                        <span>Download App</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </a>

                    <a
                        href="#demo"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
                    >
                        Request Access
                    </a>

                    <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                </div>
            </nav>
        </header>
    );
}
