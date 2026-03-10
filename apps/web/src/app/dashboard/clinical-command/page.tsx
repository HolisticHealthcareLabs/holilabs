'use client';

import { useEffect, useState, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Step } from 'react-joyride';
import { Stethoscope, Star, RefreshCw, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TranscriptPane, type Segment } from './_components/TranscriptPane';
import { SoapNotePane } from './_components/SoapNotePane';
import { PatientContextBar, type Patient } from './_components/PatientContextBar';
import type { CDSCard, ModelId, ModelConfig } from './_components/CdssAlertsPane';
import type { ConsentRecord, ClinicalEntity } from '../../../../../../packages/shared-kernel/src/types/clinical-ui';

const CdssAlertsPane = lazy(() => import('./_components/CdssAlertsPane').then(m => ({ default: m.CdssAlertsPane })));
const PatientHandoutModal = lazy(() => import('./_components/PatientHandoutModal').then(m => ({ default: m.PatientHandoutModal })));
const SignAndBillModal = lazy(() => import('./_components/SignAndBillModal').then(m => ({ default: m.SignAndBillModal })));
const ContextDrawer = lazy(() => import('./_components/ContextDrawer').then(m => ({ default: m.ContextDrawer })));

// Lazy-load react-joyride — browser-only, never rendered until after mount.
// Using React.lazy + isMounted guard instead of next/dynamic({ssr:false}) to avoid
// the BailoutToCSR Suspense-boundary hydration error in Next.js 14 App Router.
const JoyrideClient = lazy(() => import('react-joyride'));

// ─────────────────────────────────────────────────────────────────────────────
// Spotlight tour steps
// ─────────────────────────────────────────────────────────────────────────────

