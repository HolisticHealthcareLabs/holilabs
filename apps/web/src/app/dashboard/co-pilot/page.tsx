'use client';

import { useState, useEffect, useRef, useCallback, useDeferredValue, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { ClinicalSessionProvider, useClinicalSession } from '@/contexts/ClinicalSessionContext';
import { useDroppable } from '@dnd-kit/core';
import { Switch } from '@/components/ui/Switch';
import AudioWaveform from '@/components/scribe/AudioWaveform';
import TranscriptViewer from '@/components/scribe/TranscriptViewer';
import SOAPNoteEditor from '@/components/scribe/SOAPNoteEditor';
import DiagnosisAssistant from '@/components/clinical/DiagnosisAssistant';
import { CoPilotIntegrationBubble } from '@/components/dashboard/CoPilotIntegrationBubble';
import { PatientConsentModal } from '@/components/co-pilot/PatientConsentModal';
import { CoPilotOnboarding } from '@/components/co-pilot/CoPilotOnboarding';
import { CDSChatDrawer } from '@/components/co-pilot/CDSChatDrawer';
import { formatPatientDisplayName, getInitials } from '@/lib/patients/name';
import { useDropzone } from 'react-dropzone';
import type { DocumentType } from '@prisma/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { ToastContainer } from '@/components/co-pilot/Toast';
import { extractMedicalEntities } from '@/lib/medical/terminology';
import { FindingsTimeline } from '@/components/co-pilot/FindingsTimeline';
import { ClinicalDisclosureModal } from '@/components/scribe/ClinicalDisclosureModal';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';

export const dynamic = 'force-dynamic';

// Droppable Tool Workspace Component
interface DroppableToolWorkspaceProps {
  chiefComplaint?: string;
  extractedSymptoms?: string[];
  patientId?: string;
}

function DroppableToolWorkspace({ chiefComplaint, extractedSymptoms, patientId }: DroppableToolWorkspaceProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'tool-workspace',
  });

  return (
    <div
      ref={setNodeRef}
      className={`backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-white/30 dark:border-gray-700/50 shadow-xl p-6 relative transition-all duration-300
        before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-blue-500/5 before:to-purple-500/5 before:pointer-events-none
        ${isOver ? 'ring-4 ring-blue-500/50 border-blue-500/50 shadow-2xl scale-[1.02]' : ''}`}
    >
      {/* Drop indicator when dragging */}
      {isOver && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-blue-500/90 text-white px-6 py-3 rounded-lg font-semibold shadow-lg">
            Drop tool here to activate
          </div>
        </div>
      )}

      {/* Diagnosis Assistant - Auto-filled from context */}
      <DiagnosisAssistantWrapper
        chiefComplaint={chiefComplaint}
        extractedSymptoms={extractedSymptoms || []}
        patientId={patientId}
      />
    </div>
  );
}

