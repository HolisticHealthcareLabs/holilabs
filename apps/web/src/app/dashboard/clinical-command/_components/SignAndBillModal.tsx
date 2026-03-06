'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Loader2, TrendingUp, AlertTriangle } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Mock billing data — LATAM/CBHPM/TUSS format
// (No US AMA CPT codes per CMIO policy)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_DIAGNOSES = [
  { code: 'I50.9', label: 'Heart Failure, Unspecified',       severity: 'critical' as const },
  { code: 'E11.9', label: 'Type 2 Diabetes Mellitus',         severity: 'warning'  as const },
  { code: 'I10',   label: 'Essential Hypertension',           severity: 'warning'  as const },
  { code: 'N18.3', label: 'Chronic Kidney Disease, Stage 3',  severity: 'info'     as const },
];

const MOCK_SERVICES = [
  { code: 'CBHPM 31603017', label: 'Consulta Médica — Alta Complexidade',      value: 'R$ 250,00' },
  { code: 'TUSS 40302270',  label: 'Eletrocardiograma 12 derivações (urgente)', value: 'R$  60,00' },
  { code: 'TUSS 40302262',  label: 'Troponina I — Dosagem seriada',            value: 'R$  40,00' },
];

const ESTIMATED_TOTAL = 'R$ 350,00';

const SEVERITY_CHIP: Record<'critical' | 'warning' | 'info', string> = {
  critical: 'bg-red-500/15 text-red-400 border border-red-500/30',
  warning:  'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  info:     'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
};

type SubmitState = 'idle' | 'loading' | 'success';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface SignAndBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after successful claim approval — triggers the Great Reset. */
  onComplete: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SignAndBillModal({ isOpen, onClose, onComplete }: SignAndBillModalProps) {
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && submitState === 'idle') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, submitState]);

  // Reset state when modal reopens
  useEffect(() => {
    if (isOpen) setSubmitState('idle');
  }, [isOpen]);

  async function handleApprove() {
    if (submitState !== 'idle') return;
    setSubmitState('loading');
    await new Promise((r) => setTimeout(r, 1500));
    setSubmitState('success');
    await new Promise((r) => setTimeout(r, 900));
    onComplete();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bill-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-slate-900/80 backdrop-blur-sm"
            onClick={() => submitState === 'idle' && onClose()}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            key="bill-modal"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Sign and bill claim review"
              className="
                pointer-events-auto w-full max-w-lg
                bg-slate-900 border border-slate-700
                rounded-2xl shadow-2xl flex flex-col overflow-hidden
                max-h-[90vh]
              "
            >
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Sign &amp; Bill — Claim Review
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    LATAM billing standards · CBHPM / TUSS · No CPT codes
                  </p>
                </div>
                {submitState === 'idle' && (
                  <button
                    onClick={onClose}
                    aria-label="Close billing modal"
                    className="
                      p-1.5 rounded-lg text-slate-500 hover:text-white
                      hover:bg-slate-800 transition-colors
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                    "
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Extracted Diagnoses */}
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Extracted Diagnoses
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {MOCK_DIAGNOSES.map((dx) => (
                      <span
                        key={dx.code}
                        className={`
                          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                          text-xs font-medium ${SEVERITY_CHIP[dx.severity]}
                        `}
                      >
                        <span className="font-bold font-mono">{dx.code}</span>
                        <span className="text-[10px] opacity-80">— {dx.label}</span>
                      </span>
                    ))}
                  </div>
                </section>

                {/* Suggested Services */}
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Suggested Services (CBHPM / TUSS)
                  </p>
                  <div className="space-y-2">
                    {MOCK_SERVICES.map((svc) => (
                      <div
                        key={svc.code}
                        className="
                          flex items-center justify-between px-3 py-2.5
                          bg-slate-800 border border-slate-700/60 rounded-xl
                        "
                      >
                        <div>
                          <p className="text-xs font-medium text-slate-200">{svc.label}</p>
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">{svc.code}</p>
                        </div>
                        <span className="text-sm font-bold text-cyan-400 font-mono flex-shrink-0">
                          {svc.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Revenue capture summary */}
                <section className="
                  flex items-center gap-3 px-4 py-3
                  bg-emerald-500/8 border border-emerald-500/20 rounded-xl
                ">
                  <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider font-semibold">
                      Estimated Claim Value
                    </p>
                    <p className="text-lg font-bold text-emerald-400 mt-0.5">{ESTIMATED_TOTAL}</p>
                  </div>
                </section>

                {/* CDI advisory */}
                <div className="
                  flex items-start gap-2.5 px-3.5 py-3
                  bg-amber-500/8 border border-amber-500/20 rounded-xl
                ">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-400/80 leading-relaxed">
                    <span className="font-bold">CDI Note:</span> To support high-complexity code for
                    I50.9 (CHF), ensure BNP and echocardiogram results are documented in the
                    Objective section before submission.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 px-6 py-4 border-t border-slate-800 flex items-center gap-3">
                {submitState === 'idle' && (
                  <button
                    onClick={onClose}
                    className="
                      flex-1 py-2.5 rounded-xl text-sm font-medium
                      bg-slate-800 hover:bg-slate-700 text-slate-300
                      transition-colors
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500
                    "
                  >
                    Wait, let me edit the note
                  </button>
                )}

                <motion.button
                  onClick={handleApprove}
                  disabled={submitState !== 'idle'}
                  whileHover={submitState === 'idle' ? { scale: 1.02 } : {}}
                  whileTap={submitState === 'idle' ? { scale: 0.97 } : {}}
                  aria-label="Approve and submit billing claim"
                  className={`
                    flex-[2] py-3 rounded-xl text-sm font-semibold
                    flex items-center justify-center gap-2
                    transition-all
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                    ${submitState === 'success'
                      ? 'bg-emerald-600 text-white'
                      : submitState === 'loading'
                        ? 'bg-cyan-600/60 text-white cursor-not-allowed'
                        : 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                    }
                  `}
                >
                  {submitState === 'loading' && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {submitState === 'success' && (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {submitState === 'idle'    && 'Approve & Submit Claim'}
                  {submitState === 'loading' && 'Submitting…'}
                  {submitState === 'success' && 'Claim Approved!'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