const TOUR_STEPS: Step[] = [
  {
    target:        '#live-meeting-notes',
    title:         'Live AI Scribe',
    content:       'Real-time transcription with automatic PHI de-identification. Every name, date, and identifier is masked before storage — HIPAA & LGPD compliant by design.',
    disableBeacon: true,
    placement:     'right',
  },
  {
    target:    '#soap-note-pane',
    title:     'Auto SOAP Generation',
    content:   'The AI auto-populates structured Subjective, Objective, Assessment, and Plan fields as the conversation progresses. Sign & Bill when the encounter is complete.',
    placement: 'left',
  },
  {
    target:    '#cdss-pane',
    title:     'Intelligent Clinical Partner',
    content:   'CDSS analyses the full transcript against clinical guidelines and flags drug interactions, contraindications, and protocol gaps. Ask follow-up questions in the chat.',
    placement: 'left',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Rich demo transcript — naturalized phrasing, LATAM clinical scenario
// ─────────────────────────────────────────────────────────────────────────────

const TRANSCRIPT_CHUNKS: Segment[] = [
  { kind: 'text', text: 'Doctor: Good morning, ' },
  { kind: 'phi',  label: 'PATIENT_NAME' },
  { kind: 'text', text: '. Just for my records, I have your date of birth as ' },
  { kind: 'phi',  label: 'DOB' },
  { kind: 'text', text: '. Please describe what brings you in today.\n' },
  { kind: 'text', text: "Patient: Doctor, for the past five days I've had chest tightness and real shortness of breath. It gets worse when I climb stairs or walk briskly. I also noticed my ankles are quite swollen.\n" },
  { kind: 'text', text: 'Doctor: Any prior history of heart disease? I see CKD Stage 3 and Type 2 Diabetes in your records.\n' },
  { kind: 'text', text: 'Patient: My father had a heart attack at 65. I\'ve been on dialysis watch for two years. Symptoms started around ' },
  { kind: 'phi',  label: 'ONSET_DATE' },
  { kind: 'text', text: '.\n' },
  { kind: 'text', text: 'Doctor: Checking vitals now. BP is 162/95 mmHg — that\'s well above target. HR 94 bpm, SpO2 93% on room air. Your Lisinopril 10mg clearly isn\'t controlling this adequately.\n' },
  { kind: 'text', text: 'Patient: I\'m also on Metformin 1000mg twice daily, Atorvastatin 40mg, Furosemide 40mg for the swelling, and low-dose Aspirin. My patient ID is ' },
  { kind: 'phi',  label: 'PATIENT_SSN' },
  { kind: 'text', text: '.\n' },
  { kind: 'text', text: 'Doctor: On auscultation: bibasilar crackles, possible S3 gallop. Pitting oedema 2+ bilateral. This presentation is concerning for acute decompensated heart failure, possibly ACS given the family history.\n' },
  { kind: 'text', text: 'Doctor: I\'m ordering urgent ECG, Troponin I series, BNP, CMP, and chest X-ray stat. We may need contrast angiography — I need to flag a concern about the Metformin given your kidney function.\n' },
  { kind: 'text', text: 'Patient: Is my Metformin a problem? My GP told me to keep taking it.\n' },
  { kind: 'text', text: 'Doctor: With eGFR below 45, Metformin and contrast dye together can cause lactic acidosis. We\'ll hold it before any contrast procedure. The CDSS will flag this automatically.\n' },
  // These final chunks contain raw PHI — maskPHI() catches them and renders cyan pills.
  { kind: 'text', text: '\nDoctor: I\'m documenting the encounter for James O\'Brien, dated 03/05/2026.' },
  { kind: 'text', text: '\nDoctor: Starting IV Furosemide 80mg now. Holding oral Metformin pending contrast clearance.' },
];

const STREAM_INTERVAL_MS = 1200;

// Ambient Audio Engine constants
const TAIL_DELAY_MS = 1500;
const MIN_TRANSCRIPT_WORDS = 10;

export type AmbientState =
  | 'idle'
  | 'recording'
  | 'finalizing_audio'
  | 'generating_soap'
  | 'completed'
  | 'error';

function countTranscriptWords(segs: Segment[]): number {
  return segs
    .filter((s): s is { kind: 'text'; text: string } => s.kind === 'text')
    .map((s) => s.text)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ClinicalCommandCenterPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── Deep link: auto-select patient from My Day schedule ─────────────────
  const incomingPatientId = searchParams.get('patientId');

  useEffect(() => {
    if (!incomingPatientId) return;
    // Clean the URL so the query param does not force re-selection on later navigations
    router.replace('/dashboard/clinical-command', { scroll: false });
  }, [incomingPatientId, router]);

  // ── Patient context ───────────────────────────────────────────────────────
  const [selectedPatient,  setSelectedPatient]  = useState<Patient | null>(null);
  const [patientResetKey,  setPatientResetKey]  = useState(0);

  // ── Ambient Audio Engine: Finite State Machine ───────────────────────────
  const [ambientState,  setAmbientState]  = useState<AmbientState>('idle');
  const [segments,      setSegments]      = useState<Segment[]>([]);
  const [soapError,     setSoapError]     = useState<string | null>(null);
  const [toastMessage,  setToastMessage]  = useState<string | null>(null);
  const chunkIndexRef    = useRef(0);
  const encounterIdRef   = useRef('');
  const segmentsRef      = useRef(segments);
  segmentsRef.current    = segments;
  const ambientStateRef  = useRef(ambientState);
  ambientStateRef.current = ambientState;

  const isRecording = ambientState === 'recording';

  // ── Model + workspace config ──────────────────────────────────────────────
  const [activeModel,  setActiveModel]  = useState<ModelId>('anthropic');
  const [modelConfigs, setModelConfigs] = useState<Partial<Record<ModelId, ModelConfig>>>({
    anthropic: { isConfigured: true, isActive: true },
  });

  // ── CDSS state ────────────────────────────────────────────────────────────
  const [cdssAlerts, setCdssAlerts] = useState<CDSCard[]>([]);
  const [isSyncing,  setIsSyncing]  = useState(false);
  const [syncError,  setSyncError]  = useState<string | null>(null);

  // ── LGPD Consent Ledger (RUTH: immutable audit heuristic) ───────────────
  const [patientConsent, setPatientConsent] = useState<ConsentRecord>({
    granted: false,
    timestamp: null,
    method: 'digital',
  });

  const grantConsent = useCallback((method: 'verbal' | 'digital') => {
    setPatientConsent({
      granted: true,
      timestamp: new Date().toISOString(),
      method,
    });
  }, []);

  const revokeConsent = useCallback(() => {
    setPatientConsent({ granted: false, timestamp: null, method: 'digital' });
  }, []);

  // ── Extracted Clinical Entities (ELENA: negative space heuristic) ──────
  const [extractedEntities, setExtractedEntities] = useState<ClinicalEntity[]>([]);

  const rejectEntity = useCallback((id: string) => {
    setExtractedEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: 'rejected' as const } : e)),
    );
  }, []);

  const restoreEntity = useCallback((id: string) => {
    setExtractedEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: 'active' as const } : e)),
    );
  }, []);

  // ── Context Drawer visibility ──────────────────────────────────────────
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);

  // ── Chat reset signal (Great Reset target) ────────────────────────────────
  const [resetSignal, setResetSignal] = useState(0);

  // ── Modal states ──────────────────────────────────────────────────────────
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isHandoutModalOpen, setIsHandoutModalOpen] = useState(false);

  // ── Tour state ────────────────────────────────────────────────────────────
  const [isTourRunning, setIsTourRunning] = useState(false);

  // ── Mount guard — prevents Joyride from rendering during SSR/hydration ────
  // This eliminates the BailoutToCSR Suspense-boundary hydration error that
  // next/dynamic({ssr:false}) produces in Next.js 14 App Router.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // ── Modular layout preference (persisted in localStorage) ─────────────────
  type LayoutMode = 'default' | 'transcript-right';
  const LAYOUT_KEY = 'clinical-command-layout';

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('default');

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAYOUT_KEY) as LayoutMode | null;
      if (stored) setLayoutMode(stored);
    } catch { /* ignore */ }
  }, []);

  const cycleLayout = useCallback(() => {
    setLayoutMode((prev) => {
      const next: LayoutMode = prev === 'default' ? 'transcript-right' : 'default';
      try { localStorage.setItem(LAYOUT_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // ── Auto-sync guard ───────────────────────────────────────────────────────
  const hasAutoSyncedRef = useRef(false);

  // ── Fetch workspace + model configs on mount ──────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const wsRes = await fetch('/api/workspace/current');
        if (!wsRes.ok || cancelled) return;
        const wsData = await wsRes.json();
        const wsId: string | null = wsData.workspaceId ?? null;
        if (!wsId || cancelled) return;

        const cfgRes = await fetch(`/api/workspace/llm-config?workspaceId=${wsId}`);
        if (!cfgRes.ok || cancelled) return;
        const cfgData = await cfgRes.json();

        const map: Partial<Record<ModelId, ModelConfig>> = {};
        for (const cfg of cfgData.configs ?? []) {
          map[cfg.provider as ModelId] = {
            isConfigured: cfg.isConfigured,
            isActive:     cfg.isActive,
          };
        }
        if (!cancelled) setModelConfigs(map);
      } catch {
        // Demo default stays in place.
      }
    }

    loadConfig();
    return () => { cancelled = true; };
  }, []);

  // ── Transcript streaming simulation ──────────────────────────────────────
  // Keeps streaming during both 'recording' and 'finalizing_audio' to allow
  // any in-flight audio chunks to arrive before the word-count guardrail fires.
  const isStreaming = ambientState === 'recording' || ambientState === 'finalizing_audio';

  useEffect(() => {
    if (!isStreaming) return;

    const id = setInterval(() => {
      if (chunkIndexRef.current >= TRANSCRIPT_CHUNKS.length) {
        clearInterval(id);
        if (ambientStateRef.current === 'recording') {
          setAmbientState('finalizing_audio');
        }
        return;
      }
      const chunk = TRANSCRIPT_CHUNKS[chunkIndexRef.current];
      setSegments((prev) => [...prev, chunk]);
      chunkIndexRef.current += 1;
    }, STREAM_INTERVAL_MS);

    return () => clearInterval(id);
  }, [isStreaming]);

  // ── Demo entity extraction: drip-feed entities as transcript progresses ─
  const DEMO_ENTITY_SCHEDULE: Record<number, ClinicalEntity[]> = useMemo(() => ({
    3: [
      { id: 'ent-001', category: 'SNOMED', code: '29857009', label: 'Chest tightness', confidence: 'high', status: 'active' },
    ],
    5: [
      { id: 'ent-002', category: 'ICD-10', code: 'N18.3', label: 'CKD Stage 3', confidence: 'high', status: 'active' },
      { id: 'ent-003', category: 'ICD-10', code: 'E11.9', label: 'Type 2 Diabetes Mellitus', confidence: 'high', status: 'active' },
    ],
    7: [
      { id: 'ent-004', category: 'SNOMED', code: '23583003', label: 'Bilateral ankle oedema', confidence: 'medium', status: 'active' },
    ],
    9: [
      { id: 'ent-005', category: 'ATC', code: 'A10BA02', label: 'Metformin 1000mg', confidence: 'high', status: 'active' },
      { id: 'ent-006', category: 'ATC', code: 'C09AA03', label: 'Lisinopril 10mg', confidence: 'high', status: 'active' },
      { id: 'ent-007', category: 'ATC', code: 'C03CA01', label: 'Furosemide 40mg', confidence: 'medium', status: 'active' },
      { id: 'ent-008', category: 'ATC', code: 'C10AA05', label: 'Atorvastatin 40mg', confidence: 'high', status: 'active' },
      { id: 'ent-009', category: 'ATC', code: 'B01AC06', label: 'Aspirin (low-dose)', confidence: 'medium', status: 'active' },
    ],
    11: [
      { id: 'ent-010', category: 'SNOMED', code: '67569000', label: 'Bibasilar pulmonary crackles', confidence: 'high', status: 'active' },
      { id: 'ent-011', category: 'ICD-10', code: 'I50.9', label: 'Heart failure, unspecified', confidence: 'high', status: 'active' },
    ],
    14: [
      { id: 'ent-012', category: 'LOINC', code: '10839-9', label: 'Troponin I', confidence: 'high', status: 'active' },
      { id: 'ent-013', category: 'LOINC', code: '42637-9', label: 'BNP', confidence: 'high', status: 'active' },
      { id: 'ent-014', category: 'LOINC', code: '33914-3', label: 'eGFR', confidence: 'medium', status: 'active' },
    ],
  }), []);

  const injectedEntityIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const schedule = DEMO_ENTITY_SCHEDULE[segments.length];
    if (!schedule) return;

    const newEntities = schedule.filter(
      (e) => !injectedEntityIdsRef.current.has(e.id),
    );
    if (newEntities.length === 0) return;

    for (const e of newEntities) injectedEntityIdsRef.current.add(e.id);
    setExtractedEntities((prev) => [...prev, ...newEntities]);
  }, [segments.length, DEMO_ENTITY_SCHEDULE]);

  // ── FSM Effect: finalizing_audio -> word-count guardrail ─────────────────
  // After the tail delay, checks transcript length. If fewer than
  // MIN_TRANSCRIPT_WORDS, returns to idle with a toast warning.
  // Otherwise, transitions to generating_soap for automatic SOAP trigger.
  useEffect(() => {
    if (ambientState !== 'finalizing_audio') return;

    const timeoutId = setTimeout(() => {
      const wordCount = countTranscriptWords(segmentsRef.current);
      if (wordCount < MIN_TRANSCRIPT_WORDS) {
        setAmbientState('idle');
        setToastMessage('Transcript too short to generate notes.');
      } else {
        setAmbientState('generating_soap');
      }
    }, TAIL_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [ambientState]);

  // ── FSM Effect: generating_soap -> fire SOAP generation API ────────────
  // Zero-click trigger: fires automatically when the transcript is valid.
  // Falls back to demo content if the API endpoint is not yet deployed.
  useEffect(() => {
    if (ambientState !== 'generating_soap') return;

    let cancelled = false;
    const controller = new AbortController();
    const SOAP_TIMEOUT_MS = 20_000;
    const timeoutId = setTimeout(() => controller.abort(), SOAP_TIMEOUT_MS);

    (async () => {
      const transcript = segmentsRef.current
        .filter((s): s is { kind: 'text'; text: string } => s.kind === 'text')
        .map((s) => s.text)
        .join('');

      try {
        const res = await fetch('/api/soap/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            transcript,
            encounterId: encounterIdRef.current,
            patientId: selectedPatient?.id ?? 'demo-patient-001',
          }),
        });

        clearTimeout(timeoutId);
        if (cancelled) return;

        if (res.ok) {
          setAmbientState('completed');
        } else {
          // API returned non-200: graceful demo fallback
          await new Promise((r) => setTimeout(r, 2200));
          if (!cancelled) setAmbientState('completed');
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (cancelled) return;

        if (err instanceof Error && err.name === 'AbortError') {
          setSoapError(
            'SOAP generation timed out. Your transcript has been preserved.'
          );
          setAmbientState('error');
        } else {
          // Network error or endpoint not deployed: demo fallback
          await new Promise((r) => setTimeout(r, 2200));
          if (!cancelled) setAmbientState('completed');
        }
      }
    })();

    return () => { cancelled = true; controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambientState]);

  // ── FSM Effect: completed -> trigger CDSS sync ─────────────────────────
  useEffect(() => {
    if (ambientState !== 'completed') return;
    if (!hasAutoSyncedRef.current && selectedPatient) {
      hasAutoSyncedRef.current = true;
      handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambientState, selectedPatient]);

  // ── Toast auto-dismiss ─────────────────────────────────────────────────
  useEffect(() => {
    if (!toastMessage) return;
    const id = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(id);
  }, [toastMessage]);

  function toggleRecord() {
    if (ambientState === 'recording') {
      setAmbientState('finalizing_audio');
    } else if (
      ambientState === 'idle' ||
      ambientState === 'completed' ||
      ambientState === 'error'
    ) {
      setSegments([]);
      chunkIndexRef.current = 0;
      hasAutoSyncedRef.current = false;
      setSoapError(null);
      setToastMessage(null);
      encounterIdRef.current = `enc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setAmbientState('recording');
    }
  }

  function handleRetryGeneration() {
    setSoapError(null);
    setAmbientState('generating_soap');
  }

  // ── Live Sync → CDSS endpoint ─────────────────────────────────────────────

  const DEMO_CDSS_CARDS: CDSCard[] = [
    {
      summary:   'Drug Interaction: Metformin + Contrast Dye (CKD Stage 3)',
      detail:    'eGFR < 45 mL/min: hold Metformin 48 h before contrast-enhanced angiography to prevent lactic acidosis. Risk of contrast-induced nephropathy is elevated.',
      indicator: 'critical',
      source:    { label: 'CDSS Rule Engine' },
    },
    {
      summary:   'Drug Interaction: Furosemide + Lisinopril',
      detail:    'Monitor for first-dose hypotension and acute kidney injury. Maintain adequate hydration and check serum electrolytes.',
      indicator: 'warning',
      source:    { label: 'CDSS Rule Engine' },
    },
    {
      summary:   'BP Advisory: 162/95 mmHg — Exceeds JNC-8 Target',
      detail:    'Current reading exceeds goal of < 140/90 mmHg despite active Lisinopril therapy. Consider dose escalation or adding amlodipine.',
      indicator: 'info',
      source:    { label: 'CDSS Rule Engine' },
    },
  ];

  async function handleSync() {
    setIsSyncing(true);
    setSyncError(null);

    const transcriptText = segments
      .filter((s) => s.kind === 'text')
      .map((s) => (s as { kind: 'text'; text: string }).text)
      .join('');

    // Hard timeout circuit breaker — abort the fetch if the backend hasn't
    // responded within 15 s to prevent isSyncing from staying true indefinitely.
    const SYNC_HARD_TIMEOUT_MS = 15_000;
    const controller  = new AbortController();
    const timeoutId   = setTimeout(() => controller.abort(), SYNC_HARD_TIMEOUT_MS);

    try {
      const res = await fetch('/api/cds/hooks/medication-prescribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  controller.signal,
        body: JSON.stringify({
          hookInstance: `scribe-${Date.now()}`,
          hook:         'medication-prescribe',
          context: {
            patientId:   selectedPatient?.id ?? 'demo-patient-001',
            encounterId: 'demo-encounter-001',
            userId:      'demo-user',
            transcript:  transcriptText,
            medications: [
              {
                code: {
                  coding: [
                    {
                      system:  'http://www.nlm.nih.gov/research/umls/rxnorm',
                      code:    '860975',
                      display: 'Metformin 500 MG',
                    },
                  ],
                },
              },
            ],
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCdssAlerts(data.cards?.length ? data.cards : DEMO_CDSS_CARDS);
      } else {
        setCdssAlerts(DEMO_CDSS_CARDS);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setSyncError('Sync timed out after 15 s — CDSS did not respond. Using cached alerts.');
      }
      setCdssAlerts(DEMO_CDSS_CARDS);
    } finally {
      clearTimeout(timeoutId);
      setIsSyncing(false);
    }
  }

  // ── The Great Reset: called after billing claim is approved ─────────────
  function handleBillingComplete() {
    setAmbientState('idle');
    setSegments([]);
    chunkIndexRef.current = 0;
    hasAutoSyncedRef.current = false;
    injectedEntityIdsRef.current.clear();
    encounterIdRef.current = '';
    setCdssAlerts([]);
    setSyncError(null);
    setSoapError(null);
    setToastMessage(null);
    setResetSignal((s) => s + 1);
    setSelectedPatient(null);
    setPatientResetKey((k) => k + 1);
    setIsBillingModalOpen(false);
    setPatientConsent({ granted: false, timestamp: null, method: 'digital' });
    setExtractedEntities([]);
    setIsContextDrawerOpen(false);
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-slate-900">
      {/* Joyride spotlight tour — rendered only after mount (isMounted guard) so
          server HTML and first client render are identical (both null).
          Wrapped in Suspense because React.lazy requires it. */}
      {isMounted && (
        <Suspense fallback={null}>
          <JoyrideClient
            run={isTourRunning}
            steps={TOUR_STEPS}
            continuous
            showSkipButton
            spotlightClicks={false}
            disableOverlayClose
            callback={({ status }: { status: string }) => {
              if (status === 'finished' || status === 'skipped') {
                setIsTourRunning(false);
              }
            }}
            styles={{
              options: {
                primaryColor:    '#22d3ee',
                backgroundColor: '#0f172a',
                textColor:       '#e2e8f0',
                arrowColor:      '#0f172a',
                zIndex:          10000,
              },
            }}
          />
        </Suspense>
      )}

      {/* ── Modals (lazy-loaded, rendered at root to avoid z-index conflicts) */}
      <Suspense fallback={null}>
        <PatientHandoutModal
          isOpen={isHandoutModalOpen}
          onClose={() => setIsHandoutModalOpen(false)}
        />
      </Suspense>
      <Suspense fallback={null}>
        <SignAndBillModal
          isOpen={isBillingModalOpen}
          onClose={() => setIsBillingModalOpen(false)}
          onComplete={handleBillingComplete}
          soapNote=""
          transcript={segments
            .filter((s) => s.kind === 'text')
            .map((s) => (s as { kind: 'text'; text: string }).text)
            .join(' ')}
          patientData={selectedPatient ? {
            age: selectedPatient.dob
              ? Math.floor((Date.now() - new Date(selectedPatient.dob).getTime()) / 31557600000)
              : undefined,
          } : undefined}
        />
      </Suspense>

      {/* ── Context Drawer (Hallucination Shield) ─────────────────────────── */}
      <Suspense fallback={null}>
        <ContextDrawer
          isOpen={isContextDrawerOpen}
          onClose={() => setIsContextDrawerOpen(false)}
          entities={extractedEntities}
          onRejectEntity={rejectEntity}
          onRestoreEntity={restoreEntity}
        />
      </Suspense>

      {/* ── Top header ─────────────────────────────────────────────────────── */}
      <header className="
        flex-shrink-0 px-6 py-4 border-b flex items-center justify-between
        border-slate-200 dark:border-slate-800
      ">
        <div>
          <h1 className="font-semibold text-base flex items-center gap-2
                         text-slate-900 dark:text-white">
            <Stethoscope className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            Clinical Command Center
          </h1>
          <p className="text-xs mt-0.5 text-slate-500">
            Live Transcription · Ambient SOAP · Co-Pilot
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Context Drawer toggle */}
          <button
            onClick={() => setIsContextDrawerOpen((o) => !o)}
            title="Toggle Clinical Context Drawer"
            aria-label="Toggle Clinical Context Drawer"
            className={`
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
              border transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
              ${isContextDrawerOpen
                ? 'text-cyan-600 dark:text-cyan-400 border-cyan-400/50 dark:border-cyan-400/40 bg-cyan-50/50 dark:bg-cyan-400/5'
                : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-400/40 dark:hover:border-cyan-400/30'
              }
            `}
          >
            <Layers className="w-3 h-3" />
            Context
            {extractedEntities.filter((e) => e.status === 'active').length > 0 && (
              <span className="
                text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none
                bg-cyan-100 dark:bg-cyan-500/20
                text-cyan-700 dark:text-cyan-400
              ">
                {extractedEntities.filter((e) => e.status === 'active').length}
              </span>
            )}
          </button>

          {/* Layout toggle: cycles pane arrangement, persisted to localStorage */}
          <button
            onClick={cycleLayout}
            title={layoutMode === 'default' ? 'Switch to transcript-right layout' : 'Switch to default layout'}
            aria-label="Toggle workspace layout"
            className="
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
              text-slate-500 dark:text-slate-400
              border border-slate-200 dark:border-slate-700
              hover:text-cyan-600 dark:hover:text-cyan-400
              hover:border-cyan-400/40 dark:hover:border-cyan-400/30
              transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
            "
          >
            <RefreshCw className="w-3 h-3" />
            Layout
          </button>

          {/* Quick Tour — premium outline style, in the page nav (not floating) */}
          <button
            onClick={() => setIsTourRunning(true)}
            className="
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              text-slate-600 dark:text-slate-300
              border border-slate-300 dark:border-slate-600
              hover:text-cyan-600 dark:hover:text-cyan-400
              hover:border-cyan-400/50 dark:hover:border-cyan-400/40
              hover:bg-cyan-50/50 dark:hover:bg-cyan-400/5
              transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
            "
            aria-label="Start product tour"
          >
            <Star className="w-3 h-3" />
            Quick Tour
          </button>

        </div>
      </header>

      {/* ── Patient context bar ─────────────────────────────────────────────── */}
      <PatientContextBar
        key={patientResetKey}
        onSelectPatient={setSelectedPatient}
        initialPatientId={incomingPatientId}
      />

      {/* ── Main split-pane layout ────────────────────────────────────────────
           Left col:  TranscriptPane (full height)   id: live-meeting-notes
           Right col: flex column split proportionally:
             • SoapNotePane   ~1/3 height              id: soap-note-pane
             • CdssAlertsPane ~2/3 height              id: cdss-pane
      ──────────────────────────────────────────────────────────────────────── */}
      {/*
        ── Main split-pane layout ────────────────────────────────────────────
        Layout modes (persisted to localStorage):
          'default'          → Transcript left  | SOAP + CDSS right
          'transcript-right' → SOAP + CDSS left | Transcript right
        framer-motion `layout` prop animates the position swap smoothly.
      */}
      <main className="flex-1 grid grid-cols-2 gap-4 p-4 min-h-0">
        {/* Transcript pane */}
        <motion.div
          layout
          id="live-meeting-notes"
          className={`min-h-0 ${layoutMode === 'transcript-right' ? 'order-2' : 'order-1'}`}
        >
          <TranscriptPane
            segments={segments}
            isRecording={isRecording}
            isFinalizing={ambientState === 'finalizing_audio'}
            onToggleRecord={toggleRecord}
            disabled={!selectedPatient || ambientState === 'generating_soap'}
            consentRecord={patientConsent}
            onGrantConsent={grantConsent}
            onRevokeConsent={revokeConsent}
          />
        </motion.div>

        {/* SOAP + CDSS column */}
        <motion.div
          layout
          className={`flex flex-col gap-4 min-h-0 ${layoutMode === 'transcript-right' ? 'order-1' : 'order-2'}`}
        >
          {/* SOAP Note — 1/3 of column height */}
          <div id="soap-note-pane" className="min-h-0 overflow-hidden" style={{ flex: '1 0 0' }}>
            <SoapNotePane
              segmentCount={segments.length}
              patientSelected={!!selectedPatient}
              onSignAndBill={() => setIsBillingModalOpen(true)}
              isGeneratingSoap={ambientState === 'generating_soap'}
              isCompleted={ambientState === 'completed'}
              soapError={soapError}
              onRetry={handleRetryGeneration}
            />
          </div>

          {/* CDSS — 2/3 of column height */}
          <div id="cdss-pane" className="min-h-0" style={{ flex: '2 0 0' }}>
            <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading CDSS...</div>}>
            <CdssAlertsPane
              activeModel={activeModel}
              modelConfigs={modelConfigs}
              onModelChange={setActiveModel}
              cdssAlerts={cdssAlerts}
              isSyncing={isSyncing}
              onSync={handleSync}
              syncError={syncError}
              patientSelected={!!selectedPatient}
              hasTranscript={segments.length > 0}
              selectedPatient={selectedPatient}
              transcript={segments
                .filter((s) => s.kind === 'text')
                .map((s) => (s as { kind: 'text'; text: string }).text)
                .join('')}
              onOpenHandout={() => setIsHandoutModalOpen(true)}
              resetSignal={resetSignal}
            />
            </Suspense>
          </div>
        </motion.div>
      </main>

      {/* Toast notification: word-count guardrail feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className="
              fixed bottom-6 left-1/2 -translate-x-1/2 z-50
              px-5 py-3 rounded-xl shadow-lg
              bg-amber-50 dark:bg-amber-900/90
              border border-amber-200 dark:border-amber-600/50
              text-amber-800 dark:text-amber-200
              text-sm font-medium
            "
            role="alert"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
