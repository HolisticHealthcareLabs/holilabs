# Testing Scripts Quick Reference

Quick reference for testing tools and commands in holilabsv2.

## Scripts Overview

### e2e-runner.sh
Main entry point for running E2E tests with flexible options.

```bash
./scripts/e2e-runner.sh [OPTIONS]

# All tests, all browsers, headless
./scripts/e2e-runner.sh

# Auth tests only, chromium, headless
./scripts/e2e-runner.sh --suite auth --browser chromium

# Dashboard tests, all browsers, headed (show window)
./scripts/e2e-runner.sh --suite dashboard --headed

# Clinical tests, firefox, headed
./scripts/e2e-runner.sh --suite clinical --browser firefox --headed
```

**Options:**
- `--suite {all|auth|dashboard|portal|clinical|enterprise|public|a11y}` - Test suite
- `--browser {all|chromium|firefox|webkit}` - Browser engine
- `--headed` - Show browser window (default: headless)
- `--fix-and-retry` - Retry failed tests once
- `--help` - Show usage

**Output:**
- Console summary of pass/fail counts
- HTML report: `playwright-report/index.html`
- JSON results: `test-results/index.json`

### test-orchestrator.ts
Sequential test runner for CI/automation with JSON reporting.

```bash
# Run all suites sequentially, output to test-report.json
tsx scripts/test-orchestrator.ts

# Custom output path
tsx scripts/test-orchestrator.ts --json-output ./results/report.json

# Retry failed tests once
tsx scripts/test-orchestrator.ts --fix-and-retry
```

**Output:**
- JSON report with detailed stats per suite
- Console summary
- Exit code: 0 (all pass), 1 (any fail)

**Parse Results:**
```bash
jq '.succeeded' test-report.json       # true or false
jq '.totalPassed, .totalFailed' test-report.json
jq '.failedSuites[]' test-report.json  # List of failed suite names
```

## Common Commands

### Run All Tests
```bash
./scripts/e2e-runner.sh
```

### Run Smoke Test (Quick Health Check)
```bash
./scripts/e2e-runner.sh --suite public --browser chromium
```

### Run Specific Suite
```bash
./scripts/e2e-runner.sh --suite clinical
```

### Run in Headed Mode (Debug)
```bash
./scripts/e2e-runner.sh --suite auth --headed
```

### Full Orchestration (for CI)
```bash
tsx scripts/test-orchestrator.ts
```

### Run Watch Mode (Development)
```bash
pnpm exec playwright test --watch
```

### Debug a Test
```bash
pnpm exec playwright test --debug
```

### Run Specific Test Pattern
```bash
pnpm exec playwright test -g "sign-in"
```

## Test Suites

Each suite tests a specific area of functionality:

| Suite | Files | Tests |
|-------|-------|-------|
| `@public` | `public.spec.ts` | Homepage, sign-in, sign-up, docs |
| `@auth` | `auth.spec.ts` | Login, logout, signup, password reset |
| `@dashboard` | `dashboard.spec.ts` | Dashboard pages and features |
| `@portal` | `portal.spec.ts` | Patient/user portal |
| `@clinical` | `clinical.spec.ts` | Clinical decision-making (SaMD) |
| `@enterprise` | `enterprise.spec.ts` | Enterprise/admin features |
| `@a11y` | `a11y.spec.ts` | Accessibility (WCAG 2.1 AA) |

## Agent Integration

For automated agents using testing:

### Quick Health Check (< 30 seconds)
```bash
./scripts/e2e-runner.sh --suite public --browser chromium
echo $?  # 0 = passed, 1 = failed
```

### Full Test Run (5-15 minutes)
```bash
tsx scripts/test-orchestrator.ts --json-output /tmp/results.json
jq '.succeeded' /tmp/results.json  # true or false
```

