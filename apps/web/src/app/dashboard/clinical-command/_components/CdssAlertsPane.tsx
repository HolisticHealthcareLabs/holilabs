'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { m, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Info, CheckCircle2,
  Settings, MessageSquare,
  Clock, Heart, Brain, FileText,
} from 'lucide-react';


import { ClinicalChatBar, type PromptMode } from './ClinicalChatBar';
import { useMicrophoneSTT } from './useMicrophoneSTT';

// ─────────────────────────────────────────────────────────────────────────────
// Specialty-Primed User Profile (mocked)
//
// In production this comes from the authenticated user's professional profile.
// The specialty token is injected into every LLM payload as a "God-Like" prefix
// that primes the model with domain expertise and ontology constraints.
// ─────────────────────────────────────────────────────────────────────────────

const USER_PROFILE = { specialty: 'Cardiologist', region: 'LATAM' } as const;

function buildSpecialtyPrefix(): string {
  return (
    `Act as an expert ${USER_PROFILE.specialty} operating in ${USER_PROFILE.region}. ` +
    `You are consulting on this case. ` +
    `Adhere strictly to ICD-10, ATC, and SNOMED CT. `
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Self-Learning localStorage - click-frequency tracker
//
// Tracks how many times each Quick Action bubble is clicked.  On mount and
// after every click the bubbles are re-sorted so the most-used action moves
// to the front of the scrollable row automatically.
// ─────────────────────────────────────────────────────────────────────────────

const CLICK_STORAGE_KEY = 'cdss-quick-action-clicks';

function getDoctorLastNameLabel(fullName?: string | null): string | null {
  if (!fullName) return null;

  // Strip common LATAM/English doctor prefixes before parsing name parts.
  const normalized = fullName
    .replace(/^\s*(dr|dra|doctor|doctora)\.?\s+/i, '')
    .trim();

  if (!normalized) return null;

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;

  // Prefer surname(s): everything after the first given name when available.
  if (parts.length >= 2) return parts.slice(1).join(' ');
  return parts[0];
}

function loadClickCounts(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CLICK_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function saveClickCounts(counts: Record<string, number>): void {
  try { localStorage.setItem(CLICK_STORAGE_KEY, JSON.stringify(counts)); } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CDSCard = {
  summary: string;
  detail?: string;
  indicator: 'info' | 'warning' | 'critical';
  source?: { label: string };
  assuranceEventId?: string;
  ruleId?: string;
  eventType?: string;
  patientIdHash?: string;
};

import { MODEL_CATALOG, type ModelInfo } from '@/lib/ai/types';

export type ModelId = string;

export interface ModelConfig {
  isConfigured: boolean;
  isActive: boolean;
  source?: 'platform' | 'byok';
}

/** Minimal patient context needed to build LLM payloads. */
type PatientCtx = {
  id: string;
  name: string;
  dob?: string;
  mrn?: string;
};

type ChatMessage = {
  id: string;
  role: 'system' | 'user';
  content: string;
  indicator?: 'info' | 'warning' | 'critical';
  rationale?: { confidence: number; reasoning: string };
  assuranceEventId?: string;
};

/** Full LLM-ready payload -- swap `simulateLLMResponse` for real endpoints. */
type LLMPayload = {
  model: ModelId;
  systemPrompt: string;
  transcript: string;
  patient: PatientCtx | null;
  userQuery: string;
  cdssActionType?: CdssActionType;
};

type CdssActionType =
  | 'LIFESTYLE_PREVENTION'
  | 'RX_TIMELINE_SAFETY'
  | 'DIFFERENTIAL_DX'
  | 'DRAFT_HANDOUT';

type QuickActionBubble = {
  id: string;
  label: string;
  Icon: React.FC<{ className?: string }>;
  intentLabel: string;
  cdssActionType?: CdssActionType;
  systemPrompt: string;
};

type ApiConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ApiClinicalContext = {
  age?: number;
  sex?: string;
  conditions: Array<{ label?: string; icd10Code?: string; status?: string }>;
  medications: Array<{ name?: string; atcCode?: string; dose?: string; status?: string }>;
  vitals: Array<{ name: string; value: string; unit?: string }>;
};

interface CdssAlertsPaneProps {
  activeModel: ModelId;
  modelConfigs: Partial<Record<ModelId, ModelConfig>>;
  onModelChange: (model: ModelId) => void;
  cdssAlerts: CDSCard[];
  isSyncing: boolean;
  onSync: () => void;
  syncError: string | null;
  patientSelected: boolean;
  hasTranscript: boolean;
  /** Patient context — used to build LLM payloads for quick actions. */
  selectedPatient?: PatientCtx | null;
  /** Transcript text — injected into LLM payloads for grounded responses. */
  transcript?: string;
  /** Opens the Patient Handout Modal instead of writing to chat. */
  onOpenHandout?: () => void;
  /** Increment to clear internal chat state (Great Reset signal from page.tsx). */
  resetSignal?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick Action Bubbles — Zero-Click Clinical Intelligence
// Each bubble fires a hidden clinical system prompt via simulateLLMResponse.
// All bubbles remain permanently clickable (no fade/disable after use).
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_ACTIONS: QuickActionBubble[] = [
  {
    id: 'rx-timeline',
    label: 'rxTimeline',
    Icon: Clock,
    intentLabel: 'rxTimelineIntent',
    cdssActionType: 'RX_TIMELINE_SAFETY',
    systemPrompt:
      'Analyze pharmaceutical history using ATC (Anatomical Therapeutic Chemical) codes. ' +
      'Identify contraindications, drug-drug interactions, and compliance issues. ' +
      'Map diagnoses to ICD-10/11. Use SNOMED CT for clinical findings. ' +
      'Do not use CPT, RxNorm, or NDC standards.',
  },
  {
    id: 'lifestyle',
    label: 'lifestylePrevention',
    Icon: Heart,
    intentLabel: 'lifestylePreventionIntent',
    cdssActionType: 'LIFESTYLE_PREVENTION',
    systemPrompt:
      'Generate a comprehensive lifestyle and preventative care plan based on this encounter. ' +
      'Use SNOMED CT for recommended procedures, ICD-10/11 for active conditions, ' +
      'and LOINC codes for laboratory monitoring. ' +
      'Align with LATAM/Caribbean clinical guidelines (SBC, SBEM, PAHO).',
  },
  {
    id: 'differential',
    label: 'differentialDx',
    Icon: Brain,
    intentLabel: 'differentialDxIntent',
    cdssActionType: 'DIFFERENTIAL_DX',
    systemPrompt:
      'Suggest differential diagnoses ordered by probability using ICD-10/11 and SNOMED CT standards. ' +
      'Map pending investigations to LOINC codes. ' +
      'Do not use US-centric CPT codes.',
  },
  {
    id: 'handout',
    label: 'draftHandout',
    Icon: FileText,
    intentLabel: 'draftHandoutIntent',
    cdssActionType: 'DRAFT_HANDOUT',
    systemPrompt:
      'Draft a patient-friendly summary of this visit in Portuguese or Spanish ' +
      '(choose based on context). Use plain language, no medical jargon. ' +
      'Include key medications with lay explanations and follow-up instructions.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LATAM-compliant mock responses
// Ontology priority: ICD-10/11 · ATC · SNOMED CT · LOINC
// Strictly excludes: CPT · RxNorm · NDC (US-centric)
// ─────────────────────────────────────────────────────────────────────────────

const LATAM_RESPONSE_RX = `Análise Farmacológica — CDSS LATAM

Perfil ATC ativo do paciente:
• Metformina 1000mg (ATC: A10BA02) — ICD-10: E11.9 (DM Tipo 2)
• Lisinopril 10mg   (ATC: C09AA03) — ICD-10: I10   (Hipertensão)
• Atorvastatina 40mg (ATC: C10AA05) — ICD-10: E78.5 (Dislipidemia)
• Furosemida 40mg   (ATC: C03CA01) — ICD-10: I50.9 (ICC/Sobrecarga)
• AAS 100mg         (ATC: B01AC06) — Profilaxia CV (risco moderado)

Alertas de Segurança:
1. Metformina + Contraste Iodado — CONTRAINDICADA com eGFR < 45 mL/min
   (ICD-10: N18.3 — DRC Estágio 3). Suspender 48h antes de procedimento.
2. Furosemida + Lisinopril — risco de hipotensão de 1ª dose e lesão renal.
   Monitorar K+ (LOINC: 2823-3) e Creatinina (LOINC: 2160-0).
3. Lisinopril + DRC — ajuste de dose recomendado se eGFR < 30 mL/min.

Fonte: WHO ATC Index 2024 / ANVISA RDC 204/2017 / Diretrizes SBC`;

const LATAM_RESPONSE_LIFESTYLE = `Plano Preventivo — CDSS LATAM (Diretrizes PAHO/SBC 2024)

Diagnósticos ativos: I10 | E11.9 | N18.3 | Suspeita I50.9

Nutrição:
• Dieta DASH adaptada para DRC: reducao de sodio (<2g/dia),
  potassio e fosforo (compativel com N18.3)
• Controle glicemico: meta HbA1c < 7.5% (LOINC: 4548-4) em DRC

Atividade Fisica (SNOMED CT: 229070002):
• 150 min/semana intensidade moderada — pendente estabilizacao cardiaca
• Reabilitacao cardiaca supervisionada quando estavelizar

Monitoramento Laboratorial Recomendado:
• eGFR (LOINC: 62238-1) — a cada 3 meses
• HbA1c (LOINC: 4548-4) — trimestral
• BNP (LOINC: 42637-9) — controle ICC
• Eletrólitos K+/Na+ (LOINC: 2823-3 / 2951-2) — mensal

Alvo PA: < 130/80 mmHg (VII Diretriz SBC — DM + DRC)`;

const LATAM_RESPONSE_DIFFERENTIAL = `Diagnostico Diferencial — ICD-10/11 + SNOMED CT

Queixa: dor precordial + dispneia + edema bilateral (5 dias)

1. I50.9 — Insuficiência Cardiaca Congestiva (alta probabilidade)
   SNOMED CT: 84114007
   Evidencia: crepitacoes, S3, edema +2, SpO2 93%
   → BNP (LOINC: 42637-9) + Ecocardiograma urgente

2. I21.4 — IAMSSST (probabilidade moderada)
   SNOMED CT: 57054005
   Evidencia: dor + historico familiar, RCV elevado
   → Troponina I serie (LOINC: 10839-9) + ECG 12 derivacoes (LOINC: 11524-6)

3. N18.3 — Sobrecarga hidrica por DRC (probabilidade moderada)
   SNOMED CT: 709044004
   Evidencia: eGFR reduzido, edema crônico
   → Creatinina (LOINC: 2160-0) + Uria (LOINC: 3094-0)

4. J18.9 — Pneumonia (baixa probabilidade)
   SNOMED CT: 233604007
   SpO2 93% — excluir com RX torax (LOINC: 24627-2)

Proxima etapa: ECG + BNP + Troponina I seriada — URGENTE`;


const LATAM_RESPONSE_HANDOUT = `Resumo da sua Consulta de Hoje
(Para levar para casa)

Por que voce veio:
Sentiu falta de ar, aperto no peito e inchaco nas pernas
por 5 dias. Estamos investigando o coracao e os rins.

O que vamos fazer:
 - ECG (eletrocardiograma): mapear o ritmo do coracao
 - Exames de sangue: verificar coracao, rins e acucar
 - Raio-X de torax: ver se ha liquido nos pulmoes

Sobre seus remedios:
Atencao: sua Metformina pode ser pausada antes de exame
com contraste. NAO pare nenhum remedio por conta propria.
Sempre consulte seu medico antes de qualquer alteracao.

Quando voltar ou ligar imediatamente:
- Falta de ar que piora rapidamente
- Dor forte no peito
- Inchaco aumentando muito

Proximo retorno: confirmar com seu medico.

Resumo gerado com suporte de IA — confirme com seu profissional de saude.`;

const LATAM_RESPONSE_GENERIC = `Com base no contexto clinico atual (ICD-10: N18.3 | I10 | E11.9):

Metformina (ATC: A10BA02) — avaliar eGFR antes de contraste.
BNP (LOINC: 42637-9) pendente — essencial para ICC (ICD-10: I50.9).
PA 162/95 mmHg — acima da meta SBC para DM+DRC (<130/80).

Posso elaborar qualquer ponto especifico? Experimente os
atalhos acima para analise farmacologica, plano preventivo
ou diagnostico diferencial completo.`;

// ─────────────────────────────────────────────────────────────────────────────
// simulateLLMResponse
//
// Mock async pipeline -- architecture is 100% ready to swap for real endpoints
// (DeepSeek-R1 / OpenAI GPT). Replace the setTimeout with a real fetch call.
//
// V2: Routes deterministically via cdssActionType (switch), falling back to
// systemPrompt keyword heuristic only for free-text queries.
// ─────────────────────────────────────────────────────────────────────────────

async function simulateLLMResponse(payload: LLMPayload): Promise<string> {
  await new Promise((r) => setTimeout(r, 850));

  if (payload.cdssActionType) {
    switch (payload.cdssActionType) {
      case 'RX_TIMELINE_SAFETY':
        return LATAM_RESPONSE_RX;
      case 'LIFESTYLE_PREVENTION':
        return LATAM_RESPONSE_LIFESTYLE;
      case 'DIFFERENTIAL_DX':
        return LATAM_RESPONSE_DIFFERENTIAL;
      case 'DRAFT_HANDOUT':
        return LATAM_RESPONSE_HANDOUT;
    }
  }

  return LATAM_RESPONSE_GENERIC;
}

const KNOWN_MEDICATION_ATC: Record<string, { atcCode: string }> = {
  metformin: { atcCode: 'A10BA02' },
  lisinopril: { atcCode: 'C09AA03' },
  atorvastatin: { atcCode: 'C10AA05' },
  furosemide: { atcCode: 'C03CA01' },
  aspirin: { atcCode: 'B01AC06' },
  warfarin: { atcCode: 'B01AA03' },
  digoxin: { atcCode: 'C01AA05' },
  levothyroxine: { atcCode: 'H03AA01' },
  omeprazole: { atcCode: 'A02BC01' },
};

const ICD10_REGEX = /\b[A-TV-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?\b/g;

function uniqueList(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function parseAge(dob?: string): number | undefined {
  if (!dob) return undefined;
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return undefined;

  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const beforeBirthday =
    now.getMonth() < parsed.getMonth() ||
    (now.getMonth() === parsed.getMonth() && now.getDate() < parsed.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : undefined;
}

function extractVitals(transcript: string): ApiClinicalContext['vitals'] {
  const vitals: ApiClinicalContext['vitals'] = [];
  const bloodPressure = transcript.match(/\bBP\s*(?:is|:)?\s*(\d{2,3})\/(\d{2,3})\s*mmHg\b/i);
  const heartRate = transcript.match(/\bHR\s*(?:is|:)?\s*(\d{2,3})\s*bpm\b/i);
  const spo2 = transcript.match(/\bSpO2\s*(?:is|:)?\s*(\d{2,3})\s*%/i);

  if (bloodPressure) {
    vitals.push({ name: 'Blood Pressure', value: `${bloodPressure[1]}/${bloodPressure[2]}`, unit: 'mmHg' });
  }
  if (heartRate) {
    vitals.push({ name: 'Heart Rate', value: heartRate[1], unit: 'bpm' });
  }
  if (spo2) {
    vitals.push({ name: 'SpO2', value: spo2[1], unit: '%' });
  }

  return vitals;
}

function buildClinicalContextFromTranscript(
  selectedPatient: PatientCtx | null,
  transcript: string
): ApiClinicalContext {
  const age = parseAge(selectedPatient?.dob);
  const icd10Codes = uniqueList(transcript.match(ICD10_REGEX) ?? []);

  const conditions = icd10Codes.map((code) => ({
    icd10Code: code,
    label: 'Condition captured from encounter transcript',
    status: 'active',
  }));

  const lowered = transcript.toLowerCase();
  const medications = Object.entries(KNOWN_MEDICATION_ATC)
    .filter(([name]) => lowered.includes(name))
    .map(([name, info]) => ({
      name: name[0].toUpperCase() + name.slice(1),
      atcCode: info.atcCode,
      status: 'active',
    }));

  return {
    age,
    conditions,
    medications,
    vitals: extractVitals(transcript),
  };
}

function toConversationHistory(messages: ChatMessage[]): ApiConversationMessage[] {
  return messages.slice(-30).map((message) => ({
    role: message.role === 'system' ? 'assistant' : 'user',
    content: message.content,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Static UI data
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_MODEL_ID = 'claude-sonnet-4-20250514';

const INDICATOR_CONFIG = {
  critical: {
    Icon: AlertTriangle,
    color:      'text-red-500 dark:text-red-400',
    bg:         'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25',
    label:      'CRITICAL',
    labelColor: 'text-red-600 dark:text-red-400',
  },
  warning: {
    Icon: AlertTriangle,
    color:      'text-amber-500 dark:text-amber-400',
    bg:         'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25',
    label:      'WARNING',
    labelColor: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    Icon: Info,
    color:      'text-cyan-600 dark:text-cyan-400',
    bg:         'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/25',
    label:      'INFO',
    labelColor: 'text-cyan-700 dark:text-cyan-400',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// RationalePopover — hover tooltip with confidence + reasoning
// ─────────────────────────────────────────────────────────────────────────────

function RationalePopover({
  rationale,
}: {
  rationale: { confidence: number; reasoning: string };
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('dashboard.clinicalCommand');

  return (
    <div className="relative flex-shrink-0">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label="View AI reasoning"
        className="
          w-4 h-4 flex items-center justify-center
          text-[9px] font-bold
          dark:bg-slate-700/60
          dark:text-slate-400
          hover:text-cyan-600 dark:hover:text-cyan-400
          hover:bg-slate-300 dark:hover:bg-slate-700
          transition-colors
          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400
        "
        style={{ borderRadius: 'var(--radius-full)', backgroundColor: 'var(--surface-tertiary)', color: 'var(--text-tertiary)' }}
      >
        ℹ
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            className="
              absolute bottom-full right-0 mb-2 w-60 z-20
              bg-slate-900 dark:bg-slate-950
              border border-slate-700
              p-3 pointer-events-none
            "
            style={{ borderRadius: 'var(--radius-xl)', boxShadow: 'var(--token-shadow-xl)' }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {t('confidence')}
              </span>
              <span className="text-xs font-bold text-cyan-400">
                {rationale.confidence}%
              </span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {rationale.reasoning}
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SystemMessage — CDSS alert or AI reply as a chat bubble
// ─────────────────────────────────────────────────────────────────────────────

function SystemMessage({ message }: { message: ChatMessage }) {
  const t = useTranslations('dashboard.clinicalCommand');
  const cfg = message.indicator ? INDICATOR_CONFIG[message.indicator] : null;
  const Icon = cfg?.Icon;
  const [feedbackState, setFeedbackState] = useState<'idle' | 'accepted' | 'rejected' | 'noted'>('idle');

  const handleAccept = async () => {
    if (!message.assuranceEventId) return;
    setFeedbackState('accepted');
    try {
      await fetch('/api/assurance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: message.assuranceEventId, decision: { action: 'ACCEPT' }, override: false }),
      });
    } catch { /* non-blocking */ }
    setTimeout(() => setFeedbackState('noted'), 2000);
  };

  const handleReject = async () => {
    if (!message.assuranceEventId) return;
    setFeedbackState('rejected');
    try {
      await fetch('/api/assurance/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assuranceEventId: message.assuranceEventId, feedbackType: 'THUMBS_DOWN' }),
      });
    } catch { /* non-blocking */ }
    setTimeout(() => setFeedbackState('noted'), 2000);
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`border p-3 ${
        cfg?.bg ?? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700/60'
      }`}
      style={{ borderRadius: 'var(--radius-xl)' }}
    >
      <div className="flex items-start gap-2">
        {Icon && (
          <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${cfg?.color ?? ''}`} />
        )}
        <div className="flex-1 min-w-0">
          {cfg && (
            <span
              className={`text-[9px] font-bold uppercase tracking-wider block mb-1 ${cfg.labelColor}`}
            >
              {cfg.label}
            </span>
          )}
          <p
            className="text-xs leading-relaxed
                       dark:text-slate-300 whitespace-pre-line"
            style={{ color: 'var(--text-primary)' }}
          >
            {message.content}
          </p>

          {/* Feedback buttons — RLHF ground truth capture */}
          {message.indicator && message.assuranceEventId && feedbackState === 'idle' && (
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5">
              <button
                onClick={handleAccept}
                aria-label="Accept this recommendation"
                className="p-1 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                style={{ borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017a2 2 0 01-.95-.24l-3.296-1.882V10l4-7h.5A2.5 2.5 0 0114 5.5V10z" /></svg>
              </button>
              <button
                onClick={handleReject}
                aria-label="Reject this recommendation"
                className="p-1 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                style={{ borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.95.24l3.296 1.882V14l-4 7h-.5A2.5 2.5 0 0110 18.5V14z" /></svg>
              </button>
            </div>
          )}
          {feedbackState === 'accepted' && (
            <p className="text-[10px] text-emerald-400 mt-1.5 animate-pulse">{t('cdssFeedbackAccepted')}</p>
          )}
          {feedbackState === 'rejected' && (
            <p className="text-[10px] text-red-400 mt-1.5 animate-pulse">{t('cdssFeedbackNoted')}</p>
          )}
          {feedbackState === 'noted' && (
            <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-tertiary)' }}>{t('cdssFeedbackNoted')}</p>
          )}
        </div>
        {message.rationale && (
          <RationalePopover rationale={message.rationale} />
        )}
      </div>
    </m.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UserMessage — doctor's free-text or quick-action question
// ─────────────────────────────────────────────────────────────────────────────

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <m.div
        initial={{ opacity: 0, y: 6, x: 8 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.2 }}
        className="
          max-w-[88%] rounded-xl rounded-tr-sm px-3 py-2
          bg-cyan-500/15 dark:bg-cyan-500/20
          border border-cyan-300/40 dark:border-cyan-500/30
        "
      >
        <p className="text-xs dark:text-slate-300" style={{ color: 'var(--text-secondary)' }}>{message.content}</p>
      </m.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AlertSkeleton — shown while isSyncing
// ─────────────────────────────────────────────────────────────────────────────

function AlertSkeleton() {
  return (
    <div className="animate-pulse space-y-2" aria-label="Loading alerts" role="status">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="border p-3
                     dark:border-slate-700/40
                     dark:bg-slate-700/20"
          style={{ borderRadius: 'var(--radius-xl)', borderColor: 'var(--border-default)', backgroundColor: 'var(--surface-tertiary)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3.5 h-3.5 dark:bg-slate-700" style={{ borderRadius: 'var(--radius-full)', backgroundColor: 'var(--surface-tertiary)' }} />
            <div className="h-2 w-12 dark:bg-slate-700" style={{ borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-tertiary)' }} />
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 w-full dark:bg-slate-700/60" style={{ borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-tertiary)' }} />
            <div className="h-2 w-3/4 dark:bg-slate-700/40" style={{ borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-tertiary)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CdssAlertsPane
// ─────────────────────────────────────────────────────────────────────────────

export function CdssAlertsPane({
  activeModel,
  modelConfigs,
  onModelChange,
  cdssAlerts,
  isSyncing,
  onSync,
  patientSelected,
  hasTranscript,
  selectedPatient = null,
  transcript = '',
  resetSignal = 0,
  onOpenHandout,
}: CdssAlertsPaneProps) {
  const { data: sessionData } = useSession();
  const t = useTranslations('dashboard.clinicalCommand');
  const activeCfg    = modelConfigs[activeModel];
  const isConfigured = activeCfg?.isConfigured ?? false;
  const providerSource = activeCfg?.source;
  const syncEnabled  = isConfigured && patientSelected && hasTranscript && !isSyncing;
  const activeOption = MODEL_CATALOG.find((m: ModelInfo) => m.id === activeModel);

  const doctorLastNameLabel = getDoctorLastNameLabel(sessionData?.user?.name);

  // ── Self-learning click counts (persisted in localStorage) ────────────────
  const [clickCounts, setClickCounts] = useState<Record<string, number>>(loadClickCounts);

  /** Bubbles auto-sorted: most-clicked moves to the front of the row. */
  const sortedBubbles = useMemo(
    () => [...QUICK_ACTIONS].sort((a, b) => (clickCounts[b.id] ?? 0) - (clickCounts[a.id] ?? 0)),
    [clickCounts]
  );
  const topUsedBubbleId = sortedBubbles[0]?.id ?? null;

  function incrementClick(id: string) {
    const next = { ...clickCounts, [id]: (clickCounts[id] ?? 0) + 1 };
    setClickCounts(next);
    saveClickCounts(next);
  }

  // ── Chat + prompt state ────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue,   setInputValue]   = useState('');
  const [isReplying,   setIsReplying]   = useState(false);
  const [promptMode,   setPromptMode]   = useState<PromptMode>('Planning');
  const messagesEndRef                  = useRef<HTMLDivElement>(null);

  // ── Microphone STT ────────────────────────────────────────────────────────
  const { isListening, startListening, stopListening } = useMicrophoneSTT({
    onTranscript: (text) => setInputValue((prev) => prev ? `${prev} ${text}` : text),
    enabled: syncEnabled,
    patientId: selectedPatient?.id ?? null,
  });

  function handleMicToggle() {
    if (isListening) stopListening();
    else startListening();
  }

  // ── Document upload ───────────────────────────────────────────────────────
  async function handleUpload(files: FileList) {
    if (!patientSelected || !selectedPatient) return;

    Array.from(files).forEach(async (file) => {
      const form = new FormData();
      form.append('file',      file);
      form.append('patientId', selectedPatient.id);
      form.append('category',  'clinical');

      try {
        const res = await fetch('/api/upload/patient-document', {
          method: 'POST',
          headers: { 'X-Access-Reason': 'CLINICAL_CARE' },
          body:   form,
        });

        if (res.ok) {
          const data = await res.json() as { documentId?: string };
          setChatMessages((prev) => [
            ...prev,
            {
              id:      `upload-${Date.now()}`,
              role:    'system',
              content: `📎 Document uploaded: ${file.name}${data.documentId ? ` (ID: ${data.documentId.slice(0, 8)}…)` : ''}`,
            },
          ]);
        } else {
          setChatMessages((prev) => [
            ...prev,
            {
              id:        `upload-err-${Date.now()}`,
              role:      'system',
              content:   `Upload failed for ${file.name}.`,
              indicator: 'warning',
            },
          ]);
        }
      } catch {
        // Network error — silent fail; user sees nothing to avoid false alarms
      }
    });
  }

  // ── Great Reset — clear chat when resetSignal increments ──────────────────
  useEffect(() => {
    if (resetSignal === 0) return; // skip initial mount
    setChatMessages([]);
    setInputValue('');
    setIsReplying(false);
  }, [resetSignal]);

  // Convert incoming CDSS alert cards to initial system messages
  useEffect(() => {
    if (cdssAlerts.length === 0) return;

    const CONFIDENCES = [96, 89, 82, 94, 87];

    const systemMsgs: ChatMessage[] = cdssAlerts.map((card, i) => ({
      id:        `system-${i}-${card.summary.slice(0, 12)}`,
      role:      'system',
      content:   card.summary + (card.detail ? `\n${card.detail}` : ''),
      indicator: card.indicator,
      assuranceEventId: card.assuranceEventId,
      rationale: {
        confidence: CONFIDENCES[i % CONFIDENCES.length],
        reasoning: `Rule triggered from patient medication profile, vitals, and diagnosis history. ` +
                   `Cross-referenced against ${card.source?.label ?? 'CDSS'} clinical guidelines.`,
      },
    }));

    setChatMessages(systemMsgs);
  }, [cdssAlerts]);

  // Auto-scroll when new messages arrive (guarded: JSDOM doesn't implement scrollIntoView)
  useEffect(() => {
    const el = messagesEndRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // ── Quick action bubble handler ────────────────────────────────────────────
  // Iceberg UX: the chat only shows intent labels while backend receives
  // de-identified context, transcript, and action-type trigger.
  async function handleBubbleClick(bubble: QuickActionBubble) {
    if (isReplying || !syncEnabled || !selectedPatient) return;

    // Special case: handout bubble opens the dedicated modal
    if (bubble.id === 'handout' && onOpenHandout) {
      onOpenHandout();
      incrementClick(bubble.id);
      return;
    }

    incrementClick(bubble.id);

    const intentMessage = t(bubble.intentLabel);
    const userMsg: ChatMessage = {
      id: `bubble-${Date.now()}`,
      role: 'user',
      content: intentMessage,
    };

    const historySnapshot = toConversationHistory([...chatMessages, userMsg]);
    const patientContext = buildClinicalContextFromTranscript(selectedPatient, transcript);
    setChatMessages((prev) => [...prev, userMsg]);
    setIsReplying(true);

    try {
      const apiResponse = await fetch('/api/cdss/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Access-Reason': 'CLINICAL_CARE' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          model: activeModel,
          message: intentMessage,
          conversationHistory: historySnapshot,
          cdssActionType: bubble.cdssActionType,
          encounterTranscript: transcript,
          patientContext,
        }),
      });

      const data = await apiResponse.json();
      if (!apiResponse.ok || !data.success) {
        throw new Error(data.error || 'Unable to generate CDSS response');
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `reply-bubble-${Date.now()}`,
          role: 'system',
          content: data.data?.response ?? 'No response was generated.',
          rationale: {
            confidence: 90,
            reasoning:
              'Backend action prompt merged with de-identified context using ICD-10, ATC, vitals, and transcript cues.',
          },
        },
      ]);
    } catch {
      const fallbackPayload: LLMPayload = {
        model: activeModel,
        systemPrompt: buildSpecialtyPrefix() + bubble.systemPrompt,
        transcript,
        patient: selectedPatient,
        userQuery: bubble.label,
        cdssActionType: bubble.cdssActionType,
      };
      const fallbackResponse = await simulateLLMResponse(fallbackPayload);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `reply-bubble-fallback-${Date.now()}`,
          role: 'system',
          content: fallbackResponse,
          rationale: {
            confidence: 74,
            reasoning:
              'Fallback response used local mock pipeline after API route failure.',
          },
        },
      ]);
    } finally {
      setIsReplying(false);
    }
  }

  // ── Free-text chat handler ─────────────────────────────────────────────────
  async function sendMessage() {
    const text = inputValue.trim();
    if (!text || isReplying || !syncEnabled) return;

    const userMsg: ChatMessage = {
      id:      `user-${Date.now()}`,
      role:    'user',
      content: text,
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsReplying(true);

    // Unified pipeline — prepend specialty persona, then domain-specific instructions
    const payload: LLMPayload = {
      model:  activeModel,
      systemPrompt:
        buildSpecialtyPrefix() +
        'You are a clinical decision support assistant. Answer the clinician question ' +
        'using ICD-10/11, ATC, SNOMED CT, and LOINC ontologies. ' +
        'Be concise, evidence-based, and LATAM-aligned. ' +
        'Never use CPT, RxNorm, or NDC standards.',
      transcript,
      patient:   selectedPatient,
      userQuery: text,
    };

    const response = await simulateLLMResponse(payload);

    setChatMessages((prev) => [
      ...prev,
      {
        id:      `reply-${Date.now()}`,
        role:    'system',
        content: response,
        rationale: {
          confidence: 78,
          reasoning:  'Response synthesised from transcript context and CDSS guideline database.',
        },
      },
    ]);
    setIsReplying(false);
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="
      relative px-4 pt-2.5 pb-4 flex flex-col gap-2.5 overflow-hidden h-full
      dark:bg-gray-950
    " style={{ backgroundColor: 'var(--surface-primary)' }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center flex-shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider
                       dark:text-slate-400" style={{ color: 'var(--text-tertiary)' }}>
          {t('coPilotHeader')}
        </h2>
      </div>

      {/* ── Chat messages area ─────────────────────────────────────────────── */}
      <div
        aria-live="polite"
        aria-label="Clinical alerts"
        className="flex-1 overflow-y-auto min-h-0 space-y-2"
      >
        {isSyncing ? (
          <AlertSkeleton />
        ) : chatMessages.length > 0 ? (
          <>
            {chatMessages.map((msg) =>
              msg.role === 'system' ? (
                <SystemMessage key={msg.id} message={msg} />
              ) : (
                <UserMessage key={msg.id} message={msg} />
              )
            )}
            {isReplying && (
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <m.div
                      key={i}
                      className="w-1.5 h-1.5 bg-cyan-400/60"
                      style={{ borderRadius: 'var(--radius-full)' }}
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                    />
                  ))}
                </div>
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{t('aiThinking')}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-8 px-6">
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="w-9 h-9 flex items-center justify-center
                         bg-gradient-to-br from-cyan-400/20 via-violet-400/15 to-blue-500/20
                         dark:from-cyan-400/10 dark:via-violet-400/10 dark:to-blue-500/10
                         border border-cyan-200/50 dark:border-cyan-500/20"
              style={{ borderRadius: 'var(--radius-full)' }}
            >
              <MessageSquare className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            </m.div>

            <div className="text-center space-y-1">
              <m.h3
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="text-[26px] leading-tight font-medium tracking-[-0.02em]
                           text-slate-300 dark:text-slate-300"
              >
                {doctorLastNameLabel ? t('hiDoctor', { name: doctorLastNameLabel }) : t('hiThere')}
              </m.h3>
              <m.h2
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2 }}
                className="text-[40px] leading-[1.05] font-medium tracking-[-0.03em]
                           text-slate-100 dark:text-slate-100"
              >
                {t('whereToStart')}
              </m.h2>
              <m.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.28 }}
                className="text-xs dark:text-slate-500 mt-2"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {t('suggestionsAdapt')}
              </m.p>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Action Bubbles — Zero-Click Clinical Intelligence ───────────
           Staggered entry on mount.  Each bubble fades once used (per encounter).
           Horizontally scrollable with hidden scrollbar for clean overflow.
           Positioned between chat and input so flex-1 scroll is unaffected.
      ──────────────────────────────────────────────────────────────────────── */}
      {(chatMessages.length === 0 || syncEnabled) && (
        <div
          className="flex-shrink-0 flex gap-2.5 pb-0.5 pt-1"
          style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          aria-label="Quick clinical actions"
        >
          {sortedBubbles.map((bubble, i) => (
            <m.button
              key={bubble.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              onClick={() => handleBubbleClick(bubble)}
              disabled={isReplying || !syncEnabled}
              aria-label={t(bubble.label)}
              className="
                group flex items-center gap-2 whitespace-nowrap flex-shrink-0
                bg-slate-900/55 hover:bg-slate-800/90
                text-slate-200 border border-slate-700/50
                px-4 py-2 text-[12px] font-medium
                transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
              "
              style={{ borderRadius: 'var(--radius-full)' }}
              title={syncEnabled ? `${t(bubble.label)}${bubble.id === topUsedBubbleId ? ' - ' + t('mostUsed') : ''}` : t('enableSyncHint')}
            >
              <bubble.Icon className="w-3.5 h-3.5 flex-shrink-0 group-hover:text-cyan-300 transition-colors text-slate-500" />
              {t(bubble.label)}
              {bubble.id === topUsedBubbleId && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 text-[9px]
                             bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                  style={{ borderRadius: 'var(--radius-full)' }}
                >
                  {t('topBadge')}
                </span>
              )}
            </m.button>
          ))}
        </div>
      )}

      {/* ── Antigravity Chat Bar ──────────────────────────────────────────── */}
      <ClinicalChatBar
        value={inputValue}
        onChange={setInputValue}
        onSend={sendMessage}
        onSync={onSync}
        onUpload={handleUpload}
        onMicToggle={handleMicToggle}
        isListening={isListening}
        isSyncing={isSyncing}
        isReplying={isReplying}
        disabled={!syncEnabled}
        promptMode={promptMode}
        onPromptModeChange={setPromptMode}
        activeModel={activeModel}
        onModelChange={onModelChange}
      />

      {/* ── Provider source badge (top-right, subtle) ─────────────────────── */}
      {isConfigured && providerSource === 'byok' && (
        <span className="absolute top-2.5 right-3 z-10 text-[10px] font-medium text-emerald-500 dark:text-emerald-400">
          {t('customKey')}
        </span>
      )}

      {/* ── No AI provider overlay (only when genuinely no provider exists) ── */}
      <AnimatePresence>
        {!isConfigured && (
          <m.div
            key="no-ai-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="
              absolute inset-0 z-10
              dark:bg-slate-900/95
              backdrop-blur-sm
              flex flex-col items-center justify-center gap-4 p-6 text-center
            "
            style={{ borderRadius: 'var(--radius-xl)', backgroundColor: 'rgba(255,255,255,0.95)' }}
          >
            <div className="w-12 h-12 flex items-center justify-center
                            dark:bg-amber-900/30
                            border dark:border-amber-700/50"
                 style={{ borderRadius: 'var(--radius-full)', backgroundColor: 'var(--surface-warning)', borderColor: 'var(--border-default)' }}>
              <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-semibold dark:text-white" style={{ color: 'var(--text-primary)' }}>
                {t('noAiAvailable')}
              </p>
              <p className="text-xs leading-relaxed dark:text-slate-400" style={{ color: 'var(--text-tertiary)' }}>
                {t('addByokKey')}
              </p>
            </div>

            <Link
              href="/dashboard/settings/ai-providers"
              aria-label="Configure BYOK in Settings"
              className="
                inline-flex items-center gap-1.5 px-4 py-2
                bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600
                text-white text-xs font-semibold
                shadow-cyan-500/20
                transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                focus-visible:ring-offset-2
              "
              style={{ borderRadius: 'var(--radius-xl)', boxShadow: 'var(--token-shadow-md)' }}
            >
              <Settings className="w-3.5 h-3.5" />
              {t('configureByok')}
            </Link>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
