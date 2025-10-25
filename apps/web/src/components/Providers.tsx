'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PostHogProvider } from '@/components/PostHogProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
