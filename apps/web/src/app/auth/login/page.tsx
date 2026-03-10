/**
 * Clinician Login Page
 *
 * ElevenLabs-inspired minimal sign-in layout with:
 *  - Google SSO (primary action)
 *  - "Try Interactive Demo" ghost button
 *  - Terms of Service / Privacy Policy checkbox gate on the email submit path
 *
 * NextAuth credentials + Google providers.
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Suspense } from 'react';

// ─── Google colour-accurate G mark ───────────────────────────────────────────
function GoogleMark() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ─── Eye-toggle icons ─────────────────────────────────────────────────────────
function EyeOpen() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}
function EyeOff() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

// ─── Inline spinner ───────────────────────────────────────────────────────────
function Spinner({ size = 16 }: { size?: number }) {
  const r = (size / 2) - 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
         className="animate-spin" aria-hidden="true">
      <circle cx={c} cy={c} r={r} fill="none"
              stroke="currentColor" strokeOpacity={0.25} strokeWidth={2} />
      <circle cx={c} cy={c} r={r} fill="none"
              stroke="currentColor" strokeWidth={2}
              strokeDasharray={circ}
              strokeDashoffset={circ * 0.75}
              strokeLinecap="round" />
    </svg>
  );
}

// ─── Main login content ───────────────────────────────────────────────────────
function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAgreed,  setTermsAgreed]  = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';

  // ── Google sign-in ──────────────────────────────────────────────────────────
  function handleGoogleSignIn() {
    signIn('google', { callbackUrl });
  }

  // ── Interactive demo → navigate to the setup survey ────────────────────────
  function handleDemo() {
    router.push('/demo/setup');
  }

  // ── Credentials sign-in ─────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!termsAgreed) return;
    setError(null);
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (!result || result.error) {
        setError('Invalid email or password.');
        setIsLoading(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('Sign-in failed. Please try again.');
      setIsLoading(false);
    }
  }

  const submitDisabled = isLoading || !email || !password || !termsAgreed;

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-4 pb-[var(--holi-cookie-banner-h,0px)]">
      {/* Wordmark */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-10 flex flex-col items-center gap-3"
      >
        <div className="relative w-11 h-11">
          <Image
            src="/logos/Logo 1_Dark.svg"
            alt="Holi Labs"
            width={44}
            height={44}
            className="w-full h-full object-contain"
          />
        </div>
        <span className="text-[20px] leading-none font-semibold tracking-tight text-gray-900">
          Holi Labs
        </span>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="w-full max-w-[400px]"
      >
        <h1 className="text-[26px] font-bold text-gray-900 text-center mb-7 tracking-tight">
          Sign in
        </h1>

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="mb-4 overflow-hidden"
            >
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Google sign-in ────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="
            w-full flex items-center justify-center gap-3
            border border-gray-300 rounded-xl
            px-4 py-3 text-sm font-medium text-gray-900
            hover:bg-gray-50 active:bg-gray-100
            transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400
          "
        >
          <GoogleMark />
          Sign in with Google
        </button>

        {/* ── Try Interactive Demo (ghost / outline) ────────────────────────── */}
        <button
          type="button"
          onClick={handleDemo}
          disabled={isLoading}
          className="
            mt-3 w-full flex items-center justify-center gap-2
            border border-gray-300 rounded-xl
            px-4 py-3 text-sm font-medium text-gray-600
            hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100
            transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400
          "
        >
          <>
            {/* Play icon */}
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Launch Interactive Demo
          </>
        </button>

        {/* Consent line under Google button */}
        <p className="mt-4 text-[12px] text-gray-500 leading-relaxed">
          By clicking &ldquo;Sign in with Google&rdquo; I agree to the{' '}
          <a href="/legal/terms-of-service" className="underline underline-offset-2 hover:text-gray-700">
            Terms of Service
          </a>
          , and acknowledge Holi Labs&apos;{' '}
          <a href="/legal/privacy-policy" className="underline underline-offset-2 hover:text-gray-700">
            Privacy Policy
          </a>
          .
        </p>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium select-none">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* ── Email / password form ─────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-900 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="
                w-full px-4 py-3 rounded-xl border border-gray-300
                text-sm text-gray-900 placeholder:text-gray-400
                bg-white
                focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
                transition
              "
              placeholder="doctor@holilabs.com"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-900 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="
                  w-full px-4 py-3 pr-11 rounded-xl border border-gray-300
                  text-sm text-gray-900 placeholder:text-gray-400
                  bg-white
                  focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition
                "
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 transition-colors"
              >
                {showPassword ? <EyeOff /> : <EyeOpen />}
              </button>
            </div>
          </div>

          {/* ToS checkbox — gates the Sign in button */}
          <label className="flex items-start gap-3 cursor-pointer select-none group">
            <span className="mt-0.5 w-5 h-5 flex-shrink-0 relative">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="peer sr-only"
              />
              {/* Custom checkbox */}
              <span className="
                block w-5 h-5 rounded border border-gray-300
                peer-checked:bg-gray-900 peer-checked:border-gray-900
                transition-colors
                group-hover:border-gray-500
              " />
              {/* Checkmark */}
              {termsAgreed && (
                <svg
                  className="absolute inset-0 w-5 h-5 text-white pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className="text-[13px] text-gray-600 leading-relaxed">
              I agree to the{' '}
              <a
                href="/legal/terms-of-service"
                onClick={(e) => e.stopPropagation()}
                className="underline underline-offset-2 hover:text-gray-900"
              >
                Terms of Service
              </a>
              , and acknowledge Holi Labs&apos;{' '}
              <a
                href="/legal/privacy-policy"
                onClick={(e) => e.stopPropagation()}
                className="underline underline-offset-2 hover:text-gray-900"
              >
                Privacy Policy
              </a>
            </span>
          </label>

          {/* Submit — disabled until checkbox + credentials filled */}
          <button
            type="submit"
            disabled={submitDisabled}
            className="
              w-full flex items-center justify-center gap-2
              py-3 rounded-xl text-sm font-semibold
              bg-gray-500 text-white
              enabled:bg-gray-900 enabled:hover:bg-gray-700
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400
            "
          >
            {isLoading ? (
              <>
                <Spinner />
                <span>Signing in…</span>
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <a
            href="/auth/register"
            className="font-semibold underline underline-offset-2 text-gray-900 hover:text-gray-600 transition-colors"
          >
            Create profile
          </a>
        </p>
      </motion.div>
    </div>
  );
}

// ─── Page shell (Suspense for useSearchParams) ────────────────────────────────
export default function ClinicianLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-white flex items-center justify-center pb-[var(--holi-cookie-banner-h,0px)]">
          <Spinner size={24} />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
