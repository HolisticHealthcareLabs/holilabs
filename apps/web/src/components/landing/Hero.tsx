'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function Hero() {
    return (
        <section className="relative min-h-screen flex items-center overflow-hidden pt-20 sm:pt-24 pb-12 bg-background transition-colors duration-300">

            {/* Abstract Hero Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 dark:from-blue-900/20 dark:to-indigo-900/20"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                    className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-gradient-to-tr from-blue-400/10 to-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20 dark:from-blue-900/20 dark:to-blue-900/20"
                />
            </div>

            <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-7xl">
                <div className="max-w-4xl">

                    {/* Status Pill */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-card border border-border shadow-sm mb-6 sm:mb-8"
                    >
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-muted-foreground text-blue-600 dark:text-blue-400">Inpatient Cardiology Pilot</span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.1] sm:leading-[1.05] tracking-tight mb-6 sm:mb-8 text-foreground"
                    >
                        Cortex by Holi Labs. <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-500">
                            Safeguard every decision.
                        </span>
                    </motion.h1>

                    {/* Subheadline */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed font-light mb-8 sm:mb-12 max-w-2xl"
                    >
                        Real-time clinical safety support that works alongside your EHR. Generative AI helps with documentation; deterministic clinical logic protects high-risk decisions with clear rationale and auditability.
                        <span className="block mt-3 sm:mt-4 font-medium text-foreground text-blue-600 dark:text-blue-400">Web-first for LATAM workflows, with an optional lightweight desktop companion.</span>
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-4"
                    >
                        <Link
                            href="/auth/register"
                            className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all hover:scale-105 shadow-xl shadow-primary/20 text-center"
                        >
                            <span className="hidden sm:inline">For Private Practice: Start Free Beta</span>
                            <span className="sm:hidden">Start Free Beta</span>
                        </Link>
                        <Link
                            href="#demo"
                            className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold text-foreground bg-card border border-border hover:bg-muted transition-all hover:border-muted-foreground/20 text-center"
                        >
                            <span className="hidden sm:inline">For Enterprise: Request Cortex Pilot</span>
                            <span className="sm:hidden">Request Pilot</span>
                        </Link>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
