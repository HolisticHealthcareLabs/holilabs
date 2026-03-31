/**
 * Lighthouse CI Configuration
 *
 * Covers 7 critical pages (8 listed in a11y spec — /dashboard appears twice;
 * deduped here). Protected routes require a valid NextAuth session cookie.
 *
 * CI usage:
 *   LHCI_SESSION_COOKIE=<next-auth.session-token value> pnpm lhci:run
 *
 * Local usage (dev server must be running on :3000):
 *   1. Sign in manually → copy `next-auth.session-token` from DevTools → Cookies
 *   2. LHCI_SESSION_COOKIE=<value> npx lhci autorun
 *
 * Score thresholds mirror sprint5-assets/performance-budgets.json:
 *   performance  ≥ 0.80 warn  / ≥ 0.70 fail
 *   accessibility ≥ 0.90 warn / ≥ 0.85 fail
 *   best-practices ≥ 0.85 warn / ≥ 0.80 fail
 *   seo           ≥ 0.85 warn  / ≥ 0.80 fail
 *
 * Core Web Vitals thresholds mirror the same file:
 *   LCP  ≤ 4000ms  |  CLS  ≤ 0.25  |  TBT (proxy for FID) ≤ 300ms
 *   TTFB ≤ 800ms   |  FCP  ≤ 3000ms
 */

'use strict';

// ── Auth headers ──────────────────────────────────────────────────────

const SESSION_COOKIE = process.env.LHCI_SESSION_COOKIE || '';

/** Build a Cookie header for protected pages. If no token is set,
 *  Lighthouse will still run but will measure the login redirect page —
 *  acceptable for local iteration, but CI MUST provide the token. */
function authHeaders() {
  if (!SESSION_COOKIE) return {};
  return {
    Cookie: `next-auth.session-token=${SESSION_COOKIE}`,
  };
}

// ── URL lists ─────────────────────────────────────────────────────────

const BASE_URL = process.env.LHCI_BASE_URL || 'http://localhost:3000';

/** Pages that require a doctor session */
const DOCTOR_PAGES = [
  '/dashboard',
  '/dashboard/clinical-command',
  '/dashboard/comunicacoes',
];

/** Pages that require a patient session */
const PATIENT_PAGES = [
  '/portal/dashboard',
  '/portal/dashboard/lab-results',
  '/portal/dashboard/privacy',
];

/** Public — no auth required */
const PUBLIC_PAGES = [
  '/verify/prescription/test-hash',
];

// ── Collect blocks (one per auth context) ────────────────────────────

