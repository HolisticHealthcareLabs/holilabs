'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PostHogProvider } from '@/components/PostHogProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <PostHogProvider>
          <ThemeProvider defaultTheme="auto">
            {children}
          </ThemeProvider>
        </PostHogProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
