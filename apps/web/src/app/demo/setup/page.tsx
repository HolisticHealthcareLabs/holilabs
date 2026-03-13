'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── i18n Translation Map ─────────────────────────────────────────────────────

type Lang = 'en' | 'pt' | 'es';

const T: Record<Lang, {
  countryTitle: string;
  countrySub: string;
  roleTitle: string;
  stepOf: (c: number, t: number) => string;
  roles: { id: string; label: string; sub: string }[];
  disciplinesTitle: string;
  disciplinesSub: string;
  disciplines: Record<string, string>;
  comingSoon: string;
  continue: string;
  back: string;
  launchDemo: string;
  launching: string;
  signInInstead: string;
  provisionError: string;
  sessionError: string;
  connectionError: string;
}> = {
  en: {
    countryTitle: 'Where do you practice?',
    countrySub: 'Sets your billing codes and compliance framework.',
    roleTitle: 'What is your role?',
    stepOf: (c, t) => `Step ${c} of ${t}`,
    roles: [
      { id: 'CLINICIAN',  label: 'Clinician',        sub: 'Physician, NP, or licensed provider' },
      { id: 'ADMIN',      label: 'Administrator',     sub: 'Clinic director or practice owner' },
      { id: 'FRONT_DESK', label: 'Front Desk',        sub: 'Receptionist or patient intake' },
      { id: 'BILLING',    label: 'Billing & Finance',  sub: 'Medical coder or revenue cycle' },
    ],
    disciplinesTitle: 'Which practices do you offer?',
    disciplinesSub: 'Select every specialty your organization provides.',
    disciplines: {
      'general-practice': 'General Practice',
      'internal-medicine': 'Internal Medicine',
      'cardiology': 'Cardiology',
      'pediatrics': 'Pediatrics',
      'orthopedics': 'Orthopedics',
      'neurology': 'Neurology',
      'oncology': 'Oncology',
      'dermatology': 'Dermatology',
      'psychiatry': 'Psychiatry',
      'obstetrics-gynecology': 'OB-GYN',
      'emergency-medicine': 'Emergency Medicine',
      'physical-therapy': 'Physical Therapy',
      'radiology': 'Radiology',
      'anesthesiology': 'Anesthesiology',
      'endocrinology': 'Endocrinology',
      'gastroenterology': 'Gastroenterology',
      'nephrology': 'Nephrology',
      'pulmonology': 'Pulmonology',
      'urology': 'Urology',
      'ophthalmology': 'Ophthalmology',
    },
    comingSoon: 'Coming Soon',
    continue: 'Continue',
    back: 'Back',
    launchDemo: 'Launch Demo',
    launching: 'Launching...',
    signInInstead: 'Sign in instead',
    provisionError: 'Failed to provision demo.',
    sessionError: 'Session error. Please try again.',
    connectionError: 'Connection error. Please try again.',
  },
  pt: {
    countryTitle: 'Onde você atua?',
    countrySub: 'Define seus códigos de faturamento e conformidade.',
    roleTitle: 'Qual é a sua função?',
    stepOf: (c, t) => `Etapa ${c} de ${t}`,
    roles: [
      { id: 'CLINICIAN',  label: 'Médico(a)',           sub: 'Médico, enfermeiro ou profissional de saúde' },
      { id: 'ADMIN',      label: 'Administrador(a)',     sub: 'Diretor de clínica ou proprietário' },
      { id: 'FRONT_DESK', label: 'Recepção',             sub: 'Recepcionista ou triagem de pacientes' },
      { id: 'BILLING',    label: 'Faturamento',          sub: 'Codificador médico ou ciclo de receita' },
    ],
    disciplinesTitle: 'Quais práticas vocês oferecem?',
    disciplinesSub: 'Selecione todas as especialidades da sua organização.',
    disciplines: {
      'general-practice': 'Clínica Geral',
      'internal-medicine': 'Clínica Médica',
      'cardiology': 'Cardiologia',
      'pediatrics': 'Pediatria',
      'orthopedics': 'Ortopedia',
      'neurology': 'Neurologia',
      'oncology': 'Oncologia',
      'dermatology': 'Dermatologia',
      'psychiatry': 'Psiquiatria',
      'obstetrics-gynecology': 'Ginecologia e Obstetrícia',
      'emergency-medicine': 'Medicina de Emergência',
      'physical-therapy': 'Fisioterapia',
      'radiology': 'Radiologia',
      'anesthesiology': 'Anestesiologia',
      'endocrinology': 'Endocrinologia',
      'gastroenterology': 'Gastroenterologia',
      'nephrology': 'Nefrologia',
      'pulmonology': 'Pneumologia',
      'urology': 'Urologia',
      'ophthalmology': 'Oftalmologia',
    },
    comingSoon: 'Em Breve',
    continue: 'Continuar',
    back: 'Voltar',
    launchDemo: 'Iniciar Demo',
    launching: 'Iniciando...',
    signInInstead: 'Entrar na conta',
    provisionError: 'Falha ao provisionar a demonstração.',
    sessionError: 'Erro de sessão. Tente novamente.',
    connectionError: 'Erro de conexão. Tente novamente.',
  },
  es: {
    countryTitle: '¿Dónde ejerces?',
    countrySub: 'Define tus códigos de facturación y marco regulatorio.',
    roleTitle: '¿Cuál es tu rol?',
    stepOf: (c, t) => `Paso ${c} de ${t}`,
    roles: [
      { id: 'CLINICIAN',  label: 'Médico(a)',           sub: 'Médico, enfermero o profesional de salud' },
      { id: 'ADMIN',      label: 'Administrador(a)',     sub: 'Director de clínica o propietario' },
      { id: 'FRONT_DESK', label: 'Recepción',            sub: 'Recepcionista o admisión de pacientes' },
      { id: 'BILLING',    label: 'Facturación',          sub: 'Codificador médico o ciclo de ingresos' },
    ],
    disciplinesTitle: '¿Qué prácticas ofrecen?',
    disciplinesSub: 'Selecciona todas las especialidades de tu organización.',
    disciplines: {
      'general-practice': 'Medicina General',
      'internal-medicine': 'Medicina Interna',
      'cardiology': 'Cardiología',
      'pediatrics': 'Pediatría',
      'orthopedics': 'Ortopedia',
      'neurology': 'Neurología',
      'oncology': 'Oncología',
      'dermatology': 'Dermatología',
      'psychiatry': 'Psiquiatría',
      'obstetrics-gynecology': 'Ginecología y Obstetricia',
      'emergency-medicine': 'Medicina de Emergencia',
      'physical-therapy': 'Fisioterapia',
      'radiology': 'Radiología',
      'anesthesiology': 'Anestesiología',
      'endocrinology': 'Endocrinología',
      'gastroenterology': 'Gastroenterología',
      'nephrology': 'Nefrología',
      'pulmonology': 'Neumología',
      'urology': 'Urología',
      'ophthalmology': 'Oftalmología',
    },
    comingSoon: 'Próximamente',
    continue: 'Continuar',
    back: 'Atrás',
    launchDemo: 'Iniciar Demo',
    launching: 'Iniciando...',
    signInInstead: 'Iniciar sesión',
    provisionError: 'Error al provisionar la demostración.',
    sessionError: 'Error de sesión. Inténtalo de nuevo.',
    connectionError: 'Error de conexión. Inténtalo de nuevo.',
  },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { id: 'en' as Lang, native: 'English' },
  { id: 'pt' as Lang, native: 'Português' },
  { id: 'es' as Lang, native: 'Español' },
];

