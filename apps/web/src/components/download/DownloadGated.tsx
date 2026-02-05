'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

export function DownloadGated() {
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');

        try {
            const response = await fetch('/api/auth/invite/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, fullName }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage('Your request has been received. We will be in touch soon!');
            } else {
                setStatus('error');
                setMessage(data.error || 'Something went wrong. Please try again.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Failed to send request. Please check your connection.');
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-20">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-card border border-border rounded-[2.5rem] p-12 text-center overflow-hidden shadow-2xl"
            >
                {/* Background gradient/glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />

                <div className="relative z-10">
                    <div className="w-20 h-20 bg-secondary rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <Lock className="w-10 h-10 text-blue-500" />
                    </div>

                    <h2 className="text-4xl font-bold mb-4 tracking-tight">Access Restricted</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
                        The Interceptor Sidecar is an enterprise-grade agent.
                        Downloads are reserved for verified <strong>Holi Labs</strong> clinical partners.
                    </p>

                    <AnimatePresence mode="wait">
                        {status === 'success' ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8 max-w-md mx-auto"
                            >
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">Request Received</h3>
                                <p className="text-muted-foreground">{message}</p>
                                <button
                                    onClick={() => setStatus('idle')}
                                    className="mt-6 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                                >
                                    Send another request
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="max-w-md mx-auto"
                            >
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="relative group">
                                        <input
                                            required
                                            type="text"
                                            placeholder="Full Name"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full bg-background border border-border rounded-xl px-5 py-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <input
                                            required
                                            type="email"
                                            placeholder="Clinical Email Address"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-background border border-border rounded-xl px-5 py-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        />
                                        <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-50 transition-opacity group-focus-within:opacity-100" />
                                    </div>

                                    {status === 'error' && (
                                        <p className="text-sm text-destructive flex items-center justify-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            {message}
                                        </p>
                                    )}

                                    <button
                                        disabled={status === 'loading'}
                                        type="submit"
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                                    >
                                        {status === 'loading' ? 'Processing...' : 'Request Invitation'}
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </form>

                                <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        Verified Identity
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        Beta Access
                                    </div>
                                </div>

                                <p className="mt-12 text-sm text-muted-foreground">
                                    Already a partner?{' '}
                                    <a href="/auth/login" className="text-blue-500 font-bold hover:underline">
                                        Sign in to download
                                    </a>
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
