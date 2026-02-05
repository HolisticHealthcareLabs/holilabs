'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Stethoscope } from 'lucide-react';

export function Governance() {
    return (
        <section id="enterprise" className="py-24 px-6 bg-secondary border-t border-border">
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
                        Move from <span className="text-blue-600 dark:text-blue-400">&quot;Trust&quot;</span> to <span className="text-blue-600 dark:text-blue-400">&quot;Verify.&quot;</span>
                    </h2>
                    <p className="text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                        The Cortex Console gives leadership a real-time view of clinical risk, overrides, and protocol adherence across the entire network.
                    </p>
                </motion.div>

                {/* Governance Features Grid */}
                <div className="grid md:grid-cols-2 gap-8">

                    {/* Feature: Live Audit Stream */}
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
                            The Live Audit Stream
                        </h3>
                        <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                            Every validation event is logged. See exactly when a clinician accepted a safety intervention or overrode a critical alert.
                        </p>
                        <div className="bg-secondary/50 rounded-xl border border-border p-4 font-mono text-xs text-muted-foreground space-y-2">
                            <div className="flex justify-between"><span>10:42:01</span> <span className="text-emerald-600 dark:text-emerald-400">INTERVENTION_ACCEPTED</span></div>
                            <div className="flex justify-between"><span>10:42:05</span> <span className="text-red-500 dark:text-red-400">DOSE_BLOCK_TRIGGERED</span></div>
                            <div className="flex justify-between"><span>10:42:15</span> <span className="text-blue-600 dark:text-blue-400">OVERRIDE_LOGGED (Dr. Silva)</span></div>
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
                            Deterministic Enforcement
                        </h3>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                            Upload your SOPs. We turn them into binary rules. No &quot;hallucinations&quot; or &quot;suggestions.&quot; Just strict adherence to RxNorm, WHO, and your internal formularies.
                        </p>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