interface CountryOption {
  id: string;
  label: string;
  flag: string;
  available: boolean;
}

const COUNTRIES: Record<string, CountryOption[]> = {
  en: [
    { id: 'US', label: 'United States', flag: '🇺🇸', available: true },
    { id: 'BR', label: 'Brazil', flag: '🇧🇷', available: true },
    { id: 'AR', label: 'Argentina', flag: '🇦🇷', available: true },
    { id: 'BO', label: 'Bolivia', flag: '🇧🇴', available: true },
    { id: 'CO', label: 'Colombia', flag: '🇨🇴', available: false },
    { id: 'MX', label: 'Mexico', flag: '🇲🇽', available: false },
    { id: 'CL', label: 'Chile', flag: '🇨🇱', available: false },
    { id: 'PE', label: 'Peru', flag: '🇵🇪', available: false },
  ],
  pt: [
    { id: 'BR', label: 'Brasil', flag: '🇧🇷', available: true },
    { id: 'US', label: 'Estados Unidos', flag: '🇺🇸', available: true },
    { id: 'AR', label: 'Argentina', flag: '🇦🇷', available: true },
    { id: 'BO', label: 'Bolívia', flag: '🇧🇴', available: true },
    { id: 'CO', label: 'Colômbia', flag: '🇨🇴', available: false },
    { id: 'MX', label: 'México', flag: '🇲🇽', available: false },
    { id: 'CL', label: 'Chile', flag: '🇨🇱', available: false },
    { id: 'PE', label: 'Peru', flag: '🇵🇪', available: false },
  ],
  es: [
    { id: 'AR', label: 'Argentina', flag: '🇦🇷', available: true },
    { id: 'BO', label: 'Bolivia', flag: '🇧🇴', available: true },
    { id: 'BR', label: 'Brasil', flag: '🇧🇷', available: true },
    { id: 'US', label: 'Estados Unidos', flag: '🇺🇸', available: true },
    { id: 'CO', label: 'Colombia', flag: '🇨🇴', available: false },
    { id: 'MX', label: 'México', flag: '🇲🇽', available: false },
    { id: 'CL', label: 'Chile', flag: '🇨🇱', available: false },
    { id: 'PE', label: 'Perú', flag: '🇵🇪', available: false },
  ],
};

