'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface SessionTimeoutOptions {
  /**
   * Idle timeout in milliseconds (default: 15 minutes for HIPAA)
   */
  timeoutMs?: number;

  /**
   * Warning time before logout in milliseconds (default: 2 minutes)
   */
  warningMs?: number;

  /**
   * Callback when user is about to be logged out
   */
  onWarning?: () => void;

  /**
   * Callback when user is logged out
   */
  onTimeout?: () => void;

  /**
   * Redirect path after logout
   */
  redirectTo?: string;
}

/**
 * Hook to handle session timeout with auto-logout
 * HIPAA requires 15-minute idle timeout
 */
export function useSessionTimeout(options: SessionTimeoutOptions = {}) {
  const {
    timeoutMs = 15 * 60 * 1000, // 15 minutes (HIPAA requirement)
    warningMs = 2 * 60 * 1000, // 2 minutes warning
    onWarning,
    onTimeout,
    redirectTo = '/login',
  } = options;

  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Clear all timers
   */
  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Handle session timeout - logout user
   */
  const handleTimeout = useCallback(async () => {
    clearTimers();
    setShowWarning(false);

    if (onTimeout) {
      onTimeout();
    }

    // Sign out user
    await signOut({ redirect: false });

    // Redirect to login
    router.push(`${redirectTo}?reason=session_expired`);
  }, [clearTimers, onTimeout, router, redirectTo]);

  /**
   * Show warning modal before timeout
   */
  const handleWarning = useCallback(() => {
    setShowWarning(true);
    setTimeRemaining(warningMs);

    if (onWarning) {
      onWarning();
    }

    // Start countdown
    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          return 0;
        }
        return newTime;
      });
    }, 1000);
  }, [warningMs, onWarning]);

  /**
   * Reset the session timeout
   */
  const resetTimeout = useCallback(() => {
    clearTimers();
    setShowWarning(false);

    // Set warning timeout
    warningTimeoutRef.current = setTimeout(() => {
      handleWarning();
    }, timeoutMs - warningMs);

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      handleTimeout();
    }, timeoutMs);
  }, [clearTimers, timeoutMs, warningMs, handleWarning, handleTimeout]);

  /**
   * Extend session (when user clicks "Stay logged in")
   */
  const extendSession = useCallback(() => {
    resetTimeout();
  }, [resetTimeout]);

  /**
   * Manually logout
   */
  const logout = useCallback(async () => {
    clearTimers();
    setShowWarning(false);
    await signOut({ redirect: false });
    router.push(redirectTo);
  }, [clearTimers, router, redirectTo]);

  useEffect(() => {
    // List of events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    // Throttle function to avoid too many resets
    let lastReset = Date.now();
    const throttleMs = 1000; // Only reset once per second

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastReset > throttleMs) {
        lastReset = now;
        if (!showWarning) {
          resetTimeout();
        }
      }
    };

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Initial timeout
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [resetTimeout, clearTimers, showWarning]);

  return {
    showWarning,
    timeRemaining,
    extendSession,
    logout,
  };
}
