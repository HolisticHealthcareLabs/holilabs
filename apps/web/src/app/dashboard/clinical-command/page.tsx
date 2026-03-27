'use client';

import { useEffect, useState, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Step } from 'react-joyride';
import { Stethoscope, Star, Send, User, X, Eye, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TranscriptPane, type Segment } from './_components/TranscriptPane';
import { useMicrophoneSTT, type STTLanguage } from './_components/useMicrophoneSTT';
import { useClinicalContext } from './_components/useClinicalContext';
import { useLanguage } from '@/hooks/useLanguage';
import { SoapNotePane, SOAP_DEMO_CONTENT } from './_components/SoapNotePane';
import { PatientContextBar, type Patient } from './_components/PatientContextBar';
import type { CDSCard, ModelId, ModelConfig } from './_components/CdssAlertsPane';
import type { ConsentRecord, ClinicalEntity } from '../../../../../../packages/shared-kernel/src/types/clinical-ui';
import { getFacesheetForPatient, getImagingForPatient } from './_data/demo-facesheet';
import { HistoryTab } from './_components/HistoryTab';
import { useVitalsDetector } from './_components/useVitalsDetector';
import { DrawerImagingPanel } from './_components/DrawerImagingPanel';
import { DrawerDocumentsPanel } from './_components/DrawerDocumentsPanel';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { FeatureFlags } from '@/lib/featureFlags';
import { useAnalytics } from '@/hooks/useAnalytics';

const CdssAlertsPane = lazy(() => import('./_components/CdssAlertsPane').then(m => ({ default: m.CdssAlertsPane })));
const PatientHandoutModal = lazy(() => import('./_components/PatientHandoutModal').then(m => ({ default: m.PatientHandoutModal })));
const SignAndBillModal = lazy(() => import('./_components/SignAndBillModal').then(m => ({ default: m.SignAndBillModal })));
const ContextDrawer = lazy(() => import('./_components/ContextDrawer').then(m => ({ default: m.ContextDrawer })));
const PreAuthSendPopover = lazy(() => import('./_components/PreAuthSendPopover').then(m => ({ default: m.PreAuthSendPopover })));
const PreSignOffReviewModal = lazy(() => import('./_components/PreSignOffReviewModal').then(m => ({ default: m.PreSignOffReviewModal })));

// Lazy-load react-joyride — browser-only, never rendered until after mount.
// Using React.lazy + isMounted guard instead of next/dynamic({ssr:false}) to avoid
// the BailoutToCSR Suspense-boundary hydration error in Next.js 14 App Router.
const JoyrideClient = lazy(() => import('react-joyride'));

