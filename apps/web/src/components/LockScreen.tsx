'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Fingerprint, KeyRound, Mail, MessageSquare, ShieldCheck, Eye, EyeOff, Plus, CheckCircle2, Play } from 'lucide-react';
import { isDemoModeEnabled } from '@/lib/demo/demo-data-generator';

const DEMO_PASSWORD = 'holi-demo-2026';

interface LockScreenProps {
  onUnlock: () => void;
  userEmail?: string;
}

type Mode = 'loading' | 'main' | 'setup' | 'password' | 'help';

export function LockScreen({ onUnlock, userEmail }: LockScreenProps) {
  const t = useTranslations('dashboard.lockScreen');
  const isDemo = isDemoModeEnabled();
  const [mode, setMode] = useState<Mode>('loading');
  const [hasCredentials, setHasCredentials] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [setupStep, setSetupStep] = useState<'idle' | 'naming' | 'registering' | 'done'>('idle');
  const [deviceName, setDeviceName] = useState('');

  // Check if user has registered WebAuthn credentials
  useEffect(() => {
    fetch('/api/auth/webauthn/credentials')
      .then((res) => (res.ok ? res.json() : { credentials: [] }))
      .then((data) => {
        const list = data?.credentials ?? data;
        const hasCreds = Array.isArray(list) && list.length > 0;
        setHasCredentials(hasCreds);
        setMode('main');
      })
      .catch(() => setMode('main'));
  }, []);

  // Register a new biometric credential
  const handleSetupBiometrics = useCallback(async () => {
    setSetupStep('registering');
    setError('');
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');

      const optionsRes = await fetch('/api/auth/webauthn/register-options', { method: 'POST' });
      if (!optionsRes.ok) {
        setError(t('setupFailed'));
        setSetupStep('idle');
        return;
      }
      const options = await optionsRes.json();
      const registration = await startRegistration(options);

      const verifyRes = await fetch('/api/auth/webauthn/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...registration, deviceName: deviceName || 'Lock Screen Device' }),
      });

      if (verifyRes.ok) {
        setHasCredentials(true);
        setSetupStep('done');
        // Auto-transition to main after success
        setTimeout(() => setMode('main'), 1200);
      } else {
        setError(t('setupFailed'));
        setSetupStep('idle');
      }
    } catch {
      setError(t('setupFailed'));
      setSetupStep('idle');
    }
  }, [deviceName, t]);

  // Authenticate with existing credential
  const handleBiometricUnlock = useCallback(async () => {
    setUnlocking(true);
    setError('');
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const optionsRes = await fetch('/api/auth/webauthn/sign-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prescriptionNonce: 'lock-screen-unlock' }),
      });
      if (!optionsRes.ok) {
        setError(t('biometricFailed'));
        setUnlocking(false);
        return;
      }
      const options = await optionsRes.json();
      const assertion = await startAuthentication(options);
      const verifyRes = await fetch('/api/auth/webauthn/verify-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertion),
      });
      if (verifyRes.ok) {
        onUnlock();
      } else {
        setError(t('biometricFailed'));
      }
    } catch {
      setError(t('biometricFailed'));
    } finally {
      setUnlocking(false);
    }
  }, [onUnlock, t]);

  const handlePasswordUnlock = useCallback(async () => {
    if (!password.trim()) return;
    setUnlocking(true);
    setError('');

    // Demo mode: accept the demo password locally
    if (isDemo && password === DEMO_PASSWORD) {
      onUnlock();
      setUnlocking(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onUnlock();
      } else {
        setError(t('wrongPassword'));
        setPassword('');
      }
    } catch {
      // Fallback: unlock for demo mode
      if (isDemo) onUnlock();
      else setError(t('wrongPassword'));
    } finally {
      setUnlocking(false);
    }
  }, [password, onUnlock, t, isDemo]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F4FF 100%)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* H Logo */}
      <div className="relative flex items-center justify-center mb-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.43, 0.13, 0.23, 0.96] }}
          className="relative w-24 h-24 z-10"
        >
          <Image
            src="/logos/holilabs-helix-blue-dark.svg"
            alt="Holi Labs"
            fill
            className="object-contain"
            priority
          />
        </motion.div>
      </div>

      {/* Lock status text */}
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-sm font-medium text-gray-400 mb-8 tracking-wide"
      >
        {t('screenLocked')}
      </motion.p>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="text-xs text-red-500 text-center mb-4"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Main area */}
      <AnimatePresence mode="wait">
        {mode === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm text-gray-400">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <ShieldCheck className="w-4 h-4" />
            </motion.div>
          </motion.div>
        )}

        {mode === 'main' && (
          <motion.div
            key="main"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4 w-full max-w-xs"
          >
            {hasCredentials ? (
              /* Unlock with existing biometrics */
              <button
                onClick={handleBiometricUnlock}
                disabled={unlocking}
                className="group w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-[#007AFF] text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:bg-[#0066DD] transition-all duration-200 disabled:opacity-60"
              >
                {unlocking ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <ShieldCheck className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <Fingerprint className="w-5 h-5 group-hover:scale-110 transition-transform" />
                )}
                {unlocking ? t('unlocking') : t('unlock')}
              </button>
            ) : (
              /* No credentials — offer setup */
              <button
                onClick={() => setMode('setup')}
                className="group w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-[#007AFF] text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:bg-[#0066DD] transition-all duration-200"
              >
                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {t('setupBiometrics')}
              </button>
            )}

            {/* Demo quick-unlock */}
            {isDemo && (
              <button
                onClick={onUnlock}
                className="group w-full flex items-center justify-center gap-3 py-3 px-6 rounded-2xl border-2 border-emerald-300 text-emerald-600 font-semibold text-sm hover:bg-emerald-50 transition-all duration-200"
              >
                <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
                {t('demoUnlock')}
              </button>
            )}

            {/* Password fallback */}
            <button
              onClick={() => { setMode('password'); setError(''); }}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              {t('usePassword')}
              {isDemo && <span className="text-xs text-gray-300 ml-1">({DEMO_PASSWORD})</span>}
            </button>
          </motion.div>
        )}

        {mode === 'setup' && (
          <motion.div
            key="setup"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4 w-full max-w-xs"
          >
            {setupStep === 'done' ? (
              <div className="flex flex-col items-center gap-3">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" strokeWidth={1.25} />
                </motion.div>
                <p className="text-sm font-medium text-emerald-600">{t('setupComplete')}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 text-center mb-2">{t('setupDescription')}</p>
                {setupStep === 'idle' || setupStep === 'naming' ? (
                  <>
                    <input
                      type="text"
                      value={deviceName}
                      onChange={(e) => { setDeviceName(e.target.value); setSetupStep('naming'); }}
                      placeholder={t('deviceNamePlaceholder')}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40 focus:border-[#007AFF] shadow-sm transition-all"
                    />
                    <button
                      onClick={handleSetupBiometrics}
                      className="group w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-[#007AFF] text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:bg-[#0066DD] transition-all"
                    >
                      <Fingerprint className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      {t('registerDevice')}
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      <Fingerprint className="w-5 h-5 text-[#007AFF]" />
                    </motion.div>
                    {t('waitingForBiometric')}
                  </div>
                )}
              </>
            )}

            {setupStep !== 'done' && setupStep !== 'registering' && (
              <button
                onClick={() => { setMode('main'); setError(''); setSetupStep('idle'); }}
                className="mt-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                &larr; Back
              </button>
            )}
          </motion.div>
        )}

        {mode === 'password' && (
          <motion.div
            key="password"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4 w-full max-w-xs"
          >
            <form
              onSubmit={(e) => { e.preventDefault(); handlePasswordUnlock(); }}
              className="w-full flex flex-col gap-3"
            >
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                  autoFocus
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40 focus:border-[#007AFF] shadow-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={unlocking || !password.trim()}
                className="w-full py-3.5 rounded-xl bg-[#007AFF] text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:bg-[#0066DD] transition-all disabled:opacity-50"
              >
                {unlocking ? t('unlocking') : t('unlock')}
              </button>
            </form>

            <button
              onClick={() => { setMode('main'); setError(''); setPassword(''); }}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Fingerprint className="w-4 h-4" />
              {t('unlock')}
            </button>
          </motion.div>
        )}

        {mode === 'help' && (
          <motion.div
            key="help"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-3 w-full max-w-xs"
          >
            <button
              onClick={() => {/* future: trigger 2FA flow */}}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-[#007AFF]" />
              {t('twoFactor')}
            </button>
            <button
              onClick={() => {/* future: send email link */}}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
            >
              <Mail className="w-4 h-4 text-[#007AFF]" />
              {t('sendEmail')}
              {userEmail && <span className="ml-auto text-xs text-gray-400 truncate max-w-[140px]">{userEmail}</span>}
            </button>
            <button
              onClick={() => {/* future: send SMS */}}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
            >
              <MessageSquare className="w-4 h-4 text-[#007AFF]" />
              {t('sendSMS')}
            </button>

            <button
              onClick={() => setMode('main')}
              className="mt-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              &larr; Back
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help footer */}
      {mode !== 'help' && mode !== 'loading' && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          onClick={() => setMode('help')}
          className="absolute bottom-10 text-xs text-gray-400 hover:text-[#007AFF] transition-colors"
        >
          {t('helpLoggingIn')}
        </motion.button>
      )}
    </motion.div>
  );
}
