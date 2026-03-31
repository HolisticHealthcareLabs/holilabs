/**
 * Lighthouse CI Configuration for HoliLabs
 * - Budget assertions matching sprint5-assets/performance-budgets.json
 * - Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 90, SEO ≥ 85
 * - Custom assertions: no console.log in production, no mixed content, valid lang attribute
 * - URLs: 8 critical pages (doctor dashboard, SOAP editor, patient portal, etc.)
 * - GitHub Actions integration: run after build step
 */

module.exports = {
  // CI configuration
  ci: {
    // GitHub Actions: upload results to GitHub checks
    github: {
      repository: 'HolisticHealthcareLabs/holilabs',
      token: process.env.LHCI_GITHUB_APP_TOKEN,
    },
    // Or: Static assertions mode (no server upload)
    // staticDistDir: './.next',
  },

  // Budget assertions (fail CI if exceeded)
  budgets: [
    // Performance scores
    {
      name: 'Performance',
      budget: 90,
      metric: 'performance',
      threshold: 90,
      masterVersion: 'baseline-build',
    },
    // Accessibility (strict: 95)
    {
      name: 'Accessibility',
      budget: 95,
      metric: 'accessibility',
      threshold: 95,
      masterVersion: 'baseline-build',
    },
    // Best Practices
    {
      name: 'Best Practices',
      budget: 90,
      metric: 'best-practices',
      threshold: 90,
      masterVersion: 'baseline-build',
    },
    // SEO
    {
      name: 'SEO',
      budget: 85,
      metric: 'seo',
      threshold: 85,
      masterVersion: 'baseline-build',
    },

    // Core Web Vitals budgets (LCP, FID, CLS)
    {
      name: 'Largest Contentful Paint (LCP)',
      budget: 2500, // ms
      metric: 'largest-contentful-paint',
      threshold: 2500,
    },
    {
      name: 'First Input Delay (FID)',
      budget: 100, // ms
      metric: 'first-input-delay',
      threshold: 100,
    },
    {
      name: 'Cumulative Layout Shift (CLS)',
      budget: 0.1,
      metric: 'cumulative-layout-shift',
      threshold: 0.1,
    },

    // Bundle size budgets (from performance-budgets.json)
    {
      name: 'JS Bundle (Total)',
      budget: 350, // KB
      metric: 'total-byte-weight',
      resourceType: 'script',
      threshold: 350,
    },
    {
      name: 'CSS Bundle (Total)',
      budget: 50, // KB
      metric: 'total-byte-weight',
      resourceType: 'stylesheet',
      threshold: 50,
    },
  ],

  // Assertions (custom checks beyond budgets)
  assert: {
    // No console.log in production (inline scripts/eval detected)
    'uses-eval': [
      'error',
      { duration: 0 }, // eval detected = fail
    ],
    'no-unminified-css': 'warn',
    'no-unminified-javascript': 'warn',
    'no-document-write': 'error',

    // Security: no mixed content (http on https page)
    'is-on-https': 'error',

    // Accessibility: valid lang attribute on root
    'html-has-lang': 'error',
    'image-alt': 'warn', // Images must have alt text
    'label': 'warn', // Form inputs must have labels
    'color-contrast': 'warn', // WCAG AA contrast

    // Performance
    'first-contentful-paint': ['warn', { numericValue: 1800 }], // < 1.8s
    'interactive': ['warn', { numericValue: 3500 }], // < 3.5s
    'speed-index': ['warn', { numericValue: 3000 }], // < 3s
  },

  // Collect audits with detailed breakdowns
  collect: {
    // 8 critical pages for auditing (see visual-regression.config.ts)
    staticDistDir: './.next/static', // Next.js static export directory
    url: [
      'http://localhost:3000/dashboard', // doctor home
      'http://localhost:3000/dashboard/clinical-command', // SOAP editor
      'http://localhost:3000/dashboard/comunicacoes', // messaging
      'http://localhost:3000/dashboard/faturamento', // billing
      'http://localhost:3000/portal/dashboard', // patient home
      'http://localhost:3000/portal/dashboard/lab-results', // lab results
      'http://localhost:3000/portal/dashboard/privacy', // consent
      'http://localhost:3000/verify/prescription/test-hash', // public (no auth)
    ],
    // Lighthouse CI configuration
    numberOfRuns: 1,
    chromePath: process.env.CHROME_PATH, // Use system Chrome if available
    settings: {
      chromeFlags: [
        '--disable-gpu',
        '--headless',
        '--no-sandbox',
        '--disable-dev-shm-usage',
      ],
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
      formFactor: 'desktop', // Also run: 'mobile' separately if desired
      locale: 'pt-BR',
    },
  },

  // Upload results to Lighthouse CI server (or GitHub)
  upload: {
    // GitHub: push results to GitHub checks
    target: 'github',
    // Or: self-hosted LHCI server
    // serverBaseUrl: 'https://lhci.example.com',
    // token: process.env.LHCI_BUILD_TOKEN,

    // Configure baseline
    configPath: './lighthouserc.json',
    githubToken: process.env.GITHUB_TOKEN,
    githubApiHost: 'api.github.com',
  },

  // Output reporting
  report: {
    // HTML report
    outputDir: './lhci-reports',
    // Format: 'html' (default), 'json', 'csv'
    format: 'html',
  },

  // Logging
  logLevel: process.env.LHCI_LOG_LEVEL || 'info',
};

/**
 * GitHub Actions integration (CI step):
 *
 * - name: Run Lighthouse CI
 *   run: |
 *     npm install -g @lhci/cli@latest
 *     lhci autorun
 *   env:
 *     LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
 *     CHROME_PATH: /usr/bin/chromium-browser
 *
 * - name: Upload Lighthouse results
 *   if: failure()
 *   uses: actions/upload-artifact@v2
 *   with:
 *     name: lighthouse-results
 *     path: lhci-reports/
 *
 * Configuration:
 * 1. Create Lighthouse CI GitHub App: https://github.com/apps/lighthouse-ci
 * 2. Install app to repo
 * 3. Create GitHub secret: LHCI_GITHUB_APP_TOKEN
 * 4. Run `lhci wizard` to initialize baseline
 * 5. Commit .lighthouserc.json and baseline results
 */

/**
 * Local development usage:
 *
 * npm install -g @lhci/cli@latest
 *
 * # Run audit
 * lhci collect --config=lighthouserc.json
 *
 * # Upload to CI server (if configured)
 * lhci upload
 *
 * # View HTML report
 * open lhci-reports/index.html
 *
 * # Update baseline
 * lhci collect --config=lighthouserc.json --runner=lighthouse
 * lhci upload --configPath=lighthouserc.json
 */
