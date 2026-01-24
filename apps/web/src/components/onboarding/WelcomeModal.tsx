'use client';

/**
 * Welcome Modal - First-time user onboarding
 * Inspired by Stripe, Notion, Linear
 *
 * Shows once after signup, highlights 3 quick wins
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

interface WelcomeModalProps {
  userName?: string;
}

export default function WelcomeModal({ userName }: WelcomeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();

  // Accessibility: Focus management
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Check if user has seen welcome modal
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');

    if (!hasSeenWelcome) {
      // Show after 500ms for smooth entrance
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

  // Handle Escape key and focus management
  useEffect(() => {
    if (isVisible) {
      // Store the element that opened the modal
      previousActiveElementRef.current = document.activeElement as HTMLElement;

      // Focus the start button when modal opens
      setTimeout(() => startButtonRef.current?.focus(), 600);

      // Handle Escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleDismiss();
        }
      };

      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('keydown', handleEscape);
        // Return focus to the element that opened the modal
        previousActiveElementRef.current?.focus();
      };
    }
  }, [isVisible]);

  const handleDismiss = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity" />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-[#014751] to-[#017a8c] text-white p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 id="welcome-modal-title" className="text-3xl font-bold mb-2">
              {t('onboarding.welcome')}{userName ? `, ${userName}` : ''}!
            </h1>
            {/* White on gradient background - sufficient contrast */}
            <p className="text-white/90 text-lg">
              {t('onboarding.subtitle')}
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
              {t('onboarding.steps.title')}
            </h2>

            {/* 3 Quick Wins */}
            <div className="space-y-6 mb-8">
              {/* Step 1 */}
              <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {t('onboarding.steps.note.title')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {t('onboarding.steps.note.description')}
                  </p>
                  <Link
                    href="/dashboard/patients"
                    onClick={handleDismiss}
                    className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700 transition"
                  >
                    {t('onboarding.steps.note.action')} →
                  </Link>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {t('onboarding.steps.transfer.title')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {t('onboarding.steps.transfer.description')}
                  </p>
                  <Link
                    href="/dashboard/upload"
                    onClick={handleDismiss}
                    className="inline-block text-sm font-medium text-purple-600 hover:text-purple-700 transition"
                  >
                    {t('onboarding.steps.transfer.action')} →
                  </Link>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex-shrink-0 w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {t('onboarding.steps.invite.title')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {t('onboarding.steps.invite.description')}
                  </p>
                  <Link
                    href="/dashboard/patients/new"
                    onClick={handleDismiss}
                    className="inline-block text-sm font-medium text-green-600 hover:text-green-700 transition"
                  >
                    {t('onboarding.steps.invite.action')} →
                  </Link>
                </div>
              </div>
            </div>

            {/* Optional: WhatsApp Setup */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {t('onboarding.optional.title')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {t('onboarding.optional.description')}
                  </p>
                  <Link
                    href="/dashboard/settings"
                    onClick={handleDismiss}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition underline"
                  >
                    {t('onboarding.optional.action')}
                  </Link>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleDismiss}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition"
              >
                {t('onboarding.skip')}
              </button>
              <button
                ref={startButtonRef}
                onClick={handleDismiss}
                className="px-6 py-3 bg-gradient-to-r from-[#014751] to-[#017a8c] text-white font-semibold rounded-lg hover:shadow-lg transition-all hover:scale-105 flex items-center gap-2"
              >
                {t('onboarding.start')}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 text-center">
            {/* Decorative - low contrast intentional for tip footer */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('onboarding.tip')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
