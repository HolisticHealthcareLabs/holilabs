'use client';

import { useCallback, useEffect, useState } from 'react';
import { SegmentedPreset, TREATMENT_APPROACH_OPTIONS } from '@/components/ui/SegmentedPreset';

interface SkillDefinition {
  slug: string;
  name: string;
  namePtBr?: string;
  description?: string;
  icon: string;
  color: string;
  category: string;
  supportsTreatmentApproach: boolean;
}

interface SkillConfig {
  skillSlug: string;
  enabled: boolean;
  priority: number;
  treatmentApproach: string | null;
  customInstructions: string | null;
}

interface ExpandedState {
  [slug: string]: boolean;
}

const PRIORITY_OPTIONS = [
  { value: '1', label: '1', color: '#94A3B8' },
  { value: '2', label: '2', color: '#64748B' },
  { value: '3', label: '3', color: '#3B82F6' },
  { value: '4', label: '4', color: '#6366F1' },
  { value: '5', label: '5', color: '#8B5CF6' },
];

const CATEGORY_LABELS: Record<string, string> = {
  DIAGNOSIS: 'Diagnóstico',
  TREATMENT: 'Tratamento',
  DOCUMENTATION: 'Documentação',
  PREVENTION: 'Prevenção',
  WORKFLOW: 'Fluxo de Trabalho',
};

export function SkillsSettings() {
  const [definitions, setDefinitions] = useState<SkillDefinition[]>([]);
  const [configs, setConfigs] = useState<SkillConfig[]>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [globalApproach, setGlobalApproach] = useState<string>('INTEGRATIVE');

  useEffect(() => {
    Promise.all([
      fetch('/api/clinical-skills/definitions').then((r) => r.json()),
      fetch('/api/clinical-skills/config').then((r) => r.json()),
    ])
      .then(([defData, cfgData]) => {
        if (defData.success) setDefinitions(defData.definitions || []);
        if (cfgData.success) setConfigs(cfgData.configs || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getConfig = useCallback(
    (slug: string): SkillConfig => {
      return (
        configs.find((c) => c.skillSlug === slug) || {
          skillSlug: slug,
          enabled: false,
          priority: 3,
          treatmentApproach: null,
          customInstructions: null,
        }
      );
    },
    [configs],
  );

  const updateConfig = (slug: string, patch: Partial<SkillConfig>) => {
    setConfigs((prev) => {
      const idx = prev.findIndex((c) => c.skillSlug === slug);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...patch };
        return updated;
      }
      return [...prev, { skillSlug: slug, enabled: false, priority: 3, treatmentApproach: null, customInstructions: null, ...patch }];
    });
  };

  const saveAll = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const payload = configs.map((c) => ({
        skillSlug: c.skillSlug,
        enabled: c.enabled,
        priority: c.priority,
        treatmentApproach: c.treatmentApproach,
        customInstructions: c.customInstructions,
      }));
      const res = await fetch('/api/clinical-skills/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: payload }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage('Saved');
      } else {
        setSaveMessage(data.error || 'Failed to save');
      }
    } catch {
      setSaveMessage('Network error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const grouped = definitions.reduce<Record<string, SkillDefinition[]>>((acc, def) => {
    const cat = def.category || 'OTHER';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(def);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Treatment Philosophy */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-semibold text-white mb-1">
          Filosofia Terapêutica Global
        </h3>
        <p className="text-xs text-white/60 mb-4">
          Define a abordagem padrão para todas as skills que suportam MBE/PICs.
          Skills individuais podem sobrescrever.
        </p>
        <SegmentedPreset
          options={TREATMENT_APPROACH_OPTIONS}
          value={globalApproach}
          onChange={setGlobalApproach}
        />
        <div className="mt-3 flex items-center gap-4 text-[11px] text-white/40">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> MBE = Medicina Baseada em Evidências
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> PICs = Práticas Integrativas e Complementares (PNPIC/SUS)
          </span>
        </div>
      </div>

      {/* Skill Cards by Category */}
      {Object.entries(grouped).map(([category, defs]) => (
        <div key={category}>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 px-1">
            {CATEGORY_LABELS[category] || category}
          </h4>
          <div className="space-y-2">
            {defs.map((def) => {
              const cfg = getConfig(def.slug);
              const isExpanded = expanded[def.slug] || false;

              return (
                <div
                  key={def.slug}
                  className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition-colors hover:border-white/15"
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 p-4">
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: `${def.color}20` }}
                    >
                      {def.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">
                        {def.namePtBr || def.name}
                      </div>
                      {def.description && (
                        <div className="text-xs text-white/50 truncate">
                          {def.description}
                        </div>
                      )}
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => updateConfig(def.slug, { enabled: !cfg.enabled })}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                        cfg.enabled ? 'bg-emerald-500' : 'bg-white/15'
                      }`}
                      aria-label={`${cfg.enabled ? 'Disable' : 'Enable'} ${def.name}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          cfg.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    {/* Expand */}
                    <button
                      onClick={() =>
                        setExpanded((prev) => ({ ...prev, [def.slug]: !isExpanded }))
                      }
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                      aria-label="Expand settings"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Expanded config */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 space-y-4 border-t border-white/5">
                      {/* Priority */}
                      <div className="pt-3">
                        <label className="text-xs font-semibold text-white/60 mb-2 block">
                          Prioridade
                        </label>
                        <SegmentedPreset
                          options={PRIORITY_OPTIONS}
                          value={String(cfg.priority)}
                          onChange={(v) => updateConfig(def.slug, { priority: parseInt(v, 10) })}
                          size="sm"
                        />
                      </div>

                      {/* Treatment Approach (conditional) */}
                      {def.supportsTreatmentApproach && (
                        <div>
                          <label className="text-xs font-semibold text-white/60 mb-2 block">
                            Abordagem Terapêutica
                          </label>
                          <SegmentedPreset
                            options={TREATMENT_APPROACH_OPTIONS}
                            value={cfg.treatmentApproach || globalApproach}
                            onChange={(v) => updateConfig(def.slug, { treatmentApproach: v })}
                            size="sm"
                          />
                          {cfg.treatmentApproach && (
                            <button
                              onClick={() => updateConfig(def.slug, { treatmentApproach: null })}
                              className="mt-1 text-[11px] text-white/40 hover:text-white/60"
                            >
                              Reset to global default
                            </button>
                          )}
                        </div>
                      )}

                      {/* Custom Instructions */}
                      <div>
                        <label className="text-xs font-semibold text-white/60 mb-2 block">
                          Instruções Personalizadas
                        </label>
                        <textarea
                          value={cfg.customInstructions || ''}
                          onChange={(e) =>
                            updateConfig(def.slug, { customInstructions: e.target.value || null })
                          }
                          placeholder="Ex: Sempre considerar interações com metformina..."
                          className="w-full h-20 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-white/20"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={saveAll}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white disabled:opacity-50 transition-all"
        >
          {saving ? 'Saving...' : 'Save Skills Configuration'}
        </button>
        {saveMessage && (
          <span
            className={`text-xs font-semibold ${
              saveMessage === 'Saved' ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {saveMessage}
          </span>
        )}
      </div>
    </div>
  );
}
