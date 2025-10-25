"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WelcomeModal;
/**
 * Welcome Modal - First-time user onboarding
 * Inspired by Stripe, Notion, Linear
 *
 * Shows once after signup, highlights 3 quick wins
 */
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const LanguageContext_1 = require("@/contexts/LanguageContext");
function WelcomeModal({ userName }) {
    const [isVisible, setIsVisible] = (0, react_1.useState)(false);
    const { t } = (0, LanguageContext_1.useLanguage)();
    // Accessibility: Focus management
    const startButtonRef = (0, react_1.useRef)(null);
    const previousActiveElementRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        // Check if user has seen welcome modal
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
        if (!hasSeenWelcome) {
            // Show after 500ms for smooth entrance
            setTimeout(() => setIsVisible(true), 500);
        }
    }, []);
    // Handle Escape key and focus management
    (0, react_1.useEffect)(() => {
        if (isVisible) {
            // Store the element that opened the modal
            previousActiveElementRef.current = document.activeElement;
            // Focus the start button when modal opens
            setTimeout(() => startButtonRef.current?.focus(), 600);
            // Handle Escape key
            const handleEscape = (e) => {
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
    if (!isVisible)
        return null;
    return (<>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"/>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="welcome-modal-title">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-primary to-purple-700 text-white p-8 text-center">
            <div className="text-6xl mb-4" aria-hidden="true">🎉</div>
            <h1 id="welcome-modal-title" className="text-3xl font-bold mb-2">
              {t('onboarding.welcome')}{userName ? `, ${userName}` : ''}!
            </h1>
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
                  <h3 className="font-semibold text-gray-900 mb-1">
                    📝 {t('onboarding.steps.note.title')}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {t('onboarding.steps.note.description')}
                  </p>
                  <link_1.default href="/dashboard/patients" onClick={handleDismiss} className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700 transition">
                    {t('onboarding.steps.note.action')} →
                  </link_1.default>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    📊 {t('onboarding.steps.transfer.title')}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {t('onboarding.steps.transfer.description')}
                  </p>
                  <link_1.default href="/dashboard/upload" onClick={handleDismiss} className="inline-block text-sm font-medium text-purple-600 hover:text-purple-700 transition">
                    {t('onboarding.steps.transfer.action')} →
                  </link_1.default>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex-shrink-0 w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    👤 {t('onboarding.steps.invite.title')}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {t('onboarding.steps.invite.description')}
                  </p>
                  <link_1.default href="/dashboard/patients/new" onClick={handleDismiss} className="inline-block text-sm font-medium text-green-600 hover:text-green-700 transition">
                    {t('onboarding.steps.invite.action')} →
                  </link_1.default>
                </div>
              </div>
            </div>

            {/* Optional: WhatsApp Setup */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">📱</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {t('onboarding.optional.title')}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {t('onboarding.optional.description')}
                  </p>
                  <link_1.default href="/dashboard/settings" onClick={handleDismiss} className="text-sm text-gray-600 hover:text-gray-900 transition underline">
                    {t('onboarding.optional.action')}
                  </link_1.default>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <button onClick={handleDismiss} className="text-sm text-gray-500 hover:text-gray-700 transition">
                {t('onboarding.skip')}
              </button>
              <button ref={startButtonRef} onClick={handleDismiss} className="px-6 py-3 bg-gradient-to-r from-primary to-purple-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all hover:scale-105">
                {t('onboarding.start')} 🚀
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 text-center">
            <p className="text-xs text-gray-500">
              {t('onboarding.tip')}
            </p>
          </div>
        </div>
      </div>
    </>);
}
//# sourceMappingURL=WelcomeModal.js.map