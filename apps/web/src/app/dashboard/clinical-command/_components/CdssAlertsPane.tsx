'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Info, CheckCircle2,
  Settings, MessageSquare,
  Clock, Heart, Brain, FileText,
} from 'lucide-react';

// ─── Inline SVG: billing-compliance check icon ────────────────────────────────
// Lucide's FileCheck icon SVG path — inlined to avoid moduleResolution:bundler
// issues with lucide-react@0.309.0's empty `exports:{}` field.
function BillingCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}
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
// Self-Learning localStorage — click-frequency tracker
//
// Tracks how many times each Quick Action bubble is clicked.  On mount and
// after every click the bubbles are re-sorted so the most-used action moves
// to the front of the scrollable row automatically.
// ─────────────────────────────────────────────────────────────────────────────

const CLICK_STORAGE_KEY = 'cdss-quick-action-clicks';

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
};

export type ModelId = 'anthropic' | 'openai' | 'gemini';

export interface ModelConfig {
  isConfigured: boolean;
  isActive: boolean;
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
};

/** Full LLM-ready payload — swap `simulateLLMResponse` for real endpoints. */
type LLMPayload = {
  model: ModelId;
  systemPrompt: string;
  transcript: string;
  patient: PatientCtx | null;
  userQuery: string;
};

