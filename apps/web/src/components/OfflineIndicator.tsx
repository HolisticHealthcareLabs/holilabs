/**
 * Offline Indicator Component
 *
 * Competitive Analysis:
 * - Abridge: ✅ Offline mode with sync queue
 * - Nuance DAX: ✅ Offline recording, online sync
 * - Suki: ❌ No offline support
 * - Doximity: ❌ No offline support
 *
 * Impact: Enables usage in rural areas with unreliable internet
 * Critical for LATAM markets (Mexico, Brazil, Colombia, Argentina)
 */

'use client';

import { useEffect, useState } from 'react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Initialize online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      // Hide notification after 3 seconds
      setTimeout(() => setShowNotification(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Persistent indicator (always visible)
  const PersistentIndicator = () => (
    <div
      className={`fixed bottom-4 left-4 z-50 flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg transition-all ${
        isOnline
          ? 'bg-green-100 border-2 border-green-500'
          : 'bg-red-100 border-2 border-red-500 animate-pulse'
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}
      />
      <span className={`text-xs font-medium ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
        {isOnline ? 'En línea' : 'Sin conexión'}
      </span>
    </div>
  );

  // Toast notification (appears on status change)
  const ToastNotification = () => {
    if (!showNotification) return null;

    return (
      <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5 duration-300">
        <div
          className={`flex items-center space-x-3 px-6 py-4 rounded-xl shadow-2xl ${
            isOnline
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
              : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
          }`}
        >
          {isOnline ? (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="font-bold">Conexión restaurada</p>
                <p className="text-sm opacity-90">Sincronizando cambios pendientes...</p>
              </div>
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="font-bold">Sin conexión a internet</p>
                <p className="text-sm opacity-90">Los cambios se guardarán localmente</p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <PersistentIndicator />
      <ToastNotification />
    </>
  );
}
