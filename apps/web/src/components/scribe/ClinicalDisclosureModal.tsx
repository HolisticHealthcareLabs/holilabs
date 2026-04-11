'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function ClinicalDisclosureModal({
  isOpen,
  onAccept,
  onClose,
}: {
  isOpen: boolean;
  onAccept: () => void;
  onClose: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.98, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.98, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          className="w-full max-w-2xl overflow-hidden"
          style={{ borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-default)', boxShadow: 'var(--token-shadow-xl)' }}
        >
          <div className="p-6 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Clinical AI Disclosure (Required)
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              You must accept this to use AI Scribe / clinical automation features.
            </div>
          </div>

          <div className="p-6 max-h-[55vh] overflow-y-auto">
            <div className="space-y-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <p>
                This product includes AI-assisted features (e.g., transcription, summarization, and decision-support).
                AI output may be incomplete, inaccurate, or biased and must be reviewed by a licensed clinician.
              </p>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Clinician responsibility / limitation of liability
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  You acknowledge that you are solely responsible for clinical decisions, documentation accuracy, and
                  patient outcomes arising from your use of this software.
                </li>
                <li>
                  Holi Labs provides this tool “as-is” and does not provide medical advice. Holi Labs disclaims liability
                  for clinical outcomes, diagnosis, treatment, or documentation errors.
                </li>
                <li>
                  You agree to verify and edit any AI-generated content before it is used clinically or stored in the
                  medical record.
                </li>
                <li>
                  You must comply with applicable privacy, consent, and recording laws in your jurisdiction.
                </li>
              </ul>
            </div>

            <label className="mt-6 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 w-5 h-5 dark:border-gray-600"
                style={{ borderRadius: 'var(--radius-md)', borderColor: 'var(--border-strong)' }}
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                I have read and acknowledge the above disclosure and agree to proceed.
              </span>
            </label>
          </div>

          <div className="p-6 border-t flex items-center justify-end gap-3" style={{ borderColor: 'var(--border-default)' }}>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
              style={{ borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--surface-tertiary)', color: 'var(--text-primary)' }}
            >
              Close
            </button>
            <button
              onClick={onAccept}
              disabled={!acknowledged}
              className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 'var(--radius-lg)' }}
            >
              I Agree
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


