"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.viewport = exports.metadata = void 0;
exports.default = RootLayout;
const google_1 = require("next/font/google");
require("./globals.css");
require("@/styles/print.css");
require("@/styles/mobile.css");
const OfflineIndicator_1 = __importDefault(require("@/components/OfflineIndicator"));
const Providers_1 = require("@/components/Providers");
const IOSInstallPrompt_1 = require("@/components/IOSInstallPrompt");
const FeedbackWidget_1 = require("@/components/FeedbackWidget");
const SkipLink_1 = require("@/components/SkipLink");
const inter = (0, google_1.Inter)({ subsets: ['latin'] });
exports.metadata = {
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
exports.viewport = {
    themeColor: '#3b82f6',
    width: 'device-width',
    initialScale: 1,
    minimumScale: 1,
    viewportFit: 'cover',
};
function RootLayout({ children, }) {
    return (<html lang="es">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any"/>
        <link rel="icon" href="/icon.svg" type="image/svg+xml"/>
        <link rel="apple-touch-icon" href="/icon-192x192.png"/>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover"/>
      </head>
      <body className={inter.className}>
        <SkipLink_1.SkipLink />
        <Providers_1.Providers>
          <OfflineIndicator_1.default />
          <IOSInstallPrompt_1.IOSInstallPrompt />
          <FeedbackWidget_1.FeedbackWidget />
          <main id="main-content">
            {children}
          </main>
        </Providers_1.Providers>
      </body>
    </html>);
}
//# sourceMappingURL=layout.js.map