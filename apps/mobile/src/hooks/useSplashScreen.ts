/**
 * useSplashScreen Hook
 *
 * Manages app readiness state during initialization.
 * Ensures critical resources are loaded before showing the app.
 *
 * The native splash screen is configured in app.json with white background.
 * This hook manages the transition from splash to app content.
 *
 * Usage:
 *   const { isReady } = useSplashScreen();
 *   if (!isReady) return <LoadingScreen />;
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

export interface UseSplashScreenReturn {
  isReady: boolean;
  setReady: (ready: boolean) => void;
}

export function useSplashScreen(): UseSplashScreenReturn {
  const [isReady, setIsReady] = useState(false);
  const authHasHydrated = useAuthStore((state) => state._hasHydrated);

  useEffect(() => {
    async function prepare() {
      try {
        // Wait for auth store to hydrate
        if (!authHasHydrated) {
          return;
        }

        // Add any other initialization logic here
        // For example: preload fonts, images, etc.

        // Small delay to ensure UI is ready (prevents flash)
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Mark as ready
        setIsReady(true);
      } catch (error) {
        console.error('Error during app initialization:', error);
        // Even on error, mark as ready to prevent infinite loading
        setIsReady(true);
      }
    }

    prepare();
  }, [authHasHydrated]);

  return {
    isReady,
    setReady: setIsReady,
  };
}
