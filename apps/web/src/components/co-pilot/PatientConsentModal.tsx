'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface PatientConsentModalProps {
  isOpen: boolean;
  onConsent: () => void;
  onDecline: () => void;
  patientName: string;
}

export function PatientConsentModal({
  isOpen,
  onConsent,
  onDecline,
  patientName,
}: PatientConsentModalProps) {
  const [hasRead, setHasRead] = useState(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="max-w-lg w-full p-6"
          style={{ backgroundColor: 'var(--surface-primary)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--token-shadow-xl)' }}
        >
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-600/20 flex items-center justify-center">
              <div className="relative w-10 h-10">
                <Image
                  src="/icons/health-worker_form (1).svg"
                  alt="Consent"
                  width={40}
                  height={40}
                  className="dark:invert"
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold text-center mb-3" style={{ color: 'var(--text-primary)' }}>
            Recording Consent Required
          </h3>

          {/* Patient Name */}
          <div className="border p-3 mb-4" style={{ backgroundColor: 'var(--surface-accent)', borderColor: 'var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
            <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-accent)' }}>
              Patient
            </div>
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {patientName}
            </div>
          </div>

          {/* Consent Text */}
          <div className="border p-4 mb-4 max-h-48 overflow-y-auto" style={{ backgroundColor: 'var(--surface-secondary)', borderColor: 'var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
              I consent to the audio recording and transcription of this clinical consultation for documentation purposes.
            </p>
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
              I understand that:
            </p>
            <ul className="text-sm leading-relaxed space-y-2 list-disc pl-5" style={{ color: 'var(--text-secondary)' }}>
              <li>The recording will be used to generate clinical notes and documentation</li>
              <li>AI-powered transcription will process the audio in real-time</li>
              <li>All data is encrypted and stored securely per HIPAA/LGPD regulations</li>
              <li>The recording will be retained as part of my medical record</li>
              <li>I can request to stop the recording at any time</li>
            </ul>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={hasRead}
              onChange={(e) => setHasRead(e.target.checked)}
              className="mt-1 w-5 h-5 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              style={{ borderRadius: 'var(--radius-md)', borderColor: 'var(--border-strong)' }}
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              I have read and understood the above information, and I consent to this recording.
            </span>
          </label>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onDecline}
              className="flex-1 px-4 py-3 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              style={{ backgroundColor: 'var(--surface-tertiary)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-lg)' }}
            >
              Decline
            </button>
            <button
              onClick={onConsent}
              disabled={!hasRead}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-semibold hover:from-blue-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--token-shadow-lg)' }}
            >
              I Consent
            </button>
          </div>

          {/* Footer */}
          <div className="mt-4 text-center">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              This consent complies with HIPAA (USA), LGPD (Brazil), and PDPA regulations.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
