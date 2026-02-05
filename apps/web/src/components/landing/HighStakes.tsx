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
                        CRITICAL INFRASTRUCTURE
                    </span>
                    <h2 className="text-5xl md:text-6xl font-bold mb-8 leading-tight text-white">
                        For moments that <br /> cannot fail.
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
                        <div className="text-4xl mb-6">💰</div>
                        <h3 className="text-2xl font-bold mb-4 text-white">Revenue Integrity</h3>
                        <p className="text-slate-400 leading-relaxed mb-6">
                            Stop claim denials before they leave the EHR. Validate CPT/ICD-10 combinations in real-time against payer rules.
                        </p>
                        <ul className="space-y-3 text-sm text-slate-300">
                            <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Hard-brake on missing modifiers</li>
                            <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Automated medical necessity checks</li>
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
                        <div className="text-4xl mb-6">🛡️</div>
                        <h3 className="text-2xl font-bold mb-4 text-white">Clinical Safety</h3>
                        <p className="text-slate-400 leading-relaxed mb-6">
                            The ultimate safety net. Intercept contraindicated orders, allergies, and dosage errors that legacy alerts miss.
                        </p>
                        <ul className="space-y-3 text-sm text-slate-300">
                            <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Context-aware dosage validation</li>
                            <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Cross-system allergy checks</li>
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
                        <div className="text-4xl mb-6">⚖️</div>
                        <h3 className="text-2xl font-bold mb-4 text-white">Operational Compliance</h3>
                        <p className="text-slate-400 leading-relaxed mb-6">
                            Enforce Standard Operating Procedures (SOPs) across your entire network. Ensure every patient receives the same standard of care.
                        </p>
                        <ul className="space-y-3 text-sm text-slate-300">
                            <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Mandatory screening protocols</li>
                            <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Sepsis pathway enforcement</li>
                        </ul>
                    </motion.div>
                </div>

            </div>
        </section>
    );
}