const DISCIPLINE_IDS = [
  'general-practice', 'internal-medicine', 'cardiology', 'pediatrics',
  'orthopedics', 'neurology', 'oncology', 'dermatology',
  'psychiatry', 'obstetrics-gynecology', 'emergency-medicine', 'physical-therapy',
  'radiology', 'anesthesiology', 'endocrinology', 'gastroenterology',
  'nephrology', 'pulmonology', 'urology', 'ophthalmology',
];

// ─── Phases ───────────────────────────────────────────────────────────────────

type Phase = 'language' | 'country' | 'role' | 'disciplines' | 'launching';
const STEP_PHASES: Phase[] = ['country', 'role', 'disciplines'];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DemoSetupPage() {
  const router = useRouter();

  const [phase, setPhase]             = useState<Phase>('language');
  const [language, setLanguage]       = useState<Lang | null>(null);
  const [countries, setCountries]     = useState<string[]>([]);
  const [role, setRole]               = useState<string | null>(null);
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const t = T[language ?? 'en'];

  // Select-and-advance: show the highlight for 350ms, then move to next phase
  const ADVANCE_DELAY = 350;

  function selectAndAdvance(setter: () => void, nextPhase: Phase) {
    setter();
    clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => setPhase(nextPhase), ADVANCE_DELAY);
  }

  const toggleCountry = useCallback((id: string) => {
    setCountries(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id],
    );
  }, []);

  const toggleDiscipline = useCallback((id: string) => {
    setDisciplines(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id],
    );
  }, []);

  const totalSteps = STEP_PHASES.length;

  async function handleLaunch() {
    setPhase('launching');
    setIsLaunching(true);
    setError(null);

    try {
      const res = await fetch('/api/demo/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, disciplines, jurisdiction: countries[0] ?? 'OTHER', language: language ?? 'en' }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || t.provisionError);
        setPhase('disciplines');
        setIsLaunching(false);
        return;
      }

      const signInResult = await signIn('credentials', {
        email: data.credentials.email,
        password: data.credentials.password,
        redirect: false,
      });

      if (!signInResult || signInResult.error) {
        setError(t.sessionError);
        setPhase('disciplines');
        setIsLaunching(false);
        return;
      }

      const destination = data.redirectTo || '/dashboard/my-day';
      const sep = destination.includes('?') ? '&' : '?';
      router.push(`${destination}${sep}transition=cinematic`);
      router.refresh();
    } catch {
      setError(t.connectionError);
      setPhase('disciplines');
      setIsLaunching(false);
    }
  }

  function goBack() {
    if (phase === 'disciplines') setPhase('role');
    else if (phase === 'role') setPhase('country');
    else if (phase === 'country') setPhase('language');
  }

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center px-4 py-12 selection:bg-white/20">
      <AnimatePresence mode="wait">

        {/* ── LANGUAGE (Preface — Apple-style logo reveal) ────────────────────── */}
        {phase === 'language' && (
          <motion.div
            key="lang"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col items-center text-center max-w-md"
          >
            {/* Logo: fades in at center with a soft glow pulse, then rises upward */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 60 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                opacity: { delay: 0, duration: 0.8 },
                scale: { delay: 0, duration: 1.0, ease: [0.16, 1, 0.3, 1] },
                y: { delay: 1.2, duration: 0.9, ease: [0.16, 1, 0.3, 1] },
              }}
              className="mb-10 relative"
            >
              {/* Ambient glow behind the logo — breathes once then fades */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 0.4, 0], scale: [0.5, 1.8, 2.2] }}
                transition={{ delay: 0.3, duration: 1.4, ease: 'easeOut' }}
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                }}
              />
              <svg
                className="h-14 w-12"
                viewBox="20 100 555 670"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <line x1="244.03" y1="369.32" x2="350.47" y2="369.32" stroke="white" strokeLinecap="round" strokeWidth="58" />
                <line x1="244.03" y1="453.65" x2="350.47" y2="453.65" stroke="white" strokeLinecap="round" strokeWidth="58" />
                <path fill="white" d="m545.36,412.45h.28c-.09-.09-.18-.19-.28-.29,0-.23.01-.46,0-.69-.26-20.4-12.91-39.54-22.09-52.6-10.57-15.03-23.66-36.05-24.12-56.82-.03-1.47-.02-1.18,0-2.65.12-21.37,11.74-41.35,23.85-56.95,9.78-12.59,22.88-33.63,22.63-55.23-.47-40.95-33.71-74.6-74.64-75.57-43.09-1.02-78.34,33.61-78.34,76.48h-.04s.03.03.04.04c.01,20.95,11.14,39.39,22.09,53.74,11.78,15.43,24.2,35.7,24.35,57.25,0,.78,0,1.56,0,2.34-.16,21.55-14.59,43.3-24.39,57.22-10.89,15.48-22.1,32.77-22.1,53.72s8.39,39.83,21.99,53.62c15.01,15.22,24.01,35.43,24.12,56.81,0,.38,0,.77,0,1.15-.04,21.55-12.4,42.24-24.14,57.31-8.95,11.5-22.03,32.85-21.97,53.83.12,41.15,33.4,75.17,74.54,76.14,43.03,1.02,78.23-33.56,78.23-76.36,0-21.19-13.73-42.38-22.56-54.2-12.69-16.97-23.47-35.3-23.55-56.49,0-.19,0-.37,0-.56,0-21.6,8.9-42.21,24.08-57.58,13.62-13.79,22.02-32.75,22.02-53.67Z" />
                <path fill="white" d="m202.39,412.45h.28c-.09-.09-.18-.19-.28-.29,0-.23.01-.46,0-.69-.26-20.4-12.91-39.54-22.09-52.6-10.57-15.03-23.66-36.05-24.12-56.82-.03-1.47-.02-1.18,0-2.65.12-21.37,11.74-41.35,23.85-56.95,9.78-12.59,22.88-33.63,22.63-55.23-.47-40.95-33.71-74.6-74.64-75.57-43.09-1.02-78.34,33.61-78.34,76.48h-.04s.03.03.04.04c.01,20.95,11.14,39.39,22.09,53.74,11.78,15.43,24.2,35.7,24.35,57.25,0,.78,0,1.56,0,2.34-.16,21.55-14.59,43.3-24.39,57.22-10.89,15.48-22.1,32.77-22.1,53.72s8.39,39.83,21.99,53.62c15.01,15.22,24.01,35.43,24.12,56.81,0,.38,0,.77,0,1.15-.04,21.55-12.4,42.24-24.14,57.31-8.95,11.5-22.03,32.85-21.97,53.83.12,41.15,33.4,75.17,74.54,76.14,43.03,1.02,78.23-33.56,78.23-76.36,0-21.19-13.73-42.38-22.56-54.2-12.69-16.97-23.47-35.3-23.55-56.49,0-.19,0-.37,0-.56,0-21.6,8.9-42.21,24.08-57.58,13.62-13.79,22.02-32.75,22.02-53.67Z" />
              </svg>
            </motion.div>

            {/* Title: fades in after logo settles */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-[32px] sm:text-[40px] font-semibold text-white tracking-tight leading-tight mb-3"
            >
              Choose your language
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.9, duration: 0.5 }}
              className="text-white/30 text-sm mb-10"
            >
              This tailors your entire experience.
            </motion.p>

            {/* Language pills */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3"
            >
              {LANGUAGES.map((lang) => {
                const picked = language === lang.id;
                return (
                  <motion.button
                    key={lang.id}
                    onClick={() => selectAndAdvance(() => setLanguage(lang.id as Lang), 'country')}
                    animate={picked ? { scale: 1.05 } : { scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`relative px-6 py-3 rounded-2xl text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                      picked
                        ? 'bg-white text-black border border-white shadow-[0_0_40px_rgba(255,255,255,0.15)]'
                        : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white hover:text-black hover:border-white hover:shadow-[0_0_40px_rgba(255,255,255,0.12)]'
                    }`}
                  >
                    {lang.native}
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Sign in link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5, duration: 0.4 }}
              className="mt-16"
            >
              <button
                onClick={() => router.push('/auth/login')}
                className="text-[12px] text-white/15 hover:text-white/40 transition-colors"
              >
                Sign in instead
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ── COUNTRY (Step 1 of 3, multi-select grid) ────────────────────────── */}
        {phase === 'country' && (
          <motion.div
            key="country"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[480px]"
          >
            <StepHeader current={1} total={totalSteps} title={t.countryTitle} sub={t.countrySub} stepLabel={t.stepOf(1, totalSteps)} />

            <div className="max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
              <div className="grid grid-cols-2 gap-2">
                {(COUNTRIES[language ?? 'en'] ?? COUNTRIES.en).map((c) => {
                  const on = countries.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => c.available && toggleCountry(c.id)}
                      disabled={!c.available}
                      className={`
                        relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-150
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20
                        ${!c.available
                          ? 'opacity-35 cursor-not-allowed bg-white/[0.02] border border-white/[0.04]'
                          : on
                            ? 'bg-white text-black'
                            : 'bg-white/[0.03] text-white/60 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/80 hover:border-white/10'
                        }
                      `}
                    >
                      <span className={`flex-shrink-0 w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all ${
                        on ? 'bg-black border-black' : 'border-white/15'
                      }`}>
                        {on && (
                          <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="text-xl leading-none">{c.flag}</span>
                      <span className="text-[13px] font-medium flex-1">{c.label}</span>
                      {!c.available && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-white/30 whitespace-nowrap">
                          {t.comingSoon}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button onClick={goBack} className="text-[13px] text-white/20 hover:text-white/50 transition-colors">
                {t.back}
              </button>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: countries.length > 0 ? 1 : 0 }} transition={{ duration: 0.2 }}>
                <button
                  onClick={() => countries.length > 0 && setPhase('role')}
                  disabled={countries.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-20 disabled:cursor-not-allowed bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                >
                  {t.continue}
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ── ROLE (Step 1 of 2) ──────────────────────────────────────────────── */}
        {phase === 'role' && (
          <motion.div
            key="role"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[480px]"
          >
            <StepHeader current={2} total={totalSteps} title={t.roleTitle} stepLabel={t.stepOf(2, totalSteps)} />

            <div className="space-y-2 mt-6">
              {t.roles.map((r) => (
                <RadioCard
                  key={r.id}
                  selected={role === r.id}
                  onClick={() => selectAndAdvance(() => setRole(r.id), 'disciplines')}
                  label={r.label}
                  sub={r.sub}
                />
              ))}
            </div>

            <div className="mt-8">
              <button onClick={goBack} className="text-[13px] text-white/20 hover:text-white/50 transition-colors">
                {t.back}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── DISCIPLINES (Step 2 of 2) ───────────────────────────────────────── */}
        {phase === 'disciplines' && (
          <motion.div
            key="disc"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[520px]"
          >
            <StepHeader current={3} total={totalSteps} title={t.disciplinesTitle} sub={t.disciplinesSub} stepLabel={t.stepOf(3, totalSteps)} />

            <div className="max-h-[380px] overflow-y-auto pr-1 mt-6">
              <div className="grid grid-cols-2 gap-2">
              {DISCIPLINE_IDS.map((id) => {
                const on = disciplines.includes(id);
                const label = t.disciplines[id] ?? id;
                return (
                  <button
                    key={id}
                    onClick={() => toggleDiscipline(id)}
                    className={`
                      relative flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13px] font-medium text-left transition-all duration-150
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20
                      ${on
                        ? 'bg-white text-black'
                        : 'bg-white/[0.03] text-white/50 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/80 hover:border-white/10'
                      }
                    `}
                  >
                    <span className={`flex-shrink-0 w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all ${
                      on ? 'bg-black border-black' : 'border-white/15'
                    }`}>
                      {on && (
                        <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {label}
                  </button>
                );
              })}
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/15 rounded-xl px-4 py-3"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <NavRow
              onBack={goBack}
              onNext={handleLaunch}
              canNext={disciplines.length > 0}
              nextLabel={t.launchDemo}
              backLabel={t.back}
              loading={false}
            />
          </motion.div>
        )}

        {/* ── LAUNCHING (Welcome screen while provisioning) ─────────────── */}
        {phase === 'launching' && (
          <motion.div
            key="launching"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center text-center max-w-[400px]"
          >
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute w-20 h-20 rounded-full bg-white/[0.04] animate-[pulse_2.5s_ease-in-out_infinite]" />
              <div className="absolute w-14 h-14 rounded-full bg-white/[0.03] animate-[pulse_2.5s_ease-in-out_0.4s_infinite]" />
              <svg
                className="relative h-10 w-9 text-white/80"
                viewBox="20 100 555 670"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <line x1="244.03" y1="369.32" x2="350.47" y2="369.32" stroke="currentColor" strokeLinecap="round" strokeWidth="58" />
                <line x1="244.03" y1="453.65" x2="350.47" y2="453.65" stroke="currentColor" strokeLinecap="round" strokeWidth="58" />
                <path fill="currentColor" d="m545.36,412.45h.28c-.09-.09-.18-.19-.28-.29,0-.23.01-.46,0-.69-.26-20.4-12.91-39.54-22.09-52.6-10.57-15.03-23.66-36.05-24.12-56.82-.03-1.47-.02-1.18,0-2.65.12-21.37,11.74-41.35,23.85-56.95,9.78-12.59,22.88-33.63,22.63-55.23-.47-40.95-33.71-74.6-74.64-75.57-43.09-1.02-78.34,33.61-78.34,76.48h-.04s.03.03.04.04c.01,20.95,11.14,39.39,22.09,53.74,11.78,15.43,24.2,35.7,24.35,57.25,0,.78,0,1.56,0,2.34-.16,21.55-14.59,43.3-24.39,57.22-10.89,15.48-22.1,32.77-22.1,53.72s8.39,39.83,21.99,53.62c15.01,15.22,24.01,35.43,24.12,56.81,0,.38,0,.77,0,1.15-.04,21.55-12.4,42.24-24.14,57.31-8.95,11.5-22.03,32.85-21.97,53.83.12,41.15,33.4,75.17,74.54,76.14,43.03,1.02,78.23-33.56,78.23-76.36,0-21.19-13.73-42.38-22.56-54.2-12.69-16.97-23.47-35.3-23.55-56.49,0-.19,0-.37,0-.56,0-21.6,8.9-42.21,24.08-57.58,13.62-13.79,22.02-32.75,22.02-53.67Z" />
                <path fill="currentColor" d="m202.39,412.45h.28c-.09-.09-.18-.19-.28-.29,0-.23.01-.46,0-.69-.26-20.4-12.91-39.54-22.09-52.6-10.57-15.03-23.66-36.05-24.12-56.82-.03-1.47-.02-1.18,0-2.65.12-21.37,11.74-41.35,23.85-56.95,9.78-12.59,22.88-33.63,22.63-55.23-.47-40.95-33.71-74.6-74.64-75.57-43.09-1.02-78.34,33.61-78.34,76.48h-.04s.03.03.04.04c.01,20.95,11.14,39.39,22.09,53.74,11.78,15.43,24.2,35.7,24.35,57.25,0,.78,0,1.56,0,2.34-.16,21.55-14.59,43.3-24.39,57.22-10.89,15.48-22.1,32.77-22.1,53.72s8.39,39.83,21.99,53.62c15.01,15.22,24.01,35.43,24.12,56.81,0,.38,0,.77,0,1.15-.04,21.55-12.4,42.24-24.14,57.31-8.95,11.5-22.03,32.85-21.97,53.83.12,41.15,33.4,75.17,74.54,76.14,43.03,1.02,78.23-33.56,78.23-76.36,0-21.19-13.73-42.38-22.56-54.2-12.69-16.97-23.47-35.3-23.55-56.49,0-.19,0-.37,0-.56,0-21.6,8.9-42.21,24.08-57.58,13.62-13.79,22.02-32.75,22.02-53.67Z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight mb-3">
              {language === 'pt' ? 'Criando seu ambiente clínico...' : language === 'es' ? 'Creando tu espacio clínico...' : 'Creating your clinical workspace...'}
            </h2>
            <p className="text-sm text-white/50 leading-relaxed mb-6">
              {language === 'pt'
                ? 'Preparando casos e protocolos da sua especialidade. Cada detalhe, pensado para você.'
                : language === 'es'
                ? 'Preparando casos y protocolos de tu especialidad. Cada detalle, pensado para ti.'
                : 'Preparing cases and protocols for your specialty. Every detail, tailored for you.'}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-white/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {language === 'pt' ? 'Personalizando seu painel clínico...' : language === 'es' ? 'Personalizando tu panel clínico...' : 'Tailoring your command center...'}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function StepHeader({ current, total, title, sub, stepLabel }: { current: number; total: number; title: string; sub?: string; stepLabel: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-[3px] rounded-full transition-all duration-500 ${
              i < current ? 'w-7 bg-white' : i === current ? 'w-7 bg-white/40' : 'w-3 bg-white/10'
            }`}
          />
        ))}
      </div>

      <p className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.2em] mb-2">
        {stepLabel}
      </p>
      <h2 className="text-[24px] font-semibold text-white tracking-tight">{title}</h2>
      {sub && <p className="text-sm text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

function RadioCard({ selected, onClick, label, sub }: { selected: boolean; onClick: () => void; label: string; sub: string }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      animate={selected ? { scale: 1.02 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`
        w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20
        ${selected
          ? 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.1)]'
          : 'bg-white/[0.03] text-white/60 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/80 hover:border-white/10'
        }
      `}
    >
      <div className="text-left">
        <p className="text-[14px] font-medium">{label}</p>
        <p className={`text-[11px] mt-0.5 ${selected ? 'text-black/50' : 'text-white/25'}`}>{sub}</p>
      </div>
      <motion.div
        animate={selected ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0.5 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
          selected ? 'border-black bg-black' : 'border-white/15'
        }`}
      >
        {selected && <div className="w-[7px] h-[7px] rounded-full bg-white" />}
      </motion.div>
    </motion.button>
  );
}

function NavRow({
  onBack,
  onNext,
  canNext,
  nextLabel,
  backLabel,
  loading,
}: {
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
  nextLabel: string;
  backLabel: string;
  loading?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center justify-between">
      <button
        onClick={onBack}
        disabled={loading}
        className="text-[13px] text-white/20 hover:text-white/50 transition-colors disabled:opacity-30"
      >
        {backLabel}
      </button>

      <button
        onClick={onNext}
        disabled={!canNext || loading}
        className={`
          flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
          disabled:opacity-20 disabled:cursor-not-allowed
          ${canNext && !loading
            ? 'bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]'
            : 'bg-white/10 text-white/40'
          }
        `}
      >
        {loading && <Spinner />}
        {nextLabel}
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity={0.3} strokeWidth={2} />
      <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