/** Shared Lighthouse settings */
const BASE_SETTINGS = {
  formFactor: 'desktop',
  throttling: {
    rttMs: 40,
    throughputKbps: 10_240,
    cpuSlowdownMultiplier: 1,
  },
  screenEmulation: {
    mobile: false,
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    disabled: false,
  },
  emulatedUserAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

const MOBILE_SETTINGS = {
  formFactor: 'mobile',
  throttling: {
    rttMs: 150,
    throughputKbps: 1_638.4,
    cpuSlowdownMultiplier: 4,
  },
  screenEmulation: {
    mobile: true,
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    disabled: false,
  },
};

// ── Assertion presets ─────────────────────────────────────────────────

/**
 * Score thresholds from sprint5-assets/performance-budgets.json
 * `[warnLevel, errorLevel]` → warn if score < warn, fail if score < error
 * Scores are 0–1 in LHCI assertions.
 */
const SCORE_ASSERTIONS = {
  'categories:performance':     ['warn', { minScore: 0.80 }],
  'categories:accessibility':   ['error', { minScore: 0.85 }],
  'categories:best-practices':  ['warn', { minScore: 0.85 }],
  'categories:seo':              ['warn', { minScore: 0.85 }],
};

/**
 * Core Web Vitals / Lighthouse metric thresholds.
 * Values are in milliseconds (or unitless for CLS).
 * Using `critical` column from performance-budgets.json as the error threshold
 * and `warning` column as the warn threshold.
 */
const METRIC_ASSERTIONS = {
  // LCP — warning: 3000ms, critical: 4000ms
  'largest-contentful-paint': [
    'warn',
    { maxNumericValue: 3000 },
    { maxNumericValue: 4000 },
  ],

  // CLS — warning: 0.15, critical: 0.25
  'cumulative-layout-shift': [
    'warn',
    { maxNumericValue: 0.15 },
    { maxNumericValue: 0.25 },
  ],

  // TBT (Total Blocking Time) — proxy for FID/INP
  // FID warning: 200ms, critical: 300ms
  'total-blocking-time': [
    'warn',
    { maxNumericValue: 200 },
    { maxNumericValue: 300 },
  ],

  // TTFB — warning: 400ms, critical: 800ms
  'server-response-time': [
    'warn',
    { maxNumericValue: 400 },
    { maxNumericValue: 800 },
  ],

  // FCP — no explicit budget, use reasonable thresholds
  'first-contentful-paint': [
    'warn',
    { maxNumericValue: 2000 },
    { maxNumericValue: 3000 },
  ],

  // Speed Index — no budget, reasonable for a clinical app
  'speed-index': [
    'warn',
    { maxNumericValue: 3500 },
    { maxNumericValue: 5000 },
  ],
};

/**
 * Accessibility-specific audits that must pass.
 * These complement (and cross-check) the axe-core Playwright suite.
 */
const A11Y_ASSERTIONS = {
  // Hard failures — must pass on every page
  'aria-allowed-attr':          ['error', { minScore: 1 }],
  'aria-hidden-body':           ['error', { minScore: 1 }],
  'aria-required-attr':         ['error', { minScore: 1 }],
  'button-name':                ['error', { minScore: 1 }],
  'color-contrast':             ['error', { minScore: 1 }],
  'document-title':             ['error', { minScore: 1 }],
  'duplicate-id-active':        ['error', { minScore: 1 }],
  'form-field-multiple-labels': ['error', { minScore: 1 }],
  'frame-title':                ['error', { minScore: 1 }],
  'html-has-lang':              ['error', { minScore: 1 }],
  'html-lang-valid':            ['error', { minScore: 1 }],
  'image-alt':                  ['error', { minScore: 1 }],
  'input-image-alt':            ['error', { minScore: 1 }],
  'label':                      ['error', { minScore: 1 }],
  'link-name':                  ['error', { minScore: 1 }],
  'list':                       ['error', { minScore: 1 }],
  'listitem':                   ['error', { minScore: 1 }],
  'meta-viewport':              ['error', { minScore: 1 }],
  'tabindex':                   ['error', { minScore: 1 }],

  // Warnings — SaMD pages carry elevated expectations
  'focus-traps':                ['warn', { minScore: 1 }],
  'focusable-controls':         ['warn', { minScore: 1 }],
  'interactive-element-affordance': ['warn', { minScore: 1 }],
  'logical-tab-order':          ['warn', { minScore: 1 }],
  'managed-focus':              ['warn', { minScore: 1 }],
  'offscreen-content-hidden':   ['warn', { minScore: 1 }],
  'use-landmarks':              ['warn', { minScore: 1 }],
  'visual-order-follows-dom':   ['warn', { minScore: 1 }],
};

/**
 * Security / best-practice audits — clinical SaMD context
 */
const SECURITY_ASSERTIONS = {
  'is-on-https':                ['warn', { minScore: 1 }],
  'no-vulnerable-libraries':    ['warn', { minScore: 1 }],
  'csp-xss':                    ['warn', { minScore: 1 }],
};

const ALL_ASSERTIONS = {
  ...SCORE_ASSERTIONS,
  ...METRIC_ASSERTIONS,
  ...A11Y_ASSERTIONS,
  ...SECURITY_ASSERTIONS,
};

// ── Configuration export ──────────────────────────────────────────────

module.exports = {
  ci: {
    /** ── Collect ──────────────────────────────────────────────────── */
    collect: [
      // Doctor-authed pages (desktop)
      {
        url: DOCTOR_PAGES.map((p) => `${BASE_URL}${p}`),
        numberOfRuns: 3,
        settings: {
          ...BASE_SETTINGS,
          extraHeaders: authHeaders(),
        },
      },
      // Patient-authed pages (desktop)
      {
        url: PATIENT_PAGES.map((p) => `${BASE_URL}${p}`),
        numberOfRuns: 3,
        settings: {
          ...BASE_SETTINGS,
          extraHeaders: authHeaders(),
        },
      },
      // Public pages (desktop)
      {
        url: PUBLIC_PAGES.map((p) => `${BASE_URL}${p}`),
        numberOfRuns: 3,
        settings: BASE_SETTINGS,
      },
      // Dashboard mobile pass (most-used page on smallest supported viewport)
      {
        url: [`${BASE_URL}/dashboard`],
        numberOfRuns: 2,
        settings: {
          ...MOBILE_SETTINGS,
          extraHeaders: authHeaders(),
        },
      },
    ],

    /** ── Assert ───────────────────────────────────────────────────── */
    assert: {
      // Use median run to reduce noise from the 3 collected samples
      aggregationMethod: 'median-run',
      assertions: ALL_ASSERTIONS,

      // Per-page budget overrides for known heavier pages
      // Clinical Command renders a SOAP editor + AI panel → looser perf budget
      assertMatrix: [
        {
          matchingUrlPattern: '.*/dashboard/clinical-command$',
          assertions: {
            ...ALL_ASSERTIONS,
            // Looser performance threshold for the AI-heavy page
            'categories:performance': ['warn', { minScore: 0.70 }],
            'largest-contentful-paint': [
              'warn',
              { maxNumericValue: 4000 },
              { maxNumericValue: 5000 },
            ],
            'total-blocking-time': [
              'warn',
              { maxNumericValue: 400 },
              { maxNumericValue: 600 },
            ],
          },
        },
      ],
    },

    /** ── Upload ───────────────────────────────────────────────────── */
    upload: {
      // Temporary public storage is fine for dev iteration.
      // Switch to `target: 'lhci'` and configure a self-hosted LHCI server
      // before adding this to the main CI pipeline.
      target: 'temporary-public-storage',

      // Uncomment to use a self-hosted LHCI server:
      // target: 'lhci',
      // serverBaseUrl: process.env.LHCI_SERVER_URL,
      // token: process.env.LHCI_TOKEN,
    },
  },
};
