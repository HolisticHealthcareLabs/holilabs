import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  quantization?: string;
}

interface OllamaStatus {
  connected: boolean;
  version?: string;
  models: OllamaModel[];
  checkedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const RECOMMENDED_MODELS = [
  {
    name: 'llama3.2:1b-instruct-q4_K_M',
    label: 'Llama 3.2 1B',
    size: '800 MB',
    useCase: 'Resumo de notas',
  },
  {
    name: 'phi3:mini-4k-instruct-q4_K_M',
    label: 'Phi-3 Mini',
    size: '2.3 GB',
    useCase: 'Interações medicamentosas',
  },
];

/** Stale if last successful check was more than 3 polling intervals ago. */
const STALE_THRESHOLD_MS = 3 * 60_000;

// ─────────────────────────────────────────────────────────────────────────────
// Clinic-friendly error messages (no technical jargon for clinicians)
// ─────────────────────────────────────────────────────────────────────────────

const FRIENDLY_ERRORS = {
  connection: 'Conexão com o nó local perdida. Usando nuvem segura.',
  download:   'Download interrompido. Verifique a conexão e tente novamente.',
};

function toFriendlyError(_raw: string | undefined): string {
  return FRIENDLY_ERRORS.download;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${bytes} B`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton subcomponent — matches the loaded layout
// ─────────────────────────────────────────────────────────────────────────────

const FogNodeSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-2" aria-busy="true" aria-label="Carregando nó local…">
    {/* Version + title row */}
    <div className="flex items-center gap-2 mb-3">
      <div className="h-2 w-2 rounded-full bg-slate-700 flex-shrink-0" />
      <div className="h-3 w-20 bg-slate-700 rounded" />
      <div className="h-2.5 w-12 bg-slate-700/60 rounded ml-1" />
    </div>
    {/* Model card skeletons */}
    {[0, 1].map((i) => (
      <div key={i} className="rounded-lg bg-slate-900/60 px-3 py-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-3 w-24 bg-slate-700 rounded" />
            <div className="h-2.5 w-32 bg-slate-700/50 rounded" />
          </div>
          <div className="h-6 w-14 bg-slate-700 rounded" />
        </div>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// FogNodePanel
// ─────────────────────────────────────────────────────────────────────────────

export const FogNodePanel: React.FC = () => {
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [pullProgress, setPullProgress] = useState<Record<string, number>>({});
  const [pulling, setPulling] = useState<Record<string, boolean>>({});
  const [pullErrors, setPullErrors] = useState<Record<string, string>>({});

  const api = (window as any).electronAPI as typeof window.electronAPI;

  const refresh = useCallback(async () => {
    try {
      const s = await api.getOllamaStatus();
      setStatus(s);
    } catch {
      setStatus((prev) =>
        prev
          ? { ...prev, connected: false }
          : { connected: false, models: [], checkedAt: new Date().toISOString() }
      );
    }
  }, [api]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    const unsub = api.onOllamaPullProgress((data) => {
      setPullProgress((prev) => ({ ...prev, [data.name]: data.pct }));
    });
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [refresh, api]);

  async function handlePull(name: string) {
    setPulling((prev) => ({ ...prev, [name]: true }));
    setPullProgress((prev) => ({ ...prev, [name]: 0 }));
    setPullErrors((prev) => ({ ...prev, [name]: '' }));

    try {
      const result = await api.pullOllamaModel(name);
      if (!result.success) {
        setPullErrors((prev) => ({
          ...prev,
          [name]: toFriendlyError(result.error),
        }));
      }
    } catch {
      setPullErrors((prev) => ({
        ...prev,
        [name]: FRIENDLY_ERRORS.connection,
      }));
    } finally {
      setPulling((prev) => ({ ...prev, [name]: false }));
      setPullProgress((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      refresh();
    }
  }

  const installedNames = new Set(status?.models.map((m) => m.name) ?? []);
  const isStale =
    status?.checkedAt &&
    Date.now() - new Date(status.checkedAt).getTime() > STALE_THRESHOLD_MS;

  // ── Outer container ─────────────────────────────────────────────────────────
  return (
    <motion.div
      className="mt-4 rounded-xl bg-slate-800/60 border border-slate-700 p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Connection dot */}
          <span className="relative flex h-2 w-2 flex-shrink-0">
            {status?.connected && !isStale && (
              <motion.span
                className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
                animate={{ scale: [1, 1.6, 1], opacity: [0.75, 0, 0.75] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                status === null
                  ? 'bg-slate-600'
                  : status.connected
                  ? isStale
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                  : 'bg-red-500'
              }`}
            />
          </span>

          <span className="text-xs font-semibold text-slate-200 tracking-wide">FOG NODE</span>

