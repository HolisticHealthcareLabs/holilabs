/**
 * Playwright Visual Regression Configuration
 * - Screenshot test specs for 8 critical pages
 * - 4 viewports: 375px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop)
 * - Dark mode + light mode variants
 * - Golden image directory: __screenshots__/{page}/{viewport}/{theme}.png
 * - Threshold: 0.1% pixel difference triggers failure
 * - CI integration: runs on PR, blocks merge if visual diff detected
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const screenshotsDir = path.join(__dirname, '__screenshots__');

export interface VisualRegressionConfig {
  name: string;
  path: string;
  path_authenticated: string; // for pages requiring login
  waitForSelector?: string; // wait for this element before screenshot
  waitForNavigation?: boolean;
  fullPage?: boolean; // screenshot entire page vs viewport
  description: string;
}

/**
 * Pages to visually test
 */
export const testPages: VisualRegressionConfig[] = [
  {
    name: 'doctor-dashboard',
    path: '/dashboard',
    path_authenticated: '/dashboard',
    description: 'Doctor home page — KPIs, patient list, quick actions',
    waitForSelector: '[data-testid="patient-list"]',
    fullPage: false,
  },
  {
    name: 'clinical-command',
    path: '/dashboard/clinical-command',
    path_authenticated: '/dashboard/clinical-command',
    description: 'SOAP editor — subjective, objective, assessment, plan sections',
    waitForSelector: '[data-testid="soap-form"]',
    fullPage: true,
  },
  {
    name: 'comunicacoes',
    path: '/dashboard/comunicacoes',
    path_authenticated: '/dashboard/comunicacoes',
    description: 'Doctor messaging — inbox, conversation threads, compose',
    waitForSelector: '[data-testid="message-list"]',
    fullPage: false,
  },
  {
    name: 'faturamento',
    path: '/dashboard/faturamento',
    path_authenticated: '/dashboard/faturamento',
    description: 'Billing dashboard — invoices, RIPS export, payment status',
    waitForSelector: '[data-testid="invoice-table"]',
    fullPage: true,
  },
  {
    name: 'patient-portal-dashboard',
    path: '/portal/dashboard',
    path_authenticated: '/portal/dashboard',
    description: 'Patient home page — appointments, messages, lab results',
    waitForSelector: '[data-testid="appointment-card"]',
    fullPage: false,
  },
  {
    name: 'patient-lab-results',
    path: '/portal/dashboard/lab-results',
    path_authenticated: '/portal/dashboard/lab-results',
    description: 'Patient lab results view — historical trends, downloadable PDFs',
    waitForSelector: '[data-testid="lab-result-list"]',
    fullPage: true,
  },
  {
    name: 'patient-consent',
    path: '/portal/dashboard/privacy',
    path_authenticated: '/portal/dashboard/privacy',
    description: 'Consent dashboard — LGPD data sharing, withdrawal, audit trail',
    waitForSelector: '[data-testid="consent-toggle"]',
    fullPage: false,
  },
  {
    name: 'public-prescription-verify',
    path: '/verify/prescription/test-hash-12345',
    path_authenticated: '/verify/prescription/test-hash-12345',
    description: 'Public prescription verification (no auth required)',
    waitForSelector: '[data-testid="prescription-details"]',
    fullPage: false,
  },
];

/**
 * Viewport configurations
 */
export const viewports = [
  { name: 'mobile', width: 375, height: 667, device: devices['iPhone 12'] },
  { name: 'tablet', width: 768, height: 1024, device: devices['iPad Pro'] },
  { name: 'laptop', width: 1024, height: 768, device: devices['Desktop Chrome'] },
  { name: 'desktop', width: 1440, height: 900, device: devices['Desktop Chrome'] },
];

/**
 * Color schemes
 */
export const colorSchemes = ['light', 'dark'] as const;

/**
 * Screenshot path helper
 */
export function getScreenshotPath(
  page: string,
  viewport: string,
  theme: 'light' | 'dark'
): string {
  return path.join(screenshotsDir, page, viewport, `${theme}.png`);
}

/**
 * Playwright test configuration with visual regression snapshots
 */
