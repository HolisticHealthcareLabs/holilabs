'use client';

import React, { useState, useEffect } from 'react';

/**
 * Universal Validation Console (Control Plane)
 * 
 * The "God View" for C-Suite and Admins.
 * Visualizes the "Shadow Mode" validations from the Sidecar agents.
 */
export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    trustScore: 98.4,
    interventions: 142,
    hardBrakes: 12,
    uptime: '99.99%',
    protocolsActive: 8530
  });

  const [logs, setLogs] = useState<any[]>([]);

  // TOUR STATE
  const [tourStep, setTourStep] = useState<number | null>(null);

  const TOUR_STEPS = [
    {
      target: 'trust-score',
      title: 'Global Trust Score',
      description: 'primary metric of your clinical network health. It aggregates real-time adherence to protocols across all workstations.',
      position: 'right'
    },
    {
      target: 'stats-grid',
      title: 'Safety Interventions',
      description: 'Live counters of "Hard Brakes" (blocked orders) and passive nudges. Each number represents a potential error prevented.',
      position: 'bottom'
    },
    {
      target: 'infra-health',
      title: 'Infrastructure Status',
      description: 'Monitor the "Ghost Layer" agents. Green indicates the Sidecar is active and scanning pixels on the local machines.',
      position: 'right'
    },
    {
      target: 'live-stream',
      title: 'Live Validation Stream',
      description: 'The heartbeat of the system. Watch real-time validation events tailored to your specific clinical SOPs as they happen.',
      position: 'left'
    }
  ];

  // PREVENTS HYDRATION MISMATCH
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Ruleset Version State
  const [rulesVersion, setRulesVersion] = useState<string>('Loading...');

  // Poll the real API
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('http://localhost:3001/telemetry/stream');
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (e) {
        console.error("Failed to fetch telemetry stream", e);
      }
    };

    const fetchVersion = async () => {
      try {
        const res = await fetch('/api/governance/manifest');
        if (res.ok) {
          const data = await res.json();
          setRulesVersion(data.version);
        }
      } catch (e) {
        console.error("Failed to fetch rules manifest", e);
        setRulesVersion('OFFLINE');
      }
    }

    fetchLogs();
    fetchVersion();
    const timer = setInterval(fetchLogs, 2000);
    return () => clearInterval(timer);
  }, []);

  const nextStep = () => {
    if (tourStep === null) return;
    if (tourStep < TOUR_STEPS.length - 1) {
      setTourStep(tourStep + 1);
    } else {
      setTourStep(null); // End tour
    }
  };

  if (!mounted) return null;

  return (
    <div className="dark min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 relative">

      {/* TOUR BACKDROP */}
      {tourStep !== null && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 transition-opacity duration-500 animate-in fade-in" onClick={() => setTourStep(null)} />
      )}

      {/* TOUR CONTROLS (IF ACTIVE) */}
      {tourStep !== null && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-4">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm animate-in slide-in-from-bottom-4 zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
                Tour Step {tourStep + 1} / {TOUR_STEPS.length}
              </span>
              <button onClick={() => setTourStep(null)} className="text-slate-500 hover:text-white transition-colors">✕</button>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{TOUR_STEPS[tourStep].title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              {TOUR_STEPS[tourStep].description}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); nextStep(); }}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-all"
            >
              {tourStep === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next Step →'}
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className={`h-16 border-b border-white/10 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md sticky top-0 ${tourStep !== null ? 'z-30' : 'z-50'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <span className="font-bold text-slate-950 text-lg">C</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold tracking-wide text-sm text-slate-100">
              CORTEX <span className="text-white/40 font-light">ASSURANCE LAYER</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-cyan-400 font-mono tracking-wider">
                CONTROL PLANE
              </span>
              <span className="text-[9px] font-mono text-slate-500 border border-white/10 px-1 rounded hover:text-white cursor-help" title="Active Ruleset Version">
                {rulesVersion}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setTourStep(0)}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Start Interactive Tour
          </button>

          <a
            href="/download"
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded-lg transition-colors border border-cyan-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            DOWNLOAD AGENT
          </a>

          <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
            SYSTEM OPTIMAL
          </div>

          <div className="h-8 w-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs text-white/50">
            AD
          </div>
        </div>
      </header>

      {/* MAIN GRID */}
      <main className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto">

        {/* LEFT COLUMN: METRICS (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* TRUST SCORE CARD (HERO) */}
          <div className={`
             p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/5 relative overflow-hidden group shadow-2xl transition-all duration-500
             ${tourStep === 0 ? 'scale-105 z-50 ring-2 ring-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.3)]' : ''}
          `}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-cyan-500/20 transition-all duration-1000"></div>

            <div className="flex items-center justify-between mb-8">
              <h3 className="text-white/50 text-xs font-bold uppercase tracking-[0.2em]">Global Trust Score</h3>
              <span className="text-emerald-400 text-xs font-mono bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">▲ 0.2% vs Last Week</span>
            </div>

            <div className="flex items-end gap-4 mb-6">
              <span className="text-7xl font-light text-white tracking-tighter shadow-cyan-500/50 drop-shadow-lg">{metrics.trustScore}</span>
              <span className="text-2xl text-white/30 font-light mb-2">/ 100</span>
            </div>

            <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-600 w-[98.4%] shadow-[0_0_15px_rgba(6,182,212,0.8)]"></div>
            </div>
            <p className="mt-4 text-xs text-slate-400 leading-relaxed">
              The network is actively preventing <strong className="text-white">99.8%</strong> of potential adverse events.
            </p>
          </div>

          {/* SECONDARY STATS */}
          <div className={`
             grid grid-cols-2 gap-4 transition-all duration-500
             ${tourStep === 1 ? 'relative z-50 scale-105 ring-2 ring-cyan-500 rounded-xl bg-slate-900/80 p-2 -m-2' : ''}
          `}>
            <StatCard title="Interventions" value={metrics.interventions} color="text-white" sub="Lives Protected" />
            <StatCard title="Hard Brakes" value={metrics.hardBrakes} color="text-red-400" sub="Critical Stops" isDanger />
            <StatCard title="Uptime" value={metrics.uptime} color="text-emerald-400" sub="System Status" />
            <StatCard title="Protocols" value={metrics.protocolsActive.toLocaleString()} color="text-blue-400" sub="Active Rules" />
          </div>

          {/* SYSTEM HEALTH LIST */}
          <div className={`
             bg-slate-900/50 border border-white/5 rounded-2xl p-6 flex flex-col gap-4 transition-all duration-500
             ${tourStep === 2 ? 'relative z-50 scale-105 ring-2 ring-cyan-500 bg-slate-900' : ''}
          `}>
            <h3 className="text-white/50 text-xs font-bold uppercase tracking-[0.2em] mb-2">Infrastructure Health</h3>
            <HealthRow label="Ontology Core (RxNorm)" status="healthy" latency="12ms" />
            <HealthRow label="Deep Edge Inference" status="healthy" latency="45ms" />
            <HealthRow label="Privacy Vault (Zero-Knowledge)" status="healthy" latency="OK" />
            <HealthRow label="Sidecar Fleet (Desktop)" status="warning" latency="92% Online" />
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE STREAM (8 cols) */}
        <div className={`
           lg:col-span-8 flex flex-col bg-slate-900/30 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm h-[calc(100vh-8rem)] transition-all duration-500
           ${tourStep === 3 ? 'relative z-50 scale-[1.02] ring-2 ring-cyan-500 bg-slate-900' : ''}
        `}>
          <div className="h-12 border-b border-white/5 px-6 flex items-center justify-between bg-white/5">
            <span className="text-xs font-bold uppercase tracking-widest text-white/70">Live Validation Stream</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-mono text-white/50">LIVE • ENCRYPTED</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/20 gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 animate-spin-slow"></div>
                <span className="text-sm font-mono tracking-widest">WAITING FOR SIGNALS...</span>
              </div>
            ) : (
              <div className="flex flex-col animate-in fade-in duration-500">
                {logs.map((log) => (
                  <LogEntry key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}

// --- SUBCOMPONENTS ---

function StatCard({ title, value, color, sub, isDanger }: any) {
  return (
    <div className={`
      bg-slate-900/50 border p-5 rounded-xl transition-all duration-300 hover:scale-[1.02] cursor-default
      ${isDanger ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10' : 'border-white/5 hover:border-white/10'}
    `}>
      <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-2">{title}</div>
      <div className={`text-3xl font-light ${color} tracking-tight mb-1`}>{value}</div>
      <div className={`text-[10px] ${isDanger ? 'text-red-400/70' : 'text-slate-500'}`}>{sub}</div>
    </div>
  );
}

function HealthRow({ label, status, latency }: any) {
  const isHealthy = status === 'healthy';
  const color = isHealthy ? 'bg-emerald-500' : 'bg-amber-500';
  const textColor = isHealthy ? 'text-emerald-500' : 'text-amber-500';

  return (
    <div className="flex items-center justify-between text-xs py-2 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] px-2 rounded -mx-2 transition-colors">
      <span className="text-slate-400 font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] text-slate-600">{latency}</span>
        <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 rounded border border-white/5">
          <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
          <span className={`font-bold tracking-wider text-[9px] ${textColor}`}>
            {status.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

function LogEntry({ log }: any) {
  const isRed = log.level === 'CRITICAL';

  return (
    <div className={`
      flex items-start gap-4 p-5 border-b border-white/5 hover:bg-white/[0.02] transition-all duration-200 group
      ${isRed ? 'bg-red-500/[0.02]' : ''}
    `}>
      <div className="w-16 pt-0.5 flex flex-col items-end gap-1">
        <span className="font-mono text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors">
          {log.time}
        </span>
        <span className="font-mono text-[9px] text-slate-700 bg-slate-900 px-1 rounded">
          {log.id}
        </span>
      </div>

      <div className={`
         w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 shadow-lg border
         ${isRed
          ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-red-500/10'
          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/10'}
       `}>
        {isRed ? '🛡️' : '✓'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5">
          <span className={`text-sm font-bold tracking-wide ${isRed ? 'text-red-400' : 'text-slate-200'}`}>
            {log.title}
          </span>
          {log.isDeterminstic && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-widest">
              Deterministic
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
          {log.message}
        </p>

        <div className="mt-3 flex gap-2">
          {log.tags.map((tag: string, i: number) => (
            <span key={i} className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 border border-white/5 rounded-md hover:border-white/20 hover:text-slate-300 transition-colors cursor-default">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="w-24 text-right pt-1 hidden sm:block">
        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
          User ID
        </div>
        <div className="text-xs font-mono text-slate-400">
          {log.userId}
        </div>
      </div>
    </div>
  );
}

// --- MOCK DATA GENERATOR ---

// Mock generator removed in favor of real API polling
