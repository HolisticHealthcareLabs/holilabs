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
                        Ready to secure your <br /> clinical network?
                    </h2>
                    <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                        Join the beta. Download the Interceptor Sidecar and verify your clinical decisions in real-time.
                    </p>

                    <form onSubmit={handleSubmit} className="max-w-md mx-auto relative group">
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
                                {isSubmitting ? 'Sending...' : 'Request Access'}
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
                        <span className="flex items-center gap-2">Example: Children&apos;s Hospital</span>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span className="flex items-center gap-2">10ms Latency</span>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span className="flex items-center gap-2">SOC2 Type II</span>
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
