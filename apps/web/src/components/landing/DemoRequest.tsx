'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export function DemoRequest() {
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
                body: JSON.stringify({ email, fullName: 'Landing Page Guest' }), // We only have email field here, we could add name later
            });

            if (response.ok) {
                setMessage({ type: 'success', text: "Access request received. We'll be in touch with your invitation soon." });
                setEmail('');
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.error || "Failed to process request." });
            }
        } catch (error) {
            setMessage({ type: 'error', text: "Connection error. Please try again later." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section id="demo" className="py-32 px-6 bg-background">
            <div className="container mx-auto max-w-4xl text-center">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-8 tracking-tight">
                        Choose your path: <br /> clinic or enterprise.
                    </h2>
                    <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                        Private practice teams can start the web app beta now. Hospital leaders can request a Cortex pilot for governance, safety checks, and follow-up workflows.
                    </p>

                    <div className="mb-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <a
                            href="/auth/register"
                            className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all"
                        >
                            For Private Practice: Start Free Beta
                        </a>
                        <a
                            href="#demo-form"
                            className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold text-foreground bg-secondary border border-border hover:bg-muted transition-all"
                        >
                            For Enterprise: Request Cortex Pilot
                        </a>
                    </div>

                    <form id="demo-form" onSubmit={handleSubmit} className="max-w-md mx-auto relative group">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter work email..."
                                className="flex-1 bg-secondary border border-border rounded-xl px-6 py-4 text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-muted-foreground"
                                required
                            />
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-500/10 active:scale-95"
                            >
                                {isSubmitting ? 'Sending...' : 'Request Cortex Pilot'}
                            </button>
                        </div>

                        {message && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`absolute top-full left-0 right-0 mt-6 p-4 rounded-xl text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}
                            >
                                {message.text}
                            </motion.div>
                        )}
                    </form>

                    <div className="mt-12 flex items-center justify-center gap-8 text-sm font-medium text-muted-foreground/60">
                        <span className="flex items-center gap-2">Invite-only pilot</span>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span className="flex items-center gap-2">No deep integration to start</span>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span className="flex items-center gap-2">macOS + Windows</span>
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
