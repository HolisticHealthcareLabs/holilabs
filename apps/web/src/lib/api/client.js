"use strict";
/**
 * API Client Utilities
 * Fetch wrapper that automatically handles CSRF tokens, auth, and errors
 *
 * Usage:
 *   import { apiClient } from '@/lib/api/client';
 *   const response = await apiClient.post('/api/patients', { data });
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiClient = exports.ApiClientError = void 0;
exports.handleApiError = handleApiError;
const csrf_1 = require("@/lib/security/csrf");
class ApiClientError extends Error {
    status;
    code;
    details;
    constructor(message, status, code, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
        this.name = 'ApiClientError';
    }
}
exports.ApiClientError = ApiClientError;
// ============================================================================
// CSRF TOKEN MANAGEMENT
// ============================================================================
let cachedCsrfToken = null;
/**
 * Fetch CSRF token from server and cache it
 */
async function fetchCsrfToken() {
    try {
        const response = await fetch('/api/csrf', {
            method: 'GET',
            credentials: 'include', // Include cookies
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch CSRF token: ${response.status}`);
        }
        const data = await response.json();
        if (!data.token) {
            throw new Error('CSRF token not found in response');
        }
        cachedCsrfToken = data.token;
        return data.token;
    }
    catch (error) {
        console.error('Failed to fetch CSRF token:', error);
        throw error;
    }
}
/**
 * Get CSRF token (from cache or fetch new one)
 */
async function getCsrfToken() {
    // Try to get from cookie first (fast path)
    const cookieToken = (0, csrf_1.getClientCsrfToken)();
    if (cookieToken) {
        cachedCsrfToken = cookieToken;
        return cookieToken;
    }
    // Fetch from server if not in cookie
    if (!cachedCsrfToken) {
        return fetchCsrfToken();
    }
    return cachedCsrfToken;
}
/**
 * Enhanced fetch wrapper with automatic CSRF token injection
 *
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @returns Response object
 */
async function apiFetch(url, options = {}) {
    const { skipCsrf, skipAuth, ...fetchOptions } = options;
    // Prepare headers
    const headers = new Headers(fetchOptions.headers);
    // Add Content-Type if not present and body exists
    if (fetchOptions.body && !headers.has('Content-Type')) {
        if (!(fetchOptions.body instanceof FormData)) {
            headers.set('Content-Type', 'application/json');
        }
    }
    // Add CSRF token for state-changing methods
    const method = (fetchOptions.method || 'GET').toUpperCase();
    const requiresCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (requiresCsrf && !skipCsrf) {
        try {
            const csrfToken = await getCsrfToken();
            headers.set('X-CSRF-Token', csrfToken);
        }
        catch (error) {
            console.error('Failed to get CSRF token:', error);
            throw new ApiClientError('Failed to initialize request security', 500, 'CSRF_TOKEN_FETCH_FAILED');
        }
    }
    // Make request
    try {
        const response = await fetch(url, {
            ...fetchOptions,
            headers,
            credentials: skipAuth ? 'omit' : 'include', // Include auth cookies by default
        });
        // Parse response
        const contentType = response.headers.get('Content-Type');
        const isJson = contentType?.includes('application/json');
        let data;
        if (isJson) {
            data = await response.json();
        }
        else {
            data = await response.text();
        }
        // Handle error responses
        if (!response.ok) {
            const errorMessage = data?.message || data?.error || `Request failed with status ${response.status}`;
            const errorCode = data?.code;
            const errorDetails = data?.details;
            throw new ApiClientError(errorMessage, response.status, errorCode, errorDetails);
        }
        return data;
    }
    catch (error) {
        // Re-throw ApiClientError as-is
        if (error instanceof ApiClientError) {
            throw error;
        }
        // Network or other errors
        console.error('API request failed:', error);
        throw new ApiClientError(error.message || 'Network request failed', 0, 'NETWORK_ERROR');
    }
}
/**
 * API client with convenience methods
 */
exports.apiClient = {
    /**
     * GET request
     */
    async get(url, options) {
        return apiFetch(url, { ...options, method: 'GET', skipCsrf: true });
    },
    /**
     * POST request
     */
    async post(url, body, options) {
        return apiFetch(url, {
            ...options,
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    },
    /**
     * PUT request
     */
    async put(url, body, options) {
        return apiFetch(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body),
        });
    },
    /**
     * PATCH request
     */
    async patch(url, body, options) {
        return apiFetch(url, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(body),
        });
    },
    /**
     * DELETE request
     */
    async delete(url, options) {
        return apiFetch(url, { ...options, method: 'DELETE' });
    },
    /**
     * Upload file (multipart/form-data)
     */
    async upload(url, formData, options) {
        return apiFetch(url, {
            ...options,
            method: 'POST',
            body: formData,
            // Don't set Content-Type - browser will set it with boundary
        });
    },
    /**
     * Refresh CSRF token (call this after login or on 403 CSRF errors)
     */
    async refreshCsrfToken() {
        cachedCsrfToken = null;
        await fetchCsrfToken();
    },
};
// ============================================================================
// ERROR HANDLER HELPER
// ============================================================================
/**
 * Handle API client errors with user-friendly messages
 *
 * @param error - Error from API client
 * @returns User-friendly error message
 */
function handleApiError(error) {
    if (error instanceof ApiClientError) {
        // CSRF errors
        if (error.code === 'CSRF_TOKEN_MISSING' || error.code === 'CSRF_TOKEN_INVALID') {
            return 'Your session has expired. Please refresh the page and try again.';
        }
        // Auth errors
        if (error.status === 401) {
            return 'You must be logged in to perform this action.';
        }
        if (error.status === 403) {
            return 'You do not have permission to perform this action.';
        }
        // Validation errors
        if (error.status === 400) {
            return error.message || 'Invalid request. Please check your input.';
        }
        // Rate limiting
        if (error.status === 429) {
            return 'Too many requests. Please wait a moment and try again.';
        }
        // Server errors
        if (error.status >= 500) {
            return 'A server error occurred. Please try again later.';
        }
        // Default to error message
        return error.message;
    }
    // Unknown errors
    return 'An unexpected error occurred. Please try again.';
}
// ============================================================================
// EXPORTS
// ============================================================================
exports.default = exports.apiClient;
//# sourceMappingURL=client.js.map