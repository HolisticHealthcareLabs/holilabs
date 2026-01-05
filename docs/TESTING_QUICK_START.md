# Testing Quick Start Guide

**Date:** 2026-01-02
**Purpose:** Get all open-source testing tools running in < 1 hour
**Goal:** Accelerate beta testing readiness

---

## Prerequisites

Install required tools:

```bash
# Node.js dependencies (already installed via pnpm)
pnpm install

# Playwright browsers
pnpm exec playwright install chromium

# k6 load testing tool
brew install k6  # macOS
# or: choco install k6  # Windows
# or: docker pull grafana/k6  # Any platform

# Java (for Synthea)
brew install openjdk@11  # macOS

# Docker (for Inferno, ZAP)
# Already installed (check: docker --version)
```

---

## 1. Synthetic Patient Data Generation (Synthea)

Generate 100 realistic Brazilian patients for testing:

```bash
# Generate synthetic patients
./scripts/generate-synthea-patients.sh 100 "São Paulo"

# Output: synthea-output/fhir/*.json
# Review: cat synthea-output/GENERATION_REPORT.md

# Import to Medplum (optional)
# Set environment variables first:
export MEDPLUM_BASE_URL="https://api.medplum.com"
export MEDPLUM_TOKEN="your-medplum-token"

for file in synthea-output/fhir/*.json; do
    curl -X POST "${MEDPLUM_BASE_URL}/fhir/R4/" \
        -H "Authorization: Bearer ${MEDPLUM_TOKEN}" \
        -H "Content-Type: application/fhir+json" \
        -d @"$file"
done
```

**Time:** 5-10 minutes for 100 patients
**Output:** FHIR R4 JSON bundles
**Use For:** E2E testing, load testing, demo environment

---

## 2. FHIR Conformance Testing (Inferno)

Test FHIR API compliance with 2,000+ automated tests:

```bash
# Start testing infrastructure
docker-compose -f docker-compose.yml -f docker-compose.testing.yml up -d inferno

# Open Inferno web UI
open http://localhost:4567

# In Inferno UI:
# 1. Select "FHIR R4" test suite
# 2. Enter FHIR endpoint: http://host.docker.internal:3000/api/fhir/r4
# 3. Click "Run Tests"

# Stop when done
docker-compose -f docker-compose.testing.yml down inferno
```

**Time:** 30-60 minutes (automated)
**Output:** FHIR conformance report
**Use For:** LGPD compliance verification, Medplum integration validation

---

## 3. Security Vulnerability Scanning (OWASP ZAP)

Automated DAST for REST APIs:

```bash
# Start ZAP
docker-compose -f docker-compose.yml -f docker-compose.testing.yml up -d zap

# Open ZAP web UI
open http://localhost:8080

# Automated baseline scan via CLI
docker run --rm -v $(pwd):/zap/wrk:rw \
    ghcr.io/zaproxy/zaproxy:stable \
    zap-baseline.py \
    -t http://host.docker.internal:3000/api \
    -r zap-report.html

# View report
open zap-report.html

# Stop when done
docker-compose -f docker-compose.testing.yml down zap
```

**Time:** 30-60 minutes (automated)
**Output:** Security vulnerabilities report (HTML)
**Use For:** LGPD Art. 46 security audit compliance

**Priority Findings to Fix:**
- HIGH: SQL injection, XSS, authentication bypass
- MEDIUM: CSRF, insecure headers, information disclosure
- LOW: Informational only

---

## 4. End-to-End Testing (Playwright)

Test clinical workflows in real browsers:

```bash
# Install Playwright (if not already installed)
pnpm exec playwright install chromium firefox webkit

# Run all E2E tests (headless)
pnpm exec playwright test

# Run with UI (watch tests execute)
pnpm exec playwright test --headed

# Run specific test file
pnpm exec playwright test tests/e2e/01-patient-registration.spec.ts

# Run in debug mode (step through tests)
pnpm exec playwright test --debug

# Run with trace (record execution)
pnpm exec playwright test --trace on

# View test report
pnpm exec playwright show-report
```

**Available Tests:**
- `01-patient-registration.spec.ts` - Patient CRUD operations
- `02-prescription-creation.spec.ts` - Prescription workflow

**Time:** 5-10 minutes per test suite
**Output:** HTML report with screenshots/videos
**Use For:** Catching UI/UX bugs before beta users test

---

## 5. API Load Testing (k6)

Verify system handles 100 concurrent users:

```bash
# Run baseline API load test
k6 run tests/load/api-baseline.js

# Run with custom environment
BASE_URL=https://staging.holilabs.xyz \
API_TOKEN=your-staging-token \
k6 run tests/load/api-baseline.js

# Run prescription creation load test
k6 run tests/load/prescription-load.js

# Export metrics to Prometheus (Grafana visualization)
k6 run --out experimental-prometheus-rw tests/load/api-baseline.js

# View results in Grafana
open http://localhost:3001  # Grafana dashboard

# Run from Docker (alternative)
docker run --rm -v $(pwd)/tests/load:/scripts grafana/k6:latest \
    run /scripts/api-baseline.js
```

