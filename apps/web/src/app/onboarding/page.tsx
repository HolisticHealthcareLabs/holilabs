'use client';

import { useState, useTransition } from 'react';
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

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [generatedUsername, setGeneratedUsername] = useState<string | null>(null);

  const firstName = session?.user?.name?.split(' ')[0] || 'there';

  const handleSubmit = (formData: FormData) => {
    setError(null);

    startTransition(async () => {
      const result = await completeOnboarding(formData);

      if (result.success) {
        setGeneratedUsername(result.username);

        await update();

        setTimeout(() => {
          router.push('/dashboard/prevention');
        }, 1500);
      } else {
        setError(result.error);
      }
    });
  };

  if (generatedUsername) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome aboard!</h1>
          <p className="text-blue-200 mb-6">
            Your username is <span className="font-mono font-semibold text-white bg-white/10 px-2 py-0.5 rounded">@{generatedUsername}</span>
          </p>
          <p className="text-sm text-blue-300/60">Redirecting to your dashboard...</p>
          <div className="mt-4 w-8 h-8 mx-auto border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Logo + Header */}
        <div className="text-center mb-8">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <Image
              src="/logos/holilabs-helix-blue-dark.svg"
              alt="Holi Labs"
              width={48}
              height={48}
              className="block"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome, {firstName}
          </h1>
          <p className="text-blue-200/70">
            Tell us a bit about your practice so we can personalize Cortex for you.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <form action={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Specialty */}
            <div>
              <label htmlFor="specialty" className="block text-sm font-medium text-blue-200 mb-1.5">
                Specialty *
              </label>
              <select
                id="specialty"
                name="specialty"
                required
                className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-shadow"
              >
                <option value="" className="bg-slate-900">Select your specialty...</option>
                {SPECIALTIES.map(s => (
                  <option key={s} value={s} className="bg-slate-900">{s}</option>
                ))}
              </select>
            </div>

            {/* Organization */}
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-blue-200 mb-1.5">
                Organization
              </label>
              <input
                id="organization"
                name="organization"
                type="text"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-shadow"
                placeholder="Hospital or clinic name (optional)"
              />
            </div>

            {/* License Number */}
            <div>
              <label htmlFor="licenseNumber" className="block text-sm font-medium text-blue-200 mb-1.5">
                Medical License Number
              </label>
              <input
                id="licenseNumber"
                name="licenseNumber"
                type="text"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-shadow"
                placeholder="CRM, CRF, or NPI (optional)"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting up your account...
                </>
              ) : (
                'Complete Setup'
              )}
            </button>
          </form>

          {/* Note */}
          <p className="mt-6 text-center text-xs text-blue-300/40">
            A unique @username will be generated for you automatically.
            You can change it later in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
