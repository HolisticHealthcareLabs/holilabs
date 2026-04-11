'use client';

import { FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import { m } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useLanguage } from '@/hooks/useLanguage';

// ─────────────────────────────────────────────────────────────────────────────
// Temporal SOAP alignment
//
// Each threshold maps to the exact TRANSCRIPT_CHUNKS index at which the
// relevant clinical data first appears in the live transcript:
//
//  S — Subjective  chunk  5  Patient describes chief complaint ("five days...")
//  O — Objective   chunk 10  Doctor reads vitals (BP 162/95, SpO2 93%...)
//  A — Assessment  chunk 14  Doctor gives clinical impression (S3 gallop, CHF...)
//  P — Plan        chunk 15  Doctor orders tests (ECG, Troponin, BNP...)
//
// Sections below their threshold show "Listening…" — a live indicator that
// tells the doctor exactly which section the AI is currently populating.
// ─────────────────────────────────────────────────────────────────────────────

export const SOAP_THRESHOLDS = { S: 5, O: 10, A: 14, P: 15 } as const;

export const SOAP_DEMO_CONTENT = {
  S: 'Patient reports precordial pain for 3 days, radiating to the left arm, with cold sweats. Worsens with physical exertion.',
  O: 'BP: 162/95 mmHg · HR: 94 bpm · SpO2: 93% · ECG: ordered urgent · BNP: pending · Troponin I: pending',
  A: 'Acute decompensated heart failure (primary) · Possible ACS given family history. Risk factors: CKD Stage 3, T2DM, HTN, dyslipidemia.',
  P: '1. Urgent 12-lead ECG + Troponin I series\n2. BNP, CMP, chest X-ray stat\n3. IV Furosemide 80 mg — hold oral Metformin\n4. Cardiology consult · return in 48 h or SOS',
};

