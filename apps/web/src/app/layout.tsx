import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import '@/styles/print.css';
import '@/styles/mobile.css';
import OfflineIndicator from '@/components/OfflineIndicator';
import { Providers } from '@/components/Providers';
import { IOSInstallPrompt } from '@/components/IOSInstallPrompt';
import { SkipLink } from '@/components/SkipLink';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CookieConsentBanner } from '@/components/CookieConsentBanner';
import { themeInitScript } from '@/scripts/theme-init';
// Validate environment variables at app startup
import '@/lib/env';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Holi Labs - Clinical Co-Pilot',
  description: 'Clinical co-pilot for modern care teams: AI scribe, decision support, prevention workflows, and interoperable data.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Holi Labs',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Holi Labs',
    title: 'Holi Labs - Clinical Co-Pilot',
    description: 'Clinical co-pilot for modern care teams.',
  },
  twitter: {
    card: 'summary',
    title: 'Holi Labs - Clinical Co-Pilot',
    description: 'Clinical co-pilot for modern care teams.',
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme initialization script - prevents FOUC */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
          suppressHydrationWarning
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className="font-sans antialiased">
        <SkipLink />
        <ErrorBoundary>
          <Providers>
            <OfflineIndicator />
            <IOSInstallPrompt />
            <CookieConsentBanner />
            <main id="main-content">
              {children}
            </main>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
