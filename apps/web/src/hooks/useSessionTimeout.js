"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSessionTimeout = useSessionTimeout;
const react_1 = require("react");
const react_2 = require("next-auth/react");
const navigation_1 = require("next/navigation");
/**
 * Hook to handle session timeout with auto-logout
 * HIPAA requires 15-minute idle timeout
 */
function useSessionTimeout(options = {}) {
    const { timeoutMs = 15 * 60 * 1000, // 15 minutes (HIPAA requirement)
    warningMs = 2 * 60 * 1000, // 2 minutes warning
    onWarning, onTimeout, redirectTo = '/login', } = options;
    const router = (0, navigation_1.useRouter)();
    const [showWarning, setShowWarning] = (0, react_1.useState)(false);
    const [timeRemaining, setTimeRemaining] = (0, react_1.useState)(0);
    const timeoutRef = (0, react_1.useRef)(null);
    const warningTimeoutRef = (0, react_1.useRef)(null);
    const intervalRef = (0, react_1.useRef)(null);
    /**
     * Clear all timers
     */
    const clearTimers = (0, react_1.useCallback)(() => {
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
    const handleTimeout = (0, react_1.useCallback)(async () => {
        clearTimers();
        setShowWarning(false);
        if (onTimeout) {
            onTimeout();
        }
        // Sign out user
        await (0, react_2.signOut)({ redirect: false });
        // Redirect to login
        router.push(`${redirectTo}?reason=session_expired`);
    }, [clearTimers, onTimeout, router, redirectTo]);
    /**
     * Show warning modal before timeout
     */
    const handleWarning = (0, react_1.useCallback)(() => {
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
    const resetTimeout = (0, react_1.useCallback)(() => {
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
    const extendSession = (0, react_1.useCallback)(() => {
        resetTimeout();
    }, [resetTimeout]);
    /**
     * Manually logout
     */
    const logout = (0, react_1.useCallback)(async () => {
        clearTimers();
        setShowWarning(false);
        await (0, react_2.signOut)({ redirect: false });
        router.push(redirectTo);
    }, [clearTimers, router, redirectTo]);
    (0, react_1.useEffect)(() => {
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
//# sourceMappingURL=useSessionTimeout.js.map