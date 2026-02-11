'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { LanguageProvider } from '@/contexts/LanguageContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider
        refetchInterval={5 * 60} // Refetch session every 5 minutes
        refetchOnWindowFocus={false} // Disable refetch on window focus to reduce noise
      >
        <ThemeProvider defaultTheme="auto">
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
