'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Download, Activity, CheckCircle, Lock } from 'lucide-react';

export function DownloadClient() {
    return (
        <main className="relative z-10 pt-24 pb-16">
            {/* Hero Section */}
            <section className="container mx-auto max-w-7xl px-6 py-16 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-16"
                >
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-widest text-xs mb-6 border border-cyan-500/20">
                        <Shield className="w-3 h-3" />
                        Secure Enclave
                    </span>
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight text-foreground">
                        Deploy the <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-500">Interceptor</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                        Install the persistent Sidecar agent on your clinical workstations.
                        It runs silently in the background, verifying every decision in real-time.
                    </p>
                </motion.div>

                {/* Download Cards */}
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
                    {/* macOS Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="group relative bg-card border border-border hover:border-cyan-500/50 rounded-3xl p-10 text-left transition-all hover:shadow-2xl hover:shadow-cyan-500/10 overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <CheckCircle className="w-32 h-32" />
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-3xl shadow-sm font-sans font-normal">
                                
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-foreground font-sans tracking-tight">macOS</h3>
                                <p className="text-sm text-muted-foreground font-mono">Universal (M1/M2/M3 + Intel)</p>
                            </div>
                        </div>

                        <ul className="space-y-4 mb-10">
                            <li className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px]">✓</div>
                                Verified for macOS Sonoma
                            </li>
                            <li className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px]">✓</div>
                                SIP Compliant Daemon
                            </li>
                            <li className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px]">✓</div>
                                Silent "Ghost Mode"
                            </li>
                        </ul>

                        <a
                            href="/downloads/sidecar-installer-universal.dmg"
                            download
                            className="inline-flex w-full items-center justify-center gap-2 px-6 py-4 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-gray-900 to-black hover:from-gray-800 hover:to-gray-900 transition-all shadow-lg active:scale-95"
                        >
                            <Download className="w-5 h-5" />
                            Download .dmg
                        </a>
                    </motion.div>

                    {/* Windows Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="group relative bg-card border border-border hover:border-blue-500/50 rounded-3xl p-10 text-left transition-all hover:shadow-2xl hover:shadow-blue-500/10 overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Activity className="w-32 h-32" />
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-3xl shadow-sm text-blue-600 font-sans font-normal">
                                ❖
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-foreground font-sans tracking-tight">Windows</h3>
                                <p className="text-sm text-muted-foreground font-mono">Windows 10/11 Enterprise</p>
                            </div>
                        </div>

                        <ul className="space-y-4 mb-10">
                            <li className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px]">✓</div>
                                MSI Installer for MDM
                            </li>
                            <li className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px]">✓</div>
                                Citrix / VDI Ready
                            </li>
                            <li className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px]">✓</div>
                                Group Policy Compatible
                            </li>
                        </ul>

                        <a
                            href="/downloads/sidecar-installer-x64.msi"
                            download
                            className="inline-flex w-full items-center justify-center gap-2 px-6 py-4 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 transition-all shadow-lg active:scale-95"
                        >
                            <Download className="w-5 h-5" />
                            Download .msi
                        </a>
                    </motion.div>
                </div>

                {/* Token Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="max-w-2xl mx-auto"
                >
                    <div className="bg-secondary/50 border border-border rounded-xl p-8 backdrop-blur-sm">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <Lock className="w-4 h-4 text-muted-foreground" />
                            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Installation Token</h4>
                        </div>

                        <div className="flex items-center gap-4 bg-background rounded-lg p-4 border border-border font-mono text-sm text-cyan-600 dark:text-cyan-400 mb-4 overflow-x-auto shadow-inner">
                            <span className="whitespace-nowrap select-all mx-auto">
                                hk_live_7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Use this ephemeral token during the setup wizard to link the agent to your <strong>Holi Labs</strong> workspace.
                            <br />Token expires in 23 hours.
                        </p>
                    </div>
                </motion.div>
            </section>
        </main>
    );
}
