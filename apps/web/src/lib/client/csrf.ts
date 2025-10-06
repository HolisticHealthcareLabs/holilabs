/**
 * Client-side CSRF Token Utilities
 * Fetch and attach CSRF tokens to requests
 */

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Fetch a fresh CSRF token from the server
 */
export async function fetchCsrfToken(): Promise<string> {
  // Return cached token if still valid (cache for 23 hours)
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await fetch('/api/csrf', {
      method: 'GET',
      credentials: 'include', // Send cookies
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }

    const data = await response.json();
    cachedToken = data.token;
    tokenExpiry = now + 23 * 60 * 60 * 1000; // Cache for 23 hours

    return data.token;
  } catch (error) {
    console.error('CSRF token fetch error:', error);
    throw error;
  }
}

/**
 * Wrapper for fetch that automatically adds CSRF token to POST/PUT/DELETE/PATCH requests
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method?.toUpperCase() || 'GET';

  // Only add CSRF token for state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const token = await fetchCsrfToken();

    options.headers = {
      ...options.headers,
      'X-CSRF-Token': token,
    };
  }

  // Always include credentials for cookies
  options.credentials = options.credentials || 'include';

  return fetch(url, options);
}

/**
 * Clear cached CSRF token (call on logout)
 */
export function clearCsrfToken() {
  cachedToken = null;
  tokenExpiry = 0;
}
