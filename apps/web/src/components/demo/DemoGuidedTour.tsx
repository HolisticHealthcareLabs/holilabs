'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface TourStep {
  title: string;
  body: string;
  badge: string;
  icon: string;
  position: 'top-left' | 'center' | 'top-right';
}

const TOUR_STEPS: TourStep[] = [
  {
    badge: 'Safety',
    title: 'Real-Time Safety Checks',
    body: 'Traffic-light alerts for drug interactions, renal dosing, and formulary compliance — running in real time as clinicians work. Deterministic rules keep high-risk moments transparent, while AI handles context and documentation.',
    icon: '🛡️',
    position: 'top-left',
  },
  {
    badge: 'Governance',
    title: 'Live Governance Console',
    body: 'Every clinical decision is logged in a tamper-evident audit trail. The console shows fleet-wide trust scores, override intelligence, and protocol drift — giving quality teams real-time visibility instead of retrospective reports.',
    icon: '📊',
    position: 'center',
  },
  {
    badge: 'Prevention',
    title: 'Longitudinal Care Hub',
    body: 'Longitudinal care across 7 health domains with 50+ evidence-based protocols. Dynamic risk scoring, collaborative templates, and automated reminders that keep patients on track over months and years — not just during a single visit.',
    icon: '🔬',
    position: 'top-right',
  },
];

const LS_KEY = 'holilabs:demoTourSeen:v1';

function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(LS_KEY) === 'true';
  } catch {
    return false;
  }
}

function markTourSeen() {
  try {
    localStorage.setItem(LS_KEY, 'true');
  } catch { /* ignore */ }
}

export function DemoGuidedTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  const start = useCallback(() => {
    setStep(0);
    setActive(true);
  }, []);

  const next = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      markTourSeen();
      setActive(false);
    }
  }, [step]);

  const end = useCallback(() => {
    markTourSeen();
    setActive(false);
  }, []);

  const current = TOUR_STEPS[step];

  return (
    <>
      {/* Trigger button */}
      {!active && (
        <button
          onClick={start}
          className="fixed bottom-6 right-6 z-[9000] flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-full shadow-xl shadow-blue-600/25 transition-all hover:scale-105"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Quick Tour
        </button>
      )}

      {/* Tour overlay */}
      <AnimatePresence>
        {active && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9990] bg-black/60 backdrop-blur-sm"
              onClick={end}
            />

            {/* Card */}
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="fixed z-[9995] inset-0 flex items-center justify-center p-6"
            >
              <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
                {/* Card header */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-8 pt-8 pb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-4xl">{current.icon}</span>
                    <div>
                      <span className="inline-flex px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold tracking-wide mb-1">
                        {current.badge}
                      </span>
                      <h3 className="text-xl font-bold text-white">{current.title}</h3>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{current.body}</p>
                </div>

                {/* Card footer */}
                <div className="px-8 py-5 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2">
                    {TOUR_STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === step ? 'w-6 bg-blue-600' : i < step ? 'w-3 bg-blue-400' : 'w-3 bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-xs text-gray-400">{step + 1}/{TOUR_STEPS.length}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={end}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                      End Tour
                    </button>
                    <button
                      onClick={next}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {step === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
