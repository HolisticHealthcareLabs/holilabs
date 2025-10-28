/**
 * Global Error Handler
 *
 * This file catches errors in the root layout and reports them to Sentry
 * Required by Next.js App Router for production error handling
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */

'use client';


import { useEffect } from 'react';
import SupportContact from '@/components/SupportContact';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report error to Sentry
    console.error('[Global Error]', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-6">
              {/* Error Icon */}
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-red-100 p-3">
                  <svg
                    className="w-8 h-8 text-red-600"
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

              {/* Error Message */}
              <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
                Error crítico de la aplicación
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Lo sentimos, la aplicación encontró un error crítico. Por favor, intenta recargar.
              </p>

              {/* Error Details (dev only) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-xs">
                  <p className="font-mono text-red-800 break-all">
                    {error.message}
                  </p>
                  {error.digest && (
                    <p className="font-mono text-red-600 mt-1">
                      Digest: {error.digest}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => reset()}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-indigo-700 transition-all"
                >
                  Intentar de nuevo
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-all"
                >
                  Volver al inicio
                </button>
              </div>

              {/* Support Contact */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <SupportContact variant="compact" showTitle={true} />
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
