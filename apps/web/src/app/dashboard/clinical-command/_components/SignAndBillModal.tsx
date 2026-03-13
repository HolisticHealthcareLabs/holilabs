'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Loader2, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types matching the Zod schema from /api/billing/analyze
// ─────────────────────────────────────────────────────────────────────────────

interface ExtractedDiagnosis {
  code: string;
  name: string;
  type: 'primary' | 'secondary' | 'complication';
}

interface SuggestedService {
  code: string;
  name: string;
  system: 'CBHPM' | 'TUSS';
  estimatedValueBRL: number;
}

interface BillingAnalysisData {
  extractedDiagnoses: ExtractedDiagnosis[];
  suggestedServices: SuggestedService[];
  totalEstimatedValue: number;
  cdiWarnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Severity mapping for diagnosis chips
// ─────────────────────────────────────────────────────────────────────────────

const DIAGNOSIS_TYPE_CHIP: Record<ExtractedDiagnosis['type'], string> = {
  primary:      'bg-red-500/15 text-red-400 border border-red-500/30',
  secondary:    'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  complication: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
};

function formatBRL(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type SubmitState = 'idle' | 'syncing_to_ehr' | 'success' | 'ehr_error';
type FetchState = 'idle' | 'loading' | 'loaded' | 'error';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface SignAndBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after successful claim approval -- triggers the Great Reset. */
  onComplete: () => void;
  /** SOAP note text for billing analysis. */
  soapNote?: string;
  /** Encounter transcript for billing analysis. */
  transcript?: string;
  /** Minimal patient demographics for billing context. */
  patientData?: { age?: number; sex?: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SignAndBillModal({
  isOpen,
  onClose,
  onComplete,
  soapNote = '',
  transcript = '',
  patientData,
}: SignAndBillModalProps) {
  const t = useTranslations('dashboard.clinicalCommand');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [analysisData, setAnalysisData] = useState<BillingAnalysisData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchBillingAnalysis = useCallback(async () => {
    setFetchState('loading');
    setFetchError(null);

    try {
      const res = await fetch('/api/billing/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soapNote, transcript, patientData: patientData ?? {} }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Billing analysis request failed');
      }

      setAnalysisData(json.data as BillingAnalysisData);
      setFetchState('loaded');
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Unable to load billing analysis');
      setFetchState('error');
    }
  }, [soapNote, transcript, patientData]);

  useEffect(() => {
    if (!isOpen) return;
    setSubmitState('idle');
    setFetchState('idle');
    setAnalysisData(null);
    setFetchError(null);
    fetchBillingAnalysis();
  }, [isOpen, fetchBillingAnalysis]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && (submitState === 'idle' || submitState === 'ehr_error')) onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, submitState]);

  async function handleApprove() {
    if (submitState !== 'idle' && submitState !== 'ehr_error') return;
    setSubmitState('syncing_to_ehr');

    try {
      const exportPayload = {
        patientId: patientData?.age != null ? `CPF-DEMO-${patientData.age}` : 'CPF-DEMO-000',
        providerId: 'CRM-SP-123456',
        soapNote: soapNote || transcript || 'No clinical note provided',
        diagnoses: diagnoses.map((dx) => ({
          code: dx.code,
          name: dx.name,
          type: dx.type,
        })),
        billingCodes: services.map((svc) => ({
          code: svc.code,
          name: svc.name,
          system: svc.system,
          estimatedValueBRL: svc.estimatedValueBRL,
        })),
      };

      const res = await fetch('/api/interop/fhir/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportPayload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'EHR export request failed');
      }

      setSubmitState('success');
      await new Promise((r) => setTimeout(r, 2000));
      onComplete();
    } catch {
      setSubmitState('ehr_error');
    }
  }

  const diagnoses = analysisData?.extractedDiagnoses ?? [];
  const services = analysisData?.suggestedServices ?? [];
  const totalValue = analysisData?.totalEstimatedValue ?? 0;
  const cdiWarnings = analysisData?.cdiWarnings ?? [];

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
            onClick={() => (submitState === 'idle' || submitState === 'ehr_error') && onClose()}
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
                    {t('claimReview')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('billingStandards')}
                  </p>
                </div>
                {(submitState === 'idle' || submitState === 'ehr_error') && (
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

                {/* Loading state */}
                {fetchState === 'loading' && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                    <p className="text-xs text-slate-500">{t('analyzingDocumentation')}</p>
                  </div>
                )}

                {/* Error state */}
                {fetchState === 'error' && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                    <p className="text-xs text-amber-400/80">{fetchError}</p>
                    <button
                      onClick={fetchBillingAnalysis}
                      className="
                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                        bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs
                        transition-colors
                      "
                    >
                      <RefreshCw className="w-3 h-3" />
                      {t('retry')}
                    </button>
                  </div>
                )}

