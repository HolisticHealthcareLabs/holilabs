/**
 * PostHog Analytics Provider
 *
 * Initializes PostHog analytics and provides it throughout the app
 * Includes HIPAA-compliant configuration
 */

'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog, trackPageView } from '@/lib/posthog';

// Inner component that uses useSearchParams (must be wrapped in Suspense)
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // Initialize PostHog on mount
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
}