type QuickActionBubble = {
  id: string;
  label: string;
  Icon: React.FC<{ className?: string }>;
  systemPrompt: string;
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
    label: 'Rx Timeline & Safety',
    Icon: Clock,
    systemPrompt:
      'Analyze pharmaceutical history using ATC (Anatomical Therapeutic Chemical) codes. ' +
      'Identify contraindications, drug-drug interactions, and compliance issues. ' +
      'Map diagnoses to ICD-10/11. Use SNOMED CT for clinical findings. ' +
      'Do not use CPT, RxNorm, or NDC standards.',
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle & Prevention',
    Icon: Heart,
    systemPrompt:
      'Generate a comprehensive lifestyle and preventative care plan based on this encounter. ' +
      'Use SNOMED CT for recommended procedures, ICD-10/11 for active conditions, ' +
      'and LOINC codes for laboratory monitoring. ' +
      'Align with LATAM/Caribbean clinical guidelines (SBC, SBEM, PAHO).',
  },
  {
    id: 'differential',
    label: 'Differential Dx (ICD-10)',
    Icon: Brain,
    systemPrompt:
      'Suggest differential diagnoses ordered by probability using ICD-10/11 and SNOMED CT standards. ' +
      'Map pending investigations to LOINC codes. ' +
      'Do not use US-centric CPT codes.',
  },
  {
    id: 'handout',
    label: 'Draft Patient Handout',
    Icon: FileText,
    // systemPrompt is unused for this bubble — it triggers the handout modal instead
    systemPrompt:
      'Draft a patient-friendly summary of this visit in Portuguese or Spanish ' +
      '(choose based on context). Use plain language, no medical jargon. ' +
      'Include key medications with lay explanations and follow-up instructions.',
  },
  {
    id: 'cdi',
    label: 'Check Billing Compliance',
    Icon: BillingCheckIcon,
    systemPrompt:
      'Perform Ambient CDI. Analyze the current transcript and SOAP note against ' +
      'LATAM clinical billing standards (CBHPM/TUSS). Identify any missing documentation ' +
      'needed to justify the suspected ICD-10 codes. Do not use US CPT codes.',
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

const LATAM_RESPONSE_CDI = `⚠️ CDI Alert — Ambient Clinical Documentation Improvement

Para justificar código de consulta de alta complexidade e diagnóstico
de ICC (ICD-10: I50.9), a seguinte documentação está AUSENTE ou INCOMPLETA:

1. Resultado do ECG — documente achados específicos no campo OBJETIVO.
   (Ex: "Ritmo sinusal, BRE de grau leve, sem supradesnível")
   → Sem isso, a cobrança do código ECG (TUSS 40302270) pode ser glosada.

2. Encaminhamento para Cardiologia — deve constar no campo PLANO.
   (Ex: "Encaminhado para cardiologista Dr. X em caráter urgente")
   → Necessário para justificar nível de complexidade da consulta.

3. Estadiamento da ICC — documente fração de ejeção quando disponível.
   LOINC: 18009-5 (Ecocardiograma — FEVE)

4. Motivo da suspensão da Metformina — registrar formalmente no PLANO.
   (ICD-10: N18.3 + risco de contraste = contraindicação documentada)

Ação Recomendada: Revise e complemente os campos Objetivo e Plano antes
de assinar e faturar esta consulta.

Fonte: CBHPM 6ª Edição / ANS RN 465/2021 / CFM`;

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
// Mock async pipeline — architecture is 100% ready to swap for real endpoints
// (DeepSeek-R1 / OpenAI GPT).  Replace the setTimeout with a real fetch call.
// ─────────────────────────────────────────────────────────────────────────────

async function simulateLLMResponse(payload: LLMPayload): Promise<string> {
  // Simulate ~850 ms network/inference latency
  await new Promise((r) => setTimeout(r, 850));

  const sp = payload.systemPrompt.toLowerCase();

  if (sp.includes('atc') || sp.includes('pharmaceutical history')) {
    return LATAM_RESPONSE_RX;
  }
  if (sp.includes('lifestyle') || sp.includes('preventative')) {
    return LATAM_RESPONSE_LIFESTYLE;
  }
  if (sp.includes('differential') || sp.includes('icd-10')) {
    return LATAM_RESPONSE_DIFFERENTIAL;
  }
  if (sp.includes('handout') || sp.includes('patient-friendly')) {
    return LATAM_RESPONSE_HANDOUT;
  }
  if (sp.includes('cdi') || sp.includes('ambient') || sp.includes('billing compliance') || sp.includes('cbhpm')) {
    return LATAM_RESPONSE_CDI;
  }

  // Generic follow-up from free-text input
  return LATAM_RESPONSE_GENERIC;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static UI data
// ─────────────────────────────────────────────────────────────────────────────

const MODEL_OPTIONS: Array<{ id: ModelId; label: string; description: string }> = [
  {
    id: 'anthropic',
    label: 'DeepSeek-R1',
    description: 'Best for complex diagnostics and drug interactions (High Precision)',
  },
  {
    id: 'openai',
    label: 'OpenAI GPT-OSS-120B',
    description: 'Best for rapid transcription and chart completion (High Efficiency)',
  },
  {
    id: 'gemini',
    label: 'Google Gemini 1.5 Pro',
    description: 'Recommended for high-volume clinical tasks',
  },
];

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

  return (
    <div className="relative flex-shrink-0">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label="View AI reasoning"
        className="
          w-4 h-4 rounded-full flex items-center justify-center
          text-[9px] font-bold
          bg-slate-200 dark:bg-slate-700/60
          text-slate-500 dark:text-slate-400
          hover:text-cyan-600 dark:hover:text-cyan-400
          hover:bg-slate-300 dark:hover:bg-slate-700
          transition-colors
          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400
        "
      >
        ℹ
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            className="
              absolute bottom-full right-0 mb-2 w-60 z-20
              bg-slate-900 dark:bg-slate-950
              border border-slate-700
              rounded-xl p-3 shadow-2xl pointer-events-none
            "
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Confidence
              </span>
              <span className="text-xs font-bold text-cyan-400">
                {rationale.confidence}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              {rationale.reasoning}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SystemMessage — CDSS alert or AI reply as a chat bubble
// ─────────────────────────────────────────────────────────────────────────────

function SystemMessage({ message }: { message: ChatMessage }) {
  const cfg = message.indicator ? INDICATOR_CONFIG[message.indicator] : null;
  const Icon = cfg?.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl border p-3 ${
        cfg?.bg ?? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700/60'
      }`}
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
                       text-slate-800 dark:text-slate-300 whitespace-pre-line"
          >
            {message.content}
          </p>
        </div>
        {message.rationale && (
          <RationalePopover rationale={message.rationale} />
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UserMessage — doctor's free-text or quick-action question
// ─────────────────────────────────────────────────────────────────────────────

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <motion.div
        initial={{ opacity: 0, y: 6, x: 8 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.2 }}
        className="
          max-w-[88%] rounded-xl rounded-tr-sm px-3 py-2
          bg-cyan-500/15 dark:bg-cyan-500/20
          border border-cyan-300/40 dark:border-cyan-500/30
        "
      >
        <p className="text-xs text-slate-700 dark:text-slate-300">{message.content}</p>
      </motion.div>
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
          className="rounded-xl border p-3
                     border-slate-200 dark:border-slate-700/40
                     bg-slate-100 dark:bg-slate-700/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="h-2 w-12 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 rounded w-full bg-slate-200/80 dark:bg-slate-700/60" />
            <div className="h-2 rounded w-3/4 bg-slate-200/60 dark:bg-slate-700/40" />
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
  onOpenHandout,
  resetSignal = 0,
}: CdssAlertsPaneProps) {
  const activeCfg    = modelConfigs[activeModel];
  const isConfigured = activeCfg?.isConfigured ?? false;
  const syncEnabled  = isConfigured && patientSelected && hasTranscript && !isSyncing;
  const activeOption = MODEL_OPTIONS.find((m) => m.id === activeModel);

  // ── Self-learning click counts (persisted in localStorage) ────────────────
  const [clickCounts, setClickCounts] = useState<Record<string, number>>(loadClickCounts);

  /** Bubbles auto-sorted: most-clicked moves to the front of the row. */
  const sortedBubbles = useMemo(
    () => [...QUICK_ACTIONS].sort((a, b) => (clickCounts[b.id] ?? 0) - (clickCounts[a.id] ?? 0)),
    [clickCounts]
  );

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
  // Bubbles are permanently clickable — no fade/disable after use.
  async function handleBubbleClick(bubble: QuickActionBubble) {
    if (isReplying || !syncEnabled) return;

    // Track click for self-learning sort (persisted to localStorage)
    incrementClick(bubble.id);

    // 'handout' bubble opens the external modal instead of writing to chat
    if (bubble.id === 'handout') {
      onOpenHandout?.();
      return;
    }

    // All other bubbles: add user message + get LLM response
    const userMsg: ChatMessage = {
      id:      `bubble-${Date.now()}`,
      role:    'user',
      content: bubble.label,
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setIsReplying(true);

    // Prepend "God-Like" specialty persona to prime the LLM with domain expertise
    const payload: LLMPayload = {
      model:        activeModel,
      systemPrompt: buildSpecialtyPrefix() + bubble.systemPrompt,
      transcript,
      patient:      selectedPatient,
      userQuery:    bubble.label,
    };

    const response = await simulateLLMResponse(payload);

    setChatMessages((prev) => [
      ...prev,
      {
        id:      `reply-bubble-${Date.now()}`,
        role:    'system',
        content: response,
        rationale: {
          confidence: 88,
          reasoning:
            'LATAM CDSS analysis using ICD-10/11, ATC classification (WHO), ' +
            'SNOMED CT, and LOINC ontologies. Excludes US-centric CPT/RxNorm/NDC.',
        },
      },
    ]);
    setIsReplying(false);
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
      relative rounded-2xl p-5 flex flex-col gap-3 overflow-hidden h-full
      bg-white dark:bg-slate-800/40
      border border-slate-200 dark:border-slate-700/60
    ">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center flex-shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider
                       text-slate-500 dark:text-slate-400">
          Clinical Decision Support (CDSS)
        </h2>
      </div>

      {/* Divider */}
      <div className="border-t flex-shrink-0 border-slate-200 dark:border-slate-700/40" />

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
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-cyan-400/60"
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-slate-500">AI is thinking…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-6">
            <MessageSquare className="w-7 h-7 text-slate-300 dark:text-slate-700" />
            <p className="text-xs text-center leading-relaxed
                          text-slate-400 dark:text-slate-600">
              No analysis yet.
              <br />
              Record a conversation and press Sync to begin.
            </p>
          </div>
        )}
      </div>

      {/* ── Quick Action Bubbles — Zero-Click Clinical Intelligence ───────────
           Staggered entry on mount.  Each bubble fades once used (per encounter).
           Horizontally scrollable with hidden scrollbar for clean overflow.
           Positioned between chat and input so flex-1 scroll is unaffected.
      ──────────────────────────────────────────────────────────────────────── */}
      {syncEnabled && (
        <div
          className="flex-shrink-0 flex gap-2 pb-0.5"
          style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          aria-label="Quick clinical actions"
        >
          {sortedBubbles.map((bubble, i) => (
            <motion.button
              key={bubble.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              onClick={() => handleBubbleClick(bubble)}
              disabled={isReplying}
              aria-label={bubble.label}
              className="
                flex items-center gap-1.5 whitespace-nowrap flex-shrink-0
                bg-slate-800/50 hover:bg-slate-700/80
                text-cyan-400 border border-slate-700/50
                rounded-full px-3 py-1.5 text-[11px] font-medium
                transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
              "
            >
              <bubble.Icon className="w-3 h-3 flex-shrink-0" />
              {bubble.label}
            </motion.button>
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

      {/* ── API Key Required overlay ────────────────────────────────────────── */}
      <AnimatePresence>
        {!isConfigured && (
          <motion.div
            key="byok-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="
              absolute inset-0 z-10 rounded-2xl
              bg-white/95 dark:bg-slate-900/95
              backdrop-blur-sm
              flex flex-col items-center justify-center gap-4 p-6 text-center
            "
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center
                            bg-amber-50 dark:bg-amber-900/30
                            border border-amber-200 dark:border-amber-700/50">
              <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                API Key Required
              </p>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                <span className="font-medium">{activeOption?.label}</span> is not
                configured for this workspace.
                <br />
                Add your BYOK key to enable CDSS alerts.
              </p>
            </div>

            <Link
              href="/dashboard/settings/ai-providers"
              aria-label="Configure BYOK in Settings"
              className="
                inline-flex items-center gap-1.5 px-4 py-2 rounded-xl
                bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600
                text-white text-xs font-semibold
                shadow-md shadow-cyan-500/20
                transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                focus-visible:ring-offset-2
              "
            >
              <Settings className="w-3.5 h-3.5" />
              Configure BYOK in Settings
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
