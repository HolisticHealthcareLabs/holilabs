'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  // Derived data
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  patientId: string | null; // For patient portal users
  // Session timeout
  lastActivity: Date | null;
  timeUntilWarning: number | null; // seconds until warning
  showTimeoutWarning: boolean;
  extendSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configuration
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // Show warning 5 minutes before timeout
const ACTIVITY_CHECK_INTERVAL = 10 * 1000; // Check every 10 seconds

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeUntilWarning, setTimeUntilWarning] = useState<number | null>(null);

  const supabase = createClient() as any;
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle timeout logout
  const handleTimeoutLogout = useCallback(async () => {
    console.log('Session timed out due to inactivity');
    await supabase?.auth?.signOut();
    setUser(null);
    setSession(null);
    setShowTimeoutWarning(false);

    // Redirect to login with timeout message
    if (typeof window !== 'undefined') {
      window.location.href = '/portal/login?timeout=true';
    }
  }, [supabase]);

  // Update last activity time
  const updateActivity = useCallback(() => {
    const now = new Date();
    setLastActivity(now);
    setShowTimeoutWarning(false);

    // Store in localStorage for cross-tab sync
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastActivity', now.toISOString());
    }

    // Clear existing timers
    if (activityTimerRef.current) {
      clearTimeout(activityTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
    }, INACTIVITY_TIMEOUT - WARNING_TIME);

    // Set logout timer
    activityTimerRef.current = setTimeout(() => {
      handleTimeoutLogout();
    }, INACTIVITY_TIMEOUT);
  }, [handleTimeoutLogout]);

  // Refresh session from Supabase
  const refreshSession = useCallback(async () => {
    const { data: { session } } = await supabase?.auth?.refreshSession() ?? { data: { session: null } };
    setSession(session);
    setUser(session?.user ?? null);
  }, [supabase]);

  // Extend session (called from warning modal)
  const extendSession = useCallback(() => {
    updateActivity();
    refreshSession();
  }, [updateActivity, refreshSession]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Initialize activity tracking if user is logged in
      if (session?.user) {
        updateActivity();
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        updateActivity();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, updateActivity]);

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      updateActivity();
    };

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Periodic check for cross-tab activity
    checkIntervalRef.current = setInterval(() => {
      if (typeof window !== 'undefined') {
        const storedActivity = localStorage.getItem('lastActivity');
        if (storedActivity) {
          const storedDate = new Date(storedActivity);
          const timeSinceActivity = Date.now() - storedDate.getTime();

          // Update time until warning
          const remainingTime = INACTIVITY_TIMEOUT - WARNING_TIME - timeSinceActivity;
          setTimeUntilWarning(Math.max(0, Math.floor(remainingTime / 1000)));

          // Check if timeout exceeded
          if (timeSinceActivity > INACTIVITY_TIMEOUT) {
            handleTimeoutLogout();
          }
        }
      }
    }, ACTIVITY_CHECK_INTERVAL);

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user, updateActivity]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setShowTimeoutWarning(false);

    // Clear activity tracking
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lastActivity');
    }
  };

  // Derived values
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;
  const userRole = user?.user_metadata?.role ?? user?.app_metadata?.role ?? null;

  // For patients, the patient ID is the same as user ID
  // For clinicians, they don't have a patient ID
  const patientId = userRole === 'PATIENT' ? userId : null;

  const value: AuthContextType = {
    user,
    session,
    loading,
    signOut,
    refreshSession,
    userId,
    userEmail,
    userRole,
    patientId,
    lastActivity,
    timeUntilWarning,
    showTimeoutWarning,
    extendSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children as any}
      {showTimeoutWarning && user && <SessionTimeoutWarning onExtend={extendSession} />}
    </AuthContext.Provider>
  );
}

/**
 * Session Timeout Warning Modal
 */
function SessionTimeoutWarning({ onExtend }: { onExtend: () => void }) {
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md mx-4 border-2 border-yellow-500">
        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-yellow-600"
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
          ⏰ Sesión por Expirar
        </h2>

        {/* Message */}
        <p className="text-gray-600 text-center mb-6">
          Tu sesión se cerrará por inactividad en:
        </p>

        {/* Countdown */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 mb-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-yellow-600 mb-2">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            <p className="text-sm text-gray-600">minutos restantes</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onExtend}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg hover:shadow-xl"
          >
            ✓ Continuar Sesión
          </button>
          <p className="text-xs text-gray-500 text-center">
            Haz clic para extender tu sesión por 30 minutos más
          </p>
        </div>
      </div>
    </div>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
