import React, { useState, useEffect } from 'react';
import type { TrafficLightResult, TrafficLightSignal } from '../../types';

interface ConsoleViewProps {
    onMinimize: () => void;
    signalsLog: TrafficLightResult[];
    connectionStatus: 'connected' | 'degraded' | 'offline';
    ruleVersion: string | null;
}

export const ConsoleView: React.FC<ConsoleViewProps> = ({
    onMinimize,
    signalsLog,
    connectionStatus,
    ruleVersion
}) => {
    // Mock metrics for the prototype (would come from backend in prod)
    const metrics = {
        trustScore: 98.4,
        interventions: 142,
        hardBrakes: 12,
        uptime: '99.99%',
        protocolsActive: 8530
    };

    return (
        <div className="console-container text-white h-screen w-screen bg-slate-950 flex flex-col font-sans selection:bg-cyan-500/30">

            {/* Header / Top Bar */}
            <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                        <span className="font-bold text-slate-950 text-xs">C</span>
                    </div>
                    <span className="font-semibold tracking-wide text-sm text-slate-200">
                        CORTEX <span className="text-white/40 font-light">ASSURANCE LAYER</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        v{ruleVersion || '1.0.0-rc'}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-full border ${connectionStatus === 'connected' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                            'border-red-500/30 bg-red-500/10 text-red-400'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                        {connectionStatus.toUpperCase()}
                    </div>

                    <button
                        onClick={onMinimize}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded border border-white/10 transition-colors"
                    >
                        Enter Ghost Mode
                    </button>
                </div>
            </header>

            {/* Main Content Grid */}
            <main className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden">

                {/* Left Column: Metrics & Status (4 cols) */}
                <div className="col-span-3 flex flex-col gap-6">
                    {/* Trust Score Card */}
                    <div className="p-6 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-cyan-500/20 transition-all duration-700"></div>

                        <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-4">Trust Score</h3>
                        <div className="flex items-end gap-3">
                            <span className="text-5xl font-light text-white tracking-tighter">{metrics.trustScore}</span>
                            <span className="text-sm text-emerald-400 mb-1.5 font-mono">▲ 0.2%</span>
                        </div>
                        <div className="mt-4 h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 w-[98.4%] shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard label="Interventions" value={metrics.interventions} change="+12" />
                        <StatCard label="Hard Brakes" value={metrics.hardBrakes} change="+3" isDanger />
                        <StatCard label="Uptime" value={metrics.uptime} />
                        <StatCard label="Protocols" value={metrics.protocolsActive.toLocaleString()} />
                    </div>

                    {/* System Health */}
                    <div className="flex-1 bg-slate-900/50 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                        <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider">System Health</h3>
                        <HealthRow label="Ontology Engine (SQLite)" status="healthy" />
                        <HealthRow label="Deep Edge Model" status="healthy" />
                        <HealthRow label="Privacy Vault" status="healthy" />
                        <HealthRow label="EHR Connectivity" status="warning" />
                    </div>
                </div>

                {/* Center/Right: Live Feed (9 cols) */}
                <div className="col-span-9 flex flex-col bg-slate-900/30 border border-white/5 rounded-xl overflow-hidden backdrop-blur-sm">
                    <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between bg-white/5">
                        <span className="text-xs font-medium text-white/70">LIVE VALIDATION STREAM</span>
                        <span className="text-[10px] font-mono text-white/30">REAL-TIME • ENCRYPTED</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        {signalsLog.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-white/20 gap-4">
                                <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 animate-spin-slow"></div>
                                <span className="text-sm font-mono">WAITING FOR CLINICAL SIGNALS...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {signalsLog.map((log, i) => (
                                    <LogEntry key={i} result={log} index={i} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
};

// Sub-components
const StatCard = ({ label, value, change, isDanger }: any) => (
    <div className="bg-slate-900/50 border border-white/5 p-4 rounded-lg hover:border-white/10 transition-colors">
        <div className="text-[10px] text-white/40 uppercase font-bold mb-1">{label}</div>
        <div className="text-xl font-light text-white">{value}</div>
        {change && (
            <div className={`text-[10px] mt-1 ${isDanger ? 'text-red-400' : 'text-emerald-400'}`}>
                {change}
            </div>
        )}
    </div>
);

const HealthRow = ({ label, status }: any) => (
    <div className="flex items-center justify-between text-xs py-1">
        <span className="text-slate-400">{label}</span>
        <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'healthy' ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
            <span className={`font-mono ${status === 'healthy' ? 'text-emerald-500' : 'text-yellow-500'}`}>
                {status.toUpperCase()}
            </span>
        </div>
    </div>
);

const LogEntry = ({ result, index }: { result: TrafficLightResult, index: number }) => {
    const isRed = result.color === 'RED';
    const signal = result.signals[0];

    return (
        <div className={`
      flex items-start gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors
      ${index === 0 ? 'animate-fade-in-down' : ''}
    `}>
            <div className="w-12 pt-1">
                <span className="font-mono text-[10px] text-white/30">
                    {new Date().toLocaleTimeString()}
                </span>
            </div>

            <div className={`
         w-6 h-6 rounded flex items-center justify-center text-xs shrink-0 mt-0.5
         ${isRed ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}
       `}>
                {isRed ? '🛡️' : '✓'}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${isRed ? 'text-red-400' : 'text-slate-200'}`}>
                        {isRed ? 'Protocol Violation Detected' : 'Validation Assured'}
                    </span>
                    {signal?.category === 'CLINICAL' && (
                        <span className="text-[9px] px-1.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            DETERMINISTIC
                        </span>
                    )}
                </div>

                <div className="text-xs text-slate-400">
                    {signal?.message || 'Routine check passed. No anomalies detected.'}
                </div>

                {signal?.evidence && (
                    <div className="mt-2 flex gap-2">
                        {signal.evidence.map((ev: string, i: number) => (
                            <span key={i} className="text-[9px] font-mono text-slate-500 bg-slate-950 px-1 border border-white/5 rounded">
                                {ev}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="w-24 text-right">
                <span className="text-[10px] font-bold text-white/20">
                    PID-8X52
                </span>
            </div>
        </div>
    );
};
