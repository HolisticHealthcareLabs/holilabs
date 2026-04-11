'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { startAuthentication } from '@simplewebauthn/browser';
import type { AuthenticationResponseJSON } from '@simplewebauthn/browser';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BiometricSigningModalProps {
  prescriptionPayload: {
    patientId: string;
    medications: unknown[];
  };
  onSigned: (signatureToken: string) => void;
  onFallback: () => void;
  onClose: () => void;
}

type Step = 'idle' | 'requesting' | 'authenticating' | 'verifying' | 'done' | 'error';

// ─────────────────────────────────────────────────────────────────────────────
// Clinic-friendly error messages — NO raw errors or stack traces for doctors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps any thrown error to a safe, actionable Portuguese message.
 * Doctors must never see "Error: Cannot read property..." or HTTP status codes.
 */
function toFriendlyError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'NotAllowedError') {
      return 'Autenticação cancelada. Tente novamente ou use o PIN.';
    }
    // Any biometric hardware / OS error → guide user to PIN fallback
    if (
      err.message.includes('biometric') ||
      err.message.includes('authenticat') ||
      err.message.includes('verify') ||
      err.message.includes('Biometria') ||
      err.message.includes('503') ||
      err.message.includes('401') ||
      err.message.includes('400')
    ) {
      return 'Não foi possível ler a biometria. Use seu PIN para assinar.';
    }
  }
  return 'Não foi possível ler a biometria. Use seu PIN para assinar.';
}

// ─────────────────────────────────────────────────────────────────────────────
// SHA-256 nonce using Web Crypto API (browser-safe; byte-identical to Node.js)
// ─────────────────────────────────────────────────────────────────────────────