**Time:** 7-10 minutes per test
**Output:** Performance metrics, pass/fail thresholds
**Use For:** Verifying production readiness

**Target Metrics (from production plan):**
- ✅ p95 response time < 300ms
- ✅ Error rate < 1%
- ✅ 100 concurrent users

---

## 6. Integration Test Suite (Jest)

Run all unit and integration tests:

```bash
# Run all tests with coverage
pnpm test

# Run specific test file
pnpm test src/lib/__tests__/audit.test.ts

# Run in watch mode (re-run on file changes)
pnpm test --watch

# Generate coverage report
pnpm test --coverage

# View coverage report
open coverage/lcov-report/index.html
```

**Coverage Targets:**
- Overall: 70%+
- Security layer: 90%+
- Audit logging: 100%

---

## All-In-One Testing Script

Run all tests in sequence:

```bash
#!/bin/bash
# Run all testing infrastructure

set -e

echo "🧪 HOLI LABS - COMPREHENSIVE TESTING SUITE"
echo ""

# 1. Generate synthetic data
echo "1/5: Generating synthetic patients..."
./scripts/generate-synthea-patients.sh 50 "São Paulo"

# 2. Start testing infrastructure
echo "2/5: Starting testing infrastructure..."
docker-compose -f docker-compose.yml -f docker-compose.testing.yml up -d

# 3. Run unit/integration tests
echo "3/5: Running unit and integration tests..."
pnpm test --coverage

# 4. Run E2E tests
echo "4/5: Running E2E tests..."
pnpm exec playwright test

# 5. Run load tests
echo "5/5: Running load tests..."
k6 run tests/load/api-baseline.js

echo ""
echo "✅ ALL TESTS COMPLETE"
echo ""
echo "Reports:"
echo "  - Test coverage: coverage/lcov-report/index.html"
echo "  - E2E report: playwright-report/index.html"
echo "  - Load test: load-test-summary.json"
echo "  - Synthea data: synthea-output/GENERATION_REPORT.md"
echo ""
echo "Next: Review reports and fix any failing tests"
```

Save as `scripts/run-all-tests.sh` and make executable:

```bash
chmod +x scripts/run-all-tests.sh
./scripts/run-all-tests.sh
```

---

## CI/CD Integration

Add to `.github/workflows/test.yml`:

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Run unit tests
        run: pnpm test --coverage

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps chromium

      - name: Run E2E tests
        run: pnpm exec playwright test

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: |
            coverage/
            playwright-report/

  load-test:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz -L | tar xvz
          sudo mv k6-v0.48.0-linux-amd64/k6 /usr/bin/

      - name: Run load tests
        run: k6 run tests/load/api-baseline.js
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
          API_TOKEN: ${{ secrets.STAGING_API_TOKEN }}

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: ZAP baseline scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: ${{ secrets.STAGING_URL }}
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
```

---

## Troubleshooting

### Synthea fails with Java error
```bash
# Check Java version (needs 11+)
java -version

# Install Java 11+
brew install openjdk@11
export JAVA_HOME=$(/usr/libexec/java_home -v 11)
```

### Playwright browsers not installed
```bash
# Install all browsers
pnpm exec playwright install

# Or specific browser
pnpm exec playwright install chromium
```

### k6 not found
```bash
# macOS
brew install k6

# Or use Docker
alias k6='docker run --rm -v $(pwd):/app -w /app grafana/k6:latest'
```

### Docker services fail to start
```bash
# Check Docker is running
docker ps

# Restart Docker Desktop

# Check port conflicts
lsof -i :4567  # Inferno
lsof -i :8080  # ZAP
```

### E2E tests fail with "connection refused"
```bash
# Start development server first
pnpm dev

# In another terminal, run tests
pnpm exec playwright test
```

---

## Next Steps

1. ✅ **Run all tests once** to establish baseline
2. ✅ **Fix HIGH/CRITICAL security issues** from ZAP scan
3. ✅ **Achieve 70%+ test coverage** (run `pnpm test --coverage`)
4. ✅ **Add E2E tests for remaining workflows** (appointments, clinical notes)
5. ✅ **Set up weekly automated testing** (GitHub Actions schedule)
6. ✅ **Document test data** (Synthea patient scenarios)
7. ✅ **Train team** on testing tools (1-hour session)

---

## Performance Benchmarks

| Test Type | Duration | Frequency | Owner |
|-----------|----------|-----------|-------|
| Unit Tests | 2 min | Every commit | Developer |
| E2E Tests | 10 min | Every PR | QA |
| Load Tests | 7 min | Weekly | DevOps |
| Security Scan | 30 min | Weekly | Security |
| FHIR Conformance | 60 min | Monthly | Compliance |

---

## Questions?

- **Inferno:** https://github.com/inferno-framework
- **OWASP ZAP:** https://www.zaproxy.org/docs/
- **Playwright:** https://playwright.dev/docs/intro
- **k6:** https://k6.io/docs/
- **Synthea:** https://github.com/synthetichealth/synthea/wiki

---

**Last Updated:** 2026-01-02
**Next Review:** After 1-week testing sprint
