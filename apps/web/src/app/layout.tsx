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
        {/* Early crash catcher (before React hydration). */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  function showCrash(label, err) {
    try {
      var msg = (err && (err.message || err.reason && err.reason.message)) || String(err || 'Unknown error');
      var stack = (err && (err.stack || err.reason && err.reason.stack)) || '';
      var el = document.getElementById('__holilabs_crash__');
      if (!el) {
        el = document.createElement('div');
        el.id = '__holilabs_crash__';
        el.style.position = 'fixed';
        el.style.inset = '0';
        el.style.zIndex = '2147483647';
        el.style.background = '#fff';
        el.style.color = '#111';
        el.style.padding = '16px';
        el.style.overflow = 'auto';
        el.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
        document.documentElement.appendChild(el);
      }
      el.innerHTML =
        '<div style="max-width: 960px; margin: 0 auto;">' +
        '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">' +
        '<div><div style="font-size:18px; font-weight:700;">Holi Labs crash (early)</div>' +
        '<div style="color:#555; font-size:12px; margin-top:4px;">' + label + '</div></div>' +
        '<button style="background:#111;color:#fff;border:0;border-radius:8px;padding:8px 12px;cursor:pointer;" onclick="location.reload()">Reload</button>' +
        '</div>' +
        '<pre style="margin-top:12px; background:#f7f7f7; border:1px solid #e5e5e5; border-radius:8px; padding:12px; white-space:pre-wrap;">' +
        msg + (stack ? '\\n\\n' + stack : '') +
        '</pre>' +
        '</div>';
    } catch {}
  }

  window.addEventListener('error', function(e) { showCrash('window.error', (e && (e.error || e)) || e); });
  window.addEventListener('unhandledrejection', function(e) { showCrash('unhandledrejection', e); });
})();
            `,
          }}
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
