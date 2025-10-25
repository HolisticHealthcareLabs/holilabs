/**
 * Hook to get CSRF token from cookie
 */
export declare function useCSRFToken(): string | null;
/**
 * Hook to get fetch options with CSRF token
 */
export declare function useCSRFFetch(): (url: string | URL, options?: RequestInit) => Promise<Response>;
/**
 * Helper function to add CSRF token to fetch options
 */
export declare function withCSRFToken(options?: RequestInit): RequestInit;
//# sourceMappingURL=useCSRF.d.ts.map