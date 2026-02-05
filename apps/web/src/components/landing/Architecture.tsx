'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Activity } from 'lucide-react';

export function Architecture() {
    return (
        <section className="py-24 px-6 bg-secondary">
            <div className="container mx-auto max-w-7xl">

                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <span className="text-xs font-bold uppercase tracking-[0.3em] mb-6 block text-blue-600 dark:text-blue-400">
                        CORE ARCHITECTURE
                    </span>
                    <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-8 leading-tight">
                        Three Pillars of <br /> Clinical Assurance.
                    </h2>
                </motion.div>

                {/* Three Feature Pillars */}
                <div className="grid md:grid-cols-3 gap-8">

                    {/* Pillar 1: The Interceptor */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="rounded-[2rem] bg-card p-8 border border-border hover:shadow-2xl transition-all group"
                    >
                        <div className="mb-8 aspect-[4/3] rounded-[1.5rem] bg-gradient-to-br from-blue-500 to-indigo-600 p-8 flex items-center justify-center shadow-lg relative overflow-hidden text-white">
                            <div className="absolute inset-0 bg-[url('/img/grid.svg')] opacity-20"></div>
                            <Shield className="w-24 h-24 animate-pulse" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-4">The Interceptor</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            A desktop-native agent that sits over the EHR. It reads pixels, validates orders against 115,000+ protocols, and intervenes in milliseconds.
                        </p>
                    </motion.div>

                    {/* Pillar 2: The Console */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="rounded-[2rem] bg-card p-8 border border-border hover:shadow-2xl transition-all group"
                    >
                        <div className="mb-8 aspect-[4/3] rounded-[1.5rem] bg-gradient-to-br from-slate-800 to-slate-900 p-8 flex items-center justify-center shadow-lg relative overflow-hidden">
                            <div className="w-full h-full bg-slate-800/50 rounded-xl border border-white/10 flex flex-col p-3 gap-2">
                                <div className="h-2 w-1/3 bg-slate-600 rounded"></div>
                                <div className="flex-1 bg-slate-950/50 rounded border border-blue-500/30 flex items-center justify-center">
                                    <span className="text-blue-400 font-mono text-xs">LIVE STREAM</span>
                                </div>
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-4">The Console</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            The C-Suite &quot;God View.&quot; Monitor risk across your entire hospital system in real-time. Track blocks, overrides, and compliance instantly.
                        </p>
                    </motion.div>

                    {/* Pillar 3: The Protocol */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="rounded-[2rem] bg-card p-8 border border-border hover:shadow-2xl transition-all group"
                    >
                        <div className="mb-8 aspect-[4/3] rounded-[1.5rem] bg-gradient-to-br from-blue-700 to-indigo-800 p-8 flex items-center justify-center shadow-lg relative overflow-hidden text-white">
                            <div className="absolute inset-0 bg-[url('/img/grid.svg')] opacity-20"></div>
                            <Activity className="w-24 h-24" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-4">The Protocol</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Deterministic Logic. Not &quot;AI Hallucinations.&quot; We enforce hard rules from RxNorm, USPSTF, and WHO with 100% mathematical certainty.
                        </p>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
