/**
 * React Hook for CSRF Token Management
 */

'use client';

import { useEffect, useState } from 'react';
import { fetchCsrfToken } from '@/lib/client/csrf';

export function useCsrfToken() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadToken() {
      try {
        const csrfToken = await fetchCsrfToken();
        if (mounted) {
          setToken(csrfToken);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadToken();

    return () => {
      mounted = false;
    };
  }, []);

  return { token, loading, error };
}
