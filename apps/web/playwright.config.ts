import { defineConfig, devices } from '@playwright/test';

/**
 * Cross-Browser Testing Configuration
 *
 * Tests critical user flows across Chrome, Firefox, Safari (WebKit), and mobile browsers
 */

export default defineConfig({
  testDir: './tests/e2e',

  // Test artifacts
  outputDir: './tests/results',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI for stability
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],

  // Shared settings for all tests
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Maximum time for each action
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Configure projects for major browsers
  projects: [
    // Desktop Browsers
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

    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Mobile Browsers - iOS
    {
      name: 'mobile-safari-iphone',
      use: {
        ...devices['iPhone 14 Pro'],
      },
    },

    {
      name: 'mobile-safari-ipad',
      use: {
        ...devices['iPad Pro'],
      },
    },

    // Mobile Browsers - Android
    {
      name: 'mobile-chrome-android',
      use: {
        ...devices['Pixel 5'],
      },
    },

    {
      name: 'mobile-chrome-tablet',
      use: {
        ...devices['Galaxy Tab S4'],
      },
    },

    // Tablet Browsers
    {
      name: 'tablet-safari',
      use: {
        ...devices['iPad (gen 7)'],
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
  },

  // Global timeout
  timeout: 60 * 1000, // 60 seconds per test

  // Expect timeout
  expect: {
    timeout: 10000,
  },
});
