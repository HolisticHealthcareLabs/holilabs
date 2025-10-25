'use client';

/**
 * Portal Error Page
 * Catches errors in the portal section
 * Industry-grade error handling with professional support options
 */

import { useEffect } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline';
import SupportContact from '@/components/SupportContact';

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Portal Error:', error);

    // TODO: Send to Sentry
    // Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8">
          {/* Icon */}
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">
            Algo salió mal
          </h1>

          {/* Message */}
          <p className="text-gray-600 text-center mb-6">
            Lo sentimos, ocurrió un error inesperado en el portal de pacientes. Por favor, intenta de nuevo.
          </p>

          {/* Error details (dev mode only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-mono text-red-800 break-all mb-2">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-red-600">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              <ArrowPathIcon className="h-5 w-5" />
              Intentar de nuevo
            </button>
            <button
              onClick={() => window.location.href = '/portal/dashboard'}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <HomeIcon className="h-5 w-5" />
              Volver al inicio
            </button>
          </div>

          {/* Support Contact */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <SupportContact
              variant="compact"
              showTitle={true}
              title="¿Necesitas ayuda?"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