// Compact tour tooltip — replaces the bloated default joyride bubble
function TourTooltip({ continuous, index, step, size, backProps, closeProps, primaryProps, skipProps, tooltipProps }: any) {
  return (
    <div
      {...tooltipProps}
      className="bg-gray-950 border border-white/10 rounded-xl shadow-2xl shadow-black/40 px-4 py-3 max-w-[280px]"
    >
      {step.title && (
        <div className="text-[11px] font-black uppercase tracking-[0.15em] text-cyan-400 mb-1">
          {step.title}
        </div>
      )}
      <p className="text-[12px] text-gray-300 leading-relaxed">{step.content}</p>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.06]">
        <button
          {...skipProps}
          className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          Skip
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600">{index + 1}/{size}</span>
          <button
            {...primaryProps}
            className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-gray-950 text-[11px] font-bold rounded-md transition-colors"
          >
            {continuous && index < size - 1 ? 'Next' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rich demo transcript — naturalized phrasing, LATAM clinical scenario
// ─────────────────────────────────────────────────────────────────────────────

// ── Locale-keyed transcript chunks (proper clinical terminology per language) ──
const TRANSCRIPT_CHUNKS_BY_LOCALE: Record<string, Segment[]> = {
  en: [
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
    { kind: 'text', text: '\nDoctor: I\'m documenting the encounter for James O\'Brien, dated 03/05/2026.' },
    { kind: 'text', text: '\nDoctor: Starting IV Furosemide 80mg now. Holding oral Metformin pending contrast clearance.' },
  ],
  pt: [
    { kind: 'text', text: 'Médico: Bom dia, ' },
    { kind: 'phi',  label: 'PATIENT_NAME' },
    { kind: 'text', text: '. Para confirmação, tenho sua data de nascimento como ' },
    { kind: 'phi',  label: 'DOB' },
    { kind: 'text', text: '. Por favor, descreva o motivo da consulta de hoje.\n' },
    { kind: 'text', text: 'Paciente: Doutor, há cinco dias estou com opressão torácica e dispneia significativa. Piora ao subir escadas ou caminhar rápido. Também notei edema bilateral nos tornozelos.\n' },
    { kind: 'text', text: 'Médico: Algum antecedente de cardiopatia? Vejo DRC Estágio 3 e Diabetes Mellitus Tipo 2 no prontuário.\n' },
    { kind: 'text', text: 'Paciente: Meu pai teve infarto agudo do miocárdio aos 65 anos. Estou em acompanhamento nefrológico há dois anos. Os sintomas começaram por volta de ' },
    { kind: 'phi',  label: 'ONSET_DATE' },
    { kind: 'text', text: '.\n' },
    { kind: 'text', text: 'Médico: Verificando sinais vitais. PA 162/95 mmHg — bem acima da meta terapêutica. FC 94 bpm, SpO2 93% em ar ambiente. O Lisinopril 10mg claramente não está controlando adequadamente.\n' },
    { kind: 'text', text: 'Paciente: Também tomo Metformina 1000mg duas vezes ao dia, Atorvastatina 40mg, Furosemida 40mg para o edema e Ácido Acetilsalicílico em baixa dose. Meu número de identificação é ' },
    { kind: 'phi',  label: 'PATIENT_SSN' },
    { kind: 'text', text: '.\n' },
    { kind: 'text', text: 'Médico: Na ausculta: estertores crepitantes bibasais, possível B3. Edema depressível 2+ bilateral. Este quadro clínico é sugestivo de insuficiência cardíaca descompensada, possivelmente SCA considerando o histórico familiar.\n' },
    { kind: 'text', text: 'Médico: Estou solicitando ECG urgente, série de Troponina I, BNP, painel metabólico e radiografia de tórax. Poderemos precisar de angiotomografia coronariana — preciso sinalizar a preocupação com a Metformina dada a função renal.\n' },
    { kind: 'text', text: 'Paciente: A Metformina é um problema? Meu clínico geral disse para continuar tomando.\n' },
    { kind: 'text', text: 'Médico: Com TFGe abaixo de 45, Metformina associada a contraste iodado pode causar acidose lática. Vamos suspendê-la antes de qualquer procedimento com contraste. O CDSS sinalizará isto automaticamente.\n' },
    { kind: 'text', text: '\nMédico: Registrando o atendimento de James O\'Brien, data 05/03/2026.' },
    { kind: 'text', text: '\nMédico: Iniciando Furosemida 80mg IV agora. Suspendendo Metformina oral até liberação do contraste.' },
  ],
  es: [
    { kind: 'text', text: 'Médico: Buenos días, ' },
    { kind: 'phi',  label: 'PATIENT_NAME' },
    { kind: 'text', text: '. Para confirmar, tengo su fecha de nacimiento como ' },
    { kind: 'phi',  label: 'DOB' },
    { kind: 'text', text: '. Por favor, describa el motivo de la consulta de hoy.\n' },
    { kind: 'text', text: 'Paciente: Doctor, desde hace cinco días presento opresión torácica y disnea importante. Empeora al subir escaleras o caminar rápido. También noté edema bilateral en los tobillos.\n' },
    { kind: 'text', text: 'Médico: ¿Algún antecedente de cardiopatía? Veo ERC Estadio 3 y Diabetes Mellitus Tipo 2 en su historial clínico.\n' },
    { kind: 'text', text: 'Paciente: Mi padre tuvo un infarto agudo de miocardio a los 65 años. Llevo dos años en seguimiento nefrológico. Los síntomas comenzaron alrededor del ' },
    { kind: 'phi',  label: 'ONSET_DATE' },
    { kind: 'text', text: '.\n' },
    { kind: 'text', text: 'Médico: Verificando signos vitales. PA 162/95 mmHg — muy por encima de la meta terapéutica. FC 94 lpm, SpO2 93% en aire ambiente. El Lisinopril 10mg claramente no está controlando adecuadamente.\n' },
    { kind: 'text', text: 'Paciente: También tomo Metformina 1000mg dos veces al día, Atorvastatina 40mg, Furosemida 40mg para el edema y Ácido Acetilsalicílico en dosis baja. Mi número de identificación es ' },
    { kind: 'phi',  label: 'PATIENT_SSN' },
    { kind: 'text', text: '.\n' },
    { kind: 'text', text: 'Médico: En la auscultación: estertores crepitantes bibasales, posible tercer ruido cardíaco. Edema con fóvea 2+ bilateral. Este cuadro clínico es sugestivo de insuficiencia cardíaca descompensada, posiblemente SCA considerando los antecedentes familiares.\n' },
    { kind: 'text', text: 'Médico: Estoy solicitando ECG urgente, serie de Troponina I, BNP, panel metabólico y radiografía de tórax. Podríamos necesitar angiotomografía coronaria — debo señalar la preocupación con la Metformina dada la función renal.\n' },
    { kind: 'text', text: 'Paciente: ¿La Metformina es un problema? Mi médico de cabecera me dijo que siguiera tomándola.\n' },
    { kind: 'text', text: 'Médico: Con TFGe por debajo de 45, la Metformina asociada con medio de contraste puede causar acidosis láctica. La suspenderemos antes de cualquier procedimiento con contraste. El CDSS lo señalará automáticamente.\n' },
    { kind: 'text', text: '\nMédico: Registrando la consulta de James O\'Brien, fecha 05/03/2026.' },
    { kind: 'text', text: '\nMédico: Iniciando Furosemida 80mg IV ahora. Suspendiendo Metformina oral hasta aclaramiento del contraste.' },
  ],
};

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
  const t = useTranslations('dashboard.clinicalCommand');
  const { locale } = useLanguage();
  const scribeEnabled = useFeatureFlag(FeatureFlags.AI_SCRIBE_REAL_TIME);
  const { track } = useAnalytics();

  const tourSteps: Step[] = useMemo(() => [
    {
      target:        '#live-meeting-notes',
      title:         t('tourLiveScribeTitle'),
      content:       t('tourLiveScribeContent'),
      disableBeacon: true,
      placement:     'right' as const,
    },
    {
      target:    '#soap-note-pane',
      title:     t('tourSoapTitle'),
      content:   t('tourSoapContent'),
      placement: 'left' as const,
    },
    {
      target:    '#cdss-pane',
      title:     t('tourCdssTitle'),
      content:   t('tourCdssContent'),
      placement: 'left' as const,
    },
  ], [t]);

  // ── Deep link: auto-select patient from My Day schedule ─────────────────
  const incomingPatientId = searchParams?.get('patientId');

  useEffect(() => {
    if (!incomingPatientId) return;
    // Clean the URL so the query param does not force re-selection on later navigations
    router.replace('/dashboard/clinical-command', { scroll: false });
  }, [incomingPatientId, router]);

  // ── Patient context ───────────────────────────────────────────────────────
  const [selectedPatient,  setSelectedPatient]  = useState<Patient | null>(null);
  const [patientResetKey,  setPatientResetKey]  = useState(0);
  const [chartOpen,        setChartOpen]        = useState(false);
  const [attachMode,       setAttachMode]       = useState(false);

  // ── Persona-sourced patients (specialty-aligned for demo) ───────────────
  const [personaPatients,   setPersonaPatients]   = useState<Patient[] | null>(null);
  const [personaSoapNote,   setPersonaSoapNote]   = useState<{ S: string; O: string; A: string; P: string } | null>(null);
  const [personaCdssAlerts, setPersonaCdssAlerts] = useState<CDSCard[] | null>(null);

  // ── LGPD Consent Ledger — must be declared BEFORE useMicrophoneSTT ──────────
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

  // ── Prior Authorization tracking ─────────────────────────────────────────
  const [preAuthAcknowledged, setPreAuthAcknowledged] = useState(false);
  const [preAuthPopoverOpen, setPreAuthPopoverOpen] = useState(false);
  const [hasPreAuth, setHasPreAuth] = useState(false);

  // ── Ambient Audio Engine: Finite State Machine ───────────────────────────
  const [ambientState,  setAmbientState]  = useState<AmbientState>('idle');
  const [segments,      setSegments]      = useState<Segment[]>([]);
  const [soapError,     setSoapError]     = useState<string | null>(null);
  const [toastMessage,  setToastMessage]  = useState<string | null>(null);
  const encounterIdRef   = useRef('');
  const segmentsRef      = useRef(segments);
  segmentsRef.current    = segments;
  const ambientStateRef  = useRef(ambientState);
  ambientStateRef.current = ambientState;

  // ── Real Microphone STT Integration ───────────────────────────────────────
  const handleTranscript = useCallback((text: string, isFinal: boolean, speaker?: number) => {
    if (!text.trim()) return;

    // Locale-aware speaker labels
    const SPEAKER_LABELS: Record<string, { doctor: string; patient: string }> = {
      en: { doctor: 'Doctor', patient: 'Patient' },
      pt: { doctor: 'Médico', patient: 'Paciente' },
      es: { doctor: 'Médico', patient: 'Paciente' },
    };
    const labels = SPEAKER_LABELS[locale] ?? SPEAKER_LABELS.en;
    const speakerPrefix = speaker === 1 ? `${labels.patient}: ` : `${labels.doctor}: `;

    setSegments(prev => {
      if (isFinal) {
        return [...prev, { kind: 'text', text: `\n${speakerPrefix}${text}` }];
      }
      return prev;
    });
  }, [locale]);

  // Demo conversation — locale-keyed, proper clinical terminology
  type DemoLine = { speaker: 0 | 1; text: string; delay: number };
  const DEMO_LINES_BY_LOCALE: Record<string, DemoLine[]> = useMemo(() => ({
    en: [
      { speaker: 0, text: "Good morning. I'm Dr. Nogueira. What brings you in today?", delay: 0 },
      { speaker: 1, text: "Good morning, doctor. I've been having chest pain for about 3 days now. It radiates to my left arm and I get cold sweats.", delay: 2000 },
      { speaker: 0, text: "I see. Can you describe the pain? Is it sharp, dull, or pressure-like?", delay: 5000 },
      { speaker: 1, text: "It feels like pressure, like someone sitting on my chest. It gets worse when I walk up stairs or exercise.", delay: 8000 },
      { speaker: 0, text: "Does it improve with rest?", delay: 11000 },
      { speaker: 1, text: "Yes, after about 10 minutes of sitting down it goes away. But it's been happening more frequently.", delay: 13000 },
      { speaker: 0, text: "Any shortness of breath, nausea, or dizziness?", delay: 16000 },
      { speaker: 1, text: "Yes, I get short of breath and sometimes nauseous. No dizziness though.", delay: 19000 },
      { speaker: 0, text: "Do you have a history of heart disease, high blood pressure, or diabetes?", delay: 22000 },
      { speaker: 1, text: "I have high blood pressure and my cholesterol has been high. My father had a heart attack at 55.", delay: 25000 },
      { speaker: 0, text: "I'd like to order an ECG and some blood work including troponin and BNP. I'm also going to check your vitals now.", delay: 28000 },
      { speaker: 1, text: "Of course, doctor. Should I be worried?", delay: 31000 },
      { speaker: 0, text: "We'll know more after the tests. Your symptoms are consistent with angina. I want to rule out anything acute. We may need a CT coronary angiography as well.", delay: 34000 },
    ],
    pt: [
      { speaker: 0, text: "Bom dia. Sou o Dr. Nogueira. Qual o motivo da consulta hoje?", delay: 0 },
      { speaker: 1, text: "Bom dia, doutor. Há cerca de 3 dias estou com dor precordial. Irradia para o braço esquerdo e apresento sudorese fria.", delay: 2000 },
      { speaker: 0, text: "Entendo. Pode descrever a dor? É em pontada, contínua ou em pressão?", delay: 5000 },
      { speaker: 1, text: "É uma sensação de pressão, como se algo estivesse sobre o peito. Piora ao subir escadas ou fazer esforço físico.", delay: 8000 },
      { speaker: 0, text: "Melhora com o repouso?", delay: 11000 },
      { speaker: 1, text: "Sim, após cerca de 10 minutos sentado a dor cede. Mas tem sido cada vez mais frequente.", delay: 13000 },
      { speaker: 0, text: "Apresenta dispneia, náusea ou tontura?", delay: 16000 },
      { speaker: 1, text: "Sim, tenho dispneia e às vezes náusea. Tontura não.", delay: 19000 },
      { speaker: 0, text: "Tem antecedente de cardiopatia, hipertensão arterial sistêmica ou diabetes mellitus?", delay: 22000 },
      { speaker: 1, text: "Tenho hipertensão e dislipidemia. Meu pai teve infarto agudo do miocárdio aos 55 anos.", delay: 25000 },
      { speaker: 0, text: "Vou solicitar um ECG e exames laboratoriais incluindo troponina e BNP. Vou verificar seus sinais vitais agora.", delay: 28000 },
      { speaker: 1, text: "Claro, doutor. Devo me preocupar?", delay: 31000 },
      { speaker: 0, text: "Saberemos mais após os exames. Seus sintomas são compatíveis com angina. Quero descartar qualquer quadro agudo. Poderemos necessitar de angiotomografia coronariana também.", delay: 34000 },
    ],
    es: [
      { speaker: 0, text: "Buenos días. Soy el Dr. Nogueira. ¿Cuál es el motivo de la consulta hoy?", delay: 0 },
      { speaker: 1, text: "Buenos días, doctor. Hace unos 3 días tengo dolor precordial. Irradia al brazo izquierdo y presento diaforesis.", delay: 2000 },
      { speaker: 0, text: "Entiendo. ¿Puede describir el dolor? ¿Es punzante, sordo o de tipo opresivo?", delay: 5000 },
      { speaker: 1, text: "Es una sensación opresiva, como si algo estuviera sobre mi pecho. Empeora al subir escaleras o hacer ejercicio.", delay: 8000 },
      { speaker: 0, text: "¿Mejora con el reposo?", delay: 11000 },
      { speaker: 1, text: "Sí, después de unos 10 minutos sentado el dolor cede. Pero ha sido cada vez más frecuente.", delay: 13000 },
      { speaker: 0, text: "¿Presenta disnea, náuseas o mareo?", delay: 16000 },
      { speaker: 1, text: "Sí, presento disnea y a veces náuseas. Mareo no.", delay: 19000 },
      { speaker: 0, text: "¿Tiene antecedentes de cardiopatía, hipertensión arterial o diabetes mellitus?", delay: 22000 },
      { speaker: 1, text: "Tengo hipertensión y dislipidemia. Mi padre tuvo infarto agudo de miocardio a los 55 años.", delay: 25000 },
      { speaker: 0, text: "Voy a solicitar un ECG y exámenes de laboratorio incluyendo troponina y BNP. Voy a verificar sus signos vitales ahora.", delay: 28000 },
      { speaker: 1, text: "Claro, doctor. ¿Debo preocuparme?", delay: 31000 },
      { speaker: 0, text: "Sabremos más después de los exámenes. Sus síntomas son compatibles con angina. Quiero descartar cualquier cuadro agudo. Podríamos necesitar una angiotomografía coronaria también.", delay: 34000 },
    ],
  }), []);

  const handleRunDemo = useCallback(() => {
    const SPEAKER_LABELS_DEMO: Record<string, { doctor: string; patient: string }> = {
      en: { doctor: 'Doctor', patient: 'Patient' },
      pt: { doctor: 'Médico', patient: 'Paciente' },
      es: { doctor: 'Médico', patient: 'Paciente' },
    };
    const labels = SPEAKER_LABELS_DEMO[locale] ?? SPEAKER_LABELS_DEMO.en;
    const demoLines = DEMO_LINES_BY_LOCALE[locale] ?? DEMO_LINES_BY_LOCALE.en;

    track('copilot.demo_run', { locale });
    setSegments([]);
    demoLines.forEach(({ speaker, text, delay }) => {
      setTimeout(() => {
        const prefix = speaker === 0 ? `${labels.doctor}: ` : `${labels.patient}: `;
        setSegments(prev => [...prev, { kind: 'text', text: `\n${prefix}${text}` }]);
      }, delay);
    });
  }, [locale, DEMO_LINES_BY_LOCALE]);

  const {
    isListening,
    startListening,
    stopListening,
    error: micError,
    volume
  } = useMicrophoneSTT({
    onTranscript: handleTranscript,
    language: (locale as STTLanguage) || 'en',
    patientId: selectedPatient?.id,
    enabled: !!selectedPatient && patientConsent.granted,
  });

  // ── Real-time vitals detection from transcript ────────────────────────
  const {
    pendingBatch: vitalsBatch,
    acceptAll: acceptVitals,
    dismiss: dismissVitals,
    toggleItem: toggleVitalItem,
    undo: undoVitals,
    canUndo: canUndoVitals,
  } = useVitalsDetector({
    segments,
    language: (locale as STTLanguage) || 'en',
    patientId: selectedPatient?.id ?? null,
    enabled: !!selectedPatient && patientConsent.granted && isListening,
  });

  // Sync mic state with ambient state
  useEffect(() => {
    if (isListening && ambientState !== 'recording') {
      setAmbientState('recording');
    } else if (!isListening && ambientState === 'recording') {
      setAmbientState('finalizing_audio');
    }
  }, [isListening, ambientState]);

  useEffect(() => {
    if (micError) {
      setToastMessage(`Microphone error: ${micError}`);
      setAmbientState('error');
    }
  }, [micError]);

  const isRecording = ambientState === 'recording';

  // ── Pre-Auth status check when patient is selected ──────────────────────
  useEffect(() => {
    if (!selectedPatient) {
      setHasPreAuth(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/pre-auth/status?patientId=${selectedPatient.id}`, {
      headers: { 'X-Access-Reason': 'CLINICAL_CARE' },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setHasPreAuth(!!data.hasPreAuth);
      })
      .catch(() => {
        if (!cancelled) setHasPreAuth(false);
      });
    return () => { cancelled = true; };
  }, [selectedPatient]);

  // ── Model + workspace config ──────────────────────────────────────────────
  const [activeModel,  setActiveModel]  = useState<ModelId>('anthropic');
  const [modelConfigs, setModelConfigs] = useState<Partial<Record<ModelId, ModelConfig>>>({
    anthropic: { isConfigured: true, isActive: true },
  });

  // ── CDSS state ────────────────────────────────────────────────────────────
  const [cdssAlerts, setCdssAlerts] = useState<CDSCard[]>([]);
  const [isSyncing,  setIsSyncing]  = useState(false);
  const [syncError,  setSyncError]  = useState<string | null>(null);

  // ── Clinical Context Pre-Scan (fires on consent grant, NOT selection) ─────
  const { context: clinicalContext, isScanning: isContextScanning } = useClinicalContext({
    patientId: selectedPatient?.id ?? null,
    encounterId: encounterIdRef.current,
    consentGranted: patientConsent.granted,
  });

  // When the pre-scan returns risk flags + interactions, inject them as CDSS alerts
  useEffect(() => {
    if (!clinicalContext) return;

    const contextAlerts: CDSCard[] = [];

    // Risk flags → CDSS cards
    for (const flag of clinicalContext.riskFlags) {
      contextAlerts.push({
        summary: flag.flag,
        detail: flag.detail,
        indicator: flag.severity === 'critical' ? 'critical' : flag.severity === 'warning' ? 'warning' : 'info',
        source: { label: 'Pre-Scan Context Engine' },
      });
    }

    // Drug interactions → CDSS cards
    for (const ix of clinicalContext.interactionMatrix) {
      contextAlerts.push({
        summary: `Drug Interaction: ${ix.drug1} + ${ix.drug2}`,
        detail: ix.description,
        indicator: ix.severity === 'critical' ? 'critical' : ix.severity === 'major' ? 'warning' : 'info',
        source: { label: 'Pre-Scan Context Engine' },
      });
    }

    if (contextAlerts.length > 0) {
      setCdssAlerts(contextAlerts);
    }
  }, [clinicalContext]);

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
  const [coPilotTab, setCoPilotTab] = useState<'history' | 'imaging' | 'documents' | 'soap'>('history');
  const [viewingStudy, setViewingStudy] = useState<import('./_data/demo-facesheet').DrawerImagingStudy | null>(null);
  const [lastViewedStudy, setLastViewedStudy] = useState<import('./_data/demo-facesheet').DrawerImagingStudy | null>(null);

  // ── Chat reset signal (Great Reset target) ────────────────────────────────
  const [resetSignal, setResetSignal] = useState(0);

  // ── Modal states ──────────────────────────────────────────────────────────
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isHandoutModalOpen, setIsHandoutModalOpen] = useState(false);

  // ── Tour state ────────────────────────────────────────────────────────────
  const [isTourRunning, setIsTourRunning] = useState(false);

  // ── Mount guard — prevents Joyride from rendering during SSR/hydration ────
  // This eliminates the BailoutToCSR Suspense-boundary hydration error that
  // next/dynamic({ssr:false}) produces in Next.js 14 App Router.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);


  // ── Auto-sync guard ───────────────────────────────────────────────────────
  const hasAutoSyncedRef = useRef(false);

  // ── Fetch workspace + model configs + persona on mount ────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const wsRes = await fetch('/api/workspace/current');
        if (!wsRes.ok || cancelled) return;
        const wsData = await wsRes.json();
        const wsId: string | null = wsData.workspaceId ?? null;
        if (!wsId || cancelled) return;

        // Extract persona patients if this is an ephemeral demo workspace
        const metadata = wsData.metadata;
        if (metadata?.persona?.schedule && !cancelled) {
          const schedule = metadata.persona.schedule as any[];
          const today = new Date();
          const pats: Patient[] = schedule.map((p: any, i: number) => {
            const age = p.age ?? 0;
            const birthYear = today.getFullYear() - age;
            const dob = `01/01/${birthYear}`;
            return {
              id: `P${String(i + 1).padStart(3, '0')}`,
              organizationId: 'org-demo-clinic',
              name: `${p.firstName} ${p.lastName}`,
              dob,
              mrn: `MRN-${String(i + 1).padStart(3, '0')}`,
              email: `${p.firstName.toLowerCase()}.${p.lastName.toLowerCase()}@email.com`,
              phone: '',
            };
          });
          setPersonaPatients(pats);

          // Extract persona SOAP note
          const soap = metadata.persona.soapNote;
          if (soap) {
            setPersonaSoapNote({
              S: soap.subjective ?? '',
              O: soap.objective ?? '',
              A: soap.assessment ?? '',
              P: soap.plan ?? '',
            });
          }

          // Extract persona CDSS alerts
          const alerts = metadata.persona.cdssAlerts;
          if (Array.isArray(alerts) && alerts.length > 0) {
            setPersonaCdssAlerts(alerts.map((a: any) => ({
              summary: a.summary,
              detail: a.detail,
              indicator: a.indicator,
              source: { label: 'Specialty Clinical Engine' },
            })));
          }
        }

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

    // Defer config load — non-critical for first paint, load after UI renders
    const timeoutId = setTimeout(loadConfig, 500);
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, []);

  // ── Transcript streaming simulation removed in favor of real Deepgram STT ──

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

  const chunkIndexRef = useRef(0);
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
        setToastMessage(t('transcriptTooShort'));
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

      // Build patient context for the generate-note API
      const nameParts = (selectedPatient?.name ?? 'Demo Patient').split(' ');
      const firstName = nameParts[0] ?? '';
      const lastName = nameParts.slice(1).join(' ') || firstName;
      const dob = selectedPatient?.dob ?? '1980-01-01';
      const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

      try {
        const res = await fetch('/api/ai/generate-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            transcription: transcript,
            patientId: selectedPatient?.id ?? 'demo-patient-001',
            appointmentId: encounterIdRef.current,
            patientContext: {
              id: selectedPatient?.id ?? 'demo-patient-001',
              mrn: selectedPatient?.mrn ?? 'DEMO-001',
              firstName,
              lastName,
              dateOfBirth: dob,
              age,
              gender: 'unknown',
              deidentifiedName: `Patient-${(selectedPatient?.id ?? 'demo').slice(-4)}`,
              deidentifiedDOB: '****-**-**',
            },
          }),
        });

        clearTimeout(timeoutId);
        if (cancelled) return;

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.sections) {
            setPersonaSoapNote({
              S: json.data.sections.subjective,
              O: json.data.sections.objective,
              A: json.data.sections.assessment,
              P: json.data.sections.plan,
            });
          }
          track('copilot.soap_generated', { success: true });
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
          setSoapError(t('soapTimedOut'));
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
      track('copilot.recording_stopped', { segmentCount: segments.length });
      stopListening();
    } else if (
      ambientState === 'idle' ||
      ambientState === 'completed' ||
      ambientState === 'error'
    ) {
      setSegments([]);
      hasAutoSyncedRef.current = false;
      setSoapError(null);
      setToastMessage(null);
      encounterIdRef.current = `enc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      
      track('copilot.recording_started', { locale });
      startListening();
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
    track('copilot.cdss_synced');
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
        setSyncError(t('syncTimedOut'));
      }
      setCdssAlerts(DEMO_CDSS_CARDS);
    } finally {
      clearTimeout(timeoutId);
      setIsSyncing(false);
    }
  }

  // ── Pre-Sign-Off Review: proceeds to billing, optionally saves review ──
  function handleReviewComplete(result: import('@/lib/schemas/pre-signoff-review.schema').PreSignOffReviewResult) {
    setIsReviewModalOpen(false);
    setIsBillingModalOpen(true);

    // Fire-and-forget: persist review to summaryDraft
    if (encounterIdRef.current) {
      fetch(`/api/encounters/${encodeURIComponent(encounterIdRef.current)}/pre-signoff-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      }).catch(() => {});
    }
  }

  function handleReviewSkip() {
    setIsReviewModalOpen(false);
    setIsBillingModalOpen(true);
  }

  // ── The Great Reset: called after billing claim is approved ─────────────
  function handleBillingComplete() {
    track('copilot.session_completed');
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
    setIsReviewModalOpen(false);
    setPatientConsent({ granted: false, timestamp: null, method: 'digital' });
    setPreAuthAcknowledged(false);
    setPreAuthPopoverOpen(false);
    setHasPreAuth(false);
    setExtractedEntities([]);
    setIsContextDrawerOpen(false);
  }

  // ── Feature flag kill-switch ─────────────────────────────────────────────
  if (!scribeEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-gray-950 text-center px-6">
        <Stethoscope className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">Co-Pilot</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
          This feature is not enabled for your workspace. Contact your administrator.
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-950">
      {/* Joyride spotlight tour — rendered only after mount (isMounted guard) so
          server HTML and first client render are identical (both null).
          Wrapped in Suspense because React.lazy requires it. */}
      {isMounted && (
        <Suspense fallback={null}>
          <JoyrideClient
            run={isTourRunning}
            steps={tourSteps}
            continuous
            showSkipButton
            spotlightClicks={false}
            disableOverlayClose
            tooltipComponent={TourTooltip}
            callback={({ status }: { status: string }) => {
              if (status === 'finished' || status === 'skipped') {
                setIsTourRunning(false);
              }
            }}
            styles={{
              options: {
                arrowColor:      '#030712',
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
      <Suspense fallback={null}>
        <PreSignOffReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onProceedToSign={handleReviewComplete}
          onSkip={handleReviewSkip}
          soapObjective={(personaSoapNote ?? SOAP_DEMO_CONTENT).O}
          soapSubjective={(personaSoapNote ?? SOAP_DEMO_CONTENT).S}
          patientId={selectedPatient?.id ?? ''}
          clinicianSpecialty="Internal Medicine"
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

      {/* ── Top header (title + patient selector + tour — single row) ────── */}
      <header className="
        flex-shrink-0 px-5 py-2.5 border-b flex items-center gap-5
        border-gray-200 dark:border-white/[0.06]
      ">
        <h1 className="font-semibold text-sm flex items-center gap-2 flex-shrink-0
                       text-slate-900 dark:text-white">
          <Stethoscope className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
          {t('pageTitle')}
        </h1>

        {isContextScanning && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-500/10 text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-500/20 animate-pulse shrink-0">
            {t('scanningContext')}
          </span>
        )}
        {clinicalContext && !isContextScanning && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20 shrink-0">
            {t('contextReady')}
          </span>
        )}

        {/* Patient selector — inline in header */}
        <PatientContextBar
          key={patientResetKey}
          inline
          onSelectPatient={(p) => {
            if (p) track('copilot.session_started');
            setSelectedPatient(p);
            setPreAuthAcknowledged(false);
            setPreAuthPopoverOpen(false);
            if (!p) { setChartOpen(false); setAttachMode(false); }
            if (p && personaCdssAlerts) setCdssAlerts(personaCdssAlerts);
          }}
          initialPatientId={incomingPatientId}
          patients={personaPatients}
          chartOpen={chartOpen}
          onChartOpenChange={setChartOpen}
          attachMode={attachMode}
          onAttachModeChange={setAttachMode}
        />

        <div className="flex items-center shrink-0 ml-auto">
          <button
            onClick={() => setIsTourRunning(true)}
            className="
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium
              text-slate-500 dark:text-slate-500
              hover:text-slate-700 dark:hover:text-slate-300
              hover:bg-slate-100 dark:hover:bg-white/[0.04]
              transition-all duration-200
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60
            "
            aria-label={t('startTour')}
          >
            <Star className="w-3 h-3" />
            {t('quickTour')}
          </button>
        </div>
      </header>

      {/* ── Pre-Authorization Safety Banner ─────────────────────────────────── */}
      {selectedPatient && !preAuthAcknowledged && !hasPreAuth && (
        <div className="mx-3 mb-0 flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-4 py-3">
          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">{t('preAuthTitle')}</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
              {t('noPreAuthBody', { name: selectedPatient.name })}
            </p>
          </div>
          <div className="relative flex items-center gap-2 shrink-0">
            <button
              onClick={() => setPreAuthPopoverOpen((o) => !o)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors px-2 py-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/20"
            >
              <Send className="h-3 w-3" />
              {t('sendPreAuth')}
            </button>
            <button
              onClick={() => setPreAuthAcknowledged(true)}
              className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors px-2 py-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/20"
            >
              {t('acknowledge')}
            </button>
            {preAuthPopoverOpen && (
              <Suspense fallback={null}>
                <PreAuthSendPopover
                  patientName={selectedPatient.name}
                  patientId={selectedPatient.id}
                  onClose={() => setPreAuthPopoverOpen(false)}
                  onSent={() => setHasPreAuth(true)}
                />
              </Suspense>
            )}
          </div>
        </div>
      )}

      {/* ── 3-Column Layout: Transcript | SOAP (center stage) | Co-Pilot ──── */}
      <main className="flex-1 flex gap-px p-0 min-h-0">
        {/* ── Col 1: Live Meeting Notes (narrow — secondary focus) ──────── */}
        <motion.div
          layout
          id="live-meeting-notes"
          className={`hidden md:flex min-h-0 shrink-0 transition-all duration-300 border-r border-white/[0.06] ${viewingStudy ? 'w-[22%]' : 'w-[26%]'}`}
        >
          <TranscriptPane
            segments={segments}
            isRecording={isRecording}
            isFinalizing={ambientState === 'finalizing_audio'}
            onToggleRecord={toggleRecord}
            onRunDemo={handleRunDemo}
            disabled={!selectedPatient || ambientState === 'generating_soap'}
            consentRecord={patientConsent}
            onGrantConsent={grantConsent}
            onRevokeConsent={revokeConsent}
            volume={volume}
          />
        </motion.div>

        {/* ── Col 2: Tabbed Center Panel ─────────────────────────────────── */}
        <motion.div layout id="center-panel" className="min-h-0 flex-1 min-w-0 flex flex-col border-r border-white/[0.06]">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-3 pt-2 pb-1.5 shrink-0 border-b border-white/[0.04]">
            {(['history', 'imaging', 'documents', 'soap'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setCoPilotTab(tab);
                  if (tab === 'history' || tab === 'imaging') setIsContextDrawerOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                  coPilotTab === tab
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                {t(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {coPilotTab === 'history' && selectedPatient && (
              <HistoryTab
                facesheet={getFacesheetForPatient(selectedPatient.id)}
                pendingBatch={vitalsBatch}
                onAcceptAll={acceptVitals}
                onDismiss={dismissVitals}
                onToggleItem={toggleVitalItem}
                onUndo={undoVitals}
                canUndo={canUndoVitals}
              />
            )}
            {coPilotTab === 'history' && !selectedPatient && (
              <div className="flex items-center justify-center h-full text-white/30 text-sm">{t('selectPatientHistory')}</div>
            )}
            {coPilotTab === 'imaging' && selectedPatient && (() => {
              const studies = getImagingForPatient(selectedPatient.id);
              return <div className="p-3"><DrawerImagingPanel studies={studies} onSwitchToDocuments={() => setCoPilotTab('documents')} onStudySelect={(s) => { setViewingStudy(s); setLastViewedStudy(s); }} /></div>;
            })()}
            {coPilotTab === 'imaging' && !selectedPatient && (
              <div className="flex items-center justify-center h-full text-white/30 text-sm">{t('selectPatientImaging')}</div>
            )}
            {coPilotTab === 'documents' && selectedPatient && (
              <div className="p-3"><DrawerDocumentsPanel patientId={selectedPatient.id} /></div>
            )}
            {coPilotTab === 'documents' && !selectedPatient && (
              <div className="flex items-center justify-center h-full text-white/30 text-sm">{t('selectPatientDocuments')}</div>
            )}
            {coPilotTab === 'soap' && (
              <SoapNotePane
                segmentCount={segments.length}
                patientSelected={!!selectedPatient}
                onSignAndBill={() => setIsReviewModalOpen(true)}
                isGeneratingSoap={ambientState === 'generating_soap'}
                isCompleted={ambientState === 'completed'}
                soapError={soapError}
                onRetry={handleRetryGeneration}
                soapContent={personaSoapNote}
              />
            )}
          </div>
        </motion.div>

        {/* ── Col 3: AI Co-Pilot (full height — room to breathe) ───────── */}
        <motion.div
          layout
          id="cdss-pane"
          className={`hidden md:flex min-h-0 shrink-0 transition-all duration-300 ${viewingStudy ? 'w-[24%]' : 'w-[32%]'}`}
        >
          <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-500 text-sm">{t('loadingCoPilot')}</div>}>
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
        </motion.div>

        {/* ── Right Sidebar — My Day Summary + PACS Imaging ──────────────── */}
        <AnimatePresence>
          {viewingStudy && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="hidden md:flex min-h-0 shrink-0 overflow-hidden"
            >
              <div className="w-[300px] h-full flex flex-col bg-gray-50 dark:bg-gray-950 border-l border-gray-200 dark:border-white/[0.06] overflow-y-auto">

                {/* PACS — Patient Studies */}
                <div className="px-3 py-3 border-b border-gray-100 dark:border-white/[0.06]">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-white/35 mb-2">{t('rightPanelPacs')}</h3>
                  {selectedPatient ? (() => {
                    const studies = getImagingForPatient(selectedPatient.id);
                    return studies.length > 0 ? (
                      <div className="space-y-1.5">
                        {studies.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setViewingStudy(s)}
                            className={`w-full text-left rounded-lg border p-2 transition-all ${
                              viewingStudy?.id === s.id
                                ? 'border-cyan-500/30 bg-cyan-500/5'
                                : 'border-gray-200 dark:border-white/[0.05] hover:border-cyan-500/20 bg-white dark:bg-white/[0.02]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded overflow-hidden shrink-0">
                                <img src={s.thumbnailUrl || ''} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-medium text-gray-800 dark:text-white/80 truncate">{s.description}</p>
                                <p className="text-[9px] text-gray-500 dark:text-white/30">{s.bodyPart} · {new Date(s.studyDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 dark:text-white/30 italic">{t('rightPanelNoStudies')}</p>
                    )
                  })() : (
                    <p className="text-[11px] text-gray-400 dark:text-white/30 italic">{t('rightPanelSelectPatient')}</p>
                  )}
                </div>

                {/* Selected Study Viewer */}
                {viewingStudy && viewingStudy.id !== 'SIDEBAR' && (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-white/[0.06]">
                      <p className="text-[11px] font-semibold text-gray-800 dark:text-white truncate">{viewingStudy.description}</p>
                      <p className="text-[9px] text-gray-500 dark:text-white/30">
                        {viewingStudy.bodyPart} · {new Date(viewingStudy.studyDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                        {viewingStudy.radiologist && ` · ${viewingStudy.radiologist}`}
                      </p>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-3 bg-black/20 min-h-[200px]">
                      <div className="relative w-full aspect-square max-h-[280px] rounded-lg overflow-hidden bg-gray-950 ring-1 ring-white/5">
                        <img src={viewingStudy.thumbnailUrl || ''} alt={viewingStudy.description} className="w-full h-full object-contain" />
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-black/70 text-[8px] font-bold text-white">
                            {viewingStudy.modality === 'X-Ray' ? 'XR' : viewingStudy.modality === 'Ultrasound' ? 'US' : viewingStudy.modality === 'Mammography' ? 'MG' : viewingStudy.modality.slice(0, 2).toUpperCase()}
                          </span>
                          {viewingStudy.isAbnormal && <span className="px-1.5 py-0.5 rounded bg-red-500/80 text-[8px] font-bold text-white">ABN</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Mobile: stacked single-column fallback ──────────────────────── */}
      <div className="md:hidden flex-1 flex flex-col gap-3 p-3 min-h-0 overflow-y-auto">
        <div id="live-meeting-notes-mobile">
          <TranscriptPane
            segments={segments}
            isRecording={isRecording}
            isFinalizing={ambientState === 'finalizing_audio'}
            onToggleRecord={toggleRecord}
            onRunDemo={handleRunDemo}
            disabled={!selectedPatient || ambientState === 'generating_soap'}
            consentRecord={patientConsent}
            onGrantConsent={grantConsent}
            onRevokeConsent={revokeConsent}
            volume={volume}
          />
        </div>
        <div>
          <SoapNotePane
            segmentCount={segments.length}
            patientSelected={!!selectedPatient}
            onSignAndBill={() => setIsReviewModalOpen(true)}
            isGeneratingSoap={ambientState === 'generating_soap'}
            isCompleted={ambientState === 'completed'}
            soapError={soapError}
            onRetry={handleRetryGeneration}
            soapContent={personaSoapNote}
          />
        </div>
        <div>
          <Suspense fallback={<div className="flex items-center justify-center h-40 text-slate-500 text-sm">{t('loadingCoPilot')}</div>}>
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
      </div>

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
