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
export declare function useSessionTimeout(options?: SessionTimeoutOptions): {
    showWarning: boolean;
    timeRemaining: number;
    extendSession: () => void;
    logout: () => Promise<void>;
};
export {};
//# sourceMappingURL=useSessionTimeout.d.ts.map