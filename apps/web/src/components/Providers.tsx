'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/providers/ThemeProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider
        refetchInterval={5 * 60} // Refetch session every 5 minutes
        refetchOnWindowFocus={false} // Disable refetch on window focus to reduce noise
      >
        <ThemeProvider defaultTheme="auto">
          {children}
        </ThemeProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
