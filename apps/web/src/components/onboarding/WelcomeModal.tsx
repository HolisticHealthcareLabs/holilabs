'use client';

/**
 * Welcome Modal - First-time user onboarding
 * Inspired by Stripe, Notion, Linear
 *
 * Shows once after signup, highlights 3 quick wins
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface WelcomeModalProps {
  userName?: string;
}

export default function WelcomeModal({ userName }: WelcomeModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen welcome modal
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');

    if (!hasSeenWelcome) {
      // Show after 500ms for smooth entrance
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-primary to-purple-700 text-white p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold mb-2">
              ¡Bienvenido{userName ? `, ${userName}` : ''}!
            </h1>
            <p className="text-white/90 text-lg">
              Tu práctica médica ahora tiene superpoderes
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
              Comienza en 3 pasos sencillos:
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
                    📝 Crea tu primera nota clínica
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Documenta consultas en segundos con nuestro editor SOAP potenciado por IA
                  </p>
                  <Link
                    href="/dashboard/patients"
                    onClick={handleDismiss}
                    className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700 transition"
                  >
                    Ver pacientes de ejemplo →
                  </Link>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    🤖 Pregunta a tu asistente de IA
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Obtén ayuda instantánea con diagnósticos diferenciales e interacciones medicamentosas
                  </p>
                  <Link
                    href="/dashboard/ai"
                    onClick={handleDismiss}
                    className="inline-block text-sm font-medium text-purple-600 hover:text-purple-700 transition"
                  >
                    Abrir chat médico →
                  </Link>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex-shrink-0 w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    👤 Invita a tu primer paciente
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Comienza a construir tu historia clínica digital con blockchain
                  </p>
                  <Link
                    href="/dashboard/patients/new"
                    onClick={handleDismiss}
                    className="inline-block text-sm font-medium text-green-600 hover:text-green-700 transition"
                  >
                    Agregar paciente →
                  </Link>
                </div>
              </div>
            </div>

            {/* Optional: WhatsApp Setup */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">📱</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Opcional: Configura notificaciones automáticas
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Envía recordatorios de citas por WhatsApp, Email y SMS
                  </p>
                  <Link
                    href="/dashboard/settings"
                    onClick={handleDismiss}
                    className="text-sm text-gray-600 hover:text-gray-900 transition underline"
                  >
                    Configurar después
                  </Link>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleDismiss}
                className="text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Omitir por ahora
              </button>
              <button
                onClick={handleDismiss}
                className="px-6 py-3 bg-gradient-to-r from-primary to-purple-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all hover:scale-105"
              >
                ¡Empecemos! 🚀
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 text-center">
            <p className="text-xs text-gray-500">
              💡 Tip: Encuentra esta guía más tarde en el checklist (abajo a la derecha)
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
