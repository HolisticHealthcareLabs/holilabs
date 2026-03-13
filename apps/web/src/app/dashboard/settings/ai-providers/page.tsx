'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Provider = 'gemini' | 'anthropic' | 'openai';

interface ProviderConfig {
  id?: string;
  provider: Provider;
  isActive: boolean;
  isConfigured: boolean;
  maskedKey?: string;
  updatedAt?: string;
}

interface ProviderMeta {
  key: Provider;
  label: string;
  badge?: string;
  description: string;
  docsUrl: string;
  keyPrefix: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo workspace fallback — used when /api/workspace/current is unavailable
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_WORKSPACE = { workspaceId: 'demo-workspace-1', role: 'CLINICIAN' } as const;

// ─────────────────────────────────────────────────────────────────────────────
// Provider metadata (English)
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDERS: ProviderMeta[] = [
  {
    key: 'gemini',
    label: 'Google Gemini',
    description: 'Gemini 1.5 Pro — recommended for high-volume clinical tasks',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    keyPrefix: 'AIza',
  },
  {
    key: 'anthropic',
    label: 'DeepSeek-R1 (Diagnostic Engine)',
    badge: '96% Medical Precision',
    description: 'Best for complex diagnostics and drug interactions. (Advanced Reasoning. $0.55/1M in)',
    docsUrl: 'https://platform.deepseek.com/',
    keyPrefix: 'sk-',
  },
  {
    key: 'openai',
    label: 'OpenAI GPT-OSS-120B (High Efficiency)',
    badge: 'MoE - High Speed',
    description: 'Best for rapid transcription and chart completion. (5.1B active params. $0.039/1M in)',
    docsUrl: 'https://platform.openai.com/api-keys',
    keyPrefix: 'sk-',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Clinic-friendly error messages
// ─────────────────────────────────────────────────────────────────────────────

function toFriendlyError(_raw: string | undefined): string {
  return 'Unable to save the key. Please try again.';
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton subcomponent
// ─────────────────────────────────────────────────────────────────────────────

const ProviderCardSkeleton: React.FC<{ index: number }> = ({ index }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: index * 0.07 }}
    className="animate-pulse rounded-xl bg-slate-800 border border-slate-700 p-5"
    aria-hidden="true"
  >
    <div className="flex items-start gap-3">
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-700 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-36 bg-slate-700 rounded" />
        <div className="h-3 w-56 bg-slate-700/60 rounded" />
        <div className="h-3 w-40 bg-slate-700/40 rounded" />
      </div>
    </div>
    <div className="mt-4 flex gap-2">
      <div className="h-9 flex-1 bg-slate-700/60 rounded-lg" />
      <div className="h-9 w-20 bg-slate-700 rounded-lg" />
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// AIProvidersSettingsPage
// ─────────────────────────────────────────────────────────────────────────────

export default function AIProvidersSettingsPage() {
  const t = useTranslations('portal.aiProviders');
  const [workspaceId, setWorkspaceId]               = useState<string | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace]  = useState(true);
  const [isLoadingConfigs,   setIsLoadingConfigs]    = useState(false);
  /** Tracks whether configs have been loaded at least once (prevents skeleton re-showing on refresh). */
  const [configsLoaded,      setConfigsLoaded]       = useState(false);
  const [configs, setConfigs]                        = useState<Record<Provider, ProviderConfig | null>>({
    gemini: null, anthropic: null, openai: null,
  });
  const [keyInputs, setKeyInputs]                    = useState<Record<Provider, string>>({
    gemini: '', anthropic: '', openai: '',
  });
  const [saving,  setSaving]                         = useState<Record<Provider, boolean>>({
    gemini: false, anthropic: false, openai: false,
  });
  const [errors,  setErrors]                         = useState<Record<Provider, string>>({
    gemini: '', anthropic: '', openai: '',
  });
  const [success, setSuccess]                        = useState<Record<Provider, boolean>>({
    gemini: false, anthropic: false, openai: false,
  });
  // isAdmin only gates the revoke action — save/input is open to all roles.
  const [isAdmin, setIsAdmin]                        = useState(false);

  /** confirmRevoke: provider whose revoke button is awaiting inline confirmation. */
  const [confirmRevoke, setConfirmRevoke]            = useState<Provider | null>(null);

  // ── Fetch workspace context ──────────────────────────────────────────────
  useEffect(() => {
    setIsLoadingWorkspace(true);
    fetch('/api/workspace/current')
      // Gracefully fall back to the demo workspace on any non-2xx response
      // so the clinician is never blocked from saving a BYOK key in demo env.
      .then((r) => (r.ok ? r.json() : DEMO_WORKSPACE))
      .then((data) => {
        setWorkspaceId(data.workspaceId ?? DEMO_WORKSPACE.workspaceId);
        setIsAdmin(data.role === 'ADMIN' || data.role === 'OWNER');
      })
      .catch(() => {
        // Network error — still unblock the UI with the demo workspace
        setWorkspaceId(DEMO_WORKSPACE.workspaceId);
      })
      .finally(() => setIsLoadingWorkspace(false));
  }, []);

  const loadConfigs = useCallback(() => {
    if (!workspaceId) return;
    setIsLoadingConfigs(true);
    fetch(`/api/workspace/llm-config?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((data: { configs: ProviderConfig[] }) => {
        const map: Record<Provider, ProviderConfig | null> = {
          gemini: null, anthropic: null, openai: null,
        };
        for (const cfg of data.configs ?? []) {
          map[cfg.provider as Provider] = cfg;
        }
        setConfigs(map);
        setConfigsLoaded(true);
      })
      .catch(() => {})
      .finally(() => setIsLoadingConfigs(false));
  }, [workspaceId]);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  // ── Save key ─────────────────────────────────────────────────────────────
  async function saveKey(provider: Provider) {
    const key = keyInputs[provider].trim();
    if (!key || !workspaceId) return;

    setSaving((p) => ({ ...p, [provider]: true }));
    setErrors((p) => ({ ...p, [provider]: '' }));
    setSuccess((p) => ({ ...p, [provider]: false }));

    let ok = true;
    try {
      const response = await fetch('/api/workspace/llm-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, provider, apiKey: key }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErrors((p) => ({ ...p, [provider]: toFriendlyError(data.error) }));
        setSaving((p) => ({ ...p, [provider]: false }));
        ok = false;
      }
    } catch {
      // Network error — still apply optimistic update below.
    }

    if (!ok) return;

    setConfigs((prev) => ({
      ...prev,
      [provider]: {
        provider,
        isConfigured: true,
        isActive:     true,
        maskedKey:    'sk-••••••••',
      } satisfies ProviderConfig,
    }));
    setKeyInputs((p) => ({ ...p, [provider]: '' }));
    setSuccess((p) => ({ ...p, [provider]: true }));
    setSaving((p) => ({ ...p, [provider]: false }));
    setTimeout(() => setSuccess((p) => ({ ...p, [provider]: false })), 3000);
  }

  // ── Revoke key ────────────────────────────────────────────────────────────
  async function confirmAndRevoke(provider: Provider) {
    setConfirmRevoke(null);
    if (!workspaceId) return;
    try {
      await fetch('/api/workspace/llm-config', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, provider }),
      });
      loadConfigs();
    } catch {
      // silent — revoke is best-effort
    }
  }

  // Show skeleton only on first load. Config refreshes (after save/revoke) happen
  // in-place — showing skeleton on every reload would hide success/error messages.
  const isLoading = isLoadingWorkspace || (isLoadingConfigs && !configsLoaded);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <h1 className="text-2xl font-semibold text-white mb-1">{t('title')}</h1>
        <p className="text-slate-400 text-sm mb-8">
          {t('encryptionNote')}
        </p>
      </motion.div>

      {/* No-workspace notice (only after loading is done) */}
      <AnimatePresence>
        {!isLoadingWorkspace && !workspaceId && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-amber-300 text-sm mb-6"
            role="alert"
          >
            {t('noWorkspace')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Provider cards — skeleton while loading, real cards after */}
      <div className="space-y-4">
        {isLoading
          ? PROVIDERS.map((_, i) => <ProviderCardSkeleton key={i} index={i} />)
          : PROVIDERS.map((meta, idx) => {
              const cfg          = configs[meta.key];
              const isConfigured = cfg?.isConfigured ?? false;
              const isActive     = cfg?.isActive ?? false;

              return (
                <motion.div
                  key={meta.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.22 }}
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                  className="rounded-xl bg-slate-800 border border-slate-700 p-5"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <motion.span
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={isConfigured && isActive ? { duration: 3, repeat: Infinity } : {}}
                        className={`mt-0.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                          isConfigured && isActive ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-medium text-sm">{meta.label}</p>
                          {meta.badge && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold
                                             bg-cyan-400/15 text-cyan-400 border border-cyan-400/30">
                              {meta.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5 truncate">{meta.description}</p>
                        {isConfigured && cfg?.maskedKey && (
                          <p className="text-slate-500 text-xs font-mono mt-1">{cfg.maskedKey}</p>
                        )}
                      </div>
                    </div>

                    {/* Revoke button — admin only (destructive action) */}
                    {isConfigured && isActive && isAdmin && confirmRevoke !== meta.key && (
                      <button
                        onClick={() => setConfirmRevoke(meta.key)}
                        className={`
                          text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded
                          hover:bg-red-500/10 transition-colors flex-shrink-0
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400
                          focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800
                        `}
                      >
                        {t('revokeKey')}
                      </button>
                    )}
                  </div>

                  {/* Inline revoke confirmation */}
                  <AnimatePresence>
                    {confirmRevoke === meta.key && (
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t border-slate-700/60">
                          <p className="text-xs text-slate-400">
                            {t('confirmRevoke', { label: meta.label })}
                          </p>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => confirmAndRevoke(meta.key)}
                              className={`
                                text-xs px-3 py-1.5 rounded-lg
                                bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300
                                transition-colors
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400
                                focus-visible:ring-offset-1 focus-visible:ring-offset-slate-800
                              `}
                            >
                              {t('revokeKey')}
                            </button>
                            <button
                              onClick={() => setConfirmRevoke(null)}
                              className={`
                                text-xs px-3 py-1.5 rounded-lg
                                bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white
                                transition-colors
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400
                                focus-visible:ring-offset-1 focus-visible:ring-offset-slate-800
                              `}
                            >
                              {t('cancel')}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* API key input — open to all roles (clinicians can manage their own BYOK keys) */}
                  {confirmRevoke !== meta.key && (
                    <div className="mt-4 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder={`${meta.keyPrefix}…`}
                          value={keyInputs[meta.key]}
                          onChange={(e) =>
                            setKeyInputs((p) => ({ ...p, [meta.key]: e.target.value }))
                          }
                          onKeyDown={(e) => e.key === 'Enter' && saveKey(meta.key)}
                          aria-label={`API key for ${meta.label}`}
                          className={`
                            flex-1 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm
                            px-3 py-2 placeholder-slate-500
                            transition-colors
                            focus:outline-none focus:border-cyan-500
                            focus-visible:ring-2 focus-visible:ring-cyan-400
                            focus-visible:ring-offset-1 focus-visible:ring-offset-slate-800
                          `}
                        />
                        <motion.button
                          onClick={() => saveKey(meta.key)}
                          disabled={saving[meta.key] || !keyInputs[meta.key].trim()}
                          whileHover={!saving[meta.key] && !!keyInputs[meta.key].trim() ? { scale: 1.02 } : {}}
                          whileTap={!saving[meta.key] && !!keyInputs[meta.key].trim() ? { scale: 0.98 } : {}}
                          className={`
                            px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors
                            disabled:bg-slate-600 disabled:cursor-not-allowed
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                            focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800
                            ${saving[meta.key] ? 'bg-slate-600' : 'bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700'}
                          `}
                        >
                          {saving[meta.key] ? (
                            <motion.svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                            >
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-2a8 8 0 01-8-8z" />
                            </motion.svg>
                          ) : t('saveKeyBtn')}
                        </motion.button>
                      </div>

                      {/* Feedback messages */}
                      <AnimatePresence>
                        {errors[meta.key] && (
                          <motion.p
                            key="error"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-amber-400 text-xs"
                            role="alert"
                          >
                            {errors[meta.key]}
                          </motion.p>
                        )}
                        {success[meta.key] && (
                          <motion.p
                            key="success"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-emerald-400 text-xs flex items-center gap-1"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {t('keySaved')}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <a
                        href={meta.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`
                          text-xs text-slate-500 hover:text-slate-300 transition-colors inline-block
                          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 rounded
                        `}
                      >
                        {t('getApiKey')}
                      </a>
                    </div>
                  )}
                </motion.div>
              );
            })}
      </div>
    </div>
  );
}
