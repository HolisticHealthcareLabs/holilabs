'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { completeOnboarding } from '@/app/actions/onboarding';

const SPECIALTIES = [
  'Cardiology',
  'Internal Medicine',
  'Family Medicine',
  'Emergency Medicine',
  'Endocrinology',
  'Pediatrics',
  'Oncology',
  'Pulmonology',
  'Neurology',
  'Psychiatry',
  'Geriatrics',
  'Nephrology',
  'Rheumatology',
  'Dermatology',
  'Obstetrics & Gynecology',
  'Other',
] as const;

type OnboardingStep = 'review' | 'specialty' | 'practice';

const STEP_ORDER: OnboardingStep[] = ['review', 'specialty', 'practice'];

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [generatedUsername, setGeneratedUsername] = useState<string | null>(null);
  const [defaultOrg, setDefaultOrg] = useState<string>('');
  const [step, setStep] = useState<OnboardingStep>('review');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [subscribeUpdates, setSubscribeUpdates] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [organization, setOrganization] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  const firstName = session?.user?.name?.split(' ')[0] || 'there';
  const verifiedEmail = session?.user?.email || '';
  const currentStepIndex = useMemo(() => STEP_ORDER.indexOf(step), [step]);

  useEffect(() => {
    fetch('/api/user/workspace')
      .then((r) => r.json())
      .then((d) => {
        if (d.workspaceName) {
          setDefaultOrg(d.workspaceName);
          setOrganization(d.workspaceName);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = () => {
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set('specialty', selectedSpecialties.join(', '));
      formData.set('organization', organization);
      formData.set('licenseNumber', licenseNumber);

      const result = await completeOnboarding(formData);

      if (result.success) {
        setGeneratedUsername(result.username);

        await update();

        setTimeout(() => {
          router.push('/dashboard/clinical-command');
        }, 1500);
      } else {
        setError(result.error);
      }
    });
  };

  const handleContinue = () => {
    setError(null);

    if (step === 'review') {
      if (!acceptedTerms) {
        setError('Please accept the Terms of Service to continue.');
        return;
      }
      setStep('specialty');
      return;
    }

    if (step === 'specialty') {
      if (selectedSpecialties.length === 0) {
        setError('Please select at least one specialty.');
        return;
      }
      setStep('practice');
      return;
    }

    handleSubmit();
  };

  const handleBack = () => {
    setError(null);
    if (step === 'practice') {
      setStep('specialty');
      return;
    }
    if (step === 'specialty') {
      setStep('review');
    }
  };

  if (generatedUsername) {
    return (
      <div className="min-h-screen bg-[#1f1f1c] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <div className="relative h-10 w-10">
              <Image
                src="/logos/holilabs-helix-blue-dark.svg"
                alt="Holi Labs"
                width={40}
                height={40}
                className="brightness-0 invert"
              />
            </div>
          </div>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white mb-3">Account ready</h1>
          <p className="text-base text-white/70 mb-6">
            Your username is <span className="font-mono font-semibold text-white bg-white/10 px-2 py-0.5 rounded">@{generatedUsername}</span>
          </p>
          <p className="text-sm text-white/50">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1f1f1c] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-20 text-center">
          <div className="relative w-10 h-10 mx-auto mb-6">
            <Image
              src="/logos/holilabs-helix-blue-dark.svg"
              alt="Holi Labs"
              width={40}
              height={40}
              className="brightness-0 invert"
            />
          </div>
          <h1 className="text-[48px] leading-[1.05] font-semibold tracking-tight text-white mb-3">
            Let&apos;s create your account
          </h1>
          <p className="text-lg text-white/65">
            A few things for you to review
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur-sm">
          <div className="space-y-5">
            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {step === 'review' && (
              <div className="space-y-4">
                <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/78">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-white focus:ring-white/30"
                  />
                  <span>
                    I agree to Holi Labs&apos;{' '}
                    <a
                      href="/legal/terms-of-service"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="underline underline-offset-2 text-white/90 hover:text-white transition-colors"
                    >
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a
                      href="/legal/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="underline underline-offset-2 text-white/90 hover:text-white transition-colors"
                    >
                      Privacy Policy
                    </a>{' '}
                    and confirm that I am authorized to create this clinical workspace account.
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/65">
                  <input
                    type="checkbox"
                    checked={subscribeUpdates}
                    onChange={(e) => setSubscribeUpdates(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-white focus:ring-white/30"
                  />
                  <span>
                    Subscribe to occasional product updates and release notes. You can opt out at any time.
                  </span>
                </label>
              </div>
            )}

            {step === 'specialty' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white/75">
                    Select your specialties
                  </p>
                  {selectedSpecialties.length > 0 && (
                    <span className="text-xs text-white/45">
                      {selectedSpecialties.length} selected
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
                  {SPECIALTIES.map((item) => {
                    const isChecked = selectedSpecialties.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setSelectedSpecialties((prev) =>
                            isChecked
                              ? prev.filter((s) => s !== item)
                              : [...prev, item]
                          );
                        }}
                        className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left text-[13px] transition-colors ${
                          isChecked
                            ? 'border-white/30 bg-white/10 text-white font-semibold'
                            : 'border-white/8 bg-white/[0.03] text-white/70 hover:border-white/15 hover:bg-white/[0.06]'
                        }`}
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          isChecked
                            ? 'border-white bg-white'
                            : 'border-white/30 bg-transparent'
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

            {step === 'practice' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="organization" className="block text-sm font-medium text-white/75 mb-2">
                    Organization
                  </label>
                  <input
                    id="organization"
                    name="organization"
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-shadow focus:border-white/25 focus:ring-2 focus:ring-white/10"
                    placeholder="Hospital or clinic name"
                  />
                </div>
                <div>
                  <label htmlFor="licenseNumber" className="block text-sm font-medium text-white/75 mb-2">
                    Medical license number
                  </label>
                  <input
                    id="licenseNumber"
                    name="licenseNumber"
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-shadow focus:border-white/25 focus:ring-2 focus:ring-white/10"
                    placeholder="CRM, CRF, or NPI"
                  />
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
                  ? 'Creating account...'
                  : step === 'practice'
                    ? 'Create account'
                    : 'Continue'}
              </button>
            </div>

            <div className="flex items-center justify-between px-1 text-xs text-white/45">
              <span>
                Step {currentStepIndex + 1} of {STEP_ORDER.length}
              </span>
              {step !== 'review' ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-white/55 transition-colors hover:text-white/80"
                >
                  Back
                </button>
              ) : (
                <span />
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-sm text-white/52">
          <p>Email verified as {verifiedEmail || 'your account email'}</p>
          <p className="mt-1">You can update these details later in Settings.</p>
        </div>
      </div>
    </div>
  );
}
