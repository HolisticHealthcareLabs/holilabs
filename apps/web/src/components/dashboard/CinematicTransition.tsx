'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants, type Easing } from 'framer-motion';
import { useSession } from 'next-auth/react';

const APPLE_EASE = [0.16, 1, 0.3, 1] as const;
const STORAGE_KEY = 'holilabs:transition:played';

function getDoctorLastName(fullName?: string | null): string | null {
  if (!fullName) return null;
  const normalized = fullName.replace(/^\s*(dr|dra|doctor|doctora)\.?\s+/i, '').trim();
  if (!normalized) return null;
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts.slice(1).join(' ');
  return parts[0] || null;
}

function getWorkspaceLabel(session: ReturnType<typeof useSession>['data']): string {
  const name = session?.user?.name;
  const lastName = getDoctorLastName(name);
  if (lastName) return `Configuring Dr. ${lastName}'s Workspace...`;
  return 'Configuring your workspace...';
}

export function CinematicTransition({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [phase, setPhase] = useState<'bridge' | 'dissolve' | 'reveal' | 'done'>('bridge');
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    try {
      const played = sessionStorage.getItem(STORAGE_KEY);
      if (played === 'true') {
        setPhase('done');
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const fromDemo = params.get('transition') === 'cinematic';
      const referrer = document.referrer;
      const fromOnboarding = referrer.includes('/demo/') || referrer.includes('/onboarding');

      if (fromDemo || fromOnboarding) {
        setShouldPlay(true);
        sessionStorage.setItem(STORAGE_KEY, 'true');
      } else {
        setPhase('done');
      }
    } catch {
      setPhase('done');
    }
  }, [status]);

  useEffect(() => {
    if (!shouldPlay) return;

    const t1 = window.setTimeout(() => setPhase('dissolve'), 1500);
    const t2 = window.setTimeout(() => setPhase('reveal'), 2300);
    const t3 = window.setTimeout(() => setPhase('done'), 3200);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [shouldPlay]);

  const workspaceLabel = getWorkspaceLabel(session);

  if (phase === 'done') {
    return <>{children}</>;
  }

  return (
    <>
      {children}

      <AnimatePresence>
        {(phase === 'bridge' || phase === 'dissolve') && (
          <motion.div
            key="cinematic-overlay"
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: APPLE_EASE as unknown as Easing }}
            style={{ pointerEvents: phase === 'dissolve' ? 'none' : 'auto' }}
          >
            {/* Background layers */}
            <motion.div
              className="absolute inset-0 bg-neutral-950"
              animate={{
                opacity: phase === 'dissolve' ? 0 : 1,
              }}
              transition={{ duration: 0.8, ease: APPLE_EASE as unknown as Easing }}
            />

            <motion.div
              className="absolute inset-0"
              style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
              animate={{
                opacity: phase === 'dissolve' ? 0 : 1,
              }}
              transition={{ duration: 0.8, ease: APPLE_EASE as unknown as Easing }}
            />

            {/* Bridge content */}
            <div className="relative z-10 flex flex-col items-center gap-6 px-8">
              {/* Helix logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={
                  phase === 'bridge'
                    ? { opacity: 1, scale: 1, y: 0 }
                    : { opacity: 0, scale: 0.95, filter: 'blur(8px)', y: -8 }
                }
                transition={{
                  duration: phase === 'bridge' ? 0.6 : 0.5,
                  ease: APPLE_EASE as unknown as Easing,
                }}
              >
                <svg
                  className="h-10 w-9 text-white/80"
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
              </motion.div>

              {/* Status text */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={
                  phase === 'bridge'
                    ? { opacity: 1, y: 0, filter: 'blur(0px)' }
                    : { opacity: 0, y: -12, filter: 'blur(6px)' }
                }
                transition={{
                  duration: phase === 'bridge' ? 0.7 : 0.5,
                  delay: phase === 'bridge' ? 0.3 : 0,
                  ease: APPLE_EASE as unknown as Easing,
                }}
                className="text-[17px] font-medium text-white/50 tracking-[-0.01em] text-center"
              >
                {workspaceLabel}
              </motion.p>

              {/* Subtle breathing pulse */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={
                  phase === 'bridge'
                    ? { opacity: [0, 0.4, 0], scale: [0.98, 1.01, 0.98] }
                    : { opacity: 0 }
                }
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.8,
                }}
                className="absolute w-48 h-48 rounded-full bg-white/[0.03] -z-10"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reveal phase: staggered dashboard entrance */}
      {phase === 'reveal' && (
        <motion.div
          className="fixed inset-0 z-[9998] pointer-events-none"
          initial={{ backdropFilter: 'blur(12px)' }}
          animate={{ backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.9, ease: APPLE_EASE as unknown as Easing }}
          style={{ WebkitBackdropFilter: 'blur(0px)' } as any}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Stagger variants for child dashboard sections
// ---------------------------------------------------------------------------

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const scaleInCard: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 12,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const slideDownHeader: Variants = {
  hidden: {
    opacity: 0,
    y: -12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};
