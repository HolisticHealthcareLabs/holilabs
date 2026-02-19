'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Stethoscope } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/components/landing/copy';

export function Governance() {
    const { locale } = useLanguage();
    const copy = getLandingCopy(locale);

    return (
        <section id="audit" className="bg-background">
            {/* Header */}
            <div className="max-w-[980px] mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-16 text-center">
                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-blue-600 dark:text-blue-400 text-sm font-semibold uppercase tracking-widest mb-4"
                >
                    {copy.governance.kicker}
                </motion.p>
                <motion.h2
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.05 }}
                    className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6 text-foreground"
                >
                    {locale === 'pt' ? (
                        <>Proteja decisões de alto risco com <span className="text-blue-600 dark:text-blue-400">verificação transparente.</span></>
                    ) : locale === 'es' ? (
                        <>Protege decisiones críticas con <span className="text-blue-600 dark:text-blue-400">verificación transparente.</span></>
                    ) : (
                        <>Protect high-risk decisions with <span className="text-blue-600 dark:text-blue-400">transparent verification.</span></>
                    )}
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto"
                >
                    {copy.governance.subtitle}
                </motion.p>
            </div>

            {/* Two feature cards */}
            <div className="max-w-[980px] mx-auto px-4 sm:px-6 pb-24 sm:pb-32">
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Card 1: Outcome Dashboard */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="rounded-2xl bg-secondary/50 dark:bg-white/[0.03] border border-border p-8 sm:p-10"
                    >
                        <div className="w-12 h-12 rounded-xl bg-blue-600/10 dark:bg-blue-500/10 flex items-center justify-center mb-6">
                            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-3">{copy.governance.cardOneTitle}</h3>
                        <p className="text-muted-foreground leading-relaxed mb-8">{copy.governance.cardOneBody}</p>

                        {/* Mini metrics */}
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">{copy.governance.errorsAvoided}</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{copy.governance.weekDelta}</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full w-[68%]" />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">{copy.governance.complianceRate}</span>
                                    <span className="text-blue-600 dark:text-blue-400 font-semibold">93%</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full w-[93%]" />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Card 2: Deterministic Logic */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="rounded-2xl bg-secondary/50 dark:bg-white/[0.03] border border-border p-8 sm:p-10"
                    >
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6">
                            <Stethoscope className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-3">{copy.governance.cardTwoTitle}</h3>
                        <p className="text-muted-foreground leading-relaxed">{copy.governance.cardTwoBody}</p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