// Wrapper component to auto-fill DiagnosisAssistant from context
function DiagnosisAssistantWrapper({
  chiefComplaint,
  extractedSymptoms,
  patientId,
}: {
  chiefComplaint?: string;
  extractedSymptoms: string[];
  patientId?: string;
}) {

  return (
    <div className="space-y-4">
      {chiefComplaint && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 animate-pulse">
          <div className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase mb-1">
            ✨ Auto-filled from Scribe
          </div>
          <div className="text-sm text-gray-900 dark:text-white font-medium">
            Chief Complaint: {chiefComplaint}
          </div>
          {extractedSymptoms.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase mb-1">
                Extracted Symptoms:
              </div>
              <div className="flex flex-wrap gap-2">
                {extractedSymptoms.map((symptom, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-xs"
                  >
                    {symptom}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <DiagnosisAssistant
        embedded
        selectedPatientId={patientId}
        prefillChiefComplaint={chiefComplaint}
        prefillSymptoms={extractedSymptoms}
      />
    </div>
  );
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: string;
}

function CoPilotContent() {
  const { data: session } = useSession();
  const { t: tRaw } = useLanguage();
  const t = (key: string) => tRaw(`copilot.${key}`);
  const {
    state,
    updateTranscript,
    appendTranscript,
    updateLiveSoapNote,
    addExtractedSymptom,
    setSessionId,
    setIsRecording,
    setIsProcessing,
  } = useClinicalSession();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [useRealTimeMode, setUseRealTimeMode] = useState(true);
  const [cdsOpen, setCdsOpen] = useState(false);
  const [patientContext, setPatientContext] = useState<any>(null);
  const [vitalsEditing, setVitalsEditing] = useState(false);
  const [vitalsDraft, setVitalsDraft] = useState<any>({
    systolicBP: '',
    diastolicBP: '',
    heartRate: '',
    temperature: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
  });
  const [rightPanelTab, setRightPanelTab] = useState<'risk' | 'labs' | 'uploads'>('risk');
  const [riskScores, setRiskScores] = useState<any[] | null>(null);
  const [documents, setDocuments] = useState<any[] | null>(null);
  const [activity, setActivity] = useState<any[] | null>(null);
  const [uploadPendingFile, setUploadPendingFile] = useState<File | null>(null);
  const [uploadPendingType, setUploadPendingType] = useState<DocumentType>('OTHER');
  const [uploadScope, setUploadScope] = useState<'profile' | 'session'>('profile');
  const [uploadPendingPreviewUrl, setUploadPendingPreviewUrl] = useState<string | null>(null);
  const [uploadPendingPreviewKind, setUploadPendingPreviewKind] = useState<'image' | 'pdf' | 'file'>('file');
  const [sessionAttachments, setSessionAttachments] = useState<{ name: string; type: string; dataUrl: string }[]>([]);
  const [showAudioSourceModal, setShowAudioSourceModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showDisclosureModal, setShowDisclosureModal] = useState(false);
  const [audioSource, setAudioSource] = useState<'microphone' | 'system' | 'both'>('microphone');
  const [toolUsageTick, setToolUsageTick] = useState(0);
  const [toasts, setToasts] = useState<
    Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string; duration?: number }>
  >([]);
  const [cdsAttachments, setCdsAttachments] = useState<
    Array<{
      id: string;
      scope: 'patient' | 'session';
      name: string;
      kind?: string;
      addedAt?: string;
      previewUrl?: string;
      mimeType?: string;
    }>
  >([]);
  const [findingsTick, setFindingsTick] = useState(0);
  const [scribeAttention, setScribeAttention] = useState(false);
  const [scribeDebug, setScribeDebug] = useState<{
    socketConnected: boolean;
    chunksSent: number;
    lastTranscriptAt?: number;
    lastError?: string;
  }>({
    socketConnected: false,
    chunksSent: 0,
  });
  const [scribeCooldownUntilMs, setScribeCooldownUntilMs] = useState<number | null>(null);

  const isScribeCoolingDown = scribeCooldownUntilMs != null && Date.now() < scribeCooldownUntilMs;

  useEffect(() => {
    if (scribeCooldownUntilMs == null) return;
    const ms = Math.max(0, scribeCooldownUntilMs - Date.now());
    const t = setTimeout(() => setScribeCooldownUntilMs(null), ms);
    return () => clearTimeout(t);
  }, [scribeCooldownUntilMs]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastFindingsPersistMsRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);

  // Speech language preference for transcription (Deepgram).
  // V3: supports "auto" (detect on start) and persists clinician preference.
  const [speechLanguage, setSpeechLanguage] = useState<'auto' | 'en' | 'es' | 'pt'>('auto');
  const [detectedLanguage, setDetectedLanguage] = useState<'en' | 'es' | 'pt' | null>(null);
  const activeStreamLanguageRef = useRef<'en' | 'es' | 'pt'>('en');
  const detectPendingRef = useRef<boolean>(false);
  const detectStartedRef = useRef<boolean>(false);
  const prebufferRef = useRef<ArrayBuffer[]>([]);
  const prebufferBytesRef = useRef<number>(0);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('holi.speechLanguage');
      if (saved === 'auto' || saved === 'en' || saved === 'es' || saved === 'pt') setSpeechLanguage(saved);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem('holi.speechLanguage', speechLanguage);
    } catch {}
  }, [speechLanguage]);

  // V3: Float32 -> PCM16 conversion and resampling happens off-main-thread in AudioWorklet.
  const lastScribeToastAtRef = useRef<number>(0);
  const lastScribeToastMsgRef = useRef<string>('');

  const audioRecorder = useAudioRecorder({
    chunkMs: 100,
    targetSampleRate: 16000,
    onChunk: (chunk) => {
      const socket = wsRef.current as any;
      if (!socket || !state.sessionId || !state.isRecording) return;

      // If auto-detect is enabled, buffer initial audio until language is detected.
      if (detectPendingRef.current) {
        prebufferRef.current.push(chunk.pcm16);
        prebufferBytesRef.current += chunk.pcm16.byteLength;

        // Once we have ~1.5s of audio (~48KB at 16kHz PCM16 mono per 1.5s = 48000 bytes),
        // run language detection once.
        if (!detectStartedRef.current && prebufferBytesRef.current >= 48000) {
          detectStartedRef.current = true;

          const combined = new Uint8Array(prebufferBytesRef.current);
          let offset = 0;
          for (const b of prebufferRef.current) {
            combined.set(new Uint8Array(b), offset);
            offset += b.byteLength;
          }

          fetch('/api/scribe/language-detect?sampleRate=16000', {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            credentials: 'include',
            body: combined,
          })
            .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
            .then(({ ok, j }) => {
              const lang = (j?.language as any) as 'en' | 'es' | 'pt' | undefined;
              const chosen: 'en' | 'es' | 'pt' =
                ok && (lang === 'es' || lang === 'pt' || lang === 'en') ? lang : 'en';

              activeStreamLanguageRef.current = chosen;
              setDetectedLanguage(chosen);
              detectPendingRef.current = false;

              // Flush buffered audio using the detected language
              for (const buf of prebufferRef.current) {
                socket.emit('co_pilot:audio_chunk', {
                  sessionId: state.sessionId,
                  audioData: buf,
                  sampleRate: 16000,
                  language: chosen,
                });
              }
              prebufferRef.current = [];
              prebufferBytesRef.current = 0;
            })
            .catch(() => {
              // If detection fails, fall back to English.
              activeStreamLanguageRef.current = 'en';
              setDetectedLanguage('en');
              detectPendingRef.current = false;

              // Flush buffered audio anyway (don't stall transcription).
              for (const buf of prebufferRef.current) {
                socket.emit('co_pilot:audio_chunk', {
                  sessionId: state.sessionId,
                  audioData: buf,
                  sampleRate: 16000,
                  language: 'en',
                });
              }
              prebufferRef.current = [];
              prebufferBytesRef.current = 0;
            });
        }

        return;
      }

      socket.emit('co_pilot:audio_chunk', {
        sessionId: state.sessionId,
        audioData: chunk.pcm16,
        sampleRate: chunk.sampleRate,
        language: activeStreamLanguageRef.current,
      });
      setScribeDebug((prev) => ({ ...prev, chunksSent: prev.chunksSent + 1 }));
    },
  });

  const focusScribePanel = () => {
    const el = document.getElementById('scribe-panel') as HTMLElement | null;
    if (el) {
      // Bring the scribe panel into view and reset its internal scroll so the user
      // immediately sees the top of the scribe UI (even though the panel itself is always mounted).
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try {
        // If it's a scroll container, scroll it to top.
        (el as any).scrollTo?.({ top: 0, behavior: 'smooth' });
      } catch {}
    }
    setScribeAttention(true);
    window.setTimeout(() => setScribeAttention(false), 1200);
  };

  // Load patients
  useEffect(() => {
    if (session?.user?.id) {
      loadPatients();
    }
  }, [session]);

  // Load rich patient snapshot (vitals/meds/labs) for the Co-Pilot side panel
  useEffect(() => {
    (async () => {
      if (!selectedPatient?.id) {
        setPatientContext(null);
        return;
      }
      try {
        const res = await fetch(
          `/api/patients/${selectedPatient.id}/context?accessReason=DIRECT_PATIENT_CARE`,
          { cache: 'no-store' }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load patient context');
        setPatientContext(data?.data || null);
      } catch (e) {
        console.error('Failed to load patient context:', e);
        setPatientContext(null);
      }
    })();
  }, [selectedPatient?.id]);

  // Silent background: ensure a de-identified longitudinal dossier exists for this patient.
  // This enables fast CDS prompts without re-processing the entire chart on every interaction.
  useEffect(() => {
    if (!selectedPatient?.id) return;
    fetch(`/api/patients/${selectedPatient.id}/dossier/ensure`, { method: 'POST' }).catch(() => {});
  }, [selectedPatient?.id]);

  useEffect(() => {
    (async () => {
      if (!selectedPatient?.id) {
        setRiskScores(null);
        setDocuments(null);
        setActivity(null);
        return;
      }
      try {
        const [rs, docs] = await Promise.all([
          fetch(`/api/patients/${selectedPatient.id}/risk-scores`, { cache: 'no-store' }).then((r) => r.json()),
          fetch(`/api/patients/${selectedPatient.id}/documents`, { cache: 'no-store' }).then((r) => r.json()),
        ]);
        setRiskScores(Array.isArray(rs?.data) ? rs.data : []);
        setDocuments(Array.isArray(docs?.data) ? docs.data : []);
      } catch {
        setRiskScores([]);
        setDocuments([]);
      }
      try {
        const a = await fetch(`/api/patients/${selectedPatient.id}/activity`, { cache: 'no-store' }).then((r) => r.json());
        setActivity(Array.isArray(a?.data) ? a.data : []);
      } catch {
        setActivity([]);
      }
    })();
  }, [selectedPatient?.id]);

  useEffect(() => {
    // Prefill vitals editor from latest known vitals (DB snapshot first, then live SOAP vitals).
    if (!selectedPatient?.id) return;
    const latest = patientContext?.vitals?.[0];
    const live = state.liveSoapNote?.vitalSigns;

    const pick = (key: string) => {
      const v = (live && live[key] !== undefined ? live[key] : latest?.[key]) ?? '';
      return v === null || v === undefined ? '' : String(v);
    };

    setVitalsDraft((prev: any) => ({
      ...prev,
      systolicBP: pick('systolicBP'),
      diastolicBP: pick('diastolicBP'),
      heartRate: pick('heartRate'),
      temperature: pick('temperature'),
      respiratoryRate: pick('respiratoryRate'),
      oxygenSaturation: pick('oxygenSaturation'),
      weight: pick('weight'),
      height: pick('height'),
    }));
  }, [patientContext, state.liveSoapNote?.vitalSigns, selectedPatient?.id]);

  const fileToDataUrl = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });
  }, []);

  // Local preview for the pending file (so clinicians can visually confirm the selected attachment).
  useEffect(() => {
    if (!uploadPendingFile) {
      setUploadPendingPreviewUrl(null);
      setUploadPendingPreviewKind('file');
      return;
    }

    const t = String(uploadPendingFile.type || '').toLowerCase();
    const isImg = t.startsWith('image/');
    const isPdf = t === 'application/pdf';
    const url = URL.createObjectURL(uploadPendingFile);
    setUploadPendingPreviewUrl(url);
    setUploadPendingPreviewKind(isImg ? 'image' : isPdf ? 'pdf' : 'file');

    return () => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    };
  }, [uploadPendingFile]);

  const openUploadsPanel = () => {
    setRightPanelTab('uploads');
    document.getElementById('copilot-right-panels')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openRiskPanel = () => {
    setRightPanelTab('risk');
    document.getElementById('copilot-right-panels')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openLabsPanel = () => {
    setRightPanelTab('labs');
    document.getElementById('copilot-right-panels')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onDropFiles = useCallback(
    async (accepted: File[]) => {
      if (!accepted.length) return;
      // single-file flow (keeps the UX tight + reduces accidental bulk uploads)
      const file = accepted[0];
      setUploadPendingFile(file);

      if (file.type.includes('pdf')) setUploadPendingType('LAB_RESULTS');
      else if (file.type.startsWith('image/')) setUploadPendingType('IMAGING');
      else setUploadPendingType('OTHER');

      setUploadScope('profile'); // default: build patient profile
      openUploadsPanel();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openUploadsPanel]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropFiles,
    accept: {
      'image/*': [],
      'application/pdf': [],
    },
    multiple: false,
    maxSize: 7 * 1024 * 1024,
  });

  const confirmUpload = async () => {
    if (!uploadPendingFile) return;

    const dataUrl = await fileToDataUrl(uploadPendingFile);
    const payload = {
      fileName: uploadPendingFile.name,
      fileType: uploadPendingFile.type || 'application/octet-stream',
      fileSize: uploadPendingFile.size,
      dataUrl,
      documentType: uploadPendingType,
    };

    if (uploadScope === 'session') {
      setSessionAttachments((prev) => [
        ...prev,
        { name: payload.fileName, type: payload.fileType, dataUrl: payload.dataUrl },
      ]);
      setUploadPendingFile(null);
      showToast({ type: 'success', title: 'Added to session', message: 'This file is available under Session attachments and can be used in CDS.' });
      return;
    }

    if (!selectedPatient?.id) throw new Error('No patient selected');
    const res = await fetch(`/api/patients/${selectedPatient.id}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || 'Upload failed');

    // refresh docs list
    const docs = await fetch(`/api/patients/${selectedPatient.id}/documents`, { cache: 'no-store' }).then((r) => r.json());
    setDocuments(Array.isArray(docs?.data) ? docs.data : []);
    setUploadPendingFile(null);
    showToast({ type: 'success', title: 'Uploaded', message: 'Saved to patient profile. You can now “Use in CDS”.' });
  };

  const addDemoAttachment = async (kind: 'xray' | 'lab' | 'consult' | 'discharge') => {
    // Demo X-rays can rotate for variety, but demo LAB/CONSULT/DISCHARGE should be consistent for all patients.
    const url =
      kind === 'xray'
        ? ['/demo/xray-chest.svg', '/demo/xray-hand.svg', '/demo/xray-knee.svg'][
            Math.floor(Math.random() * 3)
          ]
        : kind === 'lab'
          ? '/demo/lab-cbc-sample.png'
          : kind === 'consult'
            ? '/demo/consult-note-sample.png'
            : '/demo/discharge-summary-sample.png';

    const name = `demo-${url.split('/').pop() || 'document'}`;

    const resp = await fetch(url);
    const blob = await resp.blob();
    const fallbackType =
      url.endsWith('.svg') ? 'image/svg+xml' : url.endsWith('.png') ? 'image/png' : 'application/octet-stream';
    const file = new File([blob], name, { type: blob.type || fallbackType });
    setUploadPendingFile(file);
    setUploadPendingType(
      kind === 'xray'
        ? 'IMAGING'
        : kind === 'lab'
          ? 'LAB_RESULTS'
          : kind === 'consult'
            ? 'CONSULTATION_NOTES'
            : 'DISCHARGE_SUMMARY'
    );
    setUploadScope('profile');
    openUploadsPanel();
  };

  const saveVitalsToProfile = async () => {
    if (!selectedPatient?.id) return;
    const num = (s: any) => {
      const v = String(s ?? '').trim();
      if (!v) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const payload = {
      systolicBP: num(vitalsDraft.systolicBP),
      diastolicBP: num(vitalsDraft.diastolicBP),
      heartRate: num(vitalsDraft.heartRate),
      temperature: num(vitalsDraft.temperature),
      respiratoryRate: num(vitalsDraft.respiratoryRate),
      oxygenSaturation: num(vitalsDraft.oxygenSaturation),
      weight: num(vitalsDraft.weight),
      height: num(vitalsDraft.height),
      source: 'MANUAL',
    };

    const res = await fetch(`/api/patients/${selectedPatient.id}/vitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to save vitals');

    // Refresh snapshot
    setVitalsEditing(false);
    const ctx = await fetch(`/api/patients/${selectedPatient.id}/context?accessReason=DIRECT_PATIENT_CARE`, { cache: 'no-store' });
    const ctxData = await ctx.json().catch(() => ({}));
    if (ctx.ok) setPatientContext(ctxData?.data || null);
  };

  const loadPatients = async () => {
    try {
      const response = await fetch(`/api/patients?limit=100&t=${Date.now()}`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        // If auth is missing, keep UI stable but show in-context message (no noisy toast here).
        setPatients([]);
        return;
      }
      const list = Array.isArray(data?.data) ? data.data : [];
      setPatients(list);
      // Keep patient selection in sync after attaches/refreshes.
      if (!selectedPatient && list.length > 0) {
        setSelectedPatient(list[0]);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
      setPatients([]);
    }
  };

  const attachDemoPatients = async () => {
    try {
      const res = await fetch('/api/dev/attach-demo-patients', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Common: stale session or logged-out browser profile
        if (res.status === 401) {
          throw new Error('Authentication required. Please sign in again and retry.');
        }
        throw new Error(data?.error || 'Failed to attach demo patients');
      }

      const attached = Number(data?.attached ?? 0);
      const msg = String(data?.message || '');
      if (attached > 0) {
        showToast({ type: 'success', title: 'Demo patients attached', message: `Attached ${attached} patients.` });
      } else if (msg.includes('already has patients')) {
        // Silent success: don't show a toast for this (it feels like a glitch).
      } else {
        showToast({ type: 'info', title: 'No demo patients attached', message: 'No eligible demo patients were found to attach.' });
      }
      await loadPatients();
    } catch (e: any) {
      showToast({ type: 'error', title: 'Failed to attach demo patients', message: e?.message || 'Unknown error' });
    }
  };

  const getToolUsage = (toolId: string) => {
    try {
      const raw = window.localStorage.getItem(`holi.toolUsage.${toolId}`);
      const n = raw ? Number(raw) : 0;
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  };

  const bumpToolUsage = (toolId: string) => {
    try {
      const next = getToolUsage(toolId) + 1;
      window.localStorage.setItem(`holi.toolUsage.${toolId}`, String(next));
    } catch {}
    setToolUsageTick((x) => x + 1);
  };

  const showToast = (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string; duration?: number }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, ...toast }]);
  };

  const dismissToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Patient search: useDeferredValue keeps typing snappy while filtering + rendering large lists
  const deferredQuery = useDeferredValue(searchQuery);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const patientIndex = useMemo(() => {
    return patients.map((p) => ({
      patient: p,
      haystack: `${p.firstName} ${p.lastName} ${p.mrn}`.toLowerCase(),
    }));
  }, [patients]);
  const filteredPatients = useMemo(() => {
    if (!normalizedQuery) return patients;
    return patientIndex.filter((x) => x.haystack.includes(normalizedQuery)).map((x) => x.patient);
  }, [patients, patientIndex, normalizedQuery]);

  // Initialize Socket.io connection for real-time SOAP generation
  useEffect(() => {
    if (useRealTimeMode && state.isRecording && state.sessionId) {
      connectSocket();
    }

    return () => {
      if (wsRef.current) {
        (wsRef.current as any).disconnect?.();
      }
    };
  }, [useRealTimeMode, state.isRecording, state.sessionId]);

  // If the socket connects before `audioStream` is set, ensure we reconnect once audio is available.
  useEffect(() => {
    if (!useRealTimeMode) return;
    if (!state.isRecording || !state.sessionId) return;
    if (!audioStream) return;
    // If we already have a connected socket, the connect handler will start streaming.
    // If we don't, this will establish the socket now that audio is ready.
    connectSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioStream, useRealTimeMode, state.isRecording, state.sessionId]);

  const connectSocket = async () => {
    try {
      // Avoid double-connecting.
      if ((wsRef.current as any)?.connected) return;

      // Import socket.io client dynamically
      const { io } = await import('socket.io-client');
      
      // Get auth token
      const tokenResponse = await fetch('/api/auth/socket-token');
      if (!tokenResponse.ok) throw new Error('Failed to get socket token');

      const { token } = await tokenResponse.json();

      // Ensure Socket.IO server is bootstrapped in Next.js (dev/self-host).
      // This endpoint attaches the Socket.IO server to the underlying HTTP server.
      await fetch('/api/socketio').catch(() => {});
      
      const socket = io({
        path: '/api/socket.io',
        auth: { token },
        // Prevent infinite retry loops when the socket server isn't available in local dev.
        reconnection: false,
        timeout: 2000,
      });

      wsRef.current = socket as any;

      const startRealtimeAudioStreaming = () => {
        if (!useRealTimeMode || !audioStream || !state.sessionId) return;
        try {
          // Initialize per-recording language mode.
          if (speechLanguage === 'auto') {
            setDetectedLanguage(null);
            activeStreamLanguageRef.current = 'en'; // temporary until detected
            detectPendingRef.current = true;
            detectStartedRef.current = false;
            prebufferRef.current = [];
            prebufferBytesRef.current = 0;
          } else {
            detectPendingRef.current = false;
            detectStartedRef.current = false;
            prebufferRef.current = [];
            prebufferBytesRef.current = 0;
            activeStreamLanguageRef.current = speechLanguage;
            setDetectedLanguage(null);
          }

          // Tear down any previous graph
          try {
            audioProcessorRef.current?.disconnect();
            audioSourceRef.current?.disconnect();
            audioGainRef.current?.disconnect();
            audioCtxRef.current?.close?.();
          } catch {}

          // V3: AudioWorklet pipeline (off-main-thread)
          void audioRecorder.stop();
          void audioRecorder.start(audioStream);
        } catch (e) {
          console.error('Failed to start realtime audio streaming:', e);
        }
      };

      socket.on('connect', () => {
        console.log('✅ Co-Pilot Socket.io connected');
        setScribeDebug((prev) => ({ ...prev, socketConnected: true }));
        
        // Join co-pilot session room
        socket.emit('co_pilot:join_session', { sessionId: state.sessionId });

        // Start streaming audio to server for Deepgram→Presidio→UI hard guarantee.
        // IMPORTANT: socket may connect before audioStream state is set; startRealtimeAudioStreaming()
        // is also triggered by a useEffect below when audioStream becomes available.
        startRealtimeAudioStreaming();
      });

      // If the socket connects before `audioStream` is set, we still need to start streaming
      // once the stream arrives.
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      Promise.resolve().then(() => startRealtimeAudioStreaming());

      socket.on('co_pilot:transcript_update', (data: any) => {
        const nowS = Date.now() / 1000;
        const seg = {
          speaker: data.speaker || 'Speaker 1',
          text: data.text,
          // Server emits seconds; keep UI consistent if we fall back.
          startTime: typeof data.startTime === 'number' ? data.startTime : nowS,
          endTime: typeof data.endTime === 'number' ? data.endTime : nowS,
          confidence: typeof data.confidence === 'number' ? data.confidence : 0.9,
          isFinal: typeof data.isFinal === 'boolean' ? data.isFinal : false,
        };
        appendTranscript(seg);
        setScribeDebug((prev) => ({ ...prev, lastTranscriptAt: Date.now() }));

        // Local extraction + auditable persistence (throttled) from *sanitized* transcript.
        if (seg.isFinal && seg.text && state.sessionId && state.isRecording) {
          try {
            const entities = extractMedicalEntities(seg.text);
            const symptoms = entities.symptoms.slice(0, 12);
            const diagnoses = entities.diagnoses.slice(0, 8);
            const chiefComplaint = symptoms[0] || diagnoses[0] || undefined;

            updateLiveSoapNote({
              chiefComplaint: state.liveSoapNote?.chiefComplaint || chiefComplaint,
              extractedSymptoms: symptoms.length ? symptoms : state.liveSoapNote?.extractedSymptoms,
              subjective:
                state.liveSoapNote?.subjective ||
                (symptoms.length ? `Symptoms mentioned: ${symptoms.join(', ')}.` : undefined),
              assessment:
                state.liveSoapNote?.assessment ||
                (diagnoses.length ? `Possible conditions mentioned: ${diagnoses.join(', ')}.` : undefined),
            });

            const now = Date.now();
            if (now - lastFindingsPersistMsRef.current > 1500) {
              lastFindingsPersistMsRef.current = now;
              fetch(`/api/scribe/sessions/${state.sessionId}/findings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  source: 'client-heuristic',
                  timestamp: now,
                  chiefComplaint,
                  symptoms,
                  diagnoses,
                  entities,
                }),
              }).catch(() => {});
            }
          } catch {}
        }
      });

      socket.on('co_pilot:soap_update', (data: any) => {
        updateLiveSoapNote({
          subjective: data.subjective,
          objective: data.objective,
          assessment: data.assessment,
          plan: data.plan,
          chiefComplaint: data.chiefComplaint,
          extractedSymptoms: data.extractedSymptoms,
          vitalSigns: data.vitalSigns,
        });
      });

      socket.on('co_pilot:findings_update', (data: any) => {
        // Canonical findings stream (auditable) - use it to populate the live SOAP fields.
        const f = data?.findings || {};
        const symptoms = Array.isArray(f?.symptoms) ? f.symptoms : undefined;
        updateLiveSoapNote({
          chiefComplaint: f?.chiefComplaint,
          extractedSymptoms: symptoms,
        });
        setFindingsTick((x) => x + 1);
      });

      socket.on('co_pilot:symptom_extracted', (data: any) => {
        addExtractedSymptom({
          symptom: data.symptom,
          confidence: data.confidence || 0.8,
          extractedAt: Date.now(),
        });
      });

      socket.on('error', (error: any) => {
        console.error('Socket.io error:', error);
        const msg = typeof error === 'string' ? error : error?.message || 'Socket error';
        setScribeDebug((prev) => ({ ...prev, lastError: msg }));
      });

      socket.on('connect_error', (error: any) => {
        console.error('Socket.io connect_error:', error?.message || error);
        setScribeDebug((prev) => ({
          ...prev,
          socketConnected: false,
          lastError: error?.message || 'Socket connection error',
        }));
        // Graceful fallback: disable realtime mode instead of spamming console forever.
        setUseRealTimeMode(false);
      });

      socket.on('disconnect', () => {
        console.log('Socket.io disconnected');
        setScribeDebug((prev) => ({ ...prev, socketConnected: false }));
      });

      socket.on('co_pilot:transcription_error', (data: any) => {
        const msg = data?.message || 'Transcription error';
        setScribeDebug((prev) => ({ ...prev, lastError: msg }));
        // If the server tells us to stop (e.g. 429 rate limit), do it immediately to avoid thrash.
        const now = Date.now();
        const retryAfterMs = Number.isFinite(Number(data?.retryAfterMs)) ? Number(data.retryAfterMs) : 60_000;
        const shouldStop = Boolean(data?.shouldStop) || data?.code === 429 || String(msg).includes('429');
        if (shouldStop) {
          setScribeCooldownUntilMs(now + Math.max(5_000, retryAfterMs));
          if (state.isRecording) {
            void handleStopRecording();
          }
        }
        // De-dupe toast spam (same message within 6s)
        if (msg === lastScribeToastMsgRef.current && now - lastScribeToastAtRef.current < 6000) return;
        lastScribeToastMsgRef.current = msg;
        lastScribeToastAtRef.current = now;
        showToast({ type: 'error', title: 'AI Scribe error', message: msg });
      });
    } catch (error) {
      console.error('Failed to connect Socket.io:', error);
      setScribeDebug((prev) => ({ ...prev, socketConnected: false, lastError: (error as any)?.message || 'Socket init failed' }));
      setUseRealTimeMode(false);
    }
  };

  const handleStartRecording = async () => {
    if (!selectedPatient) {
      showToast({ type: 'warning', title: 'Select a patient first', message: 'Choose a patient to start a consultation.' });
      return;
    }

    // Hard gate: disclosure must be accepted before AI scribe use.
    try {
      const accepted = window.localStorage.getItem('holi.disclosureAccepted.v1') === 'true';
      if (!accepted) {
        setShowDisclosureModal(true);
        return;
      }
    } catch {}

    // Then show patient consent modal
    setShowConsentModal(true);
  };

  const handleConsentGranted = async () => {
    try {
      if (!selectedPatient) return;
      // Persist consent so the backend verifyRecordingConsent() check passes in two‑party consent states.
      const res = await fetch('/api/consent/recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: selectedPatient.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to record consent');
      }

      setShowConsentModal(false);
      setShowAudioSourceModal(true);
    } catch (e: any) {
      console.error('Failed to record consent:', e);
      showToast({ type: 'error', title: 'Consent error', message: e?.message || 'Failed to record consent' });
    }
  };

  const handleConsentDeclined = () => {
    setShowConsentModal(false);
    showToast({ type: 'warning', title: 'Consent required', message: 'Recording cannot proceed without patient consent.' });
  };

  const startRecording = async () => {
    try {
      setShowAudioSourceModal(false);

      // Get audio stream
      let stream: MediaStream;
      try {
        if (audioSource === 'microphone') {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else if (audioSource === 'system') {
          stream = await (navigator.mediaDevices as any).getDisplayMedia({
            audio: true,
            video: false,
          });
        } else {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const systemStream = await (navigator.mediaDevices as any).getDisplayMedia({
            audio: true,
            video: false,
          });
          const audioContext = new AudioContext();
          const micSource = audioContext.createMediaStreamSource(micStream);
          const systemSource = audioContext.createMediaStreamSource(systemStream);
          const destination = audioContext.createMediaStreamDestination();
          micSource.connect(destination);
          systemSource.connect(destination);
          stream = destination.stream;
        }
      } catch (error) {
        console.error('Error accessing audio:', error);
        // Provide actionable error for the most common failure modes.
        const name = (error as any)?.name;
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          showToast({ type: 'error', title: 'Microphone access denied', message: 'Allow microphone permission for localhost:3000 and try again.' });
        } else if (name === 'NotFoundError') {
          showToast({ type: 'error', title: 'No microphone found', message: 'Connect a microphone and try again.' });
        } else {
          showToast({ type: 'error', title: 'Audio error', message: 'Check microphone permissions and device settings.' });
        }
        setIsRecording(false);
        setSessionId(null);
        return;
      }

      // Create session (only after we have audio permission, so we don't create orphan sessions)
      const sessionResponse = await fetch('/api/scribe/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient?.id,
          // Default required HIPAA access reason for in-visit scribe usage.
          accessReason: 'DIRECT_PATIENT_CARE',
          accessPurpose: 'AI_SCRIBE_RECORDING',
        }),
      });

      if (!sessionResponse.ok) {
        // Clean up audio if session creation failed
        stream.getTracks().forEach((t) => t.stop());
        const err = await sessionResponse.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || 'Failed to create session');
      }

      const sessionData = await sessionResponse.json();
      setSessionId(sessionData.data.id);
      setIsRecording(true);

      setAudioStream(stream);
      setScribeDebug((prev) => ({ ...prev, chunksSent: 0, lastError: undefined, lastTranscriptAt: undefined }));

      if (useRealTimeMode) {
        // Real-time mode - WebSocket handles everything
        connectSocket();
      } else {
        // Traditional mode - use MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm',
        });
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(1000);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      showToast({ type: 'error', title: 'Recording error', message: (error as any)?.message || 'Unknown error' });
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    setIsProcessing(true);
    detectPendingRef.current = false;
    detectStartedRef.current = false;
    prebufferRef.current = [];
    prebufferBytesRef.current = 0;

    // Stop realtime audio graph
    try {
      await audioRecorder.stop();
    } catch {}
    audioProcessorRef.current = null;
    audioSourceRef.current = null;
    audioGainRef.current = null;
    audioCtxRef.current = null;

    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      setAudioStream(null);
    }

    if (wsRef.current) {
      // Ask server to flush/finish Deepgram stream cleanly before we close the socket.
      try {
        if (state.sessionId) {
          (wsRef.current as any).emit('co_pilot:stop_stream', { sessionId: state.sessionId });
        }
      } catch {}
      wsRef.current.close();
      wsRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    // Finalize session
    if (state.sessionId) {
      try {
        const finalizeResponse = await fetch(`/api/scribe/sessions/${state.sessionId}/finalize`, {
          method: 'POST',
        });

        if (finalizeResponse.ok) {
          const finalizeData = await finalizeResponse.json();
          if (finalizeData.data?.soapNote) {
            updateLiveSoapNote({
              subjective: finalizeData.data.soapNote.subjective,
              objective: finalizeData.data.soapNote.objective,
              assessment: finalizeData.data.soapNote.assessment,
              plan: finalizeData.data.soapNote.plan,
            });
          }
        }
      } catch (error) {
        console.error('Error finalizing session:', error);
      }
    }

    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <ToastContainer toasts={toasts} onClose={dismissToast} position="top-center" />
      {/* Onboarding Tour */}
      <CoPilotOnboarding />

      <ClinicalDisclosureModal
        isOpen={showDisclosureModal}
        onClose={() => setShowDisclosureModal(false)}
        onAccept={() => {
          try {
            window.localStorage.setItem('holi.disclosureAccepted.v1', 'true');
          } catch {}
          setShowDisclosureModal(false);
          setShowConsentModal(true);
        }}
      />

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {t('title')}
            </h1>
            <p className="text-gray-700 dark:text-gray-200">
              {t('subtitle')}
            </p>
          </div>

          {/* Compact Live Mode Toggle */}
          <div className="flex items-center gap-3">
            {useRealTimeMode && state.isRecording && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">{t('liveModeActive')}</span>
              </div>
            )}
            <Switch
              enabled={useRealTimeMode}
              onChange={setUseRealTimeMode}
              label={t('liveMode')}
              disabled={state.isRecording}
              size="sm"
              showPulse={false}
            />
          </div>
        </div>
      </div>

      {/* Patient Selection Section - TOP ROW */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-6 py-6 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto">
          {!selectedPatient ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('selectPatientTitle')}
                  </h2>
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    {t('selectPatientSubtitle')}
                  </p>
                </div>
              </div>
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {filteredPatients.length === 0 ? (
                  <div className="col-span-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {t('noPatientsTitle')}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {t('noPatientsSubtitle')}
                    </div>
                    <button
                      onClick={attachDemoPatients}
                      className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                    >
                      {t('attachDemoPatients')}
                    </button>
                  </div>
                ) : (
                  filteredPatients.slice(0, 60).map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className="text-left p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                  >
                    <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {formatPatientDisplayName(patient.firstName, patient.lastName)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">MRN: {patient.mrn}</div>
                  </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-blue-500 dark:border-blue-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-xl font-bold">
                    {getInitials(selectedPatient.firstName, selectedPatient.lastName)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-1">
                      {t('activePatient')}
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatPatientDisplayName(selectedPatient.firstName, selectedPatient.lastName)}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-200">
                      MRN: {selectedPatient.mrn} • DOB: {new Date(selectedPatient.dateOfBirth).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  disabled={state.isRecording}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('changePatient')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Co-Pilot AI Tools Section - BELOW PATIENT SELECTOR */}
      {selectedPatient && (
        <div className="px-6 py-5">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-600/20 flex items-center justify-center">
                  <span className="text-2xl">⚡</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    AI Clinical Assistants
                  </h2>
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    Select AI tools to assist with this consultation
                  </p>
                </div>
              </div>

              {/* [+] Customize Button */}
              <div className="flex items-center gap-3" id="customize-button">
                <CoPilotIntegrationBubble
                  onToolSelect={(toolId) => {
                    if (!selectedPatient) {
                      showToast({ type: 'warning', title: 'Select a patient first', message: 'Choose a patient to start a consultation.' });
                      return;
                    }

                    if (toolId === 'scribe') {
                      focusScribePanel();
                    } else if (toolId === 'cds') {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      setCdsOpen(true);
                      document.getElementById('cds-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else if (toolId === 'risk') {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      openRiskPanel();
                    } else if (toolId === 'prevention') {
                      window.open(`/dashboard/prevention?patientId=${selectedPatient.id}`, '_blank');
                    } else if (toolId === 'labs') {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      openLabsPanel();
                    } else if (toolId === 'patient') {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      document.querySelector('[data-copilot-snapshot]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else if (toolId === 'dx') {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      document.getElementById('tool-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Split-Pane Layout */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-300px)]">
        {/* Left Panel: The Ear (Scribe) - Transcript & SOAP */}
        <div
          id="scribe-panel"
          className={`flex-1 lg:w-1/2 bg-white dark:bg-gray-800 overflow-y-auto transition-all ${
            scribeAttention ? 'ring-4 ring-purple-500/40 shadow-2xl' : ''
          }`}
        >
          <div className="p-6">
            {/* Always-visible AI Scribe "tool" (even before transcript exists) */}
            <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 backdrop-blur p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">AI Scribe</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {useRealTimeMode ? (
                      <span>
                        Live mode: <span className="font-semibold">Real‑time transcription</span>
                      </span>
                    ) : (
                      <span>Traditional mode: upload then transcribe</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200">
                    <span className="font-semibold">Speech language:</span>
                    <select
                      value={speechLanguage}
                      onChange={(e) => setSpeechLanguage(e.target.value as any)}
                      className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                      title="Select speech language for transcription"
                    >
                      <option value="auto">Auto (detect on start)</option>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="pt">Português</option>
                    </select>
                    {state.isRecording ? (
                      <span className="text-gray-500">• changes apply next recording</span>
                    ) : null}
                    {speechLanguage === 'auto' && detectedLanguage ? (
                      <span className="text-gray-500">• detected: {detectedLanguage.toUpperCase()}</span>
                    ) : null}
                    {speechLanguage === 'auto' && state.isRecording && !detectedLanguage ? (
                      <span className="text-gray-500">• detecting…</span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                    Status:{' '}
                    {state.isRecording ? (
                      <span className="font-semibold text-red-600 dark:text-red-400">Recording</span>
                    ) : scribeDebug.socketConnected ? (
                      <span className="font-semibold text-green-700 dark:text-green-400">Connected</span>
                    ) : (
                      <span className="font-semibold text-gray-700 dark:text-gray-300">Idle</span>
                    )}
                    {scribeDebug.lastTranscriptAt ? (
                      <span className="ml-2 text-gray-500">
                        last transcript {Math.max(0, Math.round((Date.now() - scribeDebug.lastTranscriptAt) / 1000))}s ago
                      </span>
                    ) : null}
                  </div>
                  {scribeDebug.lastError ? (
                    <div className="mt-2 text-xs text-red-700 dark:text-red-400">
                      {scribeDebug.lastError}
                    </div>
                  ) : null}
                  {isScribeCoolingDown ? (
                    <div className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                      Rate limited. You can retry in ~
                      {Math.max(1, Math.ceil((scribeCooldownUntilMs! - Date.now()) / 1000))}s.
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  {!state.isRecording ? (
                    <button
                      onClick={handleStartRecording}
                      disabled={isScribeCoolingDown}
                      className="px-4 py-2 rounded-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed text-white text-sm font-semibold shadow"
                    >
                      {isScribeCoolingDown ? 'Cooling down…' : 'Record'}
                    </button>
                  ) : (
                    <button
                      onClick={handleStopRecording}
                      className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow"
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Audio Waveform */}
            {audioStream && (
              <div className="mb-6">
                <AudioWaveform
                  stream={audioStream}
                  isRecording={state.isRecording}
                  className="h-24"
                />
              </div>
            )}

            {/* (Intentionally no "server mode"/vendor implementation details in clinician UI) */}

            {/* Transcript Viewer */}
            {state.transcript.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Live Transcript
                </h3>
                <TranscriptViewer
                  segments={state.transcript}
                  onSegmentCorrect={() => {}}
                  readonly={state.isRecording}
                />
              </div>
            )}

            {/* Empty state (so user doesn't think the tool "is missing") */}
            {state.transcript.length === 0 && !state.isRecording && (
              <div className="mt-6 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-6 bg-gray-50/60 dark:bg-gray-900/30">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  Ready to transcribe
                </div>
                <div className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                  Click <span className="font-semibold">Record</span>, allow microphone access, and start speaking.
                </div>
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                  Tip: say a sentence with PII (“John Doe”, an email) to verify redaction is working.
                </div>
              </div>
            )}

            {/* Live SOAP Note Preview */}
            {state.liveSoapNote && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Live SOAP Note
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  {state.liveSoapNote.chiefComplaint && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                        Chief Complaint
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {state.liveSoapNote.chiefComplaint}
                      </div>
                    </div>
                  )}
                  {state.liveSoapNote.subjective && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                        Subjective
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {state.liveSoapNote.subjective}
                      </div>
                    </div>
                  )}
                  {state.liveSoapNote.objective && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                        Objective
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {state.liveSoapNote.objective}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Co-Pilot Toolkit */}
        <div className="flex-1 lg:w-1/2 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-y-auto">
          <div className="p-6 space-y-6">
            
            {/* Header */}
            <div className="backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-white/30 dark:border-gray-700/50 shadow-lg p-6 relative">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center">
                      <Image
                        src="/icons/stethoscope (1).svg"
                        alt="Clinical command center"
                        width={24}
                        height={24}
                        className="opacity-90 dark:invert"
                      />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Clinical Command Center
                      </h2>
                      {selectedPatient && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-semibold inline-block mt-0.5">
                          {t('ehrAccessGranted')}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {t('toolkitSubtitle')}
                  </p>
                </div>

                {/* Compact Recording Button */}
                {selectedPatient && (
                  <div className="flex-shrink-0">
                    {!state.isRecording ? (
                      <button
                        onClick={handleStartRecording}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-xl group"
                      >
                        <div className="w-3 h-3 bg-white rounded-full group-hover:animate-pulse"></div>
                        <span className="text-sm">Record</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleStopRecording}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold transition-all shadow-lg animate-pulse"
                      >
                        <div className="w-3 h-3 bg-white rounded-sm"></div>
                        <span className="text-sm">Stop</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Modular Tools Grid */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                {/* AI Scribe Tool */}
                <button
                  onClick={() => {
                    // AI Scribe is already active in this view (left panel)
                    // Scroll to transcript section
                    focusScribePanel();
                  }}
                  className="group relative p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-600/10 hover:from-purple-500/20 hover:to-pink-600/20 border border-purple-200/50 dark:border-purple-700/30 transition-all hover:shadow-lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight">AI Scribe</span>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/0 to-pink-600/0 group-hover:from-purple-500/5 group-hover:to-pink-600/5 transition-all"></div>
                </button>

                {/* Clinical Decision Support Tool */}
                <button
                  onClick={() => {
                    setCdsOpen(true);
                  }}
                  className="group relative p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 hover:from-cyan-500/20 hover:to-blue-600/20 border border-cyan-200/50 dark:border-cyan-700/30 transition-all hover:shadow-lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight">CDS</span>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500/0 to-blue-600/0 group-hover:from-cyan-500/5 group-hover:to-blue-600/5 transition-all"></div>
                </button>

                {/* Risk Stratification Tool */}
                <button
                  onClick={() => {
                    if (!selectedPatient) {
                      showToast({ type: 'warning', title: 'Select a patient first', message: 'Choose a patient to start a consultation.' });
                      return;
                    }
                    openRiskPanel();
                  }}
                  className="group relative p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-600/10 hover:from-amber-500/20 hover:to-orange-600/20 border border-amber-200/50 dark:border-amber-700/30 transition-all hover:shadow-lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight">Risk Score</span>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/0 to-orange-600/0 group-hover:from-amber-500/5 group-hover:to-orange-600/5 transition-all"></div>
                </button>

                {/* Prevention Hub Tool */}
                <button
                  onClick={() => {
                    if (selectedPatient) {
                      window.open(`/dashboard/prevention?patientId=${selectedPatient.id}`, '_blank');
                    } else {
                      showToast({ type: 'warning', title: 'Select a patient first', message: 'Choose a patient to start a consultation.' });
                    }
                  }}
                  className="group relative p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-600/10 hover:from-emerald-500/20 hover:to-teal-600/20 border border-emerald-200/50 dark:border-emerald-700/30 transition-all hover:shadow-lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight">Prevention</span>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/0 to-teal-600/0 group-hover:from-emerald-500/5 group-hover:to-teal-600/5 transition-all"></div>
                </button>

                {/* Lab Insights Tool */}
                <button
                  onClick={() => {
                    if (!selectedPatient) {
                      showToast({ type: 'warning', title: 'Select a patient first', message: 'Choose a patient to start a consultation.' });
                      return;
                    }
                    openLabsPanel();
                  }}
                  className="group relative p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 hover:from-indigo-500/20 hover:to-purple-600/20 border border-indigo-200/50 dark:border-indigo-700/30 transition-all hover:shadow-lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight">Lab Insights</span>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/0 to-purple-600/0 group-hover:from-indigo-500/5 group-hover:to-purple-600/5 transition-all"></div>
                </button>

                {/* Add More Tools Button */}
                <button
                  onClick={() => {
                    showToast({
                      type: 'info',
                      title: 'Marketplace coming soon',
                      message: "You'll be able to add custom AI assistants and integrations here.",
                    });
                  }}
                  className="group relative p-4 rounded-xl border-2 border-dashed border-amber-300/50 dark:border-amber-600/30 hover:border-amber-400 dark:hover:border-amber-500 bg-amber-50/30 dark:bg-amber-900/10 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-all hover:shadow-lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                      {/* Golden ring effect */}
                      <div className="absolute inset-0 rounded-lg border-2 border-amber-400/60 dark:border-amber-500/40 group-hover:border-amber-500 dark:group-hover:border-amber-400 transition-colors"></div>
                      <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 text-center leading-tight">Add Tool</span>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/0 to-amber-600/0 group-hover:from-amber-500/5 group-hover:to-amber-600/5 transition-all"></div>
                </button>
              </div>
            </div>

            {/* Patient Snapshot (auto-filled EHR context) */}
            {selectedPatient && (
              <div data-copilot-snapshot className="backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-white/30 dark:border-gray-700/50 shadow-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{t('patientSnapshot')}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setVitalsEditing((v) => !v)}
                      className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      {vitalsEditing ? 'Close' : t('editVitals')}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(JSON.stringify(patientContext || {}, null, 2));
                        showToast({ type: 'success', title: 'Copied', message: 'Patient snapshot copied to clipboard.' });
                        } catch {
                        showToast({ type: 'error', title: 'Copy failed', message: 'Could not copy to clipboard.' });
                        }
                      }}
                      className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      {t('copy')}
                    </button>
                  </div>
                </div>

                {!patientContext ? (
                  <div className="text-sm text-gray-600 dark:text-gray-300">Loading context…</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-5 border border-gray-200/60 dark:border-gray-700/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                          Vitals
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {patientContext?.vitals?.[0]?.createdAt
                            ? `Updated ${new Date(patientContext.vitals[0].createdAt).toLocaleDateString()}`
                            : ''}
                        </div>
                      </div>
                      {vitalsEditing ? (
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            ['systolicBP', 'Sys BP'],
                            ['diastolicBP', 'Dia BP'],
                            ['heartRate', 'HR'],
                            ['temperature', 'Temp'],
                            ['respiratoryRate', 'RR'],
                            ['oxygenSaturation', 'SpO₂'],
                            ['weight', 'Weight'],
                            ['height', 'Height'],
                          ].map(([key, label]) => (
                            <label key={key} className="text-xs text-gray-700 dark:text-gray-200">
                              <span className="block mb-1 font-semibold">{label}</span>
                              <input
                                value={vitalsDraft[key]}
                                onChange={(e) => setVitalsDraft((p: any) => ({ ...p, [key]: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                placeholder="—"
                              />
                            </label>
                          ))}
                          <div className="col-span-2 flex justify-end gap-2 mt-2">
                            <button
                              onClick={() => setVitalsEditing(false)}
                              className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await saveVitalsToProfile();
                                } catch (e: any) {
                                  showToast({ type: 'error', title: 'Save failed', message: e?.message || 'Failed to save vitals' });
                                }
                              }}
                              className="px-3 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                            >
                              Save to profile
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-800 dark:text-gray-100 space-y-2">
                          {patientContext?.vitals?.length ? (
                            <>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-white/70 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-700/40 p-3">
                                  <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase">BP</div>
                                  <div className="text-base font-bold text-gray-900 dark:text-white">
                                    {patientContext.vitals[0].systolicBP ?? '—'}/{patientContext.vitals[0].diastolicBP ?? '—'}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-300">mmHg</div>
                                </div>
                                <div className="rounded-xl bg-white/70 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-700/40 p-3">
                                  <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase">HR</div>
                                  <div className="text-base font-bold text-gray-900 dark:text-white">
                                    {patientContext.vitals[0].heartRate ?? '—'}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-300">bpm</div>
                                </div>
                                <div className="rounded-xl bg-white/70 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-700/40 p-3">
                                  <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase">Temp</div>
                                  <div className="text-base font-bold text-gray-900 dark:text-white">
                                    {patientContext.vitals[0].temperature ?? '—'}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-300">°C</div>
                                </div>
                                <div className="rounded-xl bg-white/70 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-700/40 p-3">
                                  <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase">SpO₂</div>
                                  <div className="text-base font-bold text-gray-900 dark:text-white">
                                    {patientContext.vitals[0].oxygenSaturation ?? '—'}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-300">%</div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-gray-700 dark:text-gray-200">
                              {t('noVitalsYet')}
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Tip: click <span className="font-semibold">Edit vitals</span> to add baseline vitals.
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-5 border border-gray-200/60 dark:border-gray-700/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Medications</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {Array.isArray(patientContext?.medications) ? `${patientContext.medications.length}` : '0'}
                        </div>
                      </div>
                      {Array.isArray(patientContext?.medications) && patientContext.medications.length ? (
                        <div className="space-y-2">
                          {patientContext.medications.slice(0, 6).map((m: any, idx: number) => (
                            <div key={idx} className="flex items-start justify-between gap-3 rounded-xl bg-white/70 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-700/40 p-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {m?.name || m?.drugName || m?.medication || 'Medication'}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
                                  {[m?.dose, m?.frequency].filter(Boolean).join(' • ') || '—'}
                                </div>
                              </div>
                              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                Active
                              </div>
                            </div>
                          ))}
                          {patientContext.medications.length > 6 ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400">+{patientContext.medications.length - 6} more</div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700 dark:text-gray-200">
                          None recorded.
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add meds to strengthen CDS recommendations.</div>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-5 border border-gray-200/60 dark:border-gray-700/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Labs</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {Array.isArray(patientContext?.labResults) ? `${patientContext.labResults.length}` : '0'}
                        </div>
                      </div>
                      {Array.isArray(patientContext?.labResults) && patientContext.labResults.length ? (
                        <div className="space-y-2">
                          {patientContext.labResults.slice(0, 6).map((l: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between gap-3 rounded-xl bg-white/70 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-700/40 p-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {l?.testName || l?.name || 'Lab'}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
                                  {l?.collectedAt ? new Date(l.collectedAt).toLocaleDateString() : '—'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-gray-900 dark:text-white">
                                  {l?.value ?? '—'}{l?.unit ? ` ${l.unit}` : ''}
                                </div>
                                {l?.flag ? (
                                  <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase">{l.flag}</div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                          {patientContext.labResults.length > 6 ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400">+{patientContext.labResults.length - 6} more</div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700 dark:text-gray-200">
                          No labs recorded.
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upload a lab report to enrich context.</div>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-5 border border-gray-200/60 dark:border-gray-700/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Allergies</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {Array.isArray(patientContext?.allergies) ? `${patientContext.allergies.length}` : '0'}
                        </div>
                      </div>
                      {Array.isArray(patientContext?.allergies) && patientContext.allergies.length ? (
                        <div className="flex flex-wrap gap-2">
                          {patientContext.allergies.slice(0, 10).map((a: any, idx: number) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100/70 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/30"
                            >
                              {a?.allergen || a?.name || String(a)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700 dark:text-gray-200">
                          None recorded.
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Allergies help reduce unsafe recommendations.</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Provenance / activity */}
                <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Change log</div>
                    <button
                      onClick={async () => {
                        if (!selectedPatient?.id) return;
                        try {
                          const a = await fetch(`/api/patients/${selectedPatient.id}/activity`, { cache: 'no-store' }).then((r) => r.json());
                          setActivity(Array.isArray(a?.data) ? a.data : []);
                        } catch {
                          setActivity([]);
                        }
                      }}
                      className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      Refresh
                    </button>
                  </div>
                  {!activity ? (
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">Loading…</div>
                  ) : activity.length === 0 ? (
                    <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                      No patient-scoped activity yet. Vitals saves and uploads will appear here.
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {activity.slice(0, 8).map((e) => (
                        <div key={e.id} className="flex items-center justify-between text-sm">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white truncate">
                              {String(e.action).replace(/_/g, ' ')} • {e.resource}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
                              {e.userEmail || 'unknown'} • {new Date(e.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className={`text-xs font-semibold ${e.success ? 'text-emerald-600' : 'text-red-600'}`}>
                            {e.success ? 'OK' : 'ERR'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Findings timeline (auditable extracted entities) */}
            {selectedPatient && state.sessionId ? (
              <FindingsTimeline sessionId={state.sessionId} isRecording={state.isRecording} socketTick={findingsTick} />
            ) : null}

            {/* Embedded workflows (Risk / Labs / Uploads) */}
            {selectedPatient && (
              <div
                id="copilot-right-panels"
                className="backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-white/30 dark:border-gray-700/50 shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Clinical Tools</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Embedded workflows (no context switching / no new tabs)
                    </div>
                  </div>
                  <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
                    <button
                      onClick={() => setRightPanelTab('risk')}
                      className={`px-3 py-2 text-sm font-semibold rounded-lg ${
                        rightPanelTab === 'risk'
                          ? 'bg-white dark:bg-gray-900 shadow text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      Risk
                    </button>
                    <button
                      onClick={() => setRightPanelTab('labs')}
                      className={`px-3 py-2 text-sm font-semibold rounded-lg ${
                        rightPanelTab === 'labs'
                          ? 'bg-white dark:bg-gray-900 shadow text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      Labs
                    </button>
                    <button
                      onClick={() => setRightPanelTab('uploads')}
                      className={`px-3 py-2 text-sm font-semibold rounded-lg ${
                        rightPanelTab === 'uploads'
                          ? 'bg-white dark:bg-gray-900 shadow text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      Uploads
                    </button>
                  </div>
                </div>

                {rightPanelTab === 'risk' ? (
                  <div className="space-y-3">
                    {!riskScores ? (
                      <div className="text-sm text-gray-600 dark:text-gray-300">Loading risk scores…</div>
                    ) : riskScores.length === 0 ? (
                      <div className="text-sm text-gray-700 dark:text-gray-200">
                        No risk scores yet for this patient.
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Next: we can compute on-demand and persist to the patient profile.
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {riskScores.slice(0, 6).map((rs) => (
                          <div key={rs.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                {String(rs.riskType).replace(/_/g, ' ')}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {rs.calculatedAt ? new Date(rs.calculatedAt).toLocaleDateString() : ''}
                              </div>
                            </div>
                            <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                              {rs.scorePercentage || `${Math.round((rs.score || 0) * 1000) / 10}%`}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                              {rs.category}
                            </div>
                            {rs.recommendation ? (
                              <div className="mt-2 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                                {rs.recommendation}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                {rightPanelTab === 'labs' ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">Lab results</div>
                      {Array.isArray(patientContext?.labResults) && patientContext.labResults.length ? (
                        <div className="space-y-2">
                          {patientContext.labResults.slice(0, 8).map((lr: any) => (
                            <div key={lr.id} className="flex items-center justify-between text-sm">
                              <div className="text-gray-900 dark:text-white font-medium">{lr.testName}</div>
                              <div className="text-gray-700 dark:text-gray-200">
                                {lr.value ?? '—'} {lr.unit ?? ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700 dark:text-gray-200">
                          No lab results found yet. Upload a lab report below (default saves to profile).
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Attachments (lab-related)</div>
                        <button
                          onClick={openUploadsPanel}
                          className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                          + Add
                        </button>
                      </div>
                      {documents && documents.filter((d) => d.documentType === 'LAB_RESULTS').length ? (
                        <div className="mt-2 space-y-2">
                          {documents
                            .filter((d) => d.documentType === 'LAB_RESULTS')
                            .slice(0, 6)
                            .map((d) => (
                              <div key={d.id} className="flex items-center justify-between text-sm">
                                <div className="text-gray-900 dark:text-white font-medium truncate">{d.fileName}</div>
                                <a
                                  href={d.storageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-600 dark:text-blue-400 text-xs font-semibold"
                                >
                                  Open
                                </a>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">No lab attachments yet.</div>
                      )}
                    </div>
                  </div>
                ) : null}

                {rightPanelTab === 'uploads' ? (
                  <div className="space-y-4">
                    {/* Dropzone */}
                    <div
                      {...getRootProps()}
                      className={`rounded-2xl border-2 border-dashed p-6 transition ${
                        isDragActive
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-900/30'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            Drag & drop an image or PDF
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">
                            Default: saves to patient profile. Max 7MB (prototype).
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addDemoAttachment('xray');
                            }}
                            className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            Add demo X‑ray
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addDemoAttachment('lab');
                            }}
                            className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            Add demo lab
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addDemoAttachment('consult');
                            }}
                            className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            Add demo consult
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addDemoAttachment('discharge');
                            }}
                            className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            Add demo discharge
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Pending upload decision */}
                    {uploadPendingFile ? (
                      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {uploadPendingFile.name}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-300">
                              {(uploadPendingFile.size / 1024 / 1024).toFixed(2)}MB • {uploadPendingFile.type || 'file'}
                            </div>
                          </div>
                          <button
                            onClick={() => setUploadPendingFile(null)}
                            className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>

                        {/* Visual preview (image/PDF) */}
                        {uploadPendingPreviewUrl ? (
                          <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3">
                            {uploadPendingPreviewKind === 'image' ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={uploadPendingPreviewUrl}
                                alt={uploadPendingFile.name}
                                className="w-full max-h-64 object-contain rounded-lg bg-white dark:bg-gray-900"
                              />
                            ) : uploadPendingPreviewKind === 'pdf' ? (
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">PDF preview</div>
                                <a
                                  href={uploadPendingPreviewUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-semibold text-blue-600 dark:text-blue-400"
                                >
                                  Open
                                </a>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-700 dark:text-gray-200">Preview not available for this file type.</div>
                            )}
                          </div>
                        ) : null}

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">Where should this go?</div>
                            <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                              <input
                                type="radio"
                                checked={uploadScope === 'profile'}
                                onChange={() => setUploadScope('profile')}
                              />
                              Save to patient profile (recommended)
                            </label>
                            <label className="mt-2 flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                              <input
                                type="radio"
                                checked={uploadScope === 'session'}
                                onChange={() => setUploadScope('session')}
                              />
                              Use only in this interaction (session)
                            </label>
                          </div>

                          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">Type</div>
                            <select
                              value={uploadPendingType}
                              onChange={(e) => setUploadPendingType(e.target.value as any)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            >
                              <option value="IMAGING">Imaging / X‑ray</option>
                              <option value="LAB_RESULTS">Lab report</option>
                              <option value="CONSULTATION_NOTES">Consult note</option>
                              <option value="DISCHARGE_SUMMARY">Discharge summary</option>
                              <option value="PRESCRIPTION">Prescription</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>
                        </div>

                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={async () => {
                              try {
                                await confirmUpload();
                              } catch (e: any) {
                                showToast({ type: 'error', title: 'Upload failed', message: e?.message || 'Upload failed' });
                              }
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* Saved profile attachments */}
                    <div className="rounded-2xl border-2 border-amber-400/40 dark:border-amber-500/30 bg-white dark:bg-gray-900 p-4 shadow-[0_0_0_3px_rgba(251,191,36,0.08)]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          Patient attachments
                        </div>
                        <button
                          onClick={() => {
                            const refs = (documents || []).slice(0, 8).map((d) => ({
                              id: `patient:${d.id || d.fileName || Math.random().toString(16).slice(2)}`,
                              scope: 'patient' as const,
                              name: d.fileName,
                              kind: d.documentType,
                              addedAt: d.createdAt,
                              previewUrl: d.storageUrl,
                            }));
                            setCdsAttachments((prev) => [...prev, ...refs]);
                            setCdsOpen(true);
                            showToast({
                              type: 'success',
                              title: 'Added to CDS',
                              message: refs.length ? `Added ${refs.length} patient attachment(s) to CDS context.` : 'No patient attachments to add.',
                            });
                          }}
                          className="text-xs px-3 py-1 rounded-full bg-amber-100/60 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-900 dark:text-amber-200 font-semibold"
                        >
                          Use in CDS
                        </button>
                      </div>
                      {documents && documents.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {documents.slice(0, 8).map((d) => {
                            const url = String(d.storageUrl || '');
                            const type = String(d.fileType || '').toLowerCase();
                            const isImg =
                              type.startsWith('image/') ||
                              url.startsWith('data:image') ||
                              url.endsWith('.png') ||
                              url.endsWith('.jpg') ||
                              url.endsWith('.jpeg') ||
                              url.endsWith('.webp') ||
                              url.endsWith('.gif') ||
                              url.endsWith('.svg');

                            return (
                              <a
                                key={d.id}
                                href={d.storageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-xl border border-amber-200/60 dark:border-amber-800/30 p-3 hover:bg-amber-50/40 dark:hover:bg-amber-900/10 transition flex gap-3"
                              >
                                <div className="w-24 h-16 flex-shrink-0 rounded-lg border border-amber-200/60 dark:border-amber-800/30 bg-white/70 dark:bg-gray-900/40 overflow-hidden">
                                  {isImg ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={url} alt={d.fileName} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-200">
                                      {String(d.documentType || 'FILE')}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{d.fileName}</div>
                                  <div className="text-xs text-gray-600 dark:text-gray-300">
                                    {d.documentType} • {new Date(d.createdAt).toLocaleString()}
                                  </div>
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700 dark:text-gray-200">No uploads yet.</div>
                      )}
                    </div>

                    {/* Session-only attachments */}
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">Session attachments</div>
                        <button
                          onClick={() => {
                            // append to CDS prompt as references (no PHI in file contents yet)
                            const refs = sessionAttachments.map((a) => ({
                              id: `session:${a.name}:${a.type}:${Math.random().toString(16).slice(2)}`,
                              scope: 'session' as const,
                              name: a.name,
                              kind: a.type,
                              addedAt: new Date().toISOString(),
                              previewUrl: a.dataUrl,
                              mimeType: a.type,
                            }));
                            setCdsAttachments((prev) => [...prev, ...refs]);
                            setCdsOpen(true);
                            showToast({
                              type: 'success',
                              title: 'Added to CDS',
                              message: sessionAttachments.length
                                ? `Added ${sessionAttachments.length} session attachment(s) to CDS context.`
                                : 'No session attachments to add.',
                            });
                          }}
                          className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                          Use in CDS
                        </button>
                      </div>
                      {sessionAttachments.length ? (
                        <div className="mt-2 space-y-2">
                          {sessionAttachments.slice(0, 8).map((a, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="text-gray-900 dark:text-white font-medium truncate">{a.name}</div>
                              <button
                                onClick={() =>
                                  setSessionAttachments((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="text-xs text-red-600 dark:text-red-400 font-semibold"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">No session-only files.</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* CDS Chat (embedded - does NOT blur/blank transcript) */}
            <div id="cds-panel" className="scroll-mt-24">
              <CDSChatDrawer
                embedded
                open={cdsOpen}
                onClose={() => setCdsOpen(false)}
                patientId={selectedPatient?.id}
                patientName={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : undefined}
                transcriptText={state.transcript.map((s) => s.text).join(' ')}
                soapSummary={state.liveSoapNote ? {
                  chiefComplaint: state.liveSoapNote.chiefComplaint,
                  subjective: state.liveSoapNote.subjective,
                  objective: state.liveSoapNote.objective,
                  assessment: state.liveSoapNote.assessment,
                  plan: state.liveSoapNote.plan,
                } : null}
                attachments={cdsAttachments}
                onRemoveAttachment={(id) => setCdsAttachments((prev) => prev.filter((a) => a.id !== id))}
              />
            </div>

            {/* Active Tool Content */}
            <DroppableToolWorkspace
              chiefComplaint={state.liveSoapNote?.chiefComplaint}
              extractedSymptoms={state.extractedSymptoms.map(s => s.symptom)}
              patientId={selectedPatient?.id}
            />
          </div>
        </div>
      </div>

      {/* Consent Modal */}
      {selectedPatient && (
        <PatientConsentModal
          isOpen={showConsentModal}
          onConsent={handleConsentGranted}
          onDecline={handleConsentDeclined}
          patientName={`${selectedPatient.firstName} ${selectedPatient.lastName}`}
        />
      )}

      {/* Audio Source Modal */}
      {showAudioSourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Select Audio Source
            </h3>
            <div className="space-y-3 mb-6">
              <label className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  name="audioSource"
                  value="microphone"
                  checked={audioSource === 'microphone'}
                  onChange={(e) => setAudioSource(e.target.value as any)}
                  className="mr-4"
                />
                <span className="text-lg mr-3">🎤</span>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Microphone</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">For in-person consultations</div>
                </div>
              </label>
              <label className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  name="audioSource"
                  value="system"
                  checked={audioSource === 'system'}
                  onChange={(e) => setAudioSource(e.target.value as any)}
                  className="mr-4"
                />
                <span className="text-lg mr-3">💻</span>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">System Audio</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">For video calls</div>
                </div>
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAudioSourceModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={startRecording}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-pink-700"
              >
                Start Recording
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function CoPilotPage() {
  return (
    <ClinicalSessionProvider>
      <CoPilotContent />
    </ClinicalSessionProvider>
  );
}

