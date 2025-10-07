/**
 * API Client Utilities
 * Fetch wrapper that automatically handles CSRF tokens, auth, and errors
 *
 * Usage:
 *   import { apiClient } from '@/lib/api/client';
 *   const response = await apiClient.post('/api/patients', { data });
 */

import { getClientCsrfToken } from '@/lib/security/csrf';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// ============================================================================
// CSRF TOKEN MANAGEMENT
// ============================================================================

let cachedCsrfToken: string | null = null;

/**
 * Fetch CSRF token from server and cache it
 */
async function fetchCsrfToken(): Promise<string> {
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
  } catch (error: any) {
    console.error('Failed to fetch CSRF token:', error);
    throw error;
  }
}

/**
 * Get CSRF token (from cache or fetch new one)
 */
async function getCsrfToken(): Promise<string> {
  // Try to get from cookie first (fast path)
  const cookieToken = getClientCsrfToken();
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

// ============================================================================
// API CLIENT
// ============================================================================

interface FetchOptions extends RequestInit {
  skipCsrf?: boolean; // For GET requests or public endpoints
  skipAuth?: boolean; // For public endpoints
}

/**
 * Enhanced fetch wrapper with automatic CSRF token injection
 *
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @returns Response object
 */
async function apiFetch<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
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
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      throw new ApiClientError(
        'Failed to initialize request security',
        500,
        'CSRF_TOKEN_FETCH_FAILED'
      );
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

    let data: any;
    if (isJson) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Handle error responses
    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `Request failed with status ${response.status}`;
      const errorCode = data?.code;
      const errorDetails = data?.details;

      throw new ApiClientError(
        errorMessage,
        response.status,
        errorCode,
        errorDetails
      );
    }

    return data;
  } catch (error: any) {
    // Re-throw ApiClientError as-is
    if (error instanceof ApiClientError) {
      throw error;
    }

    // Network or other errors
    console.error('API request failed:', error);
    throw new ApiClientError(
      error.message || 'Network request failed',
      0,
      'NETWORK_ERROR'
    );
  }
}

/**
 * API client with convenience methods
 */
export const apiClient = {
  /**
   * GET request
   */
  async get<T = any>(url: string, options?: FetchOptions): Promise<T> {
    return apiFetch<T>(url, { ...options, method: 'GET', skipCsrf: true });
  },

  /**
   * POST request
   */
  async post<T = any>(url: string, body?: any, options?: FetchOptions): Promise<T> {
    return apiFetch<T>(url, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  /**
   * PUT request
   */
  async put<T = any>(url: string, body?: any, options?: FetchOptions): Promise<T> {
    return apiFetch<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, body?: any, options?: FetchOptions): Promise<T> {
    return apiFetch<T>(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, options?: FetchOptions): Promise<T> {
    return apiFetch<T>(url, { ...options, method: 'DELETE' });
  },

  /**
   * Upload file (multipart/form-data)
   */
  async upload<T = any>(url: string, formData: FormData, options?: FetchOptions): Promise<T> {
    return apiFetch<T>(url, {
      ...options,
      method: 'POST',
      body: formData,
      // Don't set Content-Type - browser will set it with boundary
    });
  },

  /**
   * Refresh CSRF token (call this after login or on 403 CSRF errors)
   */
  async refreshCsrfToken(): Promise<void> {
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
export function handleApiError(error: unknown): string {
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

export default apiClient;
