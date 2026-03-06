'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { LanguageProvider } from '@/contexts/LanguageContext';

export function Providers({ children }: { children: ReactNode }) {
  // SessionProvider must sit OUTSIDE the ErrorBoundary.
  // When ErrorBoundary catches an error and renders its fallback, every component
  // inside the boundary is unmounted — including SessionProvider.  Any component
  // (e.g. ValidationConsolePage) that calls useSession() during that cycle would
  // throw "must be wrapped in <SessionProvider>" again, creating a crash loop.
  return (
    <SessionProvider
      refetchInterval={5 * 60}
      refetchOnWindowFocus={false}
    >
      <ErrorBoundary>
        <ThemeProvider defaultTheme="auto">
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SessionProvider>
  );
}
