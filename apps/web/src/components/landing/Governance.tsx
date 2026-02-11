'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Stethoscope } from 'lucide-react';

export function Governance() {
    return (
        <section id="audit" className="py-24 px-6 bg-secondary border-t border-border">
            <div className="container mx-auto max-w-7xl">

                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-xs font-bold uppercase tracking-[0.3em] mb-6 block text-muted-foreground">
                        GOVERNANCE
                    </span>
                    <h2 className="text-5xl md:text-6xl font-bold mb-8 leading-tight text-foreground">
                        Protect clinical decisions <br /> with transparent verification.
                    </h2>
                    <p className="text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                        The Cortex audit console gives leadership a view of what was verified, what was overridden, and where protocols are drifting—without waiting for retrospective audits.
                    </p>
                </motion.div>

                {/* Governance Features Grid */}
                <div className="grid md:grid-cols-2 gap-8">

                    {/* Feature: Outcome Dashboard */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="rounded-[2rem] bg-card border border-border p-10 hover:shadow-xl transition-all group overflow-hidden relative"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10 font-mono text-4xl font-bold text-foreground">01</div>
                        <div className="mb-6 w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-2xl shadow-sm text-blue-600 dark:text-blue-400">
                            <FileText className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-4">
                            Outcome Dashboard
                        </h3>
                        <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                            See outcomes that matter to clinical and operational leadership: safety checks completed, compliance trend, and interventions prevented.
                        </p>
                        <div className="bg-secondary/50 rounded-xl border border-border p-4 text-xs text-muted-foreground space-y-3">
                            <div className="flex items-center justify-between">
                                <span>Errors prevented</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+27 this week</span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[68%]" />
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Compliance rate</span>
                                <span className="text-blue-600 dark:text-blue-400 font-semibold">93%</span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-[93%]" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Feature: Protocol Enforcement */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="rounded-[2rem] bg-card border border-border p-10 hover:shadow-xl transition-all group overflow-hidden relative"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10 font-mono text-4xl font-bold text-foreground">02</div>
                        <div className="mb-6 w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-2xl shadow-sm text-amber-500 dark:text-amber-400">
                            <Stethoscope className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-4">
                            Deterministic Clinical Logic
                        </h3>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                            Configure safety guardrails for your unit (starting with DOAC workflows). When a clinician overrides, Cortex captures the reason so teams can improve protocols and training.
                        </p>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
