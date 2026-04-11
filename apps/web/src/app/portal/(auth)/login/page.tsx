/**
 * Patient Portal Login Page - Simplified Password-First Authentication
 *
 * Features:
 * - Password authentication as primary method
 * - Magic link as alternative option
 * - Demo account quick access
 * - Remember Me functionality
 * - Account lockout handling
 * - Email verification check
 * - Clean, minimal UI (~300 lines)
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LanguageSwitch } from '@/components/ui/LanguageSwitch';
import { DemoCredentialsBanner } from '@/components/demo/DemoCredentialsBanner';

export const dynamic = 'force-dynamic';

export default function PatientLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('portal.login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const urlError = searchParams?.get('error');
  const urlMessage = searchParams?.get('message');
  const verified = searchParams?.get('verified');

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/portal/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push('/portal/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/portal/auth/magic-link/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setSuccessMessage(t('magicLinkSent'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('maria.oliveira@example.com');
    setPassword('Patient2026!');
    setRememberMe(false);
    setShowMagicLink(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitch />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <img
            src="/logos/Logo 1_Dark.svg"
            alt="Holi Labs"
            className="h-12 mx-auto mb-4"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <h1 className="text-3xl font-bold text-gray-900">
            {t('title')}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('subtitle')}
          </p>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gradient-to-br from-green-50 via-white to-green-50 text-gray-500">
              {t('signInWith')}
            </span>
          </div>
        </div>

        <DemoCredentialsBanner variant="patient" />

        <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900 mb-1">
                {t('tryDemo')}
              </p>
              <p className="text-xs text-blue-800 mb-3">
                {t('demoDescription')}
              </p>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              >
                {t('loadDemoCredentials')}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {verified && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {t('emailVerified')}
            </div>
          )}
          {urlMessage === 'already_verified' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
              {t('alreadyVerified')}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {urlError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {urlError === 'invalid_verification_token' && 'Token de verificación inválido o expirado'}
              {urlError === 'verification_token_used' && 'Este token de verificación ya fue usado'}
              {urlError === 'verification_token_expired' && 'Token de verificación expirado. Solicita uno nuevo'}
              {urlError === 'verification_failed' && 'Error al verificar email. Intenta nuevamente'}
            </div>
          )}

          {!showMagicLink ? (
            <form onSubmit={handlePasswordLogin}>
              <div className="space-y-4">
                <Input
                  label={t('emailLabel')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder={t('emailPlaceholder')}
                />

                <PasswordInput
                  label={t('passwordLabel')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-gray-700">
                      {t('rememberMe')}
                    </span>
                  </label>

                  <a
                    href="/portal/forgot-password"
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    {t('forgotPassword')}
                  </a>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  className="!from-green-600 !to-green-700 hover:!from-green-700 hover:!to-green-800"
                >
                  {t('signIn')}
                </Button>

                <button
                  type="button"
                  onClick={() => setShowMagicLink(true)}
                  className="w-full text-sm text-gray-600 hover:text-gray-900 py-2"
                >
                  {t('preferMagicLink')}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleMagicLinkRequest}>
              <div className="space-y-4">
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                  {t('magicLinkInfo')}
                </div>

                <Input
                  label={t('emailLabel')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={t('emailPlaceholder')}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  className="!from-green-600 !to-green-700 hover:!from-green-700 hover:!to-green-800"
                >
                  {t('sendMagicLink')}
                </Button>

                <button
                  type="button"
                  onClick={() => setShowMagicLink(false)}
                  className="w-full text-sm text-gray-600 hover:text-gray-900 py-2"
                >
                  {t('backToPassword')}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t('noAccount')}{' '}
              <a
                href="/portal/register"
                className="font-semibold text-green-600 hover:text-green-700"
              >
                {t('createAccount')}
              </a>
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>{t('encryptionBadge')}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{t('hipaaBadge')}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
