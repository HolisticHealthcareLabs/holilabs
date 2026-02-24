'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/components/landing/copy';

export function DemoRequest() {
    const { locale } = useLanguage();
    const copy = getLandingCopy(locale);
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage(null);

        try {
            const response = await fetch('/api/auth/invite/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, fullName: 'Landing Page Guest' }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: copy.demo.success });
                setEmail('');
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.error || copy.demo.requestError });
            }
        } catch {
            setMessage({ type: 'error', text: copy.demo.networkError });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section id="demo" className="bg-secondary/30 dark:bg-white/[0.02]">
            <div className="max-w-[780px] mx-auto px-4 sm:px-6 py-24 sm:py-32 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 tracking-tight">
                        {copy.demo.title}
                    </h2>
                    <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                        {copy.demo.subtitle}
                    </p>

                    {/* Two path CTAs */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
                        <a
                            href="/auth/register"
                            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                        >
                            {copy.demo.ctaClinic}
                            <svg className="ml-1.5 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </a>
                        <a
                            href="#demo-form"
                            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-medium text-foreground bg-background border border-border hover:bg-muted transition-colors"
                        >
                            {copy.demo.ctaEnterprise}
                        </a>
                    </div>

                    {/* Email form */}
                    <form id="demo-form" onSubmit={handleSubmit} className="relative">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={copy.demo.emailPlaceholder}
                                className="flex-1 bg-background border border-border rounded-full px-5 py-3 text-foreground text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-muted-foreground"
                                required
                            />
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-foreground text-background font-medium text-sm px-6 py-3 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                            >
                                {isSubmitting ? copy.demo.sending : copy.demo.requestCta}
                            </button>
                        </div>

                        {message && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`mt-4 text-sm font-medium ${message.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                            >
                                {message.text}
                            </motion.p>
                        )}
                    </form>

                    {/* Trust signals */}
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground/60">
                        <span>{copy.demo.inviteOnly}</span>
                        <span className="hidden sm:inline">·</span>
                        <span>{copy.demo.noIntegration}</span>
                        <span className="hidden sm:inline">·</span>
                        <span>{copy.demo.desktop}</span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
