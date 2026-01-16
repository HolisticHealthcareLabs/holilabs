 'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Provider = 'gemini' | 'claude' | 'openai';

type ChatMsg = {
  role: 'user' | 'assistant';
  content: string;
};

export function CDSChatDrawer({
  open,
  onClose,
  patientId,
  patientName,
  transcriptText,
  soapSummary,
  attachments,
  onRemoveAttachment,
  embedded = false,
}: {
  open: boolean;
  onClose: () => void;
  patientId?: string;
  patientName?: string;
  transcriptText?: string;
  soapSummary?: {
    chiefComplaint?: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  } | null;
  attachments?: Array<{
    id: string;
    scope: 'patient' | 'session';
    name: string;
    kind?: string;
    addedAt?: string;
    previewUrl?: string;
    mimeType?: string;
  }>;
  onRemoveAttachment?: (id: string) => void;
  embedded?: boolean;
}) {
  const [provider, setProvider] = useState<Provider>('gemini');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  // IMPORTANT: keep the textbox *uncontrolled* to avoid losing keystrokes/focus on re-renders
  // (this was causing "can't type properly" reports when background state updates occurred).
  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const [draftNonEmpty, setDraftNonEmpty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contextSummary, setContextSummary] = useState<any>(null);
  const [contextError, setContextError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chat' | 'soap'>('chat');
  const lastSyncedTranscriptRef = useRef<string>('');
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const importMenuRef = useRef<HTMLDivElement | null>(null);

  // Gemini-style "plus" imports (explicit toggles)
  const [includeLabs, setIncludeLabs] = useState(false);
  const [includeImaging, setIncludeImaging] = useState(false);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [dossierSummary, setDossierSummary] = useState<string>('');
  const [dossierError, setDossierError] = useState<string>('');

  const transcriptSnippet = useMemo(() => {
    const t = (transcriptText || '').trim();
    if (!t) return '';
    return t.length > 1200 ? `${t.slice(-1200)}` : t;
  }, [transcriptText]);

  useEffect(() => {
    if (!open) return;
    setContextError('');

    // Prefill prompt with latest context + transcript for “during interview” workflow.
    (async () => {
      if (!patientId) return;
      try {
        // Prefer rich cached context (vitals/meds/labs) for clinician view.
        const res = await fetch(
          `/api/patients/${patientId}/context?accessReason=DIRECT_PATIENT_CARE`,
          { cache: 'no-store' }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load patient context');
        setContextSummary(data?.data || null);
      } catch (e: any) {
        setContextError(e?.message || 'Failed to load patient context');
      }
    })();
  }, [open, patientId]);

  // Close import menu on outside click
  useEffect(() => {
    if (!importMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!importMenuRef.current) return;
      if (!importMenuRef.current.contains(e.target as Node)) {
        setImportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [importMenuOpen]);

  const fetchDossierSummary = async () => {
    if (!patientId) return;
    setDossierError('');
    try {
      const res = await fetch(`/api/patients/${patientId}/dossier`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load patient dossier');
      const sum = String(data?.data?.deidentifiedSummary || '');
      setDossierSummary(sum);
      if (!sum) {
        setDossierError('Patient dossier not ready yet. It will populate automatically in the background.');
      }
    } catch (e: any) {
      setDossierError(e?.message || 'Failed to load patient dossier');
    }
  };

  const formatContext = (ctx: any) => {
    if (!ctx) return '[loading…]';
    const demo = ctx?.demographics || {};
    const vit = ctx?.vitals?.[0];
    const meds = Array.isArray(ctx?.medications) ? ctx.medications.slice(0, 6) : [];
    const allergies = Array.isArray(ctx?.allergies) ? ctx.allergies.slice(0, 6) : [];
    const labs = Array.isArray(ctx?.labResults) ? ctx.labResults.slice(0, 5) : [];

    const lines: string[] = [];
    if (demo?.tokenId) lines.push(`Patient token: ${demo.tokenId}`);
    if (demo?.ageBand) lines.push(`Age band: ${demo.ageBand}`);
    if (demo?.gender) lines.push(`Gender: ${demo.gender}`);
    if (vit) {
      lines.push(`Latest vitals: BP ${vit.systolicBP ?? '—'}/${vit.diastolicBP ?? '—'} mmHg, HR ${vit.heartRate ?? '—'} bpm, Temp ${vit.temperature ?? '—'} °C, SpO₂ ${vit.oxygenSaturation ?? '—'}%`);
    }
    if (meds.length) lines.push(`Meds: ${meds.map((m: any) => m.name || m).join(', ')}`);
    if (allergies.length) lines.push(`Allergies: ${allergies.map((a: any) => a.allergen || a).join(', ')}`);
    if (labs.length) lines.push(`Recent labs: ${labs.map((l: any) => `${l.testName || 'Lab'}=${l.value ?? ''}${l.unit ?? ''}`).join(' | ')}`);
    return lines.join('\n');
  };

  const formatAttachments = (items?: Array<{ scope: 'patient' | 'session'; name: string; kind?: string; addedAt?: string }>) => {
    if (!items || items.length === 0) return '—';
    return items
      .slice(0, 12)
      .map((a) => {
        const when = a.addedAt ? new Date(a.addedAt).toLocaleString() : '';
        const kind = a.kind ? ` (${a.kind})` : '';
        return `- [${a.scope.toUpperCase()}] ${a.name}${kind}${when ? ` • ${when}` : ''}`;
      })
      .join('\n');
  };

  const isImageLike = (a: any) => {
    const u = String(a?.previewUrl || '').toLowerCase();
    const t = String(a?.mimeType || '').toLowerCase();
    return (
      t.startsWith('image/') ||
      u.startsWith('data:image') ||
      u.endsWith('.png') ||
      u.endsWith('.jpg') ||
      u.endsWith('.jpeg') ||
      u.endsWith('.webp') ||
      u.endsWith('.gif') ||
      u.endsWith('.svg')
    );
  };

  const isPdfLike = (a: any) => {
    const u = String(a?.previewUrl || '').toLowerCase();
    const t = String(a?.mimeType || '').toLowerCase();
    return t === 'application/pdf' || u.endsWith('.pdf') || u.startsWith('data:application/pdf');
  };

  useEffect(() => {
    if (!open) return;
    // Keep the clinician-visible input clean. We attach context/soap/transcript/attachments
    // automatically at send-time so the UI doesn't look like a wall of template text.
    if (draftRef.current) {
      draftRef.current.value = '';
    }
    setDraftNonEmpty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const syncTranscriptIntoPrompt = () => {
    const full = (transcriptText || '').trim();
    const last = lastSyncedTranscriptRef.current;
    let delta = '';
    if (full && last && full.startsWith(last)) {
      delta = full.slice(last.length).trim();
    }
    // If we can't compute a clean delta (e.g. transcript reflow), fall back to snippet.
    const payload = delta
      ? `\n\n(Transcript — new since last sync)\n${delta}\n`
      : `\n\n(Transcript — latest snippet)\n${transcriptSnippet || '—'}\n`;
    if (full) lastSyncedTranscriptRef.current = full;
    const el = draftRef.current;
    if (!el) return;
    el.value = `${(el.value || '').trim()}${payload}`.trim();
    setDraftNonEmpty(Boolean(el.value.trim()));
    try {
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    } catch {}
  };

  const buildHiddenContext = () => {
    const imports: string[] = [];
    if (includeHistory) {
      imports.push(
        `PATIENT HISTORY (de-identified dossier):\n${dossierSummary || (dossierError ? `[${dossierError}]` : '[loading…]')}`
      );
    }
    if (includeLabs) {
      imports.push(`LABS (imported):\n${formatContext(contextSummary)}`);
    }
    if (includeImaging) {
      // For now, include whatever imaging-related artifacts exist in "attachments selected".
      // This keeps the behavior explicit and avoids silently expanding scope.
      imports.push(`IMAGING (imported):\n${formatAttachments(attachments)}`);
    }

    return (
      `CDS request for${patientName ? ` ${patientName}` : ' current patient'}.\n\n` +
      (imports.length ? `IMPORTS (explicit):\n${imports.join('\n\n')}\n\n` : '') +
      `CONTEXT (structured):\n${formatContext(contextSummary)}\n\n` +
      `ATTACHMENTS (selected):\n${formatAttachments(attachments)}\n\n` +
      `SOAP SUMMARY (live):\n` +
      `CC: ${soapSummary?.chiefComplaint || '—'}\n` +
      `S: ${soapSummary?.subjective || '—'}\n` +
      `O: ${soapSummary?.objective || '—'}\n` +
      `A: ${soapSummary?.assessment || '—'}\n` +
      `P: ${soapSummary?.plan || '—'}\n\n` +
      `LATEST TRANSCRIPT (snippet):\n${transcriptSnippet || '—'}\n\n` +
      `TASK: Provide (1) ranked differential (2) red flags (3) 3 clarifying questions (4) recommended workup (5) initial plan.\n\n`
    );
  };

  async function send() {
    const clinicianText = (draftRef.current?.value || '').trim();
    if (!clinicianText) return;
    setLoading(true);
    const payload = `${buildHiddenContext()}Doctor question:\n${clinicianText}`;
    const nextMessages: ChatMsg[] = [...messages, { role: 'user', content: payload }];
    setMessages(nextMessages);
    if (draftRef.current) draftRef.current.value = '';
    setDraftNonEmpty(false);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          patientId,
          messages: nextMessages,
          temperature: 0.4,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'AI request failed');
      const text = data?.data?.message || '';
      setMessages((prev) => [...prev, { role: 'assistant', content: text }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${e?.message || 'Failed to fetch'}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const Shell = ({
    children,
  }: {
    children: React.ReactNode;
  }) =>
    embedded ? (
      <div className="backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-white/30 dark:border-gray-700/50 shadow-xl overflow-hidden flex flex-col min-h-0 max-h-[70vh]">
        {children}
      </div>
    ) : (
      <div className="fixed inset-0 z-[120]">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col min-h-0">
          {children}
        </div>
      </div>
    );

  return (
    <Shell>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Clinical Decision Support Agent</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {patientName ? `Patient: ${patientName}` : 'Patient selected in Co-Pilot'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
          >
            Close
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
          >
            <option value="gemini">Google (Gemini) — default</option>
            <option value="claude">Claude (Anthropic)</option>
            <option value="openai">OpenAI</option>
          </select>
          {/* Gemini-style import [+] */}
          <div ref={importMenuRef} className="relative">
            <button
              onClick={() => setImportMenuOpen((v) => !v)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
              title="Import patient artifacts"
              aria-label="Import patient artifacts"
            >
              +
            </button>
            {importMenuOpen ? (
              <div className="absolute left-0 top-full mt-2 w-64 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden z-[200]">
                <button
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={async () => {
                    setIncludeLabs(true);
                    setImportMenuOpen(false);
                  }}
                >
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Import labs</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Recent lab results (from patient context)</div>
                </button>
                <button
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
                  onClick={async () => {
                    setIncludeImaging(true);
                    setImportMenuOpen(false);
                  }}
                >
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Import imaging</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Selected imaging attachments</div>
                </button>
                <button
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
                  onClick={async () => {
                    setIncludeHistory(true);
                    setImportMenuOpen(false);
                    await fetchDossierSummary();
                  }}
                >
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Import patient history</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">De‑identified dossier summary</div>
                </button>
              </div>
            ) : null}
          </div>

          {/* Small chips showing what’s included */}
          <div className="flex items-center gap-2">
            {includeLabs ? (
              <span className="text-[11px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                Labs ✓
              </span>
            ) : null}
            {includeImaging ? (
              <span className="text-[11px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                Imaging ✓
              </span>
            ) : null}
            {includeHistory ? (
              <span className="text-[11px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                History ✓
              </span>
            ) : null}
          </div>
          <button
            onClick={syncTranscriptIntoPrompt}
            className="ml-auto px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
            title="Sync latest transcript snippet into the prompt"
          >
            Sync transcript
          </button>
          {contextError && <span className="text-xs text-red-600">{contextError}</span>}
        </div>

        {/* Attachment previews (OpenAI/Gemini-style) */}
        {attachments && attachments.length > 0 && (
          <div className="px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                Attachments ({Math.min(attachments.length, 12)})
              </div>
              {onRemoveAttachment && (
                <button
                  onClick={() => attachments.slice(0, 12).forEach((a) => onRemoveAttachment(a.id))}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {attachments.slice(0, 12).map((a) => (
                <div
                  key={a.id}
                  className="relative w-32 h-20 flex-shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden"
                  title={`${a.scope.toUpperCase()}: ${a.name}${a.kind ? ` (${a.kind})` : ''}`}
                >
                  {a.previewUrl && isImageLike(a) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.previewUrl}
                      alt={a.name}
                      className="w-full h-full object-cover"
                      onClick={() => a.previewUrl && window.open(a.previewUrl, '_blank')}
                      style={{ cursor: a.previewUrl ? 'pointer' : 'default' }}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-200 px-2 text-center"
                      onClick={() => a.previewUrl && window.open(a.previewUrl, '_blank')}
                      style={{ cursor: a.previewUrl ? 'pointer' : 'default' }}
                    >
                      {isPdfLike(a) ? 'PDF' : (a.kind || 'FILE')}
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <div className="text-[10px] text-white font-semibold truncate">{a.name}</div>
                    <div className="text-[10px] text-white/80 truncate">
                      {a.scope === 'patient' ? 'Patient profile' : 'Session'}
                    </div>
                  </div>

                  {onRemoveAttachment && (
                    <button
                      onClick={() => onRemoveAttachment(a.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 text-white text-xs flex items-center justify-center"
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="px-4 pt-4">
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-2 text-sm font-semibold rounded-lg ${
                activeTab === 'chat' ? 'bg-white dark:bg-gray-900 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('soap')}
              className={`px-3 py-2 text-sm font-semibold rounded-lg ${
                activeTab === 'soap' ? 'bg-white dark:bg-gray-900 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              SOAP Summary
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {activeTab === 'soap' ? (
            <div className="space-y-3">
              {(['chiefComplaint', 'subjective', 'objective', 'assessment', 'plan'] as const).map((k) => (
                <div key={k} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                    {k === 'chiefComplaint' ? 'Chief Complaint' : k}
                  </div>
                  <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {(soapSummary as any)?.[k] || '—'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
          {messages.length === 0 ? (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Tip: ask for “top 5 differentials + red flags + 3 clarifying questions” while you interview.
            </div>
          ) : null}

          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === 'user'
                  ? 'ml-auto max-w-[90%] rounded-2xl bg-blue-600 text-white p-3 text-sm whitespace-pre-wrap'
                  : 'mr-auto max-w-[90%] rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white p-3 text-sm whitespace-pre-wrap'
              }
            >
              {m.content}
            </div>
          ))}
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {/* Prompt engineering preview (optional). This shows what we will send *around* the clinician's question. */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowPromptPreview((v) => !v)}
              className="text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
            >
              {showPromptPreview ? 'Hide prompt preview' : 'Show prompt preview'}
            </button>
            {showPromptPreview ? (
              <button
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(buildHiddenContext());
                  } catch {}
                }}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Copy
              </button>
            ) : null}
          </div>

          {showPromptPreview ? (
            <pre className="w-full max-h-48 overflow-auto p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-[11px] leading-4 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {buildHiddenContext()}
            </pre>
          ) : null}

          <textarea
            ref={draftRef}
            onChange={(e) => setDraftNonEmpty(Boolean(e.target.value.trim()))}
            onKeyDown={(e) => {
              // Chat UX: Enter sends, Shift+Enter inserts newline
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!loading && draftNonEmpty) {
                  void send();
                }
              }
            }}
            className="w-full h-32 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            placeholder="Ask a clinical question…"
          />
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (draftRef.current) draftRef.current.value = '';
                setDraftNonEmpty(false);
              }}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
            >
              Clear
            </button>
            <button
              disabled={loading || !draftNonEmpty}
              onClick={send}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
    </Shell>
  );
}


