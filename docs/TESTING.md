# Testing Guide - holilabsv2

Comprehensive guide to automated testing, E2E workflows, and agent-based test orchestration for holilabsv2.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Running Tests Locally](#running-tests-locally)
4. [Test Structure & Tags](#test-structure--tags)
5. [Test Orchestration](#test-orchestration)
6. [Smoke Tests (Agent Health Checks)](#smoke-tests-agent-health-checks)
7. [CI/CD Integration](#cicd-integration)
8. [Agent-Based Testing](#agent-based-testing)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Overview

holilabsv2 uses **Playwright** for automated end-to-end testing. The testing infrastructure supports:

- **Multiple Suites**: auth, dashboard, portal, clinical, enterprise, public, a11y
- **Cross-Browser Testing**: chromium, firefox, webkit
- **Automated Orchestration**: Sequential test execution with JSON reporting
- **Agent Integration**: Quick smoke tests for autonomous verification
- **CI/CD Pipeline**: GitHub Actions with artifact uploads and PR comments

### Key Files

| File | Purpose |
|------|---------|
| `scripts/e2e-runner.sh` | Main test execution script with options |
| `scripts/test-orchestrator.ts` | Sequential suite executor for CI/automation |
| `apps/web/tests/e2e/agent-smoke-test.spec.ts` | Quick health check for agents |
| `.github/workflows/e2e-tests.yml` | GitHub Actions CI pipeline |
| `apps/web/tests/e2e/**/*.spec.ts` | Test specifications |
| `playwright.config.ts` | Playwright configuration |

---

## Quick Start

### Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- Playwright browsers installed (automatic on first run)

### Run All Tests

```bash
# Install dependencies (if not done)
pnpm install

# Run all E2E tests (headless, all browsers)
./scripts/e2e-runner.sh

# Run all tests in headed mode (see browser)
./scripts/e2e-runner.sh --headed
```

### Run Specific Suite

```bash
# Auth tests only
./scripts/e2e-runner.sh --suite auth

# Dashboard tests on chromium
./scripts/e2e-runner.sh --suite dashboard --browser chromium

# Clinical tests on firefox in headed mode
./scripts/e2e-runner.sh --suite clinical --browser firefox --headed
```

---

## Running Tests Locally

### Using e2e-runner.sh

The primary interface for running tests is `scripts/e2e-runner.sh`:

```bash
./scripts/e2e-runner.sh [OPTIONS]

Options:
  --suite SUITE              Test suite: all, auth, dashboard, portal, clinical, enterprise, public, a11y
  --browser BROWSER          Browser: all, chromium, firefox, webkit
  --headed                   Show browser window (default: headless)
  --fix-and-retry            Retry failed tests once
  --help                     Show usage information
```

#### Examples

```bash
# All tests on all browsers (typical local run)
./scripts/e2e-runner.sh

# Single suite on single browser
./scripts/e2e-runner.sh --suite auth --browser chromium

# Watch mode for development
pnpm exec playwright test --watch

# Run tests matching a pattern
pnpm exec playwright test -g "sign-in"

# Debug a specific test
pnpm exec playwright test --debug apps/web/tests/e2e/auth.spec.ts
```

### Test Output

The runner provides:

1. **Console Summary**: Pass/fail counts per suite
2. **HTML Report**: `playwright-report/index.html`
3. **JSON Results**: `test-results/index.json` (for automation)
4. **Screenshots**: Captured on failure or per test

### View Reports

```bash
# Open HTML report in browser
open playwright-report/index.html

# Or examine JSON directly
cat test-results/index.json | jq '.stats'
```

---

## Test Structure & Tags

### Test Organization

Tests are organized by feature area with corresponding tags:

```typescript
test.describe('@auth Authentication Tests', () => {
  test('should sign in successfully', async ({ page }) => {
    // Test implementation
  });

  test('should reject invalid credentials', async ({ page }) => {
    // Test implementation
  });
});
```

### Test Tags

Use `@tag` prefix in test names to group tests:

| Tag | Suite | Purpose |
|-----|-------|---------|
| `@public` | public | Public pages (homepage, sign-in, sign-up, documentation) |
| `@auth` | auth | Authentication (login, signup, logout, password reset) |
| `@dashboard` | dashboard | Dashboard functionality |
| `@portal` | portal | Patient/user portal features |
| `@clinical` | clinical | Clinical decision-making features (SaMD-related) |
| `@enterprise` | enterprise | Enterprise/admin features |
| `@a11y` | a11y | Accessibility compliance (WCAG 2.1 AA) |

### Writing Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('@feature My Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should perform action', async ({ page }) => {
    // Arrange
    const button = page.locator('button[data-testid="action"]');

    // Act
    await button.click();

    // Assert
    const result = page.locator('[data-testid="result"]');
    await expect(result).toBeVisible();
  });
});
```

---

## Test Orchestration

### Using test-orchestrator.ts

For CI/CD or agent-based automation, use the TypeScript orchestrator:

```bash
# Run all suites sequentially, generate JSON report
tsx scripts/test-orchestrator.ts

# Custom output path
tsx scripts/test-orchestrator.ts --json-output ./results/report.json

# Retry failed tests
tsx scripts/test-orchestrator.ts --fix-and-retry
```

### Orchestrator Report

The JSON report includes:

```json
{
  "timestamp": "2026-04-03T10:15:30.000Z",
  "totalSuites": 7,
  "passedSuites": 6,
  "failedSuites": 1,
  "totalTests": 150,
  "totalPassed": 145,
  "totalFailed": 5,
  "totalSkipped": 0,
  "totalDuration": 125000,
  "succeeded": false,
  "failedSuites": ["clinical"],
  "suites": [
    {
      "name": "auth",
      "passed": 25,
      "failed": 0,
      "skipped": 0,
      "duration": 15000,
      "succeeded": true,
      "failures": [],
      "timestamp": "2026-04-03T10:15:30.000Z"
    }
  ]
}
```

### Parsing Results (for Agents)

```bash
# Get pass/fail counts
jq '.totalPassed, .totalFailed' test-report.json

# Get failed suites
jq '.failedSuites[]' test-report.json

# Check overall status
jq '.succeeded' test-report.json  # true or false
```

---

## Smoke Tests (Agent Health Checks)

### Purpose

The smoke test (`agent-smoke-test.spec.ts`) is a quick health check agents can run to verify:

- Homepage loads without errors
- Sign-in page renders
- Critical routes are accessible
- No network 500 errors
- No JavaScript crashes

### Run Smoke Tests

```bash
# Quick smoke test only
./scripts/e2e-runner.sh --suite public

# Or directly
pnpm exec playwright test agent-smoke-test.spec.ts

# With screenshots
pnpm exec playwright test agent-smoke-test.spec.ts --headed
```

### What It Checks

1. **Homepage Loading**: Verifies root route responds and renders
2. **Sign-In Form**: Confirms auth UI is present and accessible
3. **Route Accessibility**: Checks 7 critical routes for 500 errors
4. **Network Stability**: Monitors for failed resource requests
5. **JS Stability**: Ensures no unhandled JavaScript errors
6. **Screenshots**: Captures state at each step for debugging

### Expected Output

```
✓ should load homepage without errors
✓ should render sign-in page with form
✓ should be accessible on all critical routes
✓ should handle network requests without crashing
✓ should have no 404 errors in initial load
✓ should verify JS bundle loads without errors

6 passed (4s)
```

---

## CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/e2e-tests.yml` workflow:

- **Triggers**: On push to main/develop and PRs
- **Strategy**: Runs tests on all 3 browsers in parallel
- **Artifacts**: Uploads HTML reports and JSON results
- **Reporting**: Comments on PRs with summary

### Workflow Steps

1. Checkout code
2. Setup Node.js (20.x)
3. Install pnpm and dependencies
4. Cache Playwright browsers
5. Start dev server
6. Run E2E tests (by browser)
7. Run smoke tests
8. Upload artifacts
9. Comment results on PR

### View CI Results

1. Push a PR to the repository
2. GitHub Actions tab shows workflow status
3. Artifacts link provides test reports
4. PR comments show summary of results

### Manual Trigger

```bash
# Trigger workflow manually via GitHub CLI
gh workflow run e2e-tests.yml --ref main
```

---

## Agent-Based Testing

### For Autonomous Agents

Agents can use the testing infrastructure to verify functionality:

#### 1. Quick Health Check (< 30 seconds)

```bash
# Run smoke test to verify system is responsive
./scripts/e2e-runner.sh --suite public --browser chromium

# Check exit code
echo $?  # 0 = all passed, non-zero = failed
```

#### 2. Full Test Suite (5-15 minutes)

```bash
# Run complete test orchestration, get JSON results
tsx scripts/test-orchestrator.ts --json-output /tmp/results.json

# Parse results
cat /tmp/results.json | jq '.succeeded'
```

#### 3. Specific Feature Testing

```bash
# Test specific suite (e.g., after code changes)
./scripts/e2e-runner.sh --suite clinical --browser chromium

# Parse pass/fail
./scripts/e2e-runner.sh --suite dashboard | grep -E "✓|✗"
```

### Integration Example

```bash
#!/bin/bash
# Agent workflow: Deploy → Test → Report

# Deploy
npm run deploy

# Wait for deployment
sleep 10

# Run smoke test
if ! ./scripts/e2e-runner.sh --suite public --browser chromium; then
  echo "DEPLOYMENT FAILED: Smoke tests did not pass"
  exit 1
fi

# Run full test suite
tsx scripts/test-orchestrator.ts --json-output /tmp/report.json

# Report results
PASSED=$(jq '.totalPassed' /tmp/report.json)
FAILED=$(jq '.totalFailed' /tmp/report.json)

echo "Test Results: $PASSED passed, $FAILED failed"
if jq '.succeeded' /tmp/report.json | grep -q true; then
  echo "✓ All tests passed - deployment successful"
else
  echo "✗ Tests failed - rolling back deployment"
  npm run rollback
  exit 1
fi
```

---

## Troubleshooting

### Common Issues

#### 1. Dev Server Won't Start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill existing process
kill -9 <PID>

# Start fresh
pnpm dev
```

#### 2. Playwright Browsers Not Found

```bash
# Reinstall Playwright with browsers
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps
```

#### 3. Tests Timeout

```bash
# Increase timeout for slow machines
pnpm exec playwright test --timeout=60000

# Or in playwright.config.ts:
timeout: 60000
```

#### 4. Network Errors in CI

```bash
# Ensure environment variables are set
cat .env.example > .env.test

# Install Playwright dependencies
pnpm exec playwright install-deps
```

#### 5. Screenshots Not Captured

```bash
# Verify output directory exists
mkdir -p apps/web/tests/e2e/screenshots

# Run with verbose logging
pnpm exec playwright test --debug
```

### Debug a Failing Test

```bash
# Run in debug mode (opens Playwright Inspector)
pnpm exec playwright test --debug

# Run in headed mode with verbose output
pnpm exec playwright test --headed --reporter=line

# Test specific file
pnpm exec playwright test apps/web/tests/e2e/auth.spec.ts

# Test with pattern
pnpm exec playwright test -g "sign-in"
```

---

## Best Practices

### Writing Tests

1. **Use Data Attributes**
   ```typescript
   // Good: Stable selector
   const button = page.locator('[data-testid="submit-button"]');

   // Avoid: Fragile selectors
   const button = page.locator('button.btn.btn-primary:nth-child(3)');
   ```

2. **Wait for Elements**
   ```typescript
   // Good: Wait for element
   await expect(element).toBeVisible();

   // Avoid: Arbitrary sleeps
   await page.waitForTimeout(2000);
   ```

3. **Test User Workflows**
   ```typescript
   // Good: End-to-end user journey
   test('user can sign up and view dashboard', async ({ page }) => {
     await page.goto('/sign-up');
     // Fill form
     // Submit
     // Verify redirect to dashboard
   });
   ```

4. **Tag All Tests**
   ```typescript
   test.describe('@feature Feature Name', () => {
     // All tests in this suite tagged with @feature
   });
   ```

### Maintaining Tests

1. **Use Roles for Reusable Setup**
   ```typescript
   test.use({ storageState: 'auth-state.json' });
   // Tests start authenticated
   ```

2. **Capture Failures**
   ```typescript
   test.afterEach(async ({ page }, testInfo) => {
     if (testInfo.status !== 'passed') {
       await page.screenshot({
         path: `test-results/failure-${Date.now()}.png`,
       });
     }
   });
   ```

3. **Test Isolation**
   - Each test should be independent
   - Clean up after each test
   - Don't rely on test execution order

### Performance

1. **Parallel Execution**
   ```bash
   # Run tests in parallel (by default)
   pnpm exec playwright test --workers=4
   ```

2. **Selective Testing in CI**
   - Run smoke tests on every PR
   - Run full suite only on main branch
   - Use `--grep` to filter by tags

3. **Browser Caching**
   - GitHub Actions caches Playwright browsers
   - First run may take 2-3 minutes
   - Subsequent runs are faster

---

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review test logs in `test-results/` and `playwright-report/`
3. Open an issue in the repository
4. Contact the team at dev@holilabs.xyz
