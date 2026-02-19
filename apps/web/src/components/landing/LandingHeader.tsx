'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/hooks/useTheme';
import LanguageSelector from '@/components/LanguageSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/components/landing/copy';

function ThemeToggle({ theme, toggleTheme }: { theme: 'light' | 'dark'; toggleTheme: () => void }) {
    return (
        <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-9 h-9 rounded-full transition-all text-muted-foreground hover:text-foreground"
            aria-label="Toggle Theme"
        >
            <div className="relative w-4 h-4">
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`absolute inset-0 transform transition-all duration-300 ${theme === 'dark' ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0'}`}
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
                    className={`absolute inset-0 transform transition-all duration-300 ${theme === 'dark' ? '-rotate-90 opacity-0' : 'rotate-0 opacity-100'}`}
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
    const { locale } = useLanguage();
    const copy = getLandingCopy(locale);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
            <nav className="max-w-[980px] mx-auto flex items-center justify-between h-11 px-4 sm:px-6 text-xs">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 shrink-0">
                    <div className="relative w-7 h-7 shrink-0">
                        <Image
                            src="/logos/holilabs-helix-blue-dark.svg"
                            alt="Holi Labs"
                            width={28}
                            height={28}
                            className="hidden dark:block"
                        />
                        <Image
                            src="/logos/holilabs-helix-blue-light.svg"
                            alt="Holi Labs"
                            width={28}
                            height={28}
                            className="dark:hidden"
                        />
                    </div>
                    <span className="font-semibold text-sm text-foreground">Holi Labs</span>
                </Link>

                {/* Center links */}
                <div className="hidden md:flex items-center gap-6 text-muted-foreground">
                    <a href="#how-it-works" className="hover:text-foreground transition-colors">{copy.header.howItWorks}</a>
                    <a href="#modules" className="hover:text-foreground transition-colors">{copy.header.audit}</a>
                    <a href="#security" className="hover:text-foreground transition-colors">Safety</a>
                    <a href="#demo" className="hover:text-foreground transition-colors">Contact</a>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-1.5">
                    <div className="hidden sm:block">
                        <LanguageSelector currentLocale={locale} compact />
                    </div>
                    <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                    <Link
                        href="/auth/login"
                        className="hidden sm:inline-flex text-muted-foreground hover:text-foreground transition-colors px-2"
                    >
                        {copy.header.login}
                    </Link>
                    <Link
                        href="/auth/register"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-full transition-colors"
                    >
                        <span className="hidden sm:inline">{copy.header.betaCta}</span>
                        <span className="sm:hidden">{copy.header.betaShort}</span>
                    </Link>
                </div>
            </nav>

            {/* Mobile nav */}
            <div className="flex md:hidden items-center justify-center gap-5 text-xs text-muted-foreground border-t border-border/30 h-9 px-4">
                <a href="#how-it-works" className="hover:text-foreground transition-colors">{copy.header.howItWorks}</a>
                <a href="#modules" className="hover:text-foreground transition-colors">{copy.header.audit}</a>
                <a href="#demo" className="hover:text-foreground transition-colors">Contact</a>
                <Link href="/auth/login" className="hover:text-foreground transition-colors">{copy.header.login}</Link>
            </div>
        </header>
    );
}
