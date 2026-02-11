'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Activity } from 'lucide-react';

export function Architecture() {
    return (
        <section id="modules" className="py-24 px-6 bg-secondary">
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
                        Three pillars for <br /> safer DOAC decisions.
                    </h2>
                </motion.div>

                {/* Three Feature Pillars */}
                <div className="grid md:grid-cols-3 gap-8">

                    {/* Pillar 1: The Checklist */}
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
                        <h3 className="text-2xl font-bold text-foreground mb-4">The Checklist</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            A 30-second verification flow for DOAC safety and discharge. If key data is missing (e.g., renal function), Cortex requires an attestation or manual entry—no guessing.
                        </p>
                    </motion.div>

                    {/* Pillar 2: The Audit Console */}
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
                                    <span className="text-blue-400 font-mono text-xs">QUALITY DASHBOARD</span>
                                </div>
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-4">The Audit Console</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            A governance view for quality and leadership. Track what was verified, what was overridden, and why—without waiting for retrospective chart audits.
                        </p>
                    </motion.div>

                    {/* Pillar 3: The Follow-up */}
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
                        <h3 className="text-2xl font-bold text-foreground mb-4">The Follow-up</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Close the loop after discharge with structured reminders and adherence workflows (including WhatsApp where appropriate), so protocols don’t end at the hospital door.
                        </p>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