                {/* Loaded state */}
                {fetchState === 'loaded' && analysisData && (
                  <>
                    {/* Extracted Diagnoses */}
                    <section>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        {t('extractedDiagnoses')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {diagnoses.map((dx) => (
                          <span
                            key={dx.code}
                            className={`
                              inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                              text-xs font-medium ${DIAGNOSIS_TYPE_CHIP[dx.type]}
                            `}
                          >
                            <span className="font-bold font-mono">{dx.code}</span>
                            <span className="text-[10px] opacity-80">- {dx.name}</span>
                          </span>
                        ))}
                      </div>
                    </section>

                    {/* Suggested Services */}
                    <section>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        {t('suggestedServices')}
                      </p>
                      <div className="space-y-2">
                        {services.map((svc) => (
                          <div
                            key={svc.code}
                            className="
                              flex items-center justify-between px-3 py-2.5
                              bg-slate-800 border border-slate-700/60 rounded-xl
                            "
                          >
                            <div>
                              <p className="text-xs font-medium text-slate-200">{svc.name}</p>
                              <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                                {svc.system} {svc.code}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-cyan-400 font-mono flex-shrink-0">
                              {formatBRL(svc.estimatedValueBRL)}
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
                          {t('estimatedClaimValue')}
                        </p>
                        <p className="text-lg font-bold text-emerald-400 mt-0.5">{formatBRL(totalValue)}</p>
                      </div>
                    </section>

                    {/* CDI advisory warnings */}
                    {cdiWarnings.length > 0 && (
                      <div className="space-y-2">
                        {cdiWarnings.map((warning, idx) => (
                          <div
                            key={idx}
                            className="
                              flex items-start gap-2.5 px-3.5 py-3
                              bg-amber-500/8 border border-amber-500/20 rounded-xl
                            "
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] text-amber-400/80 leading-relaxed">
                              <span className="font-bold">CDI:</span> {warning}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 px-6 py-4 border-t border-slate-800 flex items-center gap-3">
                {(submitState === 'idle' || submitState === 'ehr_error') && (
                  <button
                    onClick={onClose}
                    className="
                      flex-1 py-2.5 rounded-xl text-sm font-medium
                      bg-slate-800 hover:bg-slate-700 text-slate-300
                      transition-colors
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500
                    "
                  >
                    {t('editNoteFirst')}
                  </button>
                )}

                <motion.button
                  onClick={handleApprove}
                  disabled={
                    (submitState !== 'idle' && submitState !== 'ehr_error') ||
                    (submitState === 'idle' && fetchState !== 'loaded')
                  }
                  whileHover={submitState === 'idle' || submitState === 'ehr_error' ? { scale: 1.02 } : {}}
                  whileTap={submitState === 'idle' || submitState === 'ehr_error' ? { scale: 0.97 } : {}}
                  aria-label="Approve and submit billing claim"
                  className={`
                    flex-[2] py-3 rounded-xl text-sm font-semibold
                    flex items-center justify-center gap-2
                    transition-all
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                    ${submitState === 'success'
                      ? 'bg-emerald-600 text-white'
                      : submitState === 'syncing_to_ehr'
                        ? 'bg-cyan-600/60 text-white cursor-not-allowed'
                        : submitState === 'ehr_error'
                          ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'
                          : fetchState !== 'loaded'
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                    }
                  `}
                >
                  {submitState === 'syncing_to_ehr' && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {submitState === 'success' && (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {submitState === 'ehr_error' && (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {submitState === 'idle'           && t('approveSubmitClaim')}
                  {submitState === 'syncing_to_ehr' && t('pushingToEhr')}
                  {submitState === 'success'        && t('successPushedToEhr')}
                  {submitState === 'ehr_error'      && t('failedSyncRetry')}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
