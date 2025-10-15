'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PostHogProvider } from '@/components/PostHogProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <PostHogProvider>
        {children}
      </PostHogProvider>
    </ErrorBoundary>
  );
}
