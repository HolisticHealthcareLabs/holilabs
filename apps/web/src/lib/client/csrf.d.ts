/**
 * Client-side CSRF Token Utilities
 * Fetch and attach CSRF tokens to requests
 */
/**
 * Fetch a fresh CSRF token from the server
 */
export declare function fetchCsrfToken(): Promise<string>;
/**
 * Wrapper for fetch that automatically adds CSRF token to POST/PUT/DELETE/PATCH requests
 */
export declare function fetchWithCsrf(url: string, options?: RequestInit): Promise<Response>;
/**
 * Clear cached CSRF token (call on logout)
 */
export declare function clearCsrfToken(): void;
//# sourceMappingURL=csrf.d.ts.map