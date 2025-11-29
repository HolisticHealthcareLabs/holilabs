import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@/styles/print.css';
import '@/styles/mobile.css';
import OfflineIndicator from '@/components/OfflineIndicator';
import { Providers } from '@/components/Providers';
import { IOSInstallPrompt } from '@/components/IOSInstallPrompt';
import { FeedbackWidget } from '@/components/FeedbackWidget';
import { SkipLink } from '@/components/SkipLink';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { themeInitScript } from '@/scripts/theme-init';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Holi Labs - AI Medical Scribe',
  description: 'Professional AI medical scribe with voice detection, SOAP templates, and billing export for LATAM doctors',
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
    title: 'Holi Labs - AI Medical Scribe',
    description: 'Professional AI medical scribe for LATAM doctors',
  },
  twitter: {
    card: 'summary',
    title: 'Holi Labs - AI Medical Scribe',
    description: 'Professional AI medical scribe for LATAM doctors',
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Theme initialization script - prevents FOUC */}
        <script
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
            <FeedbackWidget />
            <main id="main-content">
              {children}
            </main>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
