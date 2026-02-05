'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function ParadigmShift() {
    return (
        <section id="platform" className="py-24 px-6 bg-card border-t border-border">
            <div className="container mx-auto max-w-7xl">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <span className="text-xs font-bold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400 mb-4 block">The Safety Gap</span>
                    <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                        Retrospective Audits are <span className="text-red-500 line-through decoration-4 decoration-red-200 dark:decoration-red-900">Too Late.</span>
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                        Existing healthcare tools only see data after the fact. We intercept risk <span className="text-blue-600 dark:text-blue-400 font-bold">at the point of decision</span>.
                    </p>
                    <p className="mt-8 text-lg text-muted-foreground/80 max-w-4xl mx-auto leading-relaxed">
                        While incumbent solutions operate as post-discharge recorders—analyzing failures after they&apos;ve occurred—Cortex is fundamentally preventive. By launching intelligent safety checklists the moment a clinician engages with the EHR, we ensure that doctors visit mandated data points and verify critical safety markers before a single order is finalized.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* OLD WAY */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="p-8 rounded-3xl bg-secondary border border-border opacity-75 grayscale hover:grayscale-0 transition-all duration-500"
                    >
                        <div className="text-sm font-mono text-muted-foreground mb-4">THE INCUMBENT MODEL</div>
                        <h3 className="text-2xl font-bold text-foreground mb-4">Retrospective CDI</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <span className="text-red-400">✕</span>
                                <span>Post-discharge analysis (Days late)</span>
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <span className="text-red-400">✕</span>
                                <span>Requires deep EHR Integration (18mo+)</span>
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <span className="text-red-400">✕</span>
                                <span>Blind to &quot;Last Mile&quot; clinical context</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* NEW WAY */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="p-8 rounded-3xl bg-card border border-blue-100 dark:border-blue-900 shadow-2xl shadow-blue-900/5 dark:shadow-blue-900/20 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full"></div>
                        <div className="text-sm font-mono text-blue-600 dark:text-blue-400 mb-4 font-bold">INTRODUCING CORTEX</div>
                        <h3 className="text-2xl font-bold text-foreground mb-4">Real-Time Interception</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-foreground font-medium">
                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">✓</div>
                                <span>Pre-signature intervention (&lt;10ms)</span>
                            </div>
                            <div className="flex items-center gap-3 text-foreground font-medium">
                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">✓</div>
                                <span>Over-the-Top visual analysis (Zero Install)</span>
                            </div>
                            <div className="flex items-center gap-3 text-foreground font-medium">
                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">✓</div>
                                <span>Deterministic &quot;Hard Brakes&quot; for critical safety</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

            </div>
        </section>
    );
}