async function computeNonce(payload: {
  patientId: string;
  medications: unknown[];
}): Promise<string> {
  const data = JSON.stringify({ patientId: payload.patientId, medications: payload.medications });
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Step feedback messages
// ─────────────────────────────────────────────────────────────────────────────

const STEP_MESSAGES: Partial<Record<Step, { text: string; color: string }>> = {
  requesting:     { text: 'Preparando autenticação segura…',       color: 'text-slate-400' },
  authenticating: { text: 'Aguardando reconhecimento biométrico…', color: 'text-cyan-400'  },
  verifying:      { text: 'Validando assinatura clínica…',         color: 'text-cyan-400'  },
  done:           { text: 'Prescrição assinada com segurança',      color: 'text-emerald-400' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Icon sub-components
// ─────────────────────────────────────────────────────────────────────────────

const FingerprintIcon: React.FC<{ isScanning: boolean }> = ({ isScanning }) => (
  <motion.div
    animate={isScanning ? { boxShadow: ['0 0 0 0 rgba(6,182,212,0)', '0 0 0 12px rgba(6,182,212,0.2)', '0 0 0 0 rgba(6,182,212,0)'] } : {}}
    transition={{ duration: 1.8, repeat: Infinity }}
    className="h-14 w-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center"
  >
    <svg className="h-7 w-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a7.464 7.464 0 0 1-1.15 3.993m1.989 3.559A11.954 11.954 0 0 0 10.5 22.5" />
    </svg>
  </motion.div>
);

const SuccessIcon: React.FC = () => (
  <motion.div
    className="relative flex items-center justify-center"
    initial={{ scale: 0.6, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', stiffness: 350, damping: 18 }}
  >
    {/* Ripple glow ring */}
    <motion.div
      className="absolute h-14 w-14 rounded-full bg-emerald-400/25"
      initial={{ scale: 1, opacity: 0.8 }}
      animate={{ scale: 2.8, opacity: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    />
    {/* Second ripple for depth */}
    <motion.div
      className="absolute h-14 w-14 rounded-full bg-emerald-400/15"
      initial={{ scale: 1, opacity: 0.6 }}
      animate={{ scale: 2, opacity: 0 }}
      transition={{ duration: 0.9, delay: 0.1, ease: 'easeOut' }}
    />
    <div
      className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center"
      style={{ boxShadow: '0 0 20px rgba(52, 211, 153, 0.25)' }}
    >
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
        <motion.path
          d="M5 13l4 4L19 7"
          stroke="rgb(52 211 153)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.12 }}
        />
      </svg>
    </div>
  </motion.div>
);

const ErrorIcon: React.FC = () => (
  <motion.div
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center"
  >
    <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// BiometricSigningModal
// ─────────────────────────────────────────────────────────────────────────────

export function BiometricSigningModal({
  prescriptionPayload,
  onSigned,
  onFallback,
  onClose,
}: BiometricSigningModalProps) {
  const [step, setStep] = useState<Step>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  /**
   * pendingToken: holds the JWT after server verification succeeds.
   * onSigned is NOT called immediately — we linger on the success state
   * for 800ms so the doctor sees the animated confirmation before the modal
   * closes. This avoids the jarring "snap shut" problem.
   */
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  // ── 800ms success linger before notifying parent ───────────────────────────
  useEffect(() => {
    if (step !== 'done' || pendingToken === null) return;
    const timer = setTimeout(() => {
      onSigned(pendingToken);
    }, 800);
    return () => clearTimeout(timer);
  }, [step, pendingToken, onSigned]);

  // ── Main sign flow ─────────────────────────────────────────────────────────
  async function handleSign() {
    setStep('requesting');
    setErrorMessage('');

    try {
      const prescriptionNonce = await computeNonce(prescriptionPayload);

      const optRes = await fetch('/api/auth/webauthn/sign-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prescriptionNonce }),
      });

      if (!optRes.ok) {
        const body = await optRes.json().catch(() => ({}));
        throw new Error(body.error ?? 'server_error');
      }

      const options = await optRes.json();

      setStep('authenticating');
      let assertion: AuthenticationResponseJSON;
      try {
        assertion = await startAuthentication({ optionsJSON: options });
      } catch (err) {
        throw err; // toFriendlyError handles it below
      }

      setStep('verifying');
      const verRes = await fetch('/api/auth/webauthn/verify-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertion),
      });

      if (!verRes.ok) {
        const body = await verRes.json().catch(() => ({}));
        throw new Error(body.error ?? 'server_error');
      }

      const { signatureToken } = await verRes.json();

      // Store token and transition to done; onSigned fires after 800ms linger
      setPendingToken(signatureToken);
      setStep('done');
    } catch (err) {
      setErrorMessage(toFriendlyError(err));
      setStep('error');
    }
  }

  const isLoading = ['requesting', 'authenticating', 'verifying'].includes(step);
  const stepMessage = STEP_MESSAGES[step];

  return (
    /* Animated backdrop */
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      role="dialog"
      aria-modal="true"
      aria-label="Assinatura Biométrica"
    >
      {/* Animated modal panel */}
      <motion.div
        className="relative w-full max-w-sm mx-4 bg-slate-900 border border-slate-700 p-6"
        style={{ borderRadius: 'var(--radius-xl)', boxShadow: 'var(--token-shadow-xl)' }}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          aria-label="Fechar modal de assinatura"
          className={`
            absolute top-4 right-4 h-7 w-7 flex items-center justify-center
            text-slate-500 hover:text-white hover:bg-slate-800
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
            focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
          `}
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon area — transitions between fingerprint, success, and error */}
        <div className="flex justify-center mb-4">
          <AnimatePresence mode="wait">
            {step === 'done' ? (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SuccessIcon />
              </motion.div>
            ) : step === 'error' ? (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ErrorIcon />
              </motion.div>
            ) : (
              <motion.div key="fingerprint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <FingerprintIcon isScanning={step === 'authenticating'} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <h2 className="text-center text-lg font-semibold text-white mb-1">
          Assinatura Biométrica
        </h2>
        <p className="text-center text-sm text-slate-400 mb-5">
          Autentique para assinar esta prescrição digitalmente (LGPD art. 7 / NOM-024)
        </p>

        {/* Step feedback — animated transitions between messages */}
        <div className="min-h-[28px] mb-3 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {step === 'error' ? (
              <motion.p
                key="error-msg"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="text-center text-xs text-amber-400 leading-relaxed max-w-[240px]"
                role="alert"
              >
                {errorMessage}
              </motion.p>
            ) : stepMessage ? (
              <motion.p
                key={step}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className={`text-center text-xs ${stepMessage.color}`}
              >
                {stepMessage.text}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Primary action button */}
        <motion.button
          onClick={step === 'error' ? handleSign : step === 'idle' ? handleSign : undefined}
          disabled={isLoading || step === 'done'}
          whileHover={!isLoading && step !== 'done' ? { scale: 1.015 } : {}}
          whileTap={!isLoading && step !== 'done' ? { scale: 0.985 } : {}}
          className={`
            w-full py-3 text-white font-medium text-sm
            transition-colors mb-3
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
            focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
            ${step === 'done'
              ? 'bg-emerald-600/80 cursor-default'
              : isLoading
              ? 'bg-slate-700 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700'
            }
          `}
          style={{ borderRadius: 'var(--radius-xl)' }}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2"
              >
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
                Aguarde…
              </motion.span>
            ) : step === 'done' ? (
              <motion.span
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-1.5"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <motion.path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </svg>
                Assinado
              </motion.span>
            ) : step === 'error' ? (
              <motion.span key="retry" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Tentar novamente
              </motion.span>
            ) : (
              <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Usar biometria
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* PIN fallback */}
        <button
          onClick={onFallback}
          disabled={isLoading}
          className={`
            w-full text-center text-xs py-1.5
            text-slate-500 hover:text-slate-300 hover:bg-slate-800/50
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
            focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
          `}
          style={{ borderRadius: 'var(--radius-lg)' }}
        >
          Usar PIN em vez disso
        </button>
      </motion.div>
    </motion.div>
  );
}
