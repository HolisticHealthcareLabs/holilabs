'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Joyride, {
  CallBackProps,
  ACTIONS,
  EVENTS,
  STATUS,
  type Step,
  type TooltipRenderProps,
} from 'react-joyride';
import { AlertCircle, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SpecialtyWalkthroughProps {
  active: boolean;
  onComplete: () => void;
  doctorName: string;
  specialty: string;
  firstPatientId?: string;
  voiceId?: string;
  language?: 'en' | 'pt' | 'es';
}

// ---------------------------------------------------------------------------
// Step narration scripts (keyed by language)
// ---------------------------------------------------------------------------

type Lang = 'en' | 'pt' | 'es';

interface StepDef {
  title: Record<Lang, string>;
  narration: (name: string, specialty: string) => Record<Lang, string>;
  target: string;
  route?: string;
}

const STEPS: StepDef[] = [
  {
    title: {
      en: 'My Day',
      pt: 'Meu Dia',
      es: 'Mi Día',
    },
    narration: (name, specialty) => ({
      en: `Welcome to your command center, Dr. ${name}. Your schedule is tailored to your ${specialty} patients. Each case includes pre-computed clinical context and risk flags.`,
      pt: `Bem-vindo(a) ao seu command center, Dr(a). ${name}. Sua agenda está adaptada aos seus pacientes de ${specialty}. Cada caso inclui contexto clínico pré-computado e alertas de risco.`,
      es: `Bienvenido(a) a tu command center, Dr(a). ${name}. Tu agenda está adaptada a tus pacientes de ${specialty}. Cada caso incluye contexto clínico pre-computado y alertas de riesgo.`,
    }),
    target: '#my-day-schedule',
  },
  {
    title: {
      en: 'Co-Pilot',
      pt: 'Co-Pilot',
      es: 'Co-Pilot',
    },
    narration: () => ({
      en: 'This is your Co-Pilot. It transcribes your encounter in real-time, generates SOAP notes, and runs 12 clinical decision support rules — all while you focus on your patient.',
      pt: 'Este é o seu Co-Pilot. Ele transcreve sua consulta em tempo real, gera notas SOAP e executa 12 regras de suporte à decisão clínica — tudo enquanto você foca no seu paciente.',
      es: 'Este es tu Co-Pilot. Transcribe tu consulta en tiempo real, genera notas SOAP y ejecuta 12 reglas de soporte a la decisión clínica — todo mientras te enfocas en tu paciente.',
    }),
    target: 'body',
    route: '/dashboard/clinical-command',
  },
  {
    title: {
      en: 'Prevention Hub',
      pt: 'Prevention Hub',
      es: 'Prevention Hub',
    },
    narration: () => ({
      en: 'Your Prevention Hub tracks 30-year screening protocols. It flags overdue screenings based on age, sex, and conditions — powered by USPSTF, ADA, and AHA guidelines.',
      pt: 'Seu Prevention Hub rastreia protocolos de rastreamento de 30 anos. Ele sinaliza exames atrasados com base em idade, sexo e condições — baseado nas diretrizes USPSTF, ADA e AHA.',
      es: 'Tu Prevention Hub rastrea protocolos de tamizaje de 30 años. Señala exámenes atrasados según edad, sexo y condiciones — basado en guías USPSTF, ADA y AHA.',
    }),
    target: 'body',
    route: '/dashboard/prevention/hub',
  },
  {
    title: {
      en: 'Claims Intelligence',
      pt: 'Claims Intelligence',
      es: 'Claims Intelligence',
    },
    narration: () => ({
      en: 'Claims Intelligence analyzes your billing patterns, flags denials before they happen, and optimizes your revenue cycle.',
      pt: 'Claims Intelligence analisa seus padrões de faturamento, sinaliza negativas antes que aconteçam e otimiza seu ciclo de receita.',
      es: 'Claims Intelligence analiza tus patrones de facturación, señala denegaciones antes de que ocurran y optimiza tu ciclo de ingresos.',
    }),
    target: 'body',
    route: '/dashboard/billing',
  },
];

// ---------------------------------------------------------------------------
// useWalkthroughVoice — ElevenLabs TTS with browser fallback
// ---------------------------------------------------------------------------

function useWalkthroughVoice(voiceId?: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const speak = useCallback(
    async (text: string) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const cached = cacheRef.current.get(text);
      if (cached) {
        const audio = new Audio(cached);
        audioRef.current = audio;
        await audio.play().catch(() => {});
        return;
      }

      try {
        const res = await fetch('/api/tts/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceId }),
          signal: AbortSignal.timeout(15_000),
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          cacheRef.current.set(text, url);
          const audio = new Audio(url);
          audioRef.current = audio;
          await audio.play().catch(() => {});
          return;
        }
      } catch {
        /* fall through to browser TTS */
      }

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        speechSynthesis.speak(utterance);
      }
    },
    [voiceId],
  );

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }, []);

  return { speak, stop };
}

