'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

type OnboardingProfile = import('@/app/api/onboarding/profile/route').OnboardingProfile;

const LS_KEY = 'holilabs:onboardingProfile:v1';

async function loadProfile(): Promise<OnboardingProfile | null> {
  const res = await fetch('/api/onboarding/profile', { cache: 'no-store' }).catch(() => null);
  if (res && res.ok) {
    const json = await res.json().catch(() => null);
    return (json?.data as OnboardingProfile) ?? null;
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as OnboardingProfile) : null;
  } catch {
    return null;
  }
}

async function saveProfile(profile: OnboardingProfile) {
  const res = await fetch('/api/onboarding/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile }),
  }).catch(() => null);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(profile));
  } catch { /* ignore */ }
  return Boolean(res && res.ok);
}

const STEPS = [
  {
    id: 'role',
    field: 'persona' as const,
    title: 'What best describes your role?',
    options: [
      { value: 'CLINICIAN', label: 'Clinician', desc: 'Physician, nurse, or specialist', icon: '🩺' },
      { value: 'CLINIC_OWNER', label: 'Clinic Administrator', desc: 'Practice owner or manager', icon: '🏥' },
      { value: 'HOSPITAL_IT', label: 'Hospital IT / Security', desc: 'IT, compliance, or InfoSec', icon: '🔐' },
      { value: 'OTHER', label: 'Other', desc: 'Researcher, advisor, or partner', icon: '👤' },
    ],
  },
  {
    id: 'country',
    field: 'complianceCountry' as const,
    title: 'Where is your primary practice?',
    options: [
      { value: 'BRAZIL', label: 'Brazil', desc: 'LGPD / ANVISA / SUS', icon: '🇧🇷' },
      { value: 'ARGENTINA', label: 'Argentina', desc: 'Ley 25.326 / ANMAT', icon: '🇦🇷' },
      { value: 'BOLIVIA', label: 'Bolivia', desc: 'Regional compliance', icon: '🇧🇴' },
      { value: 'MEXICO', label: 'Mexico', desc: 'LFPDPPP / COFEPRIS', icon: '🇲🇽' },
      { value: 'COLOMBIA', label: 'Colombia', desc: 'Ley 1581 / INVIMA', icon: '🇨🇴' },
      { value: 'OTHER', label: 'Other', desc: 'US, EU, or other region', icon: '🌎' },
    ],
  },
  {
    id: 'goal',
    field: 'goal' as const,
    title: 'What would you like to accomplish first?',
    options: [
      { value: 'PILOT', label: 'Run a pilot', desc: 'Test with 1-3 workstations', icon: '🧪' },
      { value: 'ROLL_OUT', label: 'Deploy to a department', desc: 'Roll out across a team', icon: '🚀' },
      { value: 'EVALUATE', label: 'Evaluate the platform', desc: 'Explore features and compliance', icon: '🔍' },
      { value: 'UNKNOWN', label: 'Just exploring', desc: "I'll decide later", icon: '✨' },
    ],
  },
];

export function IntroQuestionnaireModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (profile: OnboardingProfile) => void;
}) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [profile, setProfile] = React.useState<OnboardingProfile>({
    persona: 'CLINICIAN',
    orgSize: '6-25',
    deployment: 'UNKNOWN',
    osMix: 'MIXED',
    ehr: 'UNKNOWN',
    goal: 'EVALUATE',
    complianceCountry: 'UNKNOWN',
    insurerFocus: '',
    protocolMode: 'HYBRID_70_30',
  });

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    setStep(0);
    loadProfile()
      .then((p) => {
        if (p) setProfile((prev) => ({ ...prev, ...p }));
      })
      .finally(() => setLoading(false));
  }, [open]);

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const handleSelect = async (value: string) => {
    const updated = { ...profile, [currentStep.field]: value };
    setProfile(updated);

    if (isLastStep) {
      setSaving(true);
      await saveProfile(updated);
      onSaved?.(updated);
      setSaving(false);
      onClose();
    } else {
      setStep((s) => s + 1);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg overflow-hidden" style={{ borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-default)', boxShadow: 'var(--token-shadow-xl)' }}>
              {/* Header */}
              <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 px-8 pt-8 pb-6 text-center">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-white/60 hover:text-white text-sm font-medium transition-colors"
                >
                  Skip
                </button>
                <div className="relative w-12 h-12 mx-auto mb-4">
                  <Image
                    src="/logos/holilabs-helix-blue-dark.svg"
                    alt="Cortex"
                    width={48}
                    height={48}
                    className="brightness-0 invert"
                  />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">
                  Welcome to Cortex
                </h2>
                <p className="text-blue-100 text-sm">
                  Three quick questions to personalize your experience
                </p>

                {/* Progress dots */}
                <div className="flex items-center justify-center gap-2 mt-5">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === step
                          ? 'w-8 bg-white'
                          : i < step
                            ? 'w-4 bg-white/60'
                            : 'w-4 bg-white/25'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                        {currentStep.title}
                      </p>
                      <div className="space-y-2">
                        {currentStep.options.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleSelect(opt.value)}
                            disabled={saving}
                            className="w-full flex items-center gap-4 p-4 border hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all text-left group disabled:opacity-50"
                            style={{ borderRadius: 'var(--radius-xl)', borderColor: 'var(--border-default)' }}
                          >
                            <span className="text-2xl shrink-0">{opt.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors" style={{ color: 'var(--text-primary)' }}>
                                {opt.label}
                              </p>
                              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                                {opt.desc}
                              </p>
                            </div>
                            <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 pb-5 flex items-center justify-between">
                {step > 0 ? (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="text-sm hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Back
                  </button>
                ) : (
                  <span />
                )}
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Step {step + 1} of {STEPS.length}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