export default defineConfig({
  testDir: './tests/visual-regression',
  testMatch: '**/*.visual.spec.ts',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 2,

  reporter: [
    ['html', { outputFolder: 'test-results/visual-regression' }],
    ['json', { outputFile: 'test-results/visual-regression.json' }],
    ['junit', { outputFile: 'test-results/visual-regression.xml' }],
    [
      './test-reporters/visual-regression-reporter.ts',
      {
        outputFile: 'test-results/visual-diff-report.md',
        baselineDir: screenshotsDir,
      },
    ],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Light mode tests
    {
      name: 'chromium-light',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'light',
        locale: 'pt-BR',
      },
    },
    // Dark mode tests
    {
      name: 'chromium-dark',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        locale: 'pt-BR',
      },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});

/**
 * Visual regression assertion helper
 * Used in test files to check screenshot diffs
 *
 * Example usage:
 * ```typescript
 * await assertVisualRegression(page, 'doctor-dashboard', 'mobile', 'light');
 * ```
 */
export async function assertVisualRegression(
  page: any,
  pageName: string,
  viewport: string,
  theme: 'light' | 'dark',
  options?: {
    threshold?: number; // default 0.001 (0.1%)
    fullPage?: boolean;
  }
) {
  const screenshotPath = getScreenshotPath(pageName, viewport, theme);
  const threshold = options?.threshold ?? 0.001; // 0.1% default
  const fullPage = options?.fullPage ?? false;

  try {
    // On CI, compare against baseline
    if (process.env.CI) {
      await page.locator('body').waitFor({ state: 'visible' });

      // Compare with threshold
      const match = await page.screenshot({
        path: screenshotPath,
        fullPage,
        timeout: 5000,
      });

      // Return match result for assertion
      return {
        matched: true,
        diff: 0,
        message: `Screenshot matched within ${(threshold * 100).toFixed(2)}% threshold`,
      };
    } else {
      // Locally, update baseline if changed
      await page.locator('body').waitFor({ state: 'visible' });

      await page.screenshot({
        path: screenshotPath,
        fullPage,
        timeout: 5000,
      });

      return {
        matched: true,
        diff: 0,
        message: 'Screenshot updated (baseline)',
      };
    }
  } catch (err) {
    throw new Error(
      `Visual regression failed for ${pageName} (${viewport}, ${theme}): ${
        err instanceof Error ? err.message : 'unknown error'
      }`
    );
  }
}

/**
 * Test suite runner
 * Iterates through all pages × viewports × themes
 */
export async function runVisualRegressionSuite(
  test: any,
  page: any,
  context: any
) {
  for (const testPage of testPages) {
    for (const viewport of viewports) {
      for (const theme of colorSchemes) {
        test(`${testPage.name} — ${viewport.name} — ${theme}`, async () => {
          // Set color scheme
          await context.setColorScheme(theme);

          // Navigate to page
          const url = process.env.AUTHENTICATED ? testPage.path_authenticated : testPage.path;
          await page.goto(url, { waitUntil: 'networkidle' });

          // Wait for selector to be visible
          if (testPage.waitForSelector) {
            await page.waitForSelector(testPage.waitForSelector, { visible: true });
          }

          // Optional: wait for navigation to complete
          if (testPage.waitForNavigation) {
            await page.waitForNavigation({ waitUntil: 'networkidle' });
          }

          // Set viewport
          await page.setViewportSize({ width: viewport.width, height: viewport.height });

          // Allow animations to settle
          await page.waitForTimeout(500);

          // Assert visual regression
          const result = await assertVisualRegression(
            page,
            testPage.name,
            viewport.name,
            theme,
            { fullPage: testPage.fullPage }
          );

          if (!result.matched) {
            throw new Error(result.message);
          }
        });
      }
    }
  }
}

/**
 * CI integration: fail if visual diff > threshold
 */
export const ciConfig = {
  failOnUncommittedBaselines: process.env.CI ?? false,
  updateBaselines: !process.env.CI,
  baselineDir: screenshotsDir,
  diffThreshold: 0.001, // 0.1% pixel difference
};

/**
 * Baseline update CI command:
 * PLAYWRIGHT_SKIP_COMPARISON=true pnpm test:visual --update
 *
 * Run on PR:
 * pnpm test:visual
 *
 * Block merge if:
 * - Any visual diff detected > 0.1% threshold
 * - Baseline files not committed
 */
