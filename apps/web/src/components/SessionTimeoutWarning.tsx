'use client';

import { useEffect } from 'react';

interface SessionTimeoutWarningProps {
  isOpen: boolean;
  timeRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
}

export function SessionTimeoutWarning({
  isOpen,
  timeRemaining,
  onExtend,
  onLogout,
}: SessionTimeoutWarningProps) {
  // Format time remaining
  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);

  // Play sound on warning (optional)
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      // Optionally play a notification sound
      // const audio = new Audio('/sounds/notification.mp3');
      // audio.play().catch(() => {}); // Ignore errors if sound fails
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-yellow-100 p-4">
              <svg
                className="w-12 h-12 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Sesión a punto de expirar
          </h2>

          {/* Message */}
          <p className="text-gray-600 text-center mb-4">
            Por inactividad, tu sesión se cerrará automáticamente en:
          </p>

          {/* Countdown */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
            <div className="text-center">
              <div className="text-5xl font-black text-yellow-600 mb-2">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-600 font-medium">
                {minutes > 0 ? `${minutes} minuto${minutes !== 1 ? 's' : ''}` : `${seconds} segundo${seconds !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>

          {/* Warning Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-blue-800 text-center">
              <strong>⚕️ Seguridad HIPAA:</strong> Las sesiones inactivas se cierran automáticamente para proteger la información del paciente.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onExtend}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg font-bold hover:from-purple-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Seguir Trabajando
            </button>
            <button
              onClick={onLogout}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
            >
              Cerrar Sesión
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-4">
            Cualquier actividad (clic, tecla, scroll) extenderá tu sesión automáticamente.
          </p>
        </div>
      </div>
    </>
  );
}
