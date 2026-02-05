'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';

export function DataManagement() {
    const { language } = useLanguage();
    const isEn = language === 'en';
    const isPt = language === 'pt';
    const tr = (en: string, es: string, pt: string = es) => (isEn ? en : isPt ? pt : es);

    return (
        <section className="py-16 px-6 bg-gradient-to-b from-blue-50/30 to-white dark:from-blue-900/10 dark:to-background">
            <div className="container mx-auto max-w-7xl">

                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-xs font-bold uppercase tracking-[0.3em] mb-6 block text-cyan-800 dark:text-cyan-400">
                        DATA
                    </span>
                    <h2 className="text-6xl md:text-7xl font-bold text-foreground mb-8 leading-tight">
                        {isEn ? <>Data Management<br />That Leads the Market</> : isPt ? <>Gestão de Dados<br />Líder no Mercado</> : <>Gestión de Datos<br />Líder en el Mercado</>}
                    </h2>
                    <p className="text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                        {isEn
                            ? 'Connect your data, customize how you view it, then automate actions. The right way to deploy AI at hospital scale.'
                            : isPt
                                ? 'Conecte seus dados, personalize como você os vê e depois automatize ações. O jeito certo de usar IA em escala hospitalar.'
                                : 'Conecta tus datos, personaliza cómo los ves, y luego automatiza acciones. La forma correcta de aprovechar IA a nivel hospitalario.'}
                    </p>
                </motion.div>

                {/* Three Data Pillars */}
                <div className="grid md:grid-cols-3 gap-8">

                    {/* Pillar 1: Native Integrations */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="rounded-[2rem] bg-card border border-border p-8 hover:shadow-lg transition-all"
                    >
                        <div className="mb-6">
                            <div className="grid grid-cols-3 gap-3 mb-4 text-foreground/80">
                                <div className="aspect-square rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-xl">💊</div>
                                <div className="aspect-square rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-xl">🏥</div>
                                <div className="aspect-square rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-xl">🧪</div>
                                <div className="aspect-square rounded-xl bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center text-xl">📅</div>
                                <div className="aspect-square rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-xl">💬</div>
                                <div className="aspect-square rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-xl">📊</div>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-3">
                            {isEn ? 'Native Integrations' : isPt ? 'Integrações Nativas' : 'Integraciones Nativas'}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                            {isEn
                                ? 'Connect instantly to labs and existing systems. Sync data in minutes with 50+ no-code native integrations.'
                                : isPt
                                    ? 'Conecte instantaneamente a laboratórios e sistemas existentes. Sincronize dados em minutos com 50+ integrações nativas sem código.'
                                    : 'Conecta instantáneamente con labs, farmacias, y sistemas existentes. Sincroniza datos en minutos con 50+ integraciones nativas sin código.'}
                        </p>
                    </motion.div>

                    {/* Pillar 2: Custom Connections */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="rounded-[2rem] bg-card border border-border p-8 hover:shadow-lg transition-all"
                    >
                        <div className="mb-6 aspect-[4/3] rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 flex items-center justify-center text-white text-sm font-mono shadow-lg">
                            <div className="text-center">
                                API Webhooks<br />FHIR R4<br />HL7 | DICOM
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-3">
                            {tr('Custom Connections', 'Conexiones Personalizadas', 'Conexões Personalizadas')}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                            {tr(
                                'Build custom connections to thousands of tools using our powerful, intuitive API. Webhooks, FHIR, HL7—whatever you need.',
                                'Construye conexiones personalizadas a miles de herramientas usando nuestra API potente e intuitiva. Webhooks, FHIR, HL7, todo lo que necesites.',
                                'Crie conexões personalizadas com milhares de ferramentas usando nossa API poderosa e intuitiva. Webhooks, FHIR, HL7—tudo o que você precisar.'
                            )}
                        </p>
                    </motion.div>

                    {/* Pillar 3: Transform & Automate */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="rounded-[2rem] bg-card border border-border p-8 hover:shadow-lg transition-all"
                    >
                        <div className="mb-6 aspect-[4/3] rounded-2xl p-6 flex flex-col gap-2 bg-gradient-to-br from-[#014751] to-emerald-500">
                            <div className="bg-white/90 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800">Lab Result → Auto-Flag → Care Plan</div>
                            <div className="bg-white/90 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800">HbA1c ≥5.7% → Diabetes Prevention</div>
                            <div className="bg-white/90 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800">Missed Screening → Alert + Schedule</div>
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-3">
                            {tr('Combine & Transform', 'Combina y Transforma', 'Combine e Transforme')}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                            {tr(
                                'Take control by transforming clinical data into what your team needs: automated workflows, predictive rules, and intelligent alerts.',
                                'Toma control transformando tus datos clínicos en lo que tu equipo necesita: workflows automatizados, fórmulas predictivas, y alertas inteligentes.',
                                'Assuma o controle transformando seus dados clínicos no que sua equipe precisa: workflows automatizados, regras preditivas e alertas inteligentes.'
                            )}
                        </p>
                    </motion.div>

                </div>

                {/* Integrations Showcase */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="mt-20 rounded-[2rem] bg-card border-2 border-border p-12"
                >
                    <h3 className="text-3xl font-bold text-foreground text-center mb-12">
                        {tr('Available Integrations', 'Integraciones Disponibles', 'Integrações Disponíveis')}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                        {/* Medical Systems */}
                        <div>
                            <p className="text-sm font-bold text-muted-foreground uppercase mb-4 tracking-wide">
                                {tr('Medical Systems', 'Sistemas Médicos', 'Sistemas Médicos')}
                            </p>
                            <div className="space-y-3">
                                <div className="px-4 py-3 rounded-xl bg-secondary border border-border text-sm font-semibold text-foreground">FHIR R4</div>
                                <div className="px-4 py-3 rounded-xl bg-secondary border border-border text-sm font-semibold text-foreground">HL7</div>
                                <div className="px-4 py-3 rounded-xl bg-secondary border border-border text-sm font-semibold text-foreground">DICOM</div>
                                <div className="px-4 py-3 rounded-xl bg-secondary border border-border text-sm font-semibold text-foreground">RNDS Brasil</div>
                            </div>
                        </div>

                        {/* Communication */}
                        <div>
                            <p className="text-sm font-bold text-muted-foreground uppercase mb-4 tracking-wide">
                                {tr('Communication', 'Comunicación', 'Comunicação')}
                            </p>
                            <div className="space-y-3">
                                <div className="px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 text-sm font-semibold text-green-800 dark:text-green-300">WhatsApp</div>
                                <div className="px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 text-sm font-semibold text-green-800 dark:text-green-300">Twilio SMS</div>
                                <div className="px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 text-sm font-semibold text-green-800 dark:text-green-300">SendGrid</div>
                                <div className="px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 text-sm font-semibold text-green-800 dark:text-green-300">Push Notifications</div>
                            </div>
                        </div>

                        {/* AI Models */}
                        <div>
                            <p className="text-sm font-bold text-muted-foreground uppercase mb-4 tracking-wide">
                                {tr('AI Models', 'Modelos IA', 'Modelos de IA')}
                            </p>
                            <div className="space-y-3">
                                <div className="px-4 py-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-900/50 text-sm font-semibold text-purple-800 dark:text-purple-300">
                                    GPT-4
                                </div>
                                <div className="px-4 py-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-900/50 text-sm font-semibold text-purple-800 dark:text-purple-300">
                                    Claude
                                </div>
                                <div className="px-4 py-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-900/50 text-sm font-semibold text-purple-800 dark:text-purple-300">
                                    Gemini
                                </div>
                                <div className="px-4 py-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-900/50 text-sm font-semibold text-purple-800 dark:text-purple-300">
                                    LLaMA
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <p className="text-muted-foreground text-base">
                            {tr(
                                '+ Databases, ERP, Cloud Apps, Workflows, and more',
                                '+ Databases, ERP, Cloud Apps, Workflows y más',
                                '+ Databases, ERP, Cloud Apps, Workflows e mais'
                            )}
                        </p>
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
