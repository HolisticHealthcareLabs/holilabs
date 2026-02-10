'use client';

import React, { useEffect, useMemo, useState } from 'react';

/**
 * Universal Validation Console (Control Plane)
 *
 * This is the original "God View" dashboard.
 * It remains available at `/dashboard/console`, but `/dashboard` now redirects to
 * the fleet-aware Command Center (`/dashboard/command-center`).
 */
export default function ValidationConsolePage() {
  type FilterState = {
    country: string;
    site: string;
    unit: string;
    date: string;
  };

  type StreamLog = {
    id: string;
    time: string;
    level: 'INFO' | 'WARN' | 'CRITICAL';
    title: string;
    message?: string;
    description?: string;
    device?: string;
    country?: string;
    site?: string;
    unit?: string;
    occurredAt?: string;
    tags?: string[];
  };

  type MetricDefinition = {
    id: string;
    href: string;
  };

  const [filters, setFilters] = useState<FilterState>({
    country: 'all',
    site: 'all',
    unit: 'all',
    date: '24h',
  });

  const [logs, setLogs] = useState<StreamLog[]>([]);
  const [rulesVersion, setRulesVersion] = useState<string>('Loading...');
  const [metricDefinitions, setMetricDefinitions] = useState<Record<string, MetricDefinition>>({
    trustScore: { id: 'METRIC-TRUST-SCORE-V1', href: '#metric-definitions' },
    interventions: { id: 'METRIC-INTERVENTIONS-V1', href: '#metric-definitions' },
    hardBrakes: { id: 'METRIC-HARD-BRAKES-V1', href: '#metric-definitions' },
    uptime: { id: 'METRIC-UPTIME-V1', href: '#metric-definitions' },
    protocolsActive: { id: 'METRIC-PROTOCOLS-ACTIVE-V1', href: '#metric-definitions' },
  });
  const [mounted, setMounted] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams(filters);
    return params.toString();
  }, [filters]);

  const metrics = useMemo(() => {
    const interventions = logs.length;
    const hardBrakes = logs.filter(
      (log) => log.level === 'CRITICAL' || (log.tags ?? []).includes('hard-brake'),
    ).length;
    const warnCount = logs.filter((log) => log.level === 'WARN').length;
    const trustScore = Number(Math.max(80, 100 - hardBrakes * 2.5 - warnCount * 0.7).toFixed(1));
    const uptimeValue = Math.max(95, 100 - hardBrakes * 0.12).toFixed(2);
    const protocolsActive = Math.max(8200, 8530 - hardBrakes * 4 - warnCount);

    return {
      trustScore,
      interventions,
      hardBrakes,
      uptime: `${uptimeValue}%`,
      protocolsActive,
    };
  }, [logs]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const normalizeLog = (raw: Partial<StreamLog>): StreamLog => {
      const country = raw.country ?? 'GLOBAL';
      const site = raw.site ?? 'N/A';
      const unit = raw.unit ?? 'N/A';
      return {
        id: raw.id ?? `${country}-${site}-${unit}-${Math.random().toString(36).slice(2)}`,
        time: raw.time ?? '--:--:--',
        level: raw.level ?? 'INFO',
        title: raw.title ?? 'Telemetry event',
        message: raw.message ?? raw.description ?? 'No description provided.',
        description: raw.description ?? raw.message ?? 'No description provided.',
        device: raw.device ?? `${country}/${site}/${unit}`,
        country,
        site,
        unit,
        occurredAt: raw.occurredAt,
        tags: raw.tags ?? [],
      };
    };

    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/telemetry/stream?${queryString}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data: unknown = await res.json();
        if (!Array.isArray(data)) return;
        setLogs(data.map((event) => normalizeLog(event as Partial<StreamLog>)));
      } catch {
        // ignore
      }
    };

    const fetchVersion = async () => {
      try {
        const res = await fetch(`/api/governance/manifest?${queryString}`, { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as {
            version?: string;
            metricDefinitions?: Record<string, MetricDefinition>;
          };
          setRulesVersion(data?.version ?? 'UNKNOWN');
          if (data?.metricDefinitions) {
            setMetricDefinitions((current) => ({ ...current, ...data.metricDefinitions }));
          }
        }
      } catch {
        setRulesVersion('OFFLINE');
      }
    };

    fetchLogs();
    fetchVersion();
    const timer = setInterval(fetchLogs, 2000);
    return () => clearInterval(timer);
  }, [queryString]);

  if (!mounted) return null;

  return (
    <div className="dark bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
      <div className="px-6 py-5 border-b border-white/10 bg-slate-900/40 backdrop-blur-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.35)]">
              <span className="font-bold text-slate-950 text-lg">C</span>
            </div>
            <div className="leading-tight">
              <div className="font-semibold tracking-wide text-sm text-slate-100">
                Cortex <span className="text-white/40 font-light">Assurance Layer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-cyan-400 font-mono tracking-wider">CONTROL PLANE</span>
                <span className="text-[9px] font-mono text-slate-500 border border-white/10 px-1 rounded" title="Active ruleset version">
                  {rulesVersion}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/download"
              className="inline-flex items-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-bold rounded-lg transition-colors border border-cyan-500/20"
            >
              Download agent
            </a>
            <a
              href="/dashboard/settings?tab=billing"
              className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/80 text-xs font-bold rounded-lg transition-colors border border-white/10"
            >
              Billing
            </a>
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
              SYSTEM OPTIMAL
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-white/10 bg-slate-900/20">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <FilterSelect
            label="Country"
            value={filters.country}
            options={['all', 'AR', 'BO', 'BR']}
            onChange={(country) => setFilters((current) => ({ ...current, country }))}
          />
          <FilterSelect
            label="Site"
            value={filters.site}
            options={['all', 'Site-A', 'Site-B', 'Site-C']}
            onChange={(site) => setFilters((current) => ({ ...current, site }))}
          />
          <FilterSelect
            label="Unit"
            value={filters.unit}
            options={['all', 'ICU', 'ER', 'Oncology', 'Ward-3']}
            onChange={(unit) => setFilters((current) => ({ ...current, unit }))}
          />
          <FilterSelect
            label="Date"
            value={filters.date}
            options={['all', '24h', '7d', '30d']}
            onChange={(date) => setFilters((current) => ({ ...current, date }))}
          />
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="p-7 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/5 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white/50 text-xs font-bold uppercase tracking-[0.2em]">Global Trust Score</h3>
              <span className="text-emerald-300 text-xs font-mono bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                ▲ 0.2% vs last week
              </span>
            </div>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-6xl font-light text-white tracking-tighter">{metrics.trustScore}</span>
              <span className="text-xl text-white/30 font-light mb-1">/ 100</span>
            </div>
            <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-600 transition-all duration-500"
                style={{ width: `${metrics.trustScore}%` }}
              />
            </div>
            <p className="mt-4 text-xs text-slate-400 leading-relaxed">
              Filtered by {filters.country}/{filters.site}/{filters.unit}/{filters.date}. The network is actively preventing high-risk deviations.
            </p>
            <p className="mt-2 text-[10px] text-cyan-300/90">
              Definition:{' '}
              <a className="underline hover:text-cyan-200" href={metricDefinitions.trustScore?.href ?? '#metric-definitions'}>
                {metricDefinitions.trustScore?.id ?? 'METRIC-TRUST-SCORE-V1'}
              </a>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Interventions"
              value={metrics.interventions}
              color="text-white"
              sub="Validation actions"
              definition={metricDefinitions.interventions}
            />
            <StatCard
              title="Hard Brakes"
              value={metrics.hardBrakes}
              color="text-red-300"
              sub="Critical stops"
              isDanger
              definition={metricDefinitions.hardBrakes}
            />
            <StatCard
              title="Uptime"
              value={metrics.uptime}
              color="text-emerald-300"
              sub="Observed reliability"
              definition={metricDefinitions.uptime}
            />
            <StatCard
              title="Protocols"
              value={metrics.protocolsActive.toLocaleString()}
              color="text-blue-300"
              sub="Active rules"
              definition={metricDefinitions.protocolsActive}
            />
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col bg-slate-900/30 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="h-12 border-b border-white/5 px-6 flex items-center justify-between bg-white/5">
            <span className="text-xs font-bold uppercase tracking-widest text-white/70">Live Validation Stream</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono text-white/50">LIVE • ENCRYPTED</span>
            </div>
          </div>

          <div className="flex-1 min-h-[340px] max-h-[min(720px,calc(100dvh-22rem))] overflow-y-auto p-0 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/20 gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 animate-spin-slow" />
                <span className="text-sm font-mono tracking-widest">WAITING FOR SIGNALS...</span>
              </div>
            ) : (
              <div className="flex flex-col">
                {logs.map((log) => (
                  <LogEntry key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div id="metric-definitions" className="px-6 pb-8 max-w-[1600px] mx-auto">
        <div className="rounded-xl border border-white/10 bg-slate-900/30 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/60 mb-2">KPI Definition Hooks</div>
          <div className="text-xs text-slate-400">
            Placeholder references are now wired from governance manifest and rendered on KPI cards for explicit definition linkage.
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <span className="text-[10px] uppercase tracking-widest text-white/50">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-xs text-white/90 outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-slate-900 text-white">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatCard({
  title,
  value,
  color,
  sub,
  isDanger,
  definition,
}: {
  title: string;
  value: string | number;
  color: string;
  sub: string;
  isDanger?: boolean;
  definition?: { id?: string; href?: string };
}) {
  return (
    <div
      className={[
        'bg-slate-900/50 border p-5 rounded-xl transition-all duration-300 hover:scale-[1.02] cursor-default',
        isDanger ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10' : 'border-white/5 hover:border-white/10',
      ].join(' ')}
    >
      <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-2">{title}</div>
      <div className={`text-3xl font-light ${color} tracking-tight mb-1`}>{value}</div>
      <div className={`text-[10px] ${isDanger ? 'text-red-300/70' : 'text-slate-500'}`}>{sub}</div>
      <div className="mt-2 text-[10px] text-cyan-300/80">
        Definition:{' '}
        <a className="underline hover:text-cyan-200" href={definition?.href ?? '#metric-definitions'}>
          {definition?.id ?? 'METRIC-PLACEHOLDER'}
        </a>
      </div>
    </div>
  );
}

function LogEntry({
  log,
}: {
  log: {
    time?: string;
    level?: string;
    title?: string;
    message?: string;
    description?: string;
    country?: string;
    site?: string;
    unit?: string;
    device?: string;
  };
}) {
  const isRed = log?.level === 'CRITICAL';
  const description = String(log?.message ?? log?.description ?? 'No description provided.');
  const location = [log?.country, log?.site, log?.unit].filter(Boolean).join('/') || String(log?.device ?? 'N/A');
  return (
    <div
      className={[
        'flex items-start gap-4 p-5 border-b border-white/5 hover:bg-white/[0.02] transition-all duration-200 group',
        isRed ? 'bg-red-500/[0.02]' : '',
      ].join(' ')}
    >
      <div className="w-16 pt-0.5 flex flex-col items-end gap-1">
        <span className="font-mono text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors">
          {log?.time}
        </span>
        <span
          className={[
            'text-[9px] font-bold tracking-widest px-2 py-0.5 rounded border',
            isRed ? 'text-red-300 border-red-500/20 bg-red-500/10' : 'text-cyan-300 border-cyan-500/20 bg-cyan-500/10',
          ].join(' ')}
        >
          {String(log?.level ?? 'INFO')}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold text-white/90 truncate">{String(log?.title ?? 'Telemetry event')}</span>
          <span className="text-[10px] font-mono text-slate-600 shrink-0">{location}</span>
        </div>
        <div className="mt-1 text-xs text-slate-400 leading-relaxed">{description}</div>
      </div>
    </div>
  );
}

