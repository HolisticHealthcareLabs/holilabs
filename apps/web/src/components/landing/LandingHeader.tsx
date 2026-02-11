'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/hooks/useTheme';
import LanguageSelector from '@/components/LanguageSelector';
import { useLanguage } from '@/contexts/LanguageContext';

function ThemeToggle({ theme, toggleTheme }: { theme: 'light' | 'dark'; toggleTheme: () => void }) {
    return (
        <button
            onClick={toggleTheme}
            className="ml-0 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ease-out border focus:outline-none relative overflow-hidden"
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
    const { locale } = useLanguage();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="fixed top-2 sm:top-4 left-0 right-0 z-50 px-2 sm:px-3 md:px-4">
            <nav className="container mx-auto max-w-[1400px] bg-background/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-border">
                <div className="flex items-center justify-between px-2 sm:px-3 lg:px-6 py-2 sm:py-2.5">
                    {/* LOGO */}
                    <Link href="/" className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
                        <div className="relative w-8 h-8 sm:w-10 sm:h-10 shrink-0">
                            <Image
                                src="/logos/holilabs-helix-blue-dark.svg"
                                alt="Holi Labs"
                                width={40}
                                height={40}
                                className="hidden dark:block"
                            />
                            <Image
                                src="/logos/holilabs-helix-blue-light.svg"
                                alt="Holi Labs"
                                width={40}
                                height={40}
                                className="dark:hidden"
                            />
                        </div>
                        <span className="text-sm sm:text-base lg:text-lg xl:text-xl font-semibold tracking-tight text-foreground whitespace-nowrap">
                            Holi Labs
                        </span>
                        <span className="hidden 2xl:inline-flex text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            Cortex Pilot
                        </span>
                    </Link>

                    {/* DESKTOP LINKS */}
                    <div className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm font-medium">
                        <a href="#how-it-works" className="text-muted-foreground hover:text-primary transition-colors">How it works</a>
                        <a href="#audit" className="text-muted-foreground hover:text-primary transition-colors">Audit</a>
                    </div>

                    {/* RIGHT ACTIONS */}
                    <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
                        {/* Language Selector - Desktop */}
                        <div className="hidden md:block">
                            <LanguageSelector currentLocale={locale} />
                        </div>

                        {/* Language Selector - Mobile (icon-only) */}
                        <div className="md:hidden">
                            <LanguageSelector currentLocale={locale} compact />
                        </div>

                        {/* Desktop Login Link */}
                        <Link
                            href="/auth/login"
                            className="hidden lg:flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors px-2 py-2"
                        >
                            <span className="hidden xl:inline">Partner Login</span>
                            <span className="xl:hidden">Login</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                        </Link>

                        {/* CTA Button */}
                        <Link
                            href="/auth/register"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm whitespace-nowrap px-2.5 sm:px-3 md:px-4 lg:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
                        >
                            <span className="hidden sm:inline">Start Free Beta</span>
                            <span className="sm:hidden">Beta</span>
                        </Link>

                        {/* Theme Toggle */}
                        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                    </div>
                </div>

                {/* MOBILE NAV LINKS (below main bar on md-) */}
                <div className="flex lg:hidden items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium border-t border-border/60 px-2 sm:px-3 py-2">
                    <a href="#how-it-works" className="text-muted-foreground hover:text-primary transition-colors">How it works</a>
                    <a href="#audit" className="text-muted-foreground hover:text-primary transition-colors">Audit</a>
                    <Link href="/auth/login" className="text-muted-foreground hover:text-primary transition-colors lg:hidden">
                        Login
                    </Link>
                </div>
            </nav>
        </header>
    );
}
