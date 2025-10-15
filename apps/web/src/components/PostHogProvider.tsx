/**
 * PostHog Analytics Provider
 *
 * Initializes PostHog analytics and provides it throughout the app
 * Includes HIPAA-compliant configuration
 */

'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog, trackPageView } from '@/lib/posthog';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize PostHog on mount
  useEffect(() => {
    initPostHog();
  }, []);

  // Track page views on route changes
  useEffect(() => {
    if (pathname) {
      // Build the full URL with search params
      const url = searchParams?.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;

      trackPageView(url);
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