// ---------------------------------------------------------------------------
// Custom glassmorphism tooltip
// ---------------------------------------------------------------------------

function WalkthroughTooltip({
  continuous,
  index,
  step,
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
  size,
  isLastStep,
  muted,
  onToggleMute,
}: TooltipRenderProps & { muted: boolean; onToggleMute: () => void }) {
  return (
    <div
      {...tooltipProps}
      className="relative max-w-sm rounded-2xl border border-white/10 bg-black/80 p-5 shadow-2xl backdrop-blur-xl"
    >
      {/* Header: step counter + mute toggle */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
          Step {index + 1} of {size}
        </span>
        <button
          type="button"
          onClick={onToggleMute}
          className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={muted ? 'Unmute narration' : 'Mute narration'}
        >
          {muted ? <X className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        </button>
      </div>

      {/* Title */}
      {step.title && (
        <h3 className="mb-1 text-base font-bold text-white">{step.title as string}</h3>
      )}

      {/* Body */}
      <p className="mb-5 text-sm leading-relaxed text-white/60">
        {step.content as string}
      </p>

      {/* Progress dots */}
      <div className="mb-4 flex items-center gap-1.5">
        {Array.from({ length: size }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          {...skipProps}
          className="text-xs font-medium text-white/30 transition-colors hover:text-white/60"
        >
          Skip tour
        </button>

        <div className="flex items-center gap-2">
          {index > 0 && (
            <button
              {...backProps}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:text-white"
            >
              Back
            </button>
          )}
          <button
            {...primaryProps}
            className="rounded-lg bg-white px-4 py-1.5 text-xs font-bold text-black transition-opacity hover:opacity-90"
          >
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SpecialtyWalkthrough (main export)
// ---------------------------------------------------------------------------

export default function SpecialtyWalkthrough({
  active,
  onComplete,
  doctorName,
  specialty,
  voiceId,
  language = 'en',
}: SpecialtyWalkthroughProps) {
  const router = useRouter();
  const { speak, stop } = useWalkthroughVoice(voiceId);

  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const navigatingRef = useRef(false);

  // Build joyride steps from STEPS definitions
  const joyrideSteps: Step[] = STEPS.map((s) => {
    const narration = s.narration(doctorName, specialty);
    return {
      target: s.target,
      title: s.title[language],
      content: narration[language],
      disableBeacon: true,
      placement: s.target === 'body' ? 'center' : 'bottom',
      spotlightClicks: false,
    } satisfies Step;
  });

  // Kick-off once active
  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => setRun(true), 50);
      return () => clearTimeout(timer);
    }
    setRun(false);
  }, [active]);

  // Narrate current step whenever stepIndex or muted changes
  useEffect(() => {
    if (!run || muted) return;
    const def = STEPS[stepIndex];
    if (!def) return;
    const text = def.narration(doctorName, specialty)[language];
    speak(text);
  }, [stepIndex, run, muted, doctorName, specialty, language, speak]);

  // Cleanup audio on unmount
  useEffect(() => stop, [stop]);

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { action, index, type, status } = data;

      // Tour finished or skipped
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRun(false);
        stop();
        onComplete();
        return;
      }

      // Prevent double-handling while navigating
      if (navigatingRef.current) return;

      if (type === EVENTS.STEP_AFTER) {
        const nextIndex = action === ACTIONS.PREV ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= STEPS.length) return;

        const nextStep = STEPS[nextIndex];

        if (nextStep?.route) {
          navigatingRef.current = true;
          stop();
          router.push(nextStep.route);
          setTimeout(() => {
            setStepIndex(nextIndex);
            navigatingRef.current = false;
          }, 300);
        } else {
          setStepIndex(nextIndex);
        }
      }
    },
    [onComplete, router, stop],
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      if (!prev) stop();
      return !prev;
    });
  }, [stop]);

  if (!active) return null;

  return (
    <Joyride
      steps={joyrideSteps}
      run={run}
      stepIndex={stepIndex}
      continuous
      disableCloseOnEsc={false}
      disableOverlayClose
      hideCloseButton
      spotlightPadding={8}
      callback={handleCallback}
      tooltipComponent={(props: TooltipRenderProps) => (
        <WalkthroughTooltip {...props} muted={muted} onToggleMute={toggleMute} />
      )}
      styles={{
        options: {
          zIndex: 10_000,
          overlayColor: 'rgba(0, 0, 0, 0.55)',
          arrowColor: 'transparent',
        },
      }}
      floaterProps={{
        styles: { arrow: { length: 0, spread: 0 } },
        hideArrow: true,
      }}
    />
  );
}
