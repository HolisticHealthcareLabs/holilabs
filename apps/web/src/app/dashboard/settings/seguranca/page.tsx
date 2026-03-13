'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { startRegistration } from '@simplewebauthn/browser';
import type { RegistrationResponseJSON } from '@simplewebauthn/browser';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Credential {
  id: string;
  name: string | null;
  deviceType: string;
  createdAt: string;
  lastUsedAt: string | null;
}

type RegistrationStep = 'idle' | 'preparing' | 'waiting' | 'verifying';

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton subcomponent
// ─────────────────────────────────────────────────────────────────────────────

const CredentialSkeleton: React.FC<{ ariaLabel: string }> = ({ ariaLabel }) => (
  <div
    className="animate-pulse space-y-2"
    aria-busy="true"
    aria-label={ariaLabel}
  >
    {[0, 1].map((i) => (
      <div
        key={i}
        className="flex items-center justify-between rounded-xl bg-slate-800 border border-slate-700/60 px-4 py-3"
      >
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 bg-slate-700 rounded" />
          <div className="h-3 w-48 bg-slate-700/60 rounded" />
        </div>
        <div className="h-6 w-16 bg-slate-700/60 rounded" />
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SegurancaSettingsPage
// ─────────────────────────────────────────────────────────────────────────────

export default function SegurancaSettingsPage() {
  const t = useTranslations('dashboard.seguranca');
  const tCommon = useTranslations('common');

  const getStepLabel = (step: RegistrationStep): string | null => {
    if (step === 'idle') return null;
    if (step === 'preparing') return t('preparing');
    if (step === 'waiting') return t('waitingBiometric');
    return t('verifyingDevice');
  };

  const deviceTypeLabel = (type: string): string => {
    if (type === 'singleDevice') return t('singleDevice');
    if (type === 'multiDevice') return t('multiDevice');
    return type;
  };

  const toFriendlyError = (err: unknown): string => {
    if (err instanceof Error) {
      if (err.name === 'NotAllowedError') {
        return t('registrationCancelled');
      }
    }
    return t('registrationError');
  };
  const [credentials,          setCredentials]          = useState<Credential[]>([]);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);
  const [registrationStep,     setRegistrationStep]     = useState<RegistrationStep>('idle');
  const [deviceName,           setDeviceName]           = useState('');
  const [message,              setMessage]              = useState('');
  const [error,                setError]                = useState('');

  /** Which credential is awaiting inline revoke confirmation. */
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const isRegistering = registrationStep !== 'idle';
  const stepLabel     = getStepLabel(registrationStep);

  // ── Load credentials ──────────────────────────────────────────────────────
  const loadCredentials = useCallback(async () => {
    setIsLoadingCredentials(true);
    try {
      const res = await fetch('/api/auth/webauthn/credentials');
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials ?? []);
      }
    } catch {
      // silent — list will just be empty
    } finally {
      setIsLoadingCredentials(false);
    }
  }, []);

  useEffect(() => { loadCredentials(); }, [loadCredentials]);

  // ── Register new device ──────────────────────────────────────────────────
  async function handleRegister() {
    setRegistrationStep('preparing');
    setMessage('');
    setError('');

    try {
      const optRes = await fetch('/api/auth/webauthn/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!optRes.ok) {
        const body = await optRes.json().catch(() => ({}));
        throw new Error(body.error ?? 'server_error');
      }

      const options = await optRes.json();

      setRegistrationStep('waiting');
      let response: RegistrationResponseJSON;
      try {
        response = await startRegistration({ optionsJSON: options });
      } catch (err) {
        throw err; // toFriendlyError handles classification
      }

      setRegistrationStep('verifying');
      const verRes = await fetch('/api/auth/webauthn/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...response, deviceName: deviceName.trim() || 'Device' }),
      });

      if (!verRes.ok) {
        const body = await verRes.json().catch(() => ({}));
        throw new Error(body.error ?? 'server_error');
      }

      setMessage(t('deviceRegistered'));
      setDeviceName('');
      loadCredentials();
    } catch (err) {
      setError(toFriendlyError(err));
    } finally {
      setRegistrationStep('idle');
    }
  }

  // ── Revoke credential ────────────────────────────────────────────────────
  async function handleRevoke(credentialId: string) {
    setConfirmRevoke(null);
    try {
      await fetch(`/api/auth/webauthn/credentials/${credentialId}`, { method: 'DELETE' });
      loadCredentials();
    } catch {
      // silent
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <h1 className="text-2xl font-semibold text-white mb-1">{t('title')}</h1>
        <p className="text-slate-400 text-sm mb-8">
          {t('subtitle')}
        </p>
      </motion.div>

      {/* ── Registered credentials ─────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
          {t('registeredDevices')}
        </h2>

        {isLoadingCredentials ? (
          <CredentialSkeleton ariaLabel={t('loadingDevices')} />
        ) : credentials.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-slate-500 text-sm"
          >
            {t('noDevices')}
          </motion.p>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {credentials.map((cred, i) => (
                <motion.div
                  key={cred.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ delay: i * 0.07, duration: 0.2 }}
                  className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">
                        {cred.name ?? t('device')}
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {deviceTypeLabel(cred.deviceType)}
                        {' · ' + t('registeredOn') + ' '}
                        {new Date(cred.createdAt).toLocaleDateString()}
                        {cred.lastUsedAt &&
                          ` · ${t('lastUsed')} ${new Date(cred.lastUsedAt).toLocaleDateString()}`}
                      </p>
                    </div>

                    {confirmRevoke !== cred.id && (
                      <button
                        onClick={() => setConfirmRevoke(cred.id)}
                        aria-label={`${t('revoke')} ${cred.name ?? t('device')}`}
                        className={`
                          text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded
                          hover:bg-red-500/10 transition-colors
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400
                          focus-visible:ring-offset-1 focus-visible:ring-offset-slate-800
                        `}
                      >
                        {t('revoke')}
                      </button>
                    )}
                  </div>

                  {/* Inline revoke confirmation */}
                  <AnimatePresence>
                    {confirmRevoke === cred.id && (
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 flex items-center justify-between gap-3 pt-2.5 border-t border-slate-700/60">
                          <p className="text-xs text-slate-400 leading-tight">
                            {t('removeDevice', { name: cred.name ?? t('singleDevice') })}
                          </p>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleRevoke(cred.id)}
                              className={`
                                text-xs px-3 py-1.5 rounded-lg
                                bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300
                                transition-colors
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400
                                focus-visible:ring-offset-1 focus-visible:ring-offset-slate-800
                              `}
                            >
                              {t('confirm')}
                            </button>
                            <button
                              onClick={() => setConfirmRevoke(null)}
                              className={`
                                text-xs px-3 py-1.5 rounded-lg
                                bg-slate-700 hover:bg-slate-600 text-slate-300
                                transition-colors
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400
                                focus-visible:ring-offset-1 focus-visible:ring-offset-slate-800
                              `}
                            >
                              {tCommon('cancel')}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* ── Register new device ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        className="rounded-xl bg-slate-800 border border-slate-700 p-5"
      >
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          {t('registerDevice')}
        </h2>

        <div className="space-y-3">
          <input
            type="text"
            placeholder={t('deviceNamePlaceholder')}
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isRegistering && handleRegister()}
            disabled={isRegistering}
            aria-label={t('deviceNamePlaceholder')}
            className={`
              w-full rounded-lg bg-slate-900 border border-slate-600 text-white text-sm
              px-3 py-2 placeholder-slate-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              focus:outline-none focus:border-cyan-500
              focus-visible:ring-2 focus-visible:ring-cyan-400
              focus-visible:ring-offset-1 focus-visible:ring-offset-slate-800
            `}
          />

          {/* Step progress indicator */}
          <AnimatePresence>
            {stepLabel && (
              <motion.p
                key={registrationStep}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="text-xs text-cyan-400"
              >
                {stepLabel}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            onClick={handleRegister}
            disabled={isRegistering}
            whileHover={!isRegistering ? { scale: 1.01 } : {}}
            whileTap={!isRegistering ? { scale: 0.99 } : {}}
            className={`
              w-full py-2.5 rounded-xl text-white text-sm font-medium transition-colors
              disabled:cursor-not-allowed
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
              focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800
              ${isRegistering
                ? 'bg-slate-700'
                : 'bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700'
              }
            `}
          >
            {isRegistering ? (
              <span className="flex items-center justify-center gap-2">
                <motion.svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-2a8 8 0 01-8-8z" />
                </motion.svg>
                {t('registering')}
              </span>
            ) : (
              t('registerWithBiometrics')
            )}
          </motion.button>

          {/* Feedback messages */}
          <AnimatePresence>
            {message && (
              <motion.p
                key="success"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-emerald-400 text-xs flex items-center gap-1.5"
                role="status"
              >
                <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {message}
              </motion.p>
            )}
            {error && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-amber-400 text-xs"
                role="alert"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.section>
    </div>
  );
}
