'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type FindingsRecord = {
  id: string;
  timestamp: string;
  dataHash?: string | null;
  findings: {
    chiefComplaint?: string;
    symptoms?: string[];
    diagnoses?: string[];
    source?: string;
  } | null;
  meta?: any;
};

export function FindingsTimeline({
  sessionId,
  isRecording,
  socketTick = 0,
}: {
  sessionId?: string | null;
  isRecording?: boolean;
  /** Increment this when a socket event arrives to force refresh */
  socketTick?: number;
}) {
  const { t: tRaw } = useLanguage();
  const t = (key: string) => tRaw(`copilot.${key}`);

  const [items, setItems] = useState<FindingsRecord[] | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const canLoad = Boolean(sessionId);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/scribe/sessions/${sessionId}/findings`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to load findings');
      setItems(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load findings');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Load when session becomes available
  useEffect(() => {
    if (!canLoad) {
      setItems(null);
      setError('');
      return;
    }
    load();
  }, [canLoad, load]);

  // Refresh on socket event
  useEffect(() => {
    if (!canLoad) return;
    if (!socketTick) return;
    load();
  }, [socketTick, canLoad, load]);

  // While recording, refresh periodically (in case socket is off)
  useEffect(() => {
    if (!canLoad) return;
    if (!isRecording) return;
    const tmr = window.setInterval(() => load(), 5000);
    return () => window.clearInterval(tmr);
  }, [canLoad, isRecording, load]);

  const latest = useMemo(() => (items && items.length ? items[0] : null), [items]);

  if (!canLoad) return null;

  return (
    <div className="backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-white/30 dark:border-gray-700/50 shadow-lg p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">{t('findingsTimelineTitle')}</div>
          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
            {t('findingsTimelineSubtitle')}
          </div>
        </div>
        <button
          onClick={load}
          className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
          disabled={loading}
        >
          {loading ? t('findingsTimelineRefreshing') : t('findingsTimelineRefresh')}
        </button>
      </div>

      {error ? (
        <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      ) : null}

      {items === null ? (
        <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">{t('findingsTimelineNoSession')}</div>
      ) : items.length === 0 ? (
        <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">{t('findingsTimelineEmpty')}</div>
      ) : (
        <>
          {latest?.findings ? (
            <div className="mt-4 rounded-xl border border-emerald-200/60 dark:border-emerald-800/30 bg-emerald-50/40 dark:bg-emerald-900/10 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase">
                  {t('findingsTimelineLatest')}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  {new Date(latest.timestamp).toLocaleString()}
                </div>
              </div>
              {latest.findings.chiefComplaint ? (
                <div className="mt-2 text-sm text-gray-900 dark:text-white">
                  <span className="font-semibold">{t('findingsTimelineChiefComplaint')}</span>{' '}
                  {latest.findings.chiefComplaint}
                </div>
              ) : null}
              {Array.isArray(latest.findings.symptoms) && latest.findings.symptoms.length ? (
                <div className="mt-2">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    {t('findingsTimelineSymptoms')}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {latest.findings.symptoms.slice(0, 12).map((s, idx) => (
                      <span
                        key={`${s}-${idx}`}
                        className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-xs border border-red-200/60 dark:border-red-800/30"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {Array.isArray(latest.findings.diagnoses) && latest.findings.diagnoses.length ? (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    {t('findingsTimelineDiagnoses')}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {latest.findings.diagnoses.slice(0, 8).map((d, idx) => (
                      <span
                        key={`${d}-${idx}`}
                        className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs border border-purple-200/60 dark:border-purple-800/30"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {latest.dataHash ? (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
                    <span className="font-semibold">{t('findingsTimelineAuditHash')}</span>{' '}
                    <span className="font-mono">{latest.dataHash}</span>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(String(latest.dataHash));
                      } catch {}
                    }}
                    className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                    title={t('findingsTimelineCopyHash')}
                  >
                    {t('findingsTimelineCopy')}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
              {t('findingsTimelineHistory')}
            </div>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {items.slice(0, 12).map((it) => (
                <div
                  key={it.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      {new Date(it.timestamp).toLocaleTimeString()}
                    </div>
                    {it.findings?.source ? (
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">{it.findings.source}</div>
                    ) : null}
                  </div>
                  <div className="mt-1 text-sm text-gray-900 dark:text-white">
                    {it.findings?.chiefComplaint ? (
                      <span className="font-semibold">{it.findings.chiefComplaint}</span>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-300">{t('findingsTimelineEntryNoCc')}</span>
                    )}
                  </div>
                  {Array.isArray(it.findings?.symptoms) && it.findings!.symptoms!.length ? (
                    <div className="mt-1 text-xs text-gray-700 dark:text-gray-200 truncate">
                      {t('findingsTimelineSymptoms')}: {it.findings!.symptoms!.slice(0, 8).join(', ')}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


