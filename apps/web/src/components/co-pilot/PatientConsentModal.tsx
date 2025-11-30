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
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6"
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
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
            Recording Consent Required
          </h3>

          {/* Patient Name */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4">
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-1">
              Patient
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {patientName}
            </div>
          </div>

          {/* Consent Text */}
          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-3">
              I consent to the audio recording and transcription of this clinical consultation for documentation purposes.
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-3">
              I understand that:
            </p>
            <ul className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed space-y-2 list-disc pl-5">
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
              className="mt-1 w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-800 dark:text-gray-200">
              I have read and understood the above information, and I consent to this recording.
            </span>
          </label>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onDecline}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Decline
            </button>
            <button
              onClick={onConsent}
              disabled={!hasRead}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              I Consent
            </button>
          </div>

          {/* Footer */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-300">
              This consent complies with HIPAA (USA), LGPD (Brazil), and PDPA regulations.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
