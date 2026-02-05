'use client';

/**
 * Cortex Command Center v2 (The "Minority Report" UI)
 * 
 * High-fidelity implementation of the investor deck hero image.
 * ALIGNED METRICS: Matches the "God View" / Control Plane data.
 * - Global Trust Score (Primary Metric)
 * - Safety Interventions (Hard Brakes)
 * - Active Protocols
 * - Device Pairing
 */

import React, { useState, useEffect } from 'react';
import CommandCenterGrid from '@/components/co-pilot/CommandCenterGrid';
import CommandCenterTile from '@/components/co-pilot/CommandCenterTile';
import {
    ShieldCheckIcon,
    HandRaisedIcon,
    CpuChipIcon,
    QrCodeIcon,
    BoltIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

export default function CoPilotPage() {
    // ALIGNED METRICS (Matching DashboardPage)
    const [metrics, setMetrics] = useState({
        trustScore: 98.4,
        interventions: 142,
        hardBrakes: 12,
        protocolsActive: 8530
    });

    // Simulate active stream updates
    useEffect(() => {
        const interval = setInterval(() => {
            setMetrics(prev => ({
                ...prev,
                interventions: prev.interventions + (Math.random() > 0.7 ? 1 : 0),
                trustScore: Math.min(100, Math.max(98, prev.trustScore + (Math.random() - 0.5) * 0.1))
            }));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                        <ShieldCheckIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold tracking-wide">Cortex Assurance Layer</h1>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                            <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">System Nominal</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 text-xs font-mono rounded hover:text-white transition-colors">
                        VIEW_AUDIT_LOGS
                    </button>
                </div>
            </div>

            {/* Main Board */}
            <div className="flex-1 overflow-hidden">
                <CommandCenterGrid>
                    {/* TILE 1: GLOBAL TRUST SCORE (Primary Metric) */}
                    <CommandCenterTile
                        id="trust-score"
                        title="Global Trust Score"
                        subtitle="Adherence 24h"
                        icon={<ShieldCheckIcon className="w-6 h-6 text-cyan-400" />}
                        variant="glass"
                        size="medium"
                        isActive={true}
                    >
                        <div className="flex flex-col h-full justify-between">
                            <div className="flex items-end gap-4">
                                <div className="text-6xl font-light text-white tracking-tighter drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                                    {metrics.trustScore.toFixed(1)}
                                </div>
                                <div className="text-xl text-slate-500 font-light mb-2">/ 100</div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Safety Baseline</span>
                                    <span className="text-emerald-400">▲ 0.2%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-900/50 rounded-full overflow-hidden border border-white/5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${metrics.trustScore}%` }}
                                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(6,182,212,0.6)]"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-2">
                                    Preventing <strong className="text-white">99.8%</strong> of potential adverse events across the fleet.
                                </p>
                            </div>
                        </div>
                    </CommandCenterTile>

                    {/* TILE 2: INTERVENTIONS & HARD BRAKES */}
                    <CommandCenterTile
                        id="interventions"
                        title="Active Interventions"
                        subtitle="Lives Protected"
                        icon={<HandRaisedIcon className="w-6 h-6 text-purple-400" />}
                        variant="glass"
                        size="medium"
                    >
                        <div className="grid grid-cols-2 gap-4 h-full items-center">
                            {/* Total Interventions */}
                            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col items-center justify-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-purple-500/10 blur-xl opacity-0 group-hover:opacity-50 transition-opacity" />
                                <div className="text-3xl font-bold text-white mb-1 relative z-10">{metrics.interventions}</div>
                                <div className="text-[10px] text-purple-300 uppercase tracking-wider relative z-10">Soft Nudges</div>
                            </div>

                            {/* Hard Brakes */}
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col items-center justify-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-red-500/10 blur-xl opacity-0 group-hover:opacity-50 transition-opacity" />
                                <div className="text-3xl font-bold text-red-400 mb-1 relative z-10">{metrics.hardBrakes}</div>
                                <div className="text-[10px] text-red-300 uppercase tracking-wider relative z-10">Hard Brakes</div>
                            </div>

                            <div className="col-span-2 text-center mt-2">
                                <span className="text-xs text-slate-400">
                                    {metrics.protocolsActive.toLocaleString()} Active Protocols Enforced
                                </span>
                            </div>
                        </div>
                    </CommandCenterTile>

                    {/* TILE 3: DEVICE PAIRING (Small) */}
                    <CommandCenterTile
                        id="device-pair"
                        title="Pair Watchtower"
                        size="small"
                        variant="glass"
                        icon={<QrCodeIcon className="w-6 h-6 text-emerald-400" />}
                    >
                        <div className="flex flex-col items-center justify-center h-full gap-4 pt-2">
                            <div className="p-3 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                                {/* Placeholder QR */}
                                <div className="w-24 h-24 bg-slate-900 pattern-grid-lg" style={{ backgroundImage: 'radial-gradient(rgb(16 185 129) 2px, transparent 2px)', backgroundSize: '8px 8px' }}></div>
                            </div>
                            <div className="text-xs text-center text-slate-400">
                                Sync <span className="text-emerald-400 font-mono">Mobile Admin</span>
                            </div>
                        </div>
                    </CommandCenterTile>

                </CommandCenterGrid>
            </div>
        </div>
    );
}
