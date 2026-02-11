'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function HighStakes() {
    return (
        <section id="security" className="py-24 px-6 bg-slate-900 border-t border-slate-800">
            <div className="container mx-auto max-w-7xl">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="mb-20 text-center md:text-left"
                >
                    <span className="text-xs font-bold uppercase tracking-[0.3em] mb-6 block text-blue-400">
                        CLINICAL SAFETY INFRASTRUCTURE
                    </span>
                    <h2 className="text-5xl md:text-6xl font-bold mb-8 leading-tight text-white">
                        Built to protect care <br /> in high-risk moments.
                    </h2>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Use Case 1 */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                        <h3 className="text-2xl font-bold mb-4 text-white">Revenue Integrity at the Source</h3>
                        <p className="text-slate-400 leading-relaxed mb-6">
                            Catch missing modifiers, safety documentation gaps, and protocol misses before chart close to reduce downstream denials.
                        </p>
                        <ul className="space-y-3 text-sm text-slate-300">
                            <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Deterministic checks + clear rationale</li>
                            <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Pre-close documentation safeguards</li>
                        </ul>
                    </motion.div>

                    {/* Use Case 2 */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                        <h3 className="text-2xl font-bold mb-4 text-white">Audit & Governance</h3>
                        <p className="text-slate-400 leading-relaxed mb-6">
                            Capture override reasons and protocol drift. Help quality teams improve workflows with evidence—not anecdotes.
                        </p>
                        <ul className="space-y-3 text-sm text-slate-300">
                            <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Structured override reasons</li>
                            <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Exportable audit summaries</li>
                        </ul>
                    </motion.div>

                    {/* Use Case 3 */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                        <h3 className="text-2xl font-bold mb-4 text-white">Follow-up & Adherence</h3>
                        <p className="text-slate-400 leading-relaxed mb-6">
                            Close the loop after discharge with reminders and structured follow-up workflows—where your patients actually are.
                        </p>
                        <ul className="space-y-3 text-sm text-slate-300">
                            <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> WhatsApp-compatible reminders</li>
                            <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Escalate to staff when needed</li>
                        </ul>
                    </motion.div>
                </div>

            </div>
        </section>
    );
}
