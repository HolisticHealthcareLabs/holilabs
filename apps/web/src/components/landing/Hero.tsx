'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/components/landing/copy';

export function Hero() {
    const { locale } = useLanguage();
    const copy = getLandingCopy(locale);

    return (
        <section className="relative bg-black text-white overflow-hidden">
            {/* Subtle radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_top,rgba(59,130,246,0.15),transparent_70%)]" />

            <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 pt-36 sm:pt-44 pb-20 sm:pb-28 text-center">
                {/* Kicker */}
                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-blue-400 text-sm sm:text-base font-medium tracking-wide mb-6"
                >
                    {copy.hero.badge}
                </motion.p>

                {/* Headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-bold leading-[1.05] tracking-tight mb-4"
                >
                    {copy.hero.title}
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.15 }}
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-bold leading-[1.05] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-8"
                >
                    {copy.hero.highlight}
                </motion.p>

                {/* Description */}
                <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.25 }}
                    className="text-lg sm:text-xl text-white/70 leading-relaxed max-w-2xl mx-auto mb-4"
                >
                    {copy.hero.description}
                </motion.p>

                <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-base sm:text-lg text-blue-300/80 font-medium mb-10"
                >
                    {copy.hero.supportLine}
                </motion.p>

                {/* CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.35 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <Link
                        href="/auth/register"
                        className="inline-flex items-center justify-center px-7 py-3 rounded-full text-base font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    >
                        <span className="hidden sm:inline">{copy.hero.primaryCta}</span>
                        <span className="sm:hidden">{copy.hero.primaryShort}</span>
                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </Link>
                    <Link
                        href="#demo"
                        className="inline-flex items-center justify-center text-base font-medium text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        <span className="hidden sm:inline">{copy.hero.secondaryCta}</span>
                        <span className="sm:hidden">{copy.hero.secondaryShort}</span>
                        <svg className="ml-1.5 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}