          {status?.version && (
            <span className="text-[10px] text-slate-500 font-mono">v{status.version}</span>
          )}
          {isStale && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] text-amber-500"
            >
              dados antigos
            </motion.span>
          )}
        </div>

        <button
          onClick={refresh}
          className={`
            text-[10px] text-slate-500 hover:text-slate-200 transition-colors rounded
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
            focus-visible:ring-offset-1 focus-visible:ring-offset-slate-800 px-1 py-0.5
          `}
          title="Atualizar status"
          aria-label="Atualizar status do nó local"
        >
          ↺
        </button>
      </div>

      {/* ── Skeleton while loading ─────────────────────────────────────────── */}
      {status === null && <FogNodeSkeleton />}

      {/* ── Content (after load) ─────────────────────────────────────────────*/}
      <AnimatePresence>
        {status !== null && (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {/* Disconnected notice — clinic-friendly */}
            {!status.connected && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-slate-400 mb-3 leading-relaxed"
              >
                {FRIENDLY_ERRORS.connection}{' '}
                <a
                  href="https://ollama.com"
                  target="_blank"
                  rel="noreferrer"
                  className={`
                    text-cyan-400 hover:text-cyan-300 underline
                    focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 rounded
                  `}
                >
                  Instalar Ollama ↗
                </a>
              </motion.p>
            )}

            {/* Installed models */}
            {status.connected && status.models.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                  Modelos instalados
                </p>
                <div className="space-y-1">
                  <AnimatePresence>
                    {status.models.map((m, i) => (
                      <motion.div
                        key={m.name}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.2 }}
                        className="flex items-center justify-between text-xs text-slate-300"
                      >
                        <span className="font-mono truncate max-w-[160px]">{m.name}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {m.quantization && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-400 font-mono">
                              {m.quantization}
                            </span>
                          )}
                          <span className="text-slate-500 text-[10px]">
                            {formatBytes(m.size)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Recommended downloads */}
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                Modelos recomendados
              </p>
              <div className="space-y-2">
                {RECOMMENDED_MODELS.map((rec, idx) => {
                  const isInstalled = installedNames.has(rec.name);
                  const pct = pullProgress[rec.name];
                  const isPulling = pulling[rec.name];
                  const pullError = pullErrors[rec.name];

                  return (
                    <motion.div
                      key={rec.name}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08, duration: 0.2 }}
                      className="rounded-lg bg-slate-900/60 px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-white font-medium">{rec.label}</p>
                          <p className="text-[10px] text-slate-500">{rec.useCase}</p>
                          <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                            {rec.size}
                          </p>
                        </div>

                        {isInstalled ? (
                          <motion.span
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-[10px] text-emerald-400 flex-shrink-0 mt-0.5"
                          >
                            ✓ Instalado
                          </motion.span>
                        ) : isPulling ? (
                          <span className="text-[10px] text-cyan-400 flex-shrink-0 mt-0.5 tabular-nums">
                            {pct !== undefined ? `${pct}%` : '…'}
                          </span>
                        ) : (
                          <motion.button
                            onClick={() => handlePull(rec.name)}
                            disabled={!status.connected}
                            whileHover={status.connected ? { scale: 1.03 } : {}}
                            whileTap={status.connected ? { scale: 0.97 } : {}}
                            className={`
                              text-[10px] px-2 py-1 rounded
                              bg-cyan-700 hover:bg-cyan-600 active:bg-cyan-800
                              disabled:bg-slate-700 disabled:cursor-not-allowed
                              text-white flex-shrink-0 transition-colors
                              focus-visible:outline-none focus-visible:ring-2
                              focus-visible:ring-cyan-400 focus-visible:ring-offset-1
                              focus-visible:ring-offset-slate-900
                            `}
                          >
                            Baixar
                          </motion.button>
                        )}
                      </div>

                      {/* Progress bar — framer-motion for jitter-free animation */}
                      <AnimatePresence>
                        {isPulling && pct !== undefined && (
                          <motion.div
                            key="progress"
                            initial={{ opacity: 0, scaleX: 0 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            exit={{ opacity: 0 }}
                            className="mt-2 h-1 rounded-full bg-slate-700 overflow-hidden"
                            aria-label={`Baixando ${rec.label}: ${pct}%`}
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                              initial={{ width: '0%' }}
                              animate={{ width: `${pct}%` }}
                              transition={{
                                duration: 0.4,
                                ease: 'easeOut',
                              }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Error state — clinic-friendly */}
                      <AnimatePresence>
                        {!isPulling && pullError && (
                          <motion.div
                            key="error"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 flex items-center justify-between gap-2 overflow-hidden"
                          >
                            <p className="text-[10px] text-amber-400 leading-tight">{pullError}</p>
                            <motion.button
                              onClick={() => handlePull(rec.name)}
                              disabled={!status.connected}
                              whileHover={status.connected ? { scale: 1.03 } : {}}
                              whileTap={status.connected ? { scale: 0.97 } : {}}
                              className={`
                                text-[10px] px-2 py-0.5 rounded
                                bg-slate-700 hover:bg-slate-600 active:bg-slate-800
                                text-slate-300 flex-shrink-0 transition-colors
                                focus-visible:outline-none focus-visible:ring-2
                                focus-visible:ring-cyan-400 focus-visible:ring-offset-1
                                focus-visible:ring-offset-slate-900
                              `}
                            >
                              Tentar novamente
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
