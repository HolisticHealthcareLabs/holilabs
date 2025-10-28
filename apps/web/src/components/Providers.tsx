'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/providers/ThemeProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <ThemeProvider defaultTheme="auto">
          {children}
        </ThemeProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
