# System Testing Strategy & Execution Guide

This document outlines the three primary layers of testing for the Holi Labs platform and provides execution runbooks for each.

## 1. Unit & Integration Testing (Jest)
We use Jest for backend logic, API route handlers, database extensions, and middleware testing.

**Coverage Target:** >70% Overall, >90% Security Layer.

### Execution Commands
All commands should be run from the `apps/web` directory:
```bash
# Run all unit tests
pnpm test

# Run tests with coverage reports
pnpm test:coverage

# Run specific test suites (e.g., security tests)
pnpm test:coverage --testPathPattern="security"
```
*Note: Make sure your `.env.test` file is configured properly before running tests that require a database connection.*

## 2. End-to-End (E2E) Testing (Playwright)
Playwright is used to simulate real user interactions, verify critical clinical workflows, and ensure the UI operates correctly across different browsers.

**Location:** `apps/web/tests/e2e/` and `apps/web/tests/smoke.spec.ts`

### Execution Commands
All commands should be run from the `apps/web` directory:
```bash
# Run all E2E tests headlessly
pnpm test:e2e

# Run E2E tests with the Playwright UI (Recommended for debugging)
pnpm test:e2e:ui

# Run tests on specific browsers
pnpm test:e2e:chrome
pnpm test:e2e:firefox
pnpm test:e2e:safari
```

### Writing New E2E Tests
When adding new workflows, create a new `.spec.ts` file in `apps/web/tests/e2e/`. Ensure you use data-test-ids (`data-testid="..."`) for resilient element selection rather than brittle CSS classes.

## 3. Load Testing (k6)
Load testing ensures the API and Database can handle concurrent user stress without degrading performance or losing data (especially audit logs).

**Location:** `scripts/load-test-api.js` (Root directory)
**Thresholds:** p95 < 500ms, p99 < 1s

### Prerequisites
1. Install k6 (macOS): `brew install k6`
2. Ensure you have a realistic staging or production-like environment database. **DO NOT run load tests against a production database containing real PHI during active hours.**

### Execution Commands
Run from the root directory (`/Users/nicolacapriroloteran/prototypes/holilabsv2/`):
```bash
# Execute the standard API load test (Ramps up to 100 VUs over 5 minutes)
k6 run scripts/load-test-api.js
```

### Analyzing Results
After the test completes, k6 will output a summary. Pay close attention to:
- `http_req_duration`: Ensure the `p(95)` value is under 500ms.
- `http_req_failed`: This should be strictly `0.00%`.
- `iterations`: The total number of requests successfully processed.