// Locale-keyed SOAP content with proper clinical terminology
export const SOAP_DEMO_BY_LOCALE: Record<string, typeof SOAP_DEMO_CONTENT> = {
  en: SOAP_DEMO_CONTENT,
  pt: {
    S: 'Paciente refere dor precordial há 3 dias, com irradiação para membro superior esquerdo, acompanhada de sudorese fria. Piora ao esforço físico.',
    O: 'PA: 162/95 mmHg · FC: 94 bpm · SpO2: 93% · ECG: solicitado urgente · BNP: pendente · Troponina I: pendente',
    A: 'Insuficiência cardíaca descompensada (diagnóstico principal) · Possível SCA dado histórico familiar. Fatores de risco: DRC Estágio 3, DM2, HAS, dislipidemia.',
    P: '1. ECG de 12 derivações urgente + série de Troponina I\n2. BNP, painel metabólico, radiografia de tórax STAT\n3. Furosemida 80 mg IV — suspender Metformina oral\n4. Parecer cardiológico · retorno em 48 h ou SOS',
  },
  es: {
    S: 'Paciente refiere dolor precordial de 3 días de evolución, con irradiación a miembro superior izquierdo, acompañado de diaforesis. Empeora con el esfuerzo físico.',
    O: 'PA: 162/95 mmHg · FC: 94 lpm · SpO2: 93% · ECG: solicitado urgente · BNP: pendiente · Troponina I: pendiente',
    A: 'Insuficiencia cardíaca descompensada (diagnóstico principal) · Posible SCA dado antecedentes familiares. Factores de riesgo: ERC Estadio 3, DM2, HTA, dislipidemia.',
    P: '1. ECG de 12 derivaciones urgente + serie de Troponina I\n2. BNP, panel metabólico, radiografía de tórax STAT\n3. Furosemida 80 mg IV — suspender Metformina oral\n4. Interconsulta cardiología · control en 48 h o SOS',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SoapField — individual S/O/A/P section with three visual states:
//   • unlocked = false → "Listening…" pulse dot (section not yet spoken)
//   • unlocked = true  → fade-in content text
// ─────────────────────────────────────────────────────────────────────────────

interface SoapFieldProps {
  label:    string;
  color:    string;
  content:  string;
  unlocked: boolean;
}

function SoapField({ label, color, content, unlocked }: SoapFieldProps) {
  const t = useTranslations('dashboard.clinicalCommand');
  return (
    <div className="flex flex-col">
      <span className={`text-sm font-extrabold uppercase tracking-widest flex-shrink-0 pb-1.5 leading-none ${color}`}>
        {label}
      </span>

      {unlocked ? (
        <m.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="text-xs leading-relaxed whitespace-pre-line mt-1.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          {content}
        </m.p>
      ) : (
        /* "Listening…" state — shown before this section's transcript is spoken */
        <div className="flex items-center gap-2 mt-1 py-0.5" aria-hidden="true">
          <m.span
            className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 flex-shrink-0"
            style={{ borderRadius: 'var(--radius-full)' }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-[11px] italic select-none" style={{ color: 'var(--text-muted)' }}>
            {t('soapListening')}
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SoapSkeleton: staggered loader that mimics the S-O-A-P structure
//
// Each section fades in sequentially with increasing delays, giving the
// visual impression that the AI is "thinking" through each SOAP field.
// ─────────────────────────────────────────────────────────────────────────────

const SKELETON_SECTIONS = [
  { label: 'H', accent: 'bg-cyan-300 dark:bg-cyan-700',    delay: 0 },
  { label: 'F', accent: 'bg-emerald-300 dark:bg-emerald-700', delay: 0.15 },
  { label: 'I', accent: 'bg-amber-300 dark:bg-amber-700',  delay: 0.30 },
  { label: 'P', accent: 'bg-rose-300 dark:bg-rose-700',    delay: 0.45 },
] as const;

function SoapSkeleton() {
  const t = useTranslations('dashboard.clinicalCommand');
  return (
    <div
      className="flex flex-col gap-5 pb-2"
      role="status"
      aria-label="Generating SOAP note"
    >
      {SKELETON_SECTIONS.map(({ label, accent, delay }) => (
        <m.div
          key={label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay, duration: 0.35, ease: 'easeOut' }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <div className={`w-5 h-3.5 ${accent} animate-pulse`} style={{ borderRadius: 'var(--radius-sm)' }} />
            <div
              className="h-3 w-24 bg-slate-200 dark:bg-slate-700 animate-pulse"
              style={{ borderRadius: 'var(--radius-md)', animationDelay: `${delay * 1000}ms` }}
            />
          </div>
          <div className="space-y-1.5 pl-0.5">
            <div
              className="h-2.5 w-full bg-slate-200/80 dark:bg-slate-700/60 animate-pulse"
              style={{ borderRadius: 'var(--radius-md)', animationDelay: `${delay * 1000}ms` }}
            />
            <div
              className="h-2.5 w-5/6 bg-slate-200/60 dark:bg-slate-700/40 animate-pulse"
              style={{ borderRadius: 'var(--radius-md)', animationDelay: `${(delay + 0.1) * 1000}ms` }}
            />
            <div
              className="h-2.5 w-2/3 bg-slate-200/40 dark:bg-slate-700/20 animate-pulse"
              style={{ borderRadius: 'var(--radius-md)', animationDelay: `${(delay + 0.2) * 1000}ms` }}
            />
          </div>
        </m.div>
      ))}

      <m.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="text-[10px] text-center pt-1"
        style={{ color: 'var(--text-muted)' }}
      >
        {t('soapStructuring')}
      </m.p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SoapErrorBanner: shown when SOAP generation fails or times out.
// Preserves the transcript and offers a manual retry.
// ─────────────────────────────────────────────────────────────────────────────

function SoapErrorBanner({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  const t = useTranslations('dashboard.clinicalCommand');
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="
        flex flex-col items-center gap-3 py-5 px-4
        border
        bg-red-50/60 dark:bg-red-500/5
        border-red-200 dark:border-red-500/20
      "
      style={{ borderRadius: 'var(--radius-xl)' }}
    >
      <div
        className="
          w-9 h-9 flex items-center justify-center
          bg-red-100 dark:bg-red-500/15
          border border-red-200 dark:border-red-500/25
        "
        style={{ borderRadius: 'var(--radius-full)' }}
      >
        <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('soapGenerationFailed')}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          {error}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="
          flex items-center gap-2 px-4 py-2 text-xs font-semibold
          bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-white
          shadow-cyan-500/20
          transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
        "
        style={{ borderRadius: 'var(--radius-xl)', boxShadow: 'var(--token-shadow-md)' }}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        {t('soapRetryGeneration')}
      </button>
    </m.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SoapNotePane
// ─────────────────────────────────────────────────────────────────────────────

interface SoapNotePaneProps {
  segmentCount:      number;
  patientSelected:   boolean;
  onSignAndBill:     () => void;
  isGeneratingSoap?: boolean;
  isCompleted?:      boolean;
  soapError?:        string | null;
  onRetry?:          () => void;
  /** Override SOAP content (e.g. from persona). Falls back to SOAP_DEMO_CONTENT. */
  soapContent?:      { S: string; O: string; A: string; P: string } | null;
}

export function SoapNotePane({
  segmentCount,
  patientSelected,
  onSignAndBill,
  isGeneratingSoap = false,
  isCompleted = false,
  soapError = null,
  onRetry,
  soapContent,
}: SoapNotePaneProps) {
  const t = useTranslations('dashboard.clinicalCommand');
  const { language } = useLanguage();
  const soap = soapContent ?? SOAP_DEMO_BY_LOCALE[language] ?? SOAP_DEMO_CONTENT;
  const isPopulating = segmentCount > 0;
  const hasError     = !!soapError;
  const canSign      = patientSelected && isCompleted;

  // Status label for the header
  const statusLabel = isGeneratingSoap
    ? t('soapGenerating')
    : isCompleted
      ? t('soapComplete')
      : hasError
        ? t('soapError')
        : isPopulating
          ? t('soapAutoFill')
          : null;

  const statusColor = isGeneratingSoap
    ? 'text-amber-500 dark:text-amber-400'
    : isCompleted
      ? 'text-emerald-500 dark:text-emerald-400'
      : hasError
        ? 'text-red-500 dark:text-red-400'
        : 'text-cyan-600 dark:text-cyan-500/70';

  return (
    <div className="
      p-4 flex flex-col gap-3 overflow-hidden
    " style={{ backgroundColor: 'var(--surface-primary)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <h2 className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}>
          {t('soapNote')}
        </h2>
        {statusLabel ? (
          <span className={`ml-auto text-[10px] font-medium ${statusColor}`}>
            {statusLabel}
          </span>
        ) : (
          <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {t('soapAwaiting')}
          </span>
        )}
      </div>

      {/* SOAP body: skeleton / error / content */}
      <div className="flex-1 overflow-y-auto">
        {isGeneratingSoap ? (
          <SoapSkeleton />
        ) : hasError && onRetry ? (
          <div className="flex flex-col gap-4">
            <SoapErrorBanner error={soapError} onRetry={onRetry} />
            <div className="flex flex-col gap-5 pb-2 opacity-60">
              <SoapField
                label={t('soapSubjective')}
                color="text-cyan-600 dark:text-cyan-500"
                content={soap.S}
                unlocked={segmentCount >= SOAP_THRESHOLDS.S}
              />
              <SoapField
                label={t('soapObjective')}
                color="text-emerald-600 dark:text-emerald-500"
                content={soap.O}
                unlocked={segmentCount >= SOAP_THRESHOLDS.O}
              />
              <SoapField
                label={t('soapAssessment')}
                color="text-amber-600 dark:text-amber-500"
                content={soap.A}
                unlocked={segmentCount >= SOAP_THRESHOLDS.A}
              />
              <SoapField
                label={t('soapPlan')}
                color="text-rose-600 dark:text-rose-500"
                content={soap.P}
                unlocked={segmentCount >= SOAP_THRESHOLDS.P}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 pb-2">
            <SoapField
              label={t('soapSubjective')}
              color="text-cyan-600 dark:text-cyan-500"
              content={soap.S}
              unlocked={isCompleted || segmentCount >= SOAP_THRESHOLDS.S}
            />
            <SoapField
              label={t('soapObjective')}
              color="text-emerald-600 dark:text-emerald-500"
              content={soap.O}
              unlocked={isCompleted || segmentCount >= SOAP_THRESHOLDS.O}
            />
            <SoapField
              label={t('soapAssessment')}
              color="text-amber-600 dark:text-amber-500"
              content={soap.A}
              unlocked={isCompleted || segmentCount >= SOAP_THRESHOLDS.A}
            />
            <SoapField
              label={t('soapPlan')}
              color="text-rose-600 dark:text-rose-500"
              content={soap.P}
              unlocked={isCompleted || segmentCount >= SOAP_THRESHOLDS.P}
            />
          </div>
        )}
      </div>

      {/* Sign & Bill */}
      <m.button
        onClick={onSignAndBill}
        disabled={!canSign}
        whileHover={canSign ? { scale: 1.02 } : {}}
        whileTap={canSign ? { scale: 0.97 } : {}}
        aria-label="Sign and bill this encounter"
        className={`
          flex-shrink-0 w-full flex items-center justify-center
          py-2 text-xs font-semibold transition-all
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
          focus-visible:ring-offset-2
          focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900
          ${canSign
            ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white shadow-cyan-500/20'
            : 'cursor-not-allowed'
          }
        `}
        style={{
          borderRadius: 'var(--radius-xl)',
          ...(canSign
            ? { boxShadow: 'var(--token-shadow-md)' }
            : {
                backgroundColor: 'var(--surface-tertiary)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-default)',
              }
          ),
        }}
        title={
          !patientSelected    ? t('selectPatientFirst')
          : isGeneratingSoap  ? t('soapInProgress')
          : !isCompleted      ? t('completeRecording')
          : t('signAndBillEncounter')
        }
      >
        {t('signAndBill')}
      </m.button>
    </div>
  );
}
