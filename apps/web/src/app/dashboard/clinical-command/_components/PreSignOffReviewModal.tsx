'use client';

import { useTranslations } from 'next-intl';
import { m, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';

interface PreSignOffReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToSign: () => void;
  onSkip?: () => void;
  soapSubjective?: string;
  soapObjective?: string;
  patientId?: string;
  clinicianSpecialty?: string;
}

export function PreSignOffReviewModal({
  isOpen,
  onClose,
  onProceedToSign,
  onSkip,
  soapSubjective = '',
  soapObjective = '',
  clinicianSpecialty = 'General Medicine',
}: PreSignOffReviewModalProps) {
  const t = useTranslations('dashboard.clinicalCommand');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-slate-900/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('preSignOffReview')}</h2>
                  <p className="text-xs text-slate-500">{t('reviewClinicalNote')}</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('subjective')}</h3>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm leading-relaxed border border-slate-100 dark:border-slate-800">
                      {soapSubjective || t('noContent')}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('objective')}</h3>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm leading-relaxed border border-slate-100 dark:border-slate-800">
                      {soapObjective || t('noContent')}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-400">{t('complianceCheck')}</p>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-500/70 mt-0.5">{t('lgpdComplianceReady')}</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                {onSkip && (
                  <button
                    onClick={onSkip}
                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {t('skipReview')}
                  </button>
                )}
                <button
                  onClick={() => onProceedToSign({
                    approved: true,
                    timestamp: new Date().toISOString(),
                    specialty: clinicianSpecialty,
                  } as any)}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {t('confirmAndProceed')}
                </button>
              </div>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