### Post-Deployment Verification
```bash
#!/bin/bash
# Check if deployment is healthy

if ./scripts/e2e-runner.sh --suite public --browser chromium; then
  echo "✓ Smoke tests passed - deployment OK"
  exit 0
else
  echo "✗ Smoke tests failed - deployment problematic"
  exit 1
fi
```

## Test Fixtures & Helpers

Use helpers from `apps/web/tests/e2e/fixtures.ts`:

```typescript
import {
  test,
  login,
  logout,
  navigateTo,
  waitForElement,
  fillInput,
  assertVisible,
  TEST_USERS,
  TEST_ROUTES,
} from './fixtures';

test('user can login', async ({ page }) => {
  await login(page, TEST_USERS.doctor.email, TEST_USERS.doctor.password);
  await assertVisible(page, '[data-testid="dashboard"]');
});
```

## Reports & Artifacts

### HTML Report
```bash
# Generated after test run
open playwright-report/index.html
```

### JSON Results
```bash
# Machine-readable results
cat test-results/index.json | jq '.'

# Extract stats
jq '.stats | {passed: .expected, failed: .unexpected}' test-results/index.json
```

### Screenshots
```bash
# Smoke test screenshots
ls apps/web/tests/e2e/screenshots/smoke-test/

# Failed test screenshots
find playwright-report -name "*.png"
```

## Troubleshooting

### Dev Server Won't Start
```bash
# Kill existing process on port 3000
lsof -i :3000 | grep -v PID | awk '{print $2}' | xargs kill -9

# Or manually
pnpm dev
```

### Playwright Not Found
```bash
# Install browsers
pnpm exec playwright install --with-deps
```

### Tests Timeout
```bash
# Increase timeout in playwright.config.ts or use:
pnpm exec playwright test --timeout=60000
```

### View Debug Info
```bash
# Run with verbose logging
pnpm exec playwright test --reporter=line

# Interactive debug mode
pnpm exec playwright test --debug
```

## Environment Variables

Set in `.env` or CI system:

```bash
# Base URL for tests (default: http://localhost:3000)
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000

# Number of workers (parallel tests)
PLAYWRIGHT_TEST_WORKERS=4

# Video recording (on|off|retain-on-failure)
PLAYWRIGHT_RECORD_VIDEO=off

# Screenshots (only-on-failure|on)
PLAYWRIGHT_SCREENSHOT=only-on-failure
```

## CI/CD

### GitHub Actions Workflow
The workflow at `.github/workflows/e2e-tests.yml`:
- Runs on push to main/develop and on PRs
- Tests all 3 browsers in parallel
- Uploads artifacts
- Comments results on PRs

### Manual Trigger
```bash
gh workflow run e2e-tests.yml --ref main
```

## File Structure

```
holilabsv2/
├── scripts/
│   ├── e2e-runner.sh              # Main test runner
│   ├── test-orchestrator.ts       # Orchestrator for automation
│   └── README-TESTING.md          # This file
├── apps/web/tests/e2e/
│   ├── fixtures.ts                # Helpers & test utilities
│   ├── agent-smoke-test.spec.ts   # Quick health check
│   ├── auth.spec.ts               # Auth tests (@auth)
│   ├── dashboard.spec.ts          # Dashboard tests (@dashboard)
│   ├── portal.spec.ts             # Portal tests (@portal)
│   ├── clinical.spec.ts           # Clinical tests (@clinical)
│   ├── enterprise.spec.ts         # Enterprise tests (@enterprise)
│   ├── public.spec.ts             # Public page tests (@public)
│   ├── a11y.spec.ts               # Accessibility tests (@a11y)
│   └── screenshots/               # Captured screenshots
├── .github/workflows/
│   └── e2e-tests.yml              # GitHub Actions workflow
├── docs/
│   └── TESTING.md                 # Full testing documentation
└── playwright.config.ts            # Playwright configuration
```

## Links

- [Full Testing Documentation](../docs/TESTING.md)
- [Playwright Docs](https://playwright.dev/)
- [Test Fixtures Reference](apps/web/tests/e2e/fixtures.ts)
