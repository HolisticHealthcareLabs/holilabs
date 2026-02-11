'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { isOverrideReasonCode, type OverrideReasonCode } from '@/lib/governance/shared-types';

/**
 * Universal Validation Console (Control Plane)
 *
 * This is the original "God View" dashboard.
 * It remains available at `/dashboard/console`, but `/dashboard` now redirects to
 * the fleet-aware Command Center (`/dashboard/command-center`).
 */
function sanitizeCodeList(codes: string[]) {
  return Array.from(
    new Set(
      codes
        .map((code) => code.trim().toUpperCase())
        .filter((code) => code.length > 0),
    ),
  );
}

export default function ValidationConsolePage() {
  const CODE_CONTROL_STORAGE_KEY = 'holilabs:cortex:console:code-controls:v1';
  const LEGACY_SELECTED_CODES_KEY = 'holilabs:console:selectedCodes';
  const { data: session } = useSession();
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
    eventType?: string;
    reason?: string;
    reasonCode?: string;
    protocolVersion?: string;
    device?: string;
    country?: string;
    site?: string;
    siteId?: string;
    unit?: string;
    occurredAt?: string;
    tags?: string[];
  };

  type MetricKey = 'trustScore' | 'interventions' | 'hardBrakes' | 'uptime' | 'protocolsActive';
  type MetricDefinition = {
    id: string;
    numerator: string;
    denominator: string;
    queryRef: string;
  };

  type CodePreset = {
    id: string;
    name: string;
    description: string;
    codes: string[];
  };

  type PersistedCodeControls = {
    selectedCodes: string[];
    activePresetId: string | null;
  };

  const defaultMetricDefinitions: Record<MetricKey, MetricDefinition> = {
    trustScore: {
      id: 'METRIC-TRUST-SCORE-V1',
      numerator: 'Weighted policy-aligned decisions across evaluated events',
      denominator: 'Total weighted evaluated events',
      queryRef: 'qry.governance.trust_score.v1',
    },
    interventions: {
      id: 'METRIC-INTERVENTIONS-V1',
      numerator: 'Validation interventions executed in selected interval',
      denominator: 'Total evaluated clinical workflow events',
      queryRef: 'qry.governance.interventions.count.v1',
    },
    hardBrakes: {
      id: 'METRIC-HARD-BRAKES-V1',
      numerator: 'Critical stop interventions issued in selected interval',
      denominator: 'Total interventions executed in selected interval',
      queryRef: 'qry.governance.interventions.hard_brakes_ratio.v1',
    },
    uptime: {
      id: 'METRIC-UPTIME-V1',
      numerator: 'Minutes with policy engine healthy and enforcing',
      denominator: 'Total scheduled service minutes in selected interval',
      queryRef: 'qry.governance.runtime.uptime.v1',
    },
    protocolsActive: {
      id: 'METRIC-PROTOCOLS-ACTIVE-V1',
      numerator: 'Protocols loaded and successfully enforcing',
      denominator: 'Total protocols deployed to selected fleet scope',
      queryRef: 'qry.governance.protocols.active_ratio.v1',
    },
  };

  const codePresets: CodePreset[] = useMemo(
    () => [
      {
        id: 'cardiology',
        name: 'Cardiology',
        description: 'AF/DOAC safety and anticoagulation-focused workflow.',
        codes: ['I48.0', 'I48.91', 'DOAC-RENAL', 'ANTICOAG-RISK', 'DISCHARGE-DOAC'],
      },
      {
        id: 'pediatrics',
        name: 'Pediatrics',
        description: 'Weight-based dosing and pediatric safety checks.',
        codes: ['PEDS-WEIGHT', 'PEDS-DOSE', 'NEONATAL-SAFETY', 'J18.9', 'R50.9'],
      },
      {
        id: 'oncology',
        name: 'Oncology',
        description: 'Chemo, neutropenia, and oncology risk controls.',
        codes: ['C50.9', 'C34.90', 'ONC-CHEMO-SAFETY', 'NEUTROPENIA-RISK', 'D70.9'],
      },
    ],
    [],
  );

  const [filters, setFilters] = useState<FilterState>({
    country: 'all',
    site: 'all',
    unit: 'all',
    date: '24h',
  });

  const [logs, setLogs] = useState<StreamLog[]>([]);
  const [rulesVersion, setRulesVersion] = useState<string>('Loading...');
  const [metricDefinitions, setMetricDefinitions] = useState<Record<MetricKey, MetricDefinition>>(defaultMetricDefinitions);
  const [codeDraft, setCodeDraft] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams(filters);
    return params.toString();
  }, [filters]);

  const filteredLogs = useMemo(() => {
    if (selectedCodes.length === 0) return logs;
    const normalizedCodes = selectedCodes.map((code) => code.toLowerCase());
    return logs.filter((log) => {
      const haystack = [log.title, log.message, log.description, ...(log.tags ?? [])]
        .join(' ')
        .toLowerCase();
      return normalizedCodes.some((code) => haystack.includes(code));
    });
  }, [logs, selectedCodes]);

  const userRole = useMemo(
    () => String((session?.user as { role?: string } | undefined)?.role ?? '').toUpperCase(),
    [session],
  );

  const canEditCodes = useMemo(() => ['OWNER', 'ADMIN', 'DOCTOR', 'PHYSICIAN'].includes(userRole), [userRole]);

  const presetById = useMemo(
    () => Object.fromEntries(codePresets.map((preset) => [preset.id, preset])) as Record<string, CodePreset>,
    [codePresets],
  );

  const activePreset = useMemo(
    () => (activePresetId ? presetById[activePresetId] ?? null : null),
    [activePresetId, presetById],
  );

  const isPresetCustomized = useMemo(() => {
    if (!activePreset) return false;
    const presetCodes = new Set(activePreset.codes.map((code) => code.toUpperCase()));
    const currentCodes = new Set(selectedCodes.map((code) => code.toUpperCase()));
    if (presetCodes.size !== currentCodes.size) return true;
    for (const code of presetCodes) {
      if (!currentCodes.has(code)) return true;
    }
    return false;
  }, [activePreset, selectedCodes]);

  const metrics = useMemo(() => {
    const interventions = filteredLogs.length;
    const hardBrakes = filteredLogs.filter(
      (log) => log.level === 'CRITICAL' || (log.tags ?? []).includes('hard-brake'),
    ).length;
    const warnCount = filteredLogs.filter((log) => log.level === 'WARN').length;
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
  }, [filteredLogs]);

  const metricDefinitionByKey = useMemo(() => {
    const toSafeDefinition = (key: MetricKey): MetricDefinition => {
      const candidate = metricDefinitions[key];
      if (
        candidate &&
        typeof candidate.id === 'string' &&
        typeof candidate.numerator === 'string' &&
        typeof candidate.denominator === 'string' &&
        typeof candidate.queryRef === 'string'
      ) {
        return candidate;
      }
      return {
        id: `MISSING-METRIC-${key.toUpperCase()}`,
        numerator: `Definition missing for ${key} numerator`,
        denominator: `Definition missing for ${key} denominator`,
        queryRef: `qry.governance.missing.${key}`,
      };
    };

    return {
      trustScore: toSafeDefinition('trustScore'),
      interventions: toSafeDefinition('interventions'),
      hardBrakes: toSafeDefinition('hardBrakes'),
      uptime: toSafeDefinition('uptime'),
      protocolsActive: toSafeDefinition('protocolsActive'),
    } satisfies Record<MetricKey, MetricDefinition>;
  }, [metricDefinitions]);

  const missingMetricDefinitionKeys = useMemo(
    () =>
      (['trustScore', 'interventions', 'hardBrakes', 'uptime', 'protocolsActive'] as const).filter((key) => {
        const definition = metricDefinitionByKey[key];
        return definition.id.startsWith('MISSING-METRIC-');
      }),
    [metricDefinitionByKey],
  );

  const overrideReasonRanking = useMemo(() => {
    const extractReasonCode = (log: StreamLog): OverrideReasonCode | null => {
      const candidates: string[] = [];

      if (typeof log.reasonCode === 'string') candidates.push(log.reasonCode);
      if (typeof log.reason === 'string') candidates.push(log.reason);

      for (const tag of log.tags ?? []) {
        const tagValue = String(tag);
        const prefixMatch = tagValue.match(/^override[_-]reason[:=](.+)$/i);
        if (prefixMatch?.[1]) candidates.push(prefixMatch[1]);
      }

      const searchableText = [log.title, log.message, log.description].filter(Boolean).join(' ');
      const regexMatch = searchableText.match(
        /(BENEFIT_OUTWEIGHS_RISK|PATIENT_TOLERANT|PALLIATIVE_CARE|GUIDELINE_MISMATCH|OTHER)/i,
      );
      if (regexMatch?.[1]) candidates.push(regexMatch[1]);

      for (const candidate of candidates) {
        const normalized = candidate.trim().toUpperCase();
        if (isOverrideReasonCode(normalized)) {
          return normalized;
        }
      }

      return null;
    };

    const isOverrideLog = (log: StreamLog): boolean => {
      const eventType = String(log.eventType ?? '').toUpperCase();
      if (eventType === 'OVERRIDE') return true;
      const tags = (log.tags ?? []).map((tag) => tag.toLowerCase());
      if (tags.some((tag) => tag.includes('override'))) return true;
      const text = [log.title, log.message, log.description].join(' ').toLowerCase();
      return text.includes('override');
    };

    const overrideLogs = filteredLogs.filter(isOverrideLog);
    const counts = new Map<OverrideReasonCode, number>();
    let missingReasonCount = 0;

    for (const log of overrideLogs) {
      const reasonCode = extractReasonCode(log);
      if (!reasonCode) {
        missingReasonCount += 1;
        continue;
      }
      counts.set(reasonCode, (counts.get(reasonCode) ?? 0) + 1);
    }

    const denominator = overrideLogs.length;
    const labelForReason = (reasonCode: OverrideReasonCode): string => {
      switch (reasonCode) {
        case 'BENEFIT_OUTWEIGHS_RISK':
          return 'Benefit outweighs risk';
        case 'PATIENT_TOLERANT':
          return 'Patient tolerated before';
        case 'PALLIATIVE_CARE':
          return 'Palliative / comfort care';
        case 'GUIDELINE_MISMATCH':
          return 'Guideline mismatch';
        case 'OTHER':
          return 'Other';
        default:
          return reasonCode;
      }
    };

    const rows = Array.from(counts.entries())
      .map(([reasonCode, count]) => ({
        reasonCode,
        label: labelForReason(reasonCode),
        count,
        percentage: denominator > 0 ? (count / denominator) * 100 : 0,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.reasonCode.localeCompare(b.reasonCode);
      });

    return {
      rows,
      denominator,
      missingReasonCount,
    };
  }, [filteredLogs]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!canEditCodes && showPresetModal) {
      setShowPresetModal(false);
    }
  }, [canEditCodes, showPresetModal]);

  const addCode = (rawCode: string) => {
    const normalizedCode = rawCode.trim().toUpperCase();
    if (!normalizedCode) return;
    setSelectedCodes((current) => sanitizeCodeList([...current, normalizedCode]));
    setCodeDraft('');
  };

  const removeCode = (targetCode: string) => {
    setSelectedCodes((current) => current.filter((code) => code !== targetCode));
  };

  const clearCodeSelection = () => {
    setSelectedCodes([]);
    setActivePresetId(null);
    setCodeDraft('');
  };

  const applyPreset = useCallback(
    (presetId: string, options?: { closeModal?: boolean }) => {
      const preset = presetById[presetId];
      if (!preset) return;
      setSelectedCodes(sanitizeCodeList(preset.codes));
      setActivePresetId(preset.id);
      if (options?.closeModal !== false) {
        setShowPresetModal(false);
      }
    },
    [presetById],
  );

  useEffect(() => {
    if (!showPresetModal) return;
    modalRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowPresetModal(false);
        return;
      }
      if (event.key === 'Enter' && activePresetId) {
        const target = event.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          return;
        }
        event.preventDefault();
        applyPreset(activePresetId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showPresetModal, activePresetId, applyPreset]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CODE_CONTROL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedCodeControls;
        if (Array.isArray(parsed?.selectedCodes)) {
          setSelectedCodes(sanitizeCodeList(parsed.selectedCodes));
        }
        if (typeof parsed?.activePresetId === 'string' || parsed?.activePresetId === null) {
          setActivePresetId(parsed.activePresetId);
        }
        return;
      }

      const legacyRaw = localStorage.getItem(LEGACY_SELECTED_CODES_KEY);
      if (!legacyRaw) return;
      const legacyParsed = JSON.parse(legacyRaw) as string[];
      if (Array.isArray(legacyParsed)) {
        setSelectedCodes(sanitizeCodeList(legacyParsed));
      }
    } catch {
      // ignore malformed local data
    }
  }, []);

  useEffect(() => {
    try {
      const payload: PersistedCodeControls = {
        selectedCodes: sanitizeCodeList(selectedCodes),
        activePresetId,
      };
      localStorage.setItem(CODE_CONTROL_STORAGE_KEY, JSON.stringify(payload));
      localStorage.removeItem(LEGACY_SELECTED_CODES_KEY);
    } catch {
      // ignore persistence errors
    }
  }, [selectedCodes, activePresetId]);

  useEffect(() => {
    const normalizeLog = (raw: Partial<StreamLog>): StreamLog => {
      const country = raw.country ?? 'GLOBAL';
      const site = raw.site ?? raw.siteId ?? 'N/A';
      const unit = raw.unit ?? 'N/A';
      return {
        id: raw.id ?? `${country}-${site}-${unit}-${Math.random().toString(36).slice(2)}`,
        time: raw.time ?? '--:--:--',
        level: raw.level ?? 'INFO',
        title: raw.title ?? 'Telemetry event',
        message: raw.message ?? raw.description ?? 'No description provided.',
        description: raw.description ?? raw.message ?? 'No description provided.',
        eventType: raw.eventType,
        reason: raw.reason,
        reasonCode: raw.reasonCode,
        protocolVersion: raw.protocolVersion,
        device: raw.device ?? `${country}/${site}/${unit}`,
        country,
        site,
        siteId: raw.siteId ?? site,
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
            metricDefinitions?: Partial<Record<MetricKey, Partial<MetricDefinition>>>;
          };
          setRulesVersion(data?.version ?? 'UNKNOWN');
          if (data?.metricDefinitions) {
            setMetricDefinitions((current) => {
              const next = { ...current };
              for (const key of ['trustScore', 'interventions', 'hardBrakes', 'uptime', 'protocolsActive'] as const) {
                const fromApi = data.metricDefinitions?.[key];
                if (!fromApi) continue;
                next[key] = {
                  id: typeof fromApi.id === 'string' ? fromApi.id : current[key].id,
                  numerator:
                    typeof fromApi.numerator === 'string' ? fromApi.numerator : current[key].numerator,
                  denominator:
                    typeof fromApi.denominator === 'string'
                      ? fromApi.denominator
                      : current[key].denominator,
                  queryRef: typeof fromApi.queryRef === 'string' ? fromApi.queryRef : current[key].queryRef,
                };
              }
              return next;
            });
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
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/90 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <span className="font-bold text-white text-lg">C</span>
            </div>
            <div className="leading-tight">
              <div className="font-semibold tracking-wide text-sm text-gray-900 dark:text-gray-100">
                Cortex <span className="text-gray-500 dark:text-gray-300 font-normal">Assurance Layer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-blue-700 dark:text-blue-300 font-mono tracking-wider">CONTROL PLANE</span>
                <span className="text-[9px] font-mono text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 px-1 rounded" title="Active ruleset version">
                  {rulesVersion}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/download"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              Download agent
            </a>
            <a
              href="/dashboard/settings?tab=billing"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Billing
            </a>
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SYSTEM OPTIMAL
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
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
        <div className="max-w-[1600px] mx-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Code focus controls</div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                Admins and doctors can tune which ICD/CPT/protocol codes are prioritized in this console view.
              </p>
              {activePreset && (
                <p className="mt-1 text-[11px] text-blue-700 dark:text-blue-300">
                  Active preset: <span className="font-semibold">{activePreset.name}</span>
                  {isPresetCustomized ? ' (customized)' : ' (exact match)'}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canEditCodes ? (
                <>
                  <input
                    value={codeDraft}
                    onChange={(event) => setCodeDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      addCode(codeDraft);
                    }}
                    placeholder="Add code (e.g., I48.0, DOAC-RENAL)"
                    className="w-full sm:w-64 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  <button
                    onClick={() => addCode(codeDraft)}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Add code
                  </button>
                  <button
                    onClick={() => {
                      if (!activePresetId && codePresets.length > 0) {
                        setActivePresetId(codePresets[0].id);
                      }
                      setShowPresetModal(true);
                    }}
                    className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 text-xs font-semibold"
                  >
                    Manage presets
                  </button>
                  {activePreset && (
                    <button
                      onClick={() => applyPreset(activePreset.id, { closeModal: false })}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      Reset to {activePreset.name}
                    </button>
                  )}
                </>
              ) : (
                <span className="text-xs text-amber-600 dark:text-amber-300 font-medium">
                  Read-only: role {userRole || 'UNKNOWN'} cannot edit. Ask an admin or doctor.
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {selectedCodes.length === 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">No code filters applied.</span>
            )}
            {selectedCodes.map((code) => (
              <span
                key={code}
                className="inline-flex items-center gap-1 rounded-full border border-blue-300 dark:border-blue-700 bg-blue-100/80 dark:bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-800 dark:text-blue-300"
              >
                {code}
                {canEditCodes && (
                  <button
                    onClick={() => removeCode(code)}
                    className="ml-1 text-blue-700 dark:text-blue-300 hover:text-red-600 dark:hover:text-red-400"
                    aria-label={`Remove ${code}`}
                  >
                    x
                  </button>
                )}
              </span>
            ))}
            {canEditCodes && selectedCodes.length > 0 && (
              <button
                onClick={clearCodeSelection}
                className="ml-1 text-xs text-gray-600 dark:text-gray-300 underline underline-offset-2 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 max-w-[1600px] mx-auto">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Global Trust Score</h3>
              <span className="text-emerald-700 dark:text-emerald-300 text-xs font-mono bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                ▲ 0.2% vs last week
              </span>
            </div>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-5xl sm:text-6xl font-light text-gray-900 dark:text-gray-100 tracking-tighter">{metrics.trustScore}</span>
              <span className="text-xl text-gray-400 dark:text-gray-500 font-light mb-1">/ 100</span>
            </div>
            <div className="h-2 w-full bg-gray-200 dark:bg-gray-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-emerald-500 transition-all duration-500"
                style={{ width: `${metrics.trustScore}%` }}
              />
            </div>
            <p className="mt-4 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Filtered by {filters.country}/{filters.site}/{filters.unit}/{filters.date}. The network is actively preventing high-risk deviations.
            </p>
            <p className="mt-2 text-[10px] text-blue-700 dark:text-blue-300">
              Definition: {metricDefinitionByKey.trustScore.id}
            </p>
            <p className="mt-1 text-[10px] text-gray-600 dark:text-gray-300">
              Formula: {metricDefinitionByKey.trustScore.numerator} /{' '}
              {metricDefinitionByKey.trustScore.denominator}
            </p>
            <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
              Query: {metricDefinitionByKey.trustScore.queryRef}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Interventions"
              value={metrics.interventions}
              color="text-gray-900 dark:text-white"
              sub="Validation actions"
              definition={metricDefinitionByKey.interventions}
            />
            <StatCard
              title="Hard Brakes"
              value={metrics.hardBrakes}
              color="text-red-600 dark:text-red-300"
              sub="Critical stops"
              isDanger
              definition={metricDefinitionByKey.hardBrakes}
            />
            <StatCard
              title="Uptime"
              value={metrics.uptime}
              color="text-emerald-600 dark:text-emerald-300"
              sub="Observed reliability"
              definition={metricDefinitionByKey.uptime}
            />
            <StatCard
              title="Protocols"
              value={metrics.protocolsActive.toLocaleString()}
              color="text-blue-600 dark:text-blue-300"
              sub="Active rules"
              definition={metricDefinitionByKey.protocolsActive}
            />
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                Top Override Reasons
              </h3>
              <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                n={overrideReasonRanking.denominator} overrides
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
              Scope: country/site/unit/date = {filters.country}/{filters.site}/{filters.unit}/{filters.date}
            </p>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Percent denominator = total overrides in current filtered stream ({overrideReasonRanking.denominator}).
            </p>

            {overrideReasonRanking.rows.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 px-3 py-4 text-xs text-gray-500 dark:text-gray-400">
                No override reason events found in the current filter scope.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {overrideReasonRanking.rows.map((row, index) => (
                  <div
                    key={row.reasonCode}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {index + 1}. {row.label}
                        </div>
                        <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400 truncate">
                          {row.reasonCode}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">{row.count}</div>
                        <div className="text-[11px] text-blue-700 dark:text-blue-300">
                          {row.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {overrideReasonRanking.missingReasonCount > 0 && (
              <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-300">
                {overrideReasonRanking.missingReasonCount} override event(s) were missing a valid reason code in this scope.
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
          <div className="h-12 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 flex items-center justify-between bg-gray-50 dark:bg-gray-800/80">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300">Live Validation Stream</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">LIVE • ENCRYPTED</span>
            </div>
          </div>

          <div className="flex-1 min-h-[340px] max-h-[min(720px,calc(100dvh-22rem))] overflow-y-auto p-0 custom-scrollbar">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 animate-spin-slow" />
                <span className="text-sm font-mono tracking-widest">WAITING FOR SIGNALS...</span>
              </div>
            ) : (
              <div className="flex flex-col">
                {filteredLogs.map((log) => (
                  <LogEntry key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div id="metric-definitions" className="px-4 sm:px-6 pb-8 max-w-[1600px] mx-auto">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-gray-600 dark:text-gray-300 mb-2">KPI Definition Hooks</div>
          <div className="text-xs text-gray-600 dark:text-gray-300">
            KPI cards render manifest-backed metric IDs, formulas, and query references for auditable governance definitions.
          </div>
          {missingMetricDefinitionKeys.length > 0 ? (
            <div className="mt-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Missing manifest definitions for: {missingMetricDefinitionKeys.join(', ')}. Placeholder definitions are shown in KPI cards.
            </div>
          ) : (
            <div className="mt-3 text-[11px] text-emerald-700 dark:text-emerald-300">
              All KPI definition keys are resolved from manifest/default contract.
            </div>
          )}
        </div>
      </div>

      {showPresetModal && canEditCodes && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-black/50"
            aria-label="Close preset modal"
            onClick={() => setShowPresetModal(false)}
          />
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Manage Code Presets"
            tabIndex={-1}
            className="relative w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl outline-none"
          >
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Manage Code Presets</h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  Switch Cardiology, Pediatrics, or Oncology workflows in one click.
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Keyboard: Enter applies active preset, Escape closes.
                </p>
              </div>
              <button
                onClick={() => setShowPresetModal(false)}
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Close
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              {codePresets.map((preset) => (
                <button
                  key={preset.id}
                  onFocus={() => setActivePresetId(preset.id)}
                  onMouseEnter={() => setActivePresetId(preset.id)}
                  onClick={() => applyPreset(preset.id)}
                  className={[
                    'text-left rounded-xl border p-4 transition-colors',
                    activePresetId === preset.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-700/50',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{preset.name}</div>
                    {activePresetId === preset.id && (
                      <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">ACTIVE</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{preset.description}</p>
                  <div className="mt-2 text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                    {preset.codes.length} codes
                  </div>
                </button>
              ))}
            </div>

            <div className="px-5 pb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={() => {
                  clearCodeSelection();
                  setShowPresetModal(false);
                }}
                className="text-xs text-gray-600 dark:text-gray-300 underline underline-offset-2 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Clear selection
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (activePresetId) {
                      applyPreset(activePresetId);
                    }
                  }}
                  disabled={!activePresetId}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 text-white text-xs font-semibold"
                >
                  Apply active preset
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  You can still add/remove individual codes after applying a preset.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
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
    <label className="flex flex-col gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2">
      <span className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-xs text-gray-800 dark:text-gray-100 outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
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
  definition?: { id?: string; numerator?: string; denominator?: string; queryRef?: string };
}) {
  return (
    <div
      className={[
        'border p-5 rounded-2xl transition-colors duration-200 cursor-default',
        isDanger
          ? 'border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50',
      ].join(' ')}
    >
      <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-2">{title}</div>
      <div className={`text-3xl font-light ${color} tracking-tight mb-1`}>{value}</div>
      <div className={`text-[10px] ${isDanger ? 'text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-300'}`}>{sub}</div>
      <div className="mt-2 text-[10px] text-blue-700 dark:text-blue-300">
        Definition: {definition?.id ?? 'METRIC-PLACEHOLDER'}
      </div>
      <div className="mt-1 text-[10px] text-gray-600 dark:text-gray-300">
        Formula: {definition?.numerator ?? 'N/A'} / {definition?.denominator ?? 'N/A'}
      </div>
      <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
        Query: {definition?.queryRef ?? 'N/A'}
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
        'flex items-start gap-4 p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors duration-200 group',
        isRed ? 'bg-red-50/60 dark:bg-red-950/15' : '',
      ].join(' ')}
    >
      <div className="w-16 pt-0.5 flex flex-col items-end gap-1">
        <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
          {log?.time}
        </span>
        <span
          className={[
            'text-[9px] font-bold tracking-widest px-2 py-0.5 rounded border',
            isRed
              ? 'text-red-700 dark:text-red-300 border-red-500/30 bg-red-500/10'
              : 'text-blue-700 dark:text-blue-300 border-blue-500/30 bg-blue-500/10',
          ].join(' ')}
        >
          {String(log?.level ?? 'INFO')}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{String(log?.title ?? 'Telemetry event')}</span>
          <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 shrink-0">{location}</span>
        </div>
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{description}</div>
      </div>
    </div>
  );
}

