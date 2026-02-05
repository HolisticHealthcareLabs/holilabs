'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';

export function CoPilot() {
    const { language } = useLanguage();
    const isEn = language === 'en';
    const isPt = language === 'pt';
    const tr = (en: string, es: string, pt: string = es) => (isEn ? en : isPt ? pt : es);

    return (
        <section className="py-16 px-6 bg-gradient-to-b from-gray-50 to-white dark:from-background dark:to-secondary/20">
            <div className="container mx-auto max-w-7xl">

                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <span className="text-xs font-bold uppercase tracking-[0.3em] mb-6 block text-blue-800 dark:text-blue-400">
                        {isEn ? 'THE CORTEX SUITE' : isPt ? 'A SUÍTE CORTEX' : 'LA SUITE CORTEX'}
                    </span>
                    <h2 className="text-6xl md:text-7xl font-bold mb-8 leading-tight text-blue-900 dark:text-blue-50">
                        {isEn
                            ? 'Intelligent clinical infrastructure for modern healthcare'
                            : isPt
                                ? 'Infraestrutura clínica inteligente para a saúde moderna'
                                : 'Infraestructura clínica inteligente para la medicina moderna'}
                    </h2>
                    <p className="text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                        {isEn
                            ? 'Automate clinical workflows and ensure safety with our specialized product line.'
                            : isPt
                                ? 'Automatize fluxos clínicos e garanta a segurança com nossa linha de produtos especializada.'
                                : 'Automatiza procesos clínicos y garantiza la seguridad con nuestra línea de productos especializada.'}
                    </p>
                </motion.div>

                {/* Four Solution Cards */}
                <div className="grid md:grid-cols-2 gap-8 mb-16">

                    {/* 1. Gobernanza Corporativa */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="rounded-[2rem] bg-card border-2 border-border p-10 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-xl transition-all"
                    >
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm bg-blue-900/10 dark:bg-blue-500/20">
                                🏛️
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-foreground mb-3">
                                    {tr('Flexible Corporate Governance', 'Gobernanza Corporativa Flexible', 'Governança Corporativa Flexível')}
                                </h3>
                                <p className="text-muted-foreground leading-relaxed text-lg">
                                    {tr(
                                        'Implement governance on your terms. Ensure regulatory compliance, data protection, and full control at hospital scale.',
                                        'Implemente gobernanza bajo sus términos. Garantice conformidad regulatoria, protección de datos y control total a escala hospitalaria.',
                                        'Implemente governança nos seus termos. Garanta conformidade regulatória, proteção de dados e controle total em escala hospitalar.'
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-6">
                            <span className="px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-sm font-semibold text-blue-700 dark:text-blue-300">HIPAA/LGPD</span>
                            <span className="px-4 py-2 rounded-full bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 text-sm font-semibold text-purple-700 dark:text-purple-300">Audit Logs</span>
                            <span className="px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-emerald-700 dark:text-emerald-300">Role-Based Access</span>
                        </div>
                    </motion.div>

                    {/* 2. Value-Based Care Outcomes */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="rounded-[2rem] bg-card border-2 border-border p-10 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-xl transition-all"
                    >
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center text-3xl shadow-sm">
                                📊
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-foreground mb-3">
                                    {tr('Value-Based Outcomes Tracking', 'Rastreo de Outcomes Basados en Valor', 'Rastreamento de Outcomes Baseados em Valor')}
                                </h3>
                                <p className="text-muted-foreground leading-relaxed text-lg">
                                    {tr(
                                        'An extensive dashboard showing tangible outcomes: HbA1c control, fewer hospitalizations, treatment adherence, and quality metrics for value-based contracts.',
                                        'Dashboard extensivo que muestra outcomes tangibles: control de HbA1c, reducción de hospitalizaciones, adherencia a tratamientos, y métricas de calidad para contratos de valor.',
                                        'Um dashboard completo que mostra outcomes tangíveis: controle de HbA1c, redução de internações, adesão ao tratamento e métricas de qualidade para contratos de valor.'
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-6">
                            <span className="px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 text-sm font-semibold text-blue-700 dark:text-blue-300">HEDIS Measures</span>
                            <span className="px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-900/50 text-sm font-semibold text-indigo-700 dark:text-indigo-300">Quality Metrics</span>
                            <span className="px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 text-sm font-semibold text-blue-700 dark:text-blue-300">Population Health</span>
                        </div>
                    </motion.div>

                    {/* 3. Prevention Hub WHO/PAHO */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="rounded-[2rem] bg-card border-2 border-border p-10 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-xl transition-all"
                    >
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center text-3xl shadow-sm">
                                🎯
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-foreground mb-3">
                                    {tr('Global Prevention Protocol Hub', 'Hub de Prevención con Protocolos Globales', 'Hub de Prevenção com Protocolos Globais')}
                                </h3>
                                <p className="text-muted-foreground leading-relaxed text-lg">
                                    {tr(
                                        'Access established prevention protocols from WHO, PAHO, and USPSTF. Track preventive-care adherence and generate automatic reminders for screenings.',
                                        'Accede a protocolos de prevención establecidos por WHO, PAHO, y USPSTF. Rastrea adherencia a tratamientos preventivos y genera recordatorios automáticos para screenings.',
                                        'Acesse protocolos de prevenção estabelecidos por WHO, PAHO e USPSTF. Acompanhe adesão preventiva e gere lembretes automáticos de screenings.'
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-6">
                            <span className="px-4 py-2 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 text-sm font-semibold text-green-700 dark:text-green-300">WHO NCD</span>
                            <span className="px-4 py-2 rounded-full bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-900/50 text-sm font-semibold text-teal-700 dark:text-teal-300">PAHO LATAM</span>
                            <span className="px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 text-sm font-semibold text-emerald-700 dark:text-emerald-300">USPSTF A/B</span>
                        </div>
                    </motion.div>

                    {/* 4. AI Command Center */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="rounded-[2rem] bg-card border-2 border-border p-10 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-xl transition-all"
                    >
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center text-3xl shadow-sm">
                                📈
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-foreground mb-3">
                                    {tr('Predictive Intelligent Navigation', 'Navegación Inteligente Predictiva', 'Navegação Inteligente Preditiva')}
                                </h3>
                                <p className="text-muted-foreground leading-relaxed text-lg">
                                    {tr(
                                        'A co-pilot that predicts what you need based on time of day, patient type, and your usage patterns. Instant access to any function with voice commands.',
                                        'Co-Pilot que predice qué herramientas necesitas según hora del día, tipo de paciente, y tus patrones de uso. Acceso instantáneo a cualquier función con comandos de voz.',
                                        'Um co-pilot que prevê o que você precisa com base na hora do dia, tipo de paciente e seus padrões de uso. Acesso instantâneo a qualquer função com comandos de voz.'
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-6">
                            <span className="px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 text-sm font-semibold text-amber-700 dark:text-amber-300">Voice Commands</span>
                            <span className="px-4 py-2 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/50 text-sm font-semibold text-orange-700 dark:text-orange-300">Smart Navigation</span>
                            <span className="px-4 py-2 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 text-sm font-semibold text-yellow-700 dark:text-yellow-300">Predictive UI</span>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
