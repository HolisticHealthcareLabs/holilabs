'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function Hero() {
    return (
        <section className="relative h-screen min-h-[800px] flex items-center overflow-hidden pt-24 bg-background transition-colors duration-300">

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

            <div className="container mx-auto px-6 relative z-10 max-w-7xl">
                <div className="max-w-4xl">

                    {/* Status Pill */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm mb-8"
                    >
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground text-blue-600 dark:text-blue-400">Clinical Labs v2.0 Beta</span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight mb-8 text-foreground"
                    >
                        Medical Intelligence <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-500">
                            Redefined.
                        </span>
                    </motion.h1>

                    {/* Subheadline */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-light mb-12 max-w-2xl"
                    >
                        Ensuring safety and accuracy across the clinical workflow. Holi Labs provides the underlying infrastructure for the next generation of healthcare products.
                        <span className="block mt-4 font-medium text-foreground text-blue-600 dark:text-blue-400">Umbrella for Clinical Assurance.</span>
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="flex flex-col sm:flex-row items-start gap-4"
                    >
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-lg font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all hover:scale-105 shadow-xl shadow-primary/20"
                        >
                            Access Command Center
                        </Link>
                        <a
                            href="#platform"
                            className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-lg font-semibold text-foreground bg-card border border-border hover:bg-muted transition-all hover:border-muted-foreground/20"
                        >
                            View Architecture
                        </a>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
