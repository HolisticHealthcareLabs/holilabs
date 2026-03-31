'use client';

/**
 * [ACTIVATING: PAUL — Onboarding Welcome Page i18n Fix]
 *
 * Waitlist-gated onboarding: validates invitation link, creates account.
 * All strings use useTranslations('onboarding.welcome') for trilingual support.
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface LeadInfo {
  name: string | null;
  email: string;
  company: string | null;
  plan: string | null;
}

type PageState = 'loading' | 'form' | 'submitting' | 'success' | 'invalid';

export default function WaitlistOnboardingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('onboarding.welcome');
  const leadId = searchParams?.get('leadId') ?? null;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leadId) {
      setPageState('invalid');
      return;
    }

    fetch(`/api/admin/waitlist/${leadId}/verify`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setLead(data.lead);
          setPageState('form');
        } else {
          setPageState('invalid');
        }
      })
      .catch(() => setPageState('invalid'));
  }, [leadId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t('passwordMinLength'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setPageState('submitting');

    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('somethingWentWrong'));
        setPageState('form');
        return;
      }

      setPageState('success');
      setTimeout(() => {
        router.push('/sign-in?onboarded=true');
      }, 2000);
    } catch {
      setError(t('networkError'));
      setPageState('form');
    }
  };

  // --- Loading ---
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#424245] border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // --- Invalid link ---
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">
            {t('invalidLink')}
          </h1>
          <p className="text-sm text-[#86868b]">
            {t('invalidLinkDescription')}
          </p>
        </div>
      </div>
    );
  }

  // --- Success ---
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">
            {t('accountCreated')}
          </h1>
          <p className="text-sm text-[#86868b]">
            {t('redirecting')}
          </p>
          <div className="mt-4 w-5 h-5 mx-auto border-2 border-[#424245] border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // --- Form ---
  const firstName = lead?.name ? lead.name.split(' ')[0] : null;

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative w-12 h-12 mx-auto mb-5">
            <Image
              src="/logos/Logo 1_Light.svg"
              alt="Cortex"
              width={48}
              height={48}
              className="invert"
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-1.5">
            {firstName ? t('titleWithName', { name: firstName }) : t('title')}
          </h1>
          <p className="text-sm text-[#86868b]">
            {t('subtitle')}
          </p>
        </div>

        {/* Form card */}
        <div className="bg-[#1c1c1e] border border-[#38383a] rounded-2xl p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Pre-filled info */}
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-medium text-[#86868b] uppercase tracking-wider mb-1.5">
                  {t('email')}
                </label>
                <div className="px-4 py-3 rounded-xl bg-[#2c2c2e] border border-[#38383a] text-sm text-[#a1a1a6]">
                  {lead?.email}
                </div>
              </div>
              {lead?.company && (
                <div>
                  <label className="block text-xs font-medium text-[#86868b] uppercase tracking-wider mb-1.5">
                    {t('workspace')}
                  </label>
                  <div className="px-4 py-3 rounded-xl bg-[#2c2c2e] border border-[#38383a] text-sm text-[#a1a1a6]">
                    {lead.company}
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[#86868b] uppercase tracking-wider mb-1.5">
                {t('createPassword')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl bg-[#2c2c2e] border border-[#38383a] text-white text-sm placeholder:text-[#48484a] outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] transition-colors"
                placeholder={t('minCharacters')}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-[#86868b] uppercase tracking-wider mb-1.5">
                {t('confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl bg-[#2c2c2e] border border-[#38383a] text-white text-sm placeholder:text-[#48484a] outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] transition-colors"
                placeholder={t('reEnterPassword')}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={pageState === 'submitting'}
              className="w-full py-3.5 bg-[#0071e3] text-white text-sm font-semibold rounded-xl hover:bg-[#0077ed] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {pageState === 'submitting' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('creatingAccount')}
                </>
              ) : (
                t('createAccount')
              )}
            </button>
          </form>

          {lead?.plan && (
            <p className="mt-4 text-center text-xs text-[#48484a]">
              {t('plan')} <span className="text-[#86868b] capitalize">{lead.plan}</span>
            </p>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-[#48484a]">
          {t('alreadyHaveAccount')}{' '}
          <a href="/sign-in" className="text-[#0071e3] hover:underline">
            {t('signIn')}
          </a>
        </p>
      </div>
    </div>
  );
}
