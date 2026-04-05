/**
 * playwright.config.ts
 *
 * Playwright configuration for E2E tests in holilabsv2.
 *
 * Copy this to playwright.config.ts and customize as needed.
 *
 * Features:
 *  - Multi-browser testing (chromium, firefox, webkit)
 *  - Retries on CI environments
 *  - HTML and JSON reporting
 *  - Screenshot on failure
 *  - Video recording options
 *  - Configurable test directories
 */

import { defineConfig, devices } from '@playwright/test';

// Read environment variables
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const isCI = !!process.env.CI;

export default defineConfig({
  // ========================================================================
  // Test Configuration
  // ========================================================================

  testDir: './apps/web/tests/e2e',
  testMatch: '**/*.spec.ts',
  testIgnore: ['**/fixtures.ts', '**/*.helper.ts'],

  // Number of parallel workers
  workers: isCI ? 1 : 4,

  // Timeout for each test
  timeout: 30 * 1000,
  navigationTimeout: 15 * 1000,
  actionTimeout: 10 * 1000,

  // Retries
  retries: isCI ? 1 : 0,

  // Expect timeout
  expect: {
    timeout: 5 * 1000,
  },

  // ========================================================================
  // Output Configuration
  // ========================================================================

  outputDir: 'test-results',

  // Reporters
  reporter: [
    // Console reporter (line format is compact)
    ['line'],

    // HTML report (interactive, visual)
    ['html', { outputFolder: 'playwright-report' }],

    // JSON report (machine-readable)
    ['json', { outputFile: 'test-results/index.json' }],

    // JUnit report (for CI/CD integration)
    ['junit', { outputFile: 'test-results/junit.xml' }],

    // GitHub reporter (for action summaries)
    ...(isCI ? [['github']] : []),
  ],

  // ========================================================================
  // Shared Configuration
  // ========================================================================

  use: {
    // Base URL for relative path navigation
    baseURL,

    // Screenshots
    screenshot: 'only-on-failure',
    screenshotDir: 'test-results/screenshots',

    // Video recording
    video: isCI ? 'retain-on-failure' : 'off',
    videoDir: 'test-results/videos',

    // Trace collection
    trace: isCI ? 'on-first-retry' : 'on-failure',
    traceDir: 'test-results/traces',

    // Browser context options
    locale: 'en-US',
    timezone: 'UTC',
    geolocation: { latitude: 37.7749, longitude: -122.4194 }, // SF
    permissions: [],

    // Viewport
    viewport: { width: 1280, height: 720 },

    // HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  // ========================================================================
  // Projects (Browsers)
  // ========================================================================

  projects: [
    // Chromium (default browser for most web dev)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Chromium-specific options can go here
      },
    },

    // Firefox (Gecko rendering engine)
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Firefox-specific options can go here
      },
    },

    // WebKit (Safari engine)
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        // WebKit-specific options can go here
      },
    },

    // Optional: Mobile testing
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // ========================================================================
  // Web Server Configuration
  // ========================================================================

  webServer: {
    // Only start if --no-webserver not passed
    command: 'pnpm dev',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120 * 1000, // 2 minutes for startup
  },

  // ========================================================================
  // Global Setup / Teardown
  // ========================================================================

  // globalSetup: require.resolve('./global-setup.ts'),
  // globalTeardown: require.resolve('./global-teardown.ts'),

  // ========================================================================
  // Metadata
  // ========================================================================

  metadata: {
    project: 'holilabsv2',
    environment: isCI ? 'ci' : 'local',
    timestamp: new Date().toISOString(),
  },
});

/**
 * Global Setup (Optional)
 *
 * If you need to set up state before all tests (e.g., seed database):
 *
 * ```typescript
 * import { chromium, FullConfig } from '@playwright/test';
 *
 * async function globalSetup(config: FullConfig) {
 *   // Seed database
 *   // Create test fixtures
 *   // Clear cache
 * }
 *
 * export default globalSetup;
 * ```
 */

/**
 * Global Teardown (Optional)
 *
 * If you need cleanup after all tests:
 *
 * ```typescript
 * async function globalTeardown() {
 *   // Clean up test data
 *   // Close connections
 * }
 *
 * export default globalTeardown;
 * ```
 */

/**
 * Notes:
 *
 * 1. Base URL
 *    By default tests run against http://localhost:3000
 *    Override with: PLAYWRIGHT_TEST_BASE_URL=https://staging.example.com
 *
 * 2. Workers
 *    Local: 4 parallel workers (fast)
 *    CI: 1 worker (stable, low resource usage)
 *
 * 3. Retries
 *    Flaky tests are retried once on CI
 *    Use sparingly - fix flaky tests instead
 *
 * 4. Screenshots & Videos
 *    Captured on failure to help debug
 *    Videos only retained on CI failures (saves space)
 *
 * 5. Reporters
 *    Line: Quick console output
 *    HTML: Beautiful interactive report
 *    JSON: For CI integration
 *    JUnit: For test dashboards
 *
 * 6. Projects
 *    Each project runs tests in different browser
 *    Use --project flag to run specific browser:
 *    pnpm exec playwright test --project=chromium
 *
 * 7. Web Server
 *    Automatically starts dev server if not running
 *    Set reuseExistingServer=true for local development
 *    On CI, server is already running
 */
