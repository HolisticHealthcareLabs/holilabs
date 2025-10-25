/**
 * API Client Utilities
 * Fetch wrapper that automatically handles CSRF tokens, auth, and errors
 *
 * Usage:
 *   import { apiClient } from '@/lib/api/client';
 *   const response = await apiClient.post('/api/patients', { data });
 */
export interface ApiError {
    error: string;
    message?: string;
    code?: string;
    details?: any;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export declare class ApiClientError extends Error {
    status: number;
    code?: string | undefined;
    details?: any | undefined;
    constructor(message: string, status: number, code?: string | undefined, details?: any | undefined);
}
interface FetchOptions extends RequestInit {
    skipCsrf?: boolean;
    skipAuth?: boolean;
}
/**
 * API client with convenience methods
 */
export declare const apiClient: {
    /**
     * GET request
     */
    get<T = any>(url: string, options?: FetchOptions): Promise<T>;
    /**
     * POST request
     */
    post<T = any>(url: string, body?: any, options?: FetchOptions): Promise<T>;
    /**
     * PUT request
     */
    put<T = any>(url: string, body?: any, options?: FetchOptions): Promise<T>;
    /**
     * PATCH request
     */
    patch<T = any>(url: string, body?: any, options?: FetchOptions): Promise<T>;
    /**
     * DELETE request
     */
    delete<T = any>(url: string, options?: FetchOptions): Promise<T>;
    /**
     * Upload file (multipart/form-data)
     */
    upload<T = any>(url: string, formData: FormData, options?: FetchOptions): Promise<T>;
    /**
     * Refresh CSRF token (call this after login or on 403 CSRF errors)
     */
    refreshCsrfToken(): Promise<void>;
};
/**
 * Handle API client errors with user-friendly messages
 *
 * @param error - Error from API client
 * @returns User-friendly error message
 */
export declare function handleApiError(error: unknown): string;
export default apiClient;
//# sourceMappingURL=client.d.ts.map