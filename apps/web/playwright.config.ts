import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration — E2E + Visual Regression
 *
 * Test directories:
 *   - tests/e2e/              → critical user flow tests
 *   - tests/visual-regression/ → screenshot comparison at 4 viewports × 2 themes
 *   - tests/accessibility/    → axe-core a11y audits
 *
 * Viewports (visual regression):
 *   mobile  375×667  | tablet 768×1024 | laptop 1024×768 | desktop 1440×900
 *
 * Browsers: chromium, firefox, webkit
 * Retries: 2 on CI, 0 locally
 * Reporters: html + json (CI-friendly)
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/** Viewport presets used by visual regression specs */
export const VIEWPORTS = {
  mobile:  { width: 375,  height: 667  },
  tablet:  { width: 768,  height: 1024 },
  laptop:  { width: 1024, height: 768  },
  desktop: { width: 1440, height: 900  },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;
export type ThemeName = 'light' | 'dark';

export default defineConfig({
  /* Test directories — Playwright discovers specs in all listed dirs */
  testDir: './tests',
  testMatch: '**/*.spec.ts',

  /* Artifacts */
  outputDir: './tests/results',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  /* Snapshot settings for visual regression (toMatchSnapshot) */
  expect: {
    timeout: 10_000,
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.001,
    },
  },

  /* ──────────────────────────────────────────────
     Browser × Viewport Projects
     ────────────────────────────────────────────── */
  projects: [
    // ── Desktop browsers (E2E + visual regression) ──
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // ── Visual regression viewports (chromium) ──
    {
      name: 'vr-mobile',
      testDir: './tests/visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORTS.mobile,
      },
    },
    {
      name: 'vr-tablet',
      testDir: './tests/visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORTS.tablet,
      },
    },
    {
      name: 'vr-laptop',
      testDir: './tests/visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORTS.laptop,
      },
    },
    {
      name: 'vr-desktop',
      testDir: './tests/visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORTS.desktop,
      },
    },

    // ── Mobile E2E ──
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14 Pro'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  timeout: 60_000,
});
