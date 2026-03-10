'use client';

import { useState, useMemo, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { completeAdminOnboarding } from '@/app/actions/onboarding';

const JURISDICTIONS = [
  { value: 'BRAZIL', label: 'Brazil', billing: 'CBHPM / TUSS' },
  { value: 'MEXICO', label: 'Mexico', billing: 'CAUSES / FPGC' },
  { value: 'COLOMBIA', label: 'Colombia', billing: 'CUPS' },
  { value: 'ARGENTINA', label: 'Argentina', billing: 'PMO' },
  { value: 'CHILE', label: 'Chile', billing: 'FONASA / ISAPRE' },
  { value: 'BOLIVIA', label: 'Bolivia', billing: 'CNS' },
  { value: 'PERU', label: 'Peru', billing: 'SIS / EsSalud' },
  { value: 'US', label: 'United States', billing: 'CPT / ICD-10-PCS' },
  { value: 'OTHER', label: 'Other', billing: 'Custom' },
] as const;

const DISCIPLINES = [
  'Cardiology', 'Internal Medicine', 'Family Medicine', 'Emergency Medicine',
  'Endocrinology', 'Pediatrics', 'Oncology', 'Pulmonology',
  'Neurology', 'Psychiatry', 'Geriatrics', 'Nephrology',
  'Rheumatology', 'Dermatology', 'Obstetrics & Gynecology', 'Other',
] as const;

type AdminStep = 'jurisdiction' | 'disciplines' | 'invite';
const STEP_ORDER: AdminStep[] = ['jurisdiction', 'disciplines', 'invite'];

export default function AdminOnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<AdminStep>('jurisdiction');
  const [done, setDone] = useState(false);

  const [jurisdiction, setJurisdiction] = useState('');
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [frontDeskEmail, setFrontDeskEmail] = useState('');

  const currentStepIndex = useMemo(() => STEP_ORDER.indexOf(step), [step]);
  const billingLabel = JURISDICTIONS.find((j) => j.value === jurisdiction)?.billing || '';

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('jurisdiction', jurisdiction);
      formData.set('billingStandard', billingLabel);
      formData.set('disciplines', selectedDisciplines.join(', '));
      formData.set('frontDeskEmail', frontDeskEmail);

      const result = await completeAdminOnboarding(formData);
      if (result.success) {
        setDone(true);
        await update();
        setTimeout(() => router.push('/dashboard/my-day'), 1200);
      } else {
        setError(result.error);
      }
    });
  };

  const handleContinue = () => {
    setError(null);
    if (step === 'jurisdiction') {
      if (!jurisdiction) { setError('Please select your jurisdiction.'); return; }
      setStep('disciplines');
      return;
    }
    if (step === 'disciplines') {
      if (selectedDisciplines.length === 0) { setError('Please select at least one discipline.'); return; }
      setStep('invite');
      return;
    }
    handleSubmit();
  };

  const handleBack = () => {
    setError(null);
    if (step === 'invite') { setStep('disciplines'); return; }
    if (step === 'disciplines') { setStep('jurisdiction'); }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#1f1f1c] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <div className="relative h-10 w-10">
              <Image src="/logos/holilabs-helix-blue-dark.svg" alt="Holi Labs" width={40} height={40} className="brightness-0 invert" />
            </div>
          </div>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white mb-3">Workspace ready</h1>
          <p className="text-sm text-white/50">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1f1f1c] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-16 text-center">
          <div className="relative w-10 h-10 mx-auto mb-6">
            <Image src="/logos/holilabs-helix-blue-dark.svg" alt="Holi Labs" width={40} height={40} className="brightness-0 invert" />
          </div>
          <h1 className="text-[42px] leading-[1.05] font-semibold tracking-tight text-white mb-3">
            Configure your workspace
          </h1>
          <p className="text-lg text-white/65">
            {session?.user?.name ? `Welcome, ${session.user.name.split(' ')[0]}` : 'A few things to set up'}
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-sm">
          <div className="space-y-5">
            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {step === 'jurisdiction' && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-white/75">Primary jurisdiction</p>
                <div className="grid gap-2 max-h-[340px] overflow-y-auto pr-1">
                  {JURISDICTIONS.map((j) => {
                    const isSelected = jurisdiction === j.value;
                    return (
                      <button
                        key={j.value}
                        type="button"
                        onClick={() => setJurisdiction(j.value)}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                          isSelected
                            ? 'border-white/30 bg-white/10 text-white font-semibold'
                            : 'border-white/8 bg-white/[0.03] text-white/70 hover:border-white/15 hover:bg-white/[0.06]'
                        }`}
                      >
                        <span>{j.label}</span>
                        <span className="text-xs text-white/45">{j.billing}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 'disciplines' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white/75">Clinical disciplines</p>
                  {selectedDisciplines.length > 0 && (
                    <span className="text-xs text-white/45">{selectedDisciplines.length} selected</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
                  {DISCIPLINES.map((item) => {
                    const isChecked = selectedDisciplines.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setSelectedDisciplines((prev) =>
                            isChecked ? prev.filter((s) => s !== item) : [...prev, item]
                          );
                        }}
                        className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left text-[13px] transition-colors ${
                          isChecked
                            ? 'border-white/30 bg-white/10 text-white font-semibold'
                            : 'border-white/8 bg-white/[0.03] text-white/70 hover:border-white/15 hover:bg-white/[0.06]'
                        }`}
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          isChecked ? 'border-white bg-white' : 'border-white/30 bg-transparent'
                        }`}>
                          {isChecked && (
                            <svg className="h-2.5 w-2.5 text-[#1f1f1c]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className="truncate">{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 'invite' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-white/75 mb-2">Invite your front desk (optional)</p>
                  <p className="text-xs text-white/45 mb-4">
                    Send a free license to your receptionist so they can manage arrivals and scheduling.
                  </p>
                  <input
                    type="email"
                    value={frontDeskEmail}
                    onChange={(e) => setFrontDeskEmail(e.target.value)}
                    placeholder="receptionist@clinic.com"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-shadow focus:border-white/25 focus:ring-2 focus:ring-white/10"
                  />
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-white/50">
                  You can skip this step and invite team members later from Settings.
                </div>
              </div>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={handleContinue}
                disabled={isPending}
                className="w-full rounded-2xl bg-white py-3.5 text-base font-semibold text-[#1f1f1c] transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending
                  ? 'Setting up workspace...'
                  : step === 'invite'
                    ? 'Complete setup'
                    : 'Continue'}
              </button>
            </div>

            <div className="flex items-center justify-between px-1 text-xs text-white/45">
              <span>Step {currentStepIndex + 1} of {STEP_ORDER.length}</span>
              {step !== 'jurisdiction' ? (
                <button type="button" onClick={handleBack} className="text-white/55 transition-colors hover:text-white/80">
                  Back
                </button>
              ) : (
                <span />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
