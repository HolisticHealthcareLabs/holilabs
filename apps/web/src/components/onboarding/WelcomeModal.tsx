'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// i18n — inline translations for the welcome modal
// ---------------------------------------------------------------------------

type Lang = 'en' | 'pt' | 'es';

const COPY: Record<Lang, {
  welcome: (name: string) => string;
  workspaceReady: (specialty: string) => string;
  startTour: string;
  explore: string;
}> = {
  en: {
    welcome: (name) => `Welcome, Dr. ${name}.`,
    workspaceReady: (specialty) => `Your ${specialty} workspace is ready.`,
    startTour: 'Take the 75-second guided tour',
    explore: "I'll explore on my own",
  },
  pt: {
    welcome: (name) => `Bem-vindo(a), Dr(a). ${name}.`,
    workspaceReady: (specialty) => `Seu ambiente de ${specialty} está pronto.`,
    startTour: 'Fazer o tour guiado de 75 segundos',
    explore: 'Prefiro explorar por conta própria',
  },
  es: {
    welcome: (name) => `Bienvenido(a), Dr(a). ${name}.`,
    workspaceReady: (specialty) => `Tu espacio de ${specialty} está listo.`,
    startTour: 'Hacer el tour guiado de 75 segundos',
    explore: 'Prefiero explorar por mi cuenta',
  },
};

function getLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('holilabs_language');
  if (stored === 'pt' || stored === 'es') return stored;
  return 'en';
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WelcomeModalProps {
  doctorName: string;
  specialty: string;
  onStartTour: () => void;
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WelcomeModal({
  doctorName,
  specialty,
  onStartTour,
  onDismiss,
}: WelcomeModalProps) {
  const tourBtnRef = useRef<HTMLButtonElement>(null);
  const lang = getLang();
  const copy = COPY[lang];

  useEffect(() => {
    const timer = setTimeout(() => tourBtnRef.current?.focus(), 100);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome"
    >
      {/* Dark glass backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />

      {/* Card */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center px-8 py-12 max-w-md w-full"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0, duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Hospital demo logo */}
        <img
          src="/demo/hospital-logo.png"
          alt="Hospital Demo"
          className="h-10 w-auto mb-4 opacity-60"
        />

        {/* Holi Labs logo */}
        <svg
          className="h-10 w-9 text-white/80 mb-10"
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

        {/* Welcome heading */}
        <motion.h1
          className="text-[28px] sm:text-[34px] font-semibold text-white tracking-tight leading-tight"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04, duration: 0.12 }}
        >
          {copy.welcome(doctorName)}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-white/40 text-[15px] mt-2 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.06, duration: 0.1 }}
        >
          {copy.workspaceReady(specialty)}
        </motion.p>

        {/* CTA: Start Tour */}
        <motion.button
          ref={tourBtnRef}
          onClick={onStartTour}
          className="w-full max-w-xs px-6 py-3.5 bg-white text-black text-[14px] font-semibold tracking-[-0.01em] transition-all duration-200 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          style={{ borderRadius: 'var(--radius-xl)' }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.1 }}
        >
          {copy.startTour}
        </motion.button>

        {/* Ghost: Explore on my own */}
        <motion.button
          onClick={onDismiss}
          className="mt-4 text-[13px] text-white/25 hover:text-white/50 transition-colors duration-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.1 }}
        >
          {copy.explore}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
