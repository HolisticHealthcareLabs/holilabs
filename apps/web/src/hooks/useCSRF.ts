'use client';

/**
 * CSRF Token Hook
 *
 * Provides CSRF token for client-side requests
 */

import { useEffect, useState } from 'react';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Hook to get CSRF token from cookie
 */
export function useCSRFToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const getToken = () => {
      const cookies = document.cookie.split(';');
      const csrfCookie = cookies.find(cookie =>
        cookie.trim().startsWith(`${CSRF_COOKIE_NAME}=`)
      );

      if (csrfCookie) {
        return csrfCookie.split('=')[1];
      }

      return null;
    };

    setToken(getToken());

    // Watch for cookie changes
    const interval = setInterval(() => {
      setToken(getToken());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return token;
}

/**
 * Hook to get fetch options with CSRF token
 */
export function useCSRFFetch() {
  const token = useCSRFToken();

  const fetchWithCSRF = async (
    url: string | URL,
    options: RequestInit = {}
  ): Promise<Response> => {
    const headers = new Headers(options.headers);

    if (token && !headers.has(CSRF_HEADER_NAME)) {
      headers.set(CSRF_HEADER_NAME, token);
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  return fetchWithCSRF;
}

/**
 * Helper function to add CSRF token to fetch options
 */
export function withCSRFToken(options: RequestInit = {}): RequestInit {
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(cookie =>
    cookie.trim().startsWith(`${CSRF_COOKIE_NAME}=`)
  );

  const token = csrfCookie?.split('=')[1];

  if (!token) {
    console.warn('CSRF token not found in cookies');
    return options;
  }

  return {
    ...options,
    headers: {
      ...options.headers,
      [CSRF_HEADER_NAME]: token,
    },
  };
}
