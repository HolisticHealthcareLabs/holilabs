'use client';

/**
 * Offline Detector Component
 * Shows a banner when the user loses internet connection
 */

import { useState, useEffect } from 'react';
import { WifiIcon, SignalSlashIcon } from '@heroicons/react/24/outline';

export function OfflineDetector() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);

      // Hide reconnection message after 3 seconds
      setTimeout(() => {
        setWasOffline(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show offline banner
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SignalSlashIcon className="h-5 w-5" />
            <div>
              <p className="font-semibold">Sin conexión a Internet</p>
              <p className="text-sm text-red-100">
                Algunas funciones pueden no estar disponibles
              </p>
            </div>
          </div>
          <div className="animate-pulse">
            <div className="h-2 w-2 bg-white rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show reconnection success message
  if (wasOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white px-4 py-3 shadow-lg animate-slide-down">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <WifiIcon className="h-5 w-5" />
          <div>
            <p className="font-semibold">Conexión restaurada</p>
            <p className="text-sm text-green-100">
              Ya puedes continuar usando el portal
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Hook to detect online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
