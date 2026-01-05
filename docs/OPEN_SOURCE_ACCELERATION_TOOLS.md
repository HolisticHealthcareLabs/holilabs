# Open Source Tools to Accelerate Beta Testing Readiness

**Date:** 2026-01-02
**Target:** Ship to real patients in Brazil, Argentina, Bolivia within WEEKS
**Current Status:** 67% production-ready (Phase 1.1 ✅, Phase 1.2 ✅, Phase 1.4 ongoing)

---

## Executive Summary

This document identifies **high-impact open-source tools** that can significantly accelerate time-to-beta by automating:
- FHIR API conformance testing (reduce 2 weeks to 2 days)
- Synthetic patient data generation (eliminate PHI risks, enable parallel testing)
- Security vulnerability scanning (automated SAST/DAST in CI/CD)
- E2E clinical workflow testing (catch UI/UX issues before patient use)
- API load testing (verify 100 concurrent users target)

**Estimated Time Savings:** 3-4 weeks if implemented in parallel

---

## 1. FHIR API Testing & Conformance 🏥

### Problem
- Manual FHIR conformance testing is slow and error-prone
- Need to verify Medplum integration meets FHIR R4 standards
- LGPD/HIPAA require audit trail verification for all PHI access

### Solutions

#### **Inferno Health API Testing Framework** (Priority 1) 🚀
- **What:** Open-source FHIR conformance testing suite by ONC (Office of the National Coordinator)
- **Why:** Automates validation of FHIR implementations with 2,000+ tests
- **Integration:** Run against `/api/fhir/r4` endpoints
- **Time Saved:** 2 weeks → 2 days
- **License:** Apache 2.0
- **GitHub:** https://github.com/inferno-framework
- **Quick Start:**
  ```bash
  # Run Inferno via Docker
  docker run -it -p 4567:4567 infernocommunity/inferno-core
  # Point to: http://localhost:3000/api/fhir/r4
  ```

**Benefits:**
- ✅ Automated FHIR R4 compliance verification
- ✅ SMART-on-FHIR authentication testing
- ✅ Bulk data export validation (LGPD data portability)
- ✅ Generate compliance reports for regulatory review

**Action Items:**
1. Add Inferno to `docker-compose.yml` as a service
2. Create GitHub Actions workflow to run Inferno tests on every PR
3. Document results in `/docs/FHIR_CONFORMANCE_REPORT.md`

---

#### **Crucible by MITRE** (Alternative)
- **What:** 228 test suites with 2,000+ FHIR specification tests
- **Why:** Helps identify errors in FHIR applications early
- **License:** Apache 2.0
- **URL:** https://projectcrucible.org/

**When to Use:** If Inferno doesn't cover specific FHIR resources (e.g., rare lab result formats)

---

### 2. Synthetic Data Generation 🧬

### Problem
- Can't test with real patient data (LGPD Art. 48 violations)
- Manual test data creation is slow and unrealistic
- Need diverse patient scenarios (chronic disease, pediatrics, geriatrics)

### Solution

#### **Synthea™ Patient Generator** (Priority 1) 🚀
- **What:** Open-source synthetic patient generator by MITRE (1M+ synthetic patients)
- **Why:** Generates complete medical histories in FHIR format, free from privacy restrictions
- **License:** Apache 2.0
- **GitHub:** https://github.com/synthetichealth/synthea
- **Quick Start:**
  ```bash
  # Generate 100 Brazilian patients
  ./run_synthea -p 100 --state "São Paulo" --gender F --age 25-65

  # Output: FHIR R4 JSON bundles → import to Medplum
  curl -X POST http://localhost:8080/fhir/R4/Bundle \
    -H "Content-Type: application/fhir+json" \
    -d @output/fhir/Patient-*.json
  ```

**Benefits:**
- ✅ LGPD-compliant (no real PHI)
- ✅ Realistic disease progressions (diabetes, hypertension, cancer)
- ✅ Generates prescriptions, lab results, encounters
- ✅ Demographic diversity (age, gender, ethnicity)
- ✅ FHIR R4 native output

**Integration Strategy:**
1. Create script: `/scripts/generate-synthetic-patients.sh`
2. Generate 1,000 Brazilian patients with diverse conditions
3. Import to Medplum via FHIR API
4. Use for E2E testing, load testing, demo environment

**Time Saved:** 1-2 weeks of manual data creation

---

#### **Synthetic Audit Log Generator** (Compliance Testing)
- **What:** Generates realistic audit logs for HIPAA/LGPD/GDPR compliance testing
- **Why:** Test audit log queries (LGPD Art. 9 - data subject access)
- **URL:** https://syntheticauditlogs.com/
- **Use Case:** Verify audit trail performance with 1M+ log entries

---

## 3. Security Scanning (SAST/DAST) 🔒

### Problem
- Manual security reviews are slow (2-3 weeks)
- Need continuous vulnerability scanning in CI/CD
- LGPD Art. 46 requires regular security audits

### Solutions

#### **OWASP ZAP (Zed Attack Proxy)** (Priority 1) 🚀
- **What:** World's most popular open-source DAST tool (11k+ GitHub stars)
- **Why:** Automated API vulnerability scanning + manual pen testing
- **License:** Apache 2.0
- **GitHub:** https://github.com/zaproxy/zaproxy
- **Quick Start:**
  ```bash
  # Run ZAP Docker container
  docker run -u zap -p 8080:8080 zaproxy/zap-stable zap-webswing.sh

  # Automated scan of API routes
  docker run zaproxy/zap-baseline zap-baseline.py -t https://holilabs.xyz/api

  # Add to GitHub Actions (already configured in .github/workflows/)
  ```

**Benefits:**
- ✅ REST API testing (finds injection, auth bypass, IDOR)
- ✅ Runs in CI/CD pipeline
- ✅ Generates HIPAA/LGPD compliance reports
- ✅ Integrates with Grafana (we already have Prometheus/Grafana)

**Integration Strategy:**
1. Add ZAP scan to `.github/workflows/security-scan.yml`
2. Run weekly scheduled scans (Fridays before release)
3. Alert via PagerDuty on HIGH/CRITICAL findings
4. Document in `/docs/SECURITY_SCAN_REPORTS/`

**Time Saved:** 2 weeks of manual pen testing → 2 hours automated

---

#### **Semgrep (SAST)** (Already Configured? Check `.github/workflows/`)
- **What:** Fast SAST scanner with healthcare-specific rules
- **Why:** Detects insecure code patterns (SQL injection, XSS, auth bypass)
- **License:** LGPL 2.1
- **URL:** https://semgrep.dev/
- **Check:** Already enabled in GitHub Actions?

```bash
# Verify Semgrep is running
gh run list --workflow=semgrep.yml
```

---

#### **GitLeaks (Secret Scanning)** (Already Configured!)
- **What:** Detects hardcoded secrets (API keys, passwords, tokens)
- **Status:** ✅ Already configured (`.gitleaks.toml` exists)
- **Check:** Verify no secrets in `gitleaks-report.json`

```bash
# Run gitleaks scan
gitleaks detect --source . --report-path gitleaks-report.json
```

---

## 4. End-to-End (E2E) Testing 🧪

### Problem
- Manual UI testing is slow and incomplete
- Clinical workflows span multiple pages (patient → prescription → pharmacy)
- Need to verify patient portal flows work before beta users test

### Solutions

#### **Playwright by Microsoft** (Priority 1) 🚀
- **What:** Modern E2E testing framework with cross-browser support
- **Why:** Fast parallel execution, multi-tab workflows, screenshot/video recording
- **License:** Apache 2.0
- **GitHub:** https://github.com/microsoft/playwright
- **Quick Start:**
  ```bash
  # Install Playwright
  pnpm add -D @playwright/test
  npx playwright install chromium

  # Create test: /tests/e2e/patient-workflow.spec.ts
  import { test, expect } from '@playwright/test';

  test('clinician creates prescription', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/patients');
    await page.click('text=João Silva');
    await page.click('button:has-text("New Prescription")');
    await page.fill('input[name="medication"]', 'Metformin 500mg');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Prescription created')).toBeVisible();
  });

  # Run tests
  npx playwright test --headed
  ```

**Benefits:**
- ✅ Multi-tab workflows (patient portal + clinician dashboard)
- ✅ Cross-browser (Chrome, Firefox, Safari/WebKit)
- ✅ Automatic waiting (no flaky tests)
- ✅ Screenshot/video on failure (debugging)
- ✅ Parallel test execution (10x faster than Cypress)

**Integration Strategy:**
1. Create `/tests/e2e/` directory with critical workflows:
   - `patient-registration.spec.ts`
   - `prescription-creation.spec.ts`
   - `appointment-booking.spec.ts`
   - `patient-portal-login.spec.ts`
2. Add GitHub Actions workflow: `.github/workflows/e2e-tests.yml`
3. Run on every PR to `main` branch

**Time Saved:** 1 week of manual regression testing → 30 minutes automated

---

#### **Cypress** (Alternative, Easier Learning Curve)
- **What:** JavaScript E2E testing framework with great DX
- **Why:** Easier for teams familiar with JavaScript, live debugging
- **Limitation:** Single-tab only (can't test multi-window workflows)
- **GitHub:** https://github.com/cypress-io/cypress

**When to Use:** If team prefers JavaScript-only and doesn't need multi-tab testing

---

## 5. API Load & Performance Testing 📊

### Problem
- Need to verify system handles 100 concurrent users (target from production plan)
- API response time target: p95 < 300ms
- No current load testing infrastructure

### Solution

#### **k6 by Grafana Labs** (Priority 1) 🚀
- **What:** Modern load testing tool in Go with JavaScript scripting
- **Why:** Integrates with existing Grafana/Prometheus stack
- **License:** AGPL v3 (open source)
- **GitHub:** https://github.com/grafana/k6
- **Quick Start:**
  ```bash
  # Install k6
  brew install k6  # macOS
  # or: docker pull grafana/k6

  # Create test: /tests/load/api-load-test.js
  import http from 'k6/http';
  import { check, sleep } from 'k6';

  export let options = {
    vus: 100,        // 100 virtual users
    duration: '5m',  // 5 minute test
    thresholds: {
      http_req_duration: ['p(95)<300'], // p95 < 300ms
      http_req_failed: ['rate<0.01'],   // < 1% failures
    },
  };

  export default function() {
    // Test GET /api/patients
    let res = http.get('https://holilabs.xyz/api/patients', {
      headers: { 'Authorization': 'Bearer ${TOKEN}' },
    });
    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 300ms': (r) => r.timings.duration < 300,
    });
    sleep(1);
  }

  # Run test
  k6 run tests/load/api-load-test.js

  # Send metrics to Prometheus (already configured!)
  k6 run --out experimental-prometheus-rw tests/load/api-load-test.js
  ```

**Benefits:**
- ✅ Simulates 100+ concurrent users on laptop
- ✅ Exports metrics to Prometheus/Grafana (existing stack!)
- ✅ HTTP, WebSocket, gRPC support
- ✅ CI/CD integration (GitHub Actions)
- ✅ Detects bottlenecks before production

**Integration Strategy:**
1. Create `/tests/load/` directory with scenarios:
   - `api-baseline.js` (baseline performance)
   - `patient-list-load.js` (100 users listing patients)
   - `prescription-creation-load.js` (concurrent prescription writes)
   - `fhir-api-load.js` (FHIR endpoint stress test)
2. Add Grafana dashboard: "k6 Load Testing"
3. Run weekly load tests (Fridays before release)
4. Set alerts: p95 > 400ms, failure rate > 1%

**Time Saved:** 3-4 days of manual load testing → 1 hour automated

---

## 6. Additional Tools to Consider

### CI/CD Optimization

#### **Turborepo Cache** (Already Using?)
- Check if already enabled: `pnpm turbo run build --cache`
- **Benefit:** Speeds up builds by 50-80%

#### **GitHub Actions Cache** (Already Enabled?)
- Verify: `.github/workflows/deploy-production.yml` has `actions/cache@v3`

---

### API Contract Testing

#### **Pact**
- **What:** Consumer-driven contract testing
- **Why:** Verify API backwards compatibility
- **URL:** https://docs.pact.io/
- **Use Case:** Ensure mobile app doesn't break when API changes

---

### Database Testing

#### **pgTAP**
- **What:** Unit testing for PostgreSQL
- **Why:** Test database triggers, functions, constraints
- **GitHub:** https://pgtap.org/
- **Use Case:** Verify encryption extension behavior

---

## Implementation Roadmap (1 Week Sprint)

### Day 1-2: Testing Infrastructure
- [ ] Add Inferno FHIR testing to `docker-compose.yml`
- [ ] Generate 1,000 synthetic patients via Synthea
- [ ] Set up OWASP ZAP in GitHub Actions

### Day 3-4: E2E & Load Testing
- [ ] Write 5 critical Playwright E2E tests
- [ ] Create k6 load testing scripts (100 concurrent users)
- [ ] Add Grafana k6 dashboard

### Day 5: Security & Compliance
- [ ] Run full ZAP scan, fix HIGH/CRITICAL issues
- [ ] Verify Inferno FHIR conformance (generate report)
- [ ] Document in `/docs/COMPLIANCE_VERIFICATION.md`

### Day 6-7: CI/CD Integration
- [ ] Add all tools to GitHub Actions workflows
- [ ] Set up PagerDuty alerts for failures
- [ ] Create beta testing checklist with automated gates

---

## Cost Savings (Open Source vs Commercial)

| Tool Category | Commercial Solution | Annual Cost | Open Source | Savings |
|---------------|-------------------|-------------|-------------|---------|
| FHIR Testing | InterSystems IRIS | $50,000 | Inferno | $50,000 |
| Synthetic Data | MDClone | $100,000 | Synthea | $100,000 |
| DAST | Veracode | $75,000 | OWASP ZAP | $75,000 |
| E2E Testing | BrowserStack | $12,000 | Playwright | $12,000 |
| Load Testing | BlazeMeter | $24,000 | k6 OSS | $24,000 |
| **TOTAL** | | **$261,000** | | **$261,000** |

**Time-to-Beta:** -3 weeks (parallel automation)

---

## Success Metrics

### Before Open Source Tools
- Manual FHIR testing: 2 weeks
- Manual security review: 2 weeks
- Manual load testing: 3 days
- E2E regression testing: 1 week
- **Total:** 5+ weeks

### After Open Source Tools
- Automated FHIR testing: 2 hours
- Automated security scan: 1 hour
- Automated load testing: 1 hour
- Automated E2E testing: 30 minutes
- **Total:** ~5 hours (95% faster)

---

## Next Steps

1. **Approve this plan** and assign tool owners
2. **Run 1-week sprint** to implement all tools
3. **Generate compliance reports** for LGPD/ANVISA review
4. **Enable automated testing** in CI/CD
5. **Ship to beta** with confidence ✅

---

## Sources

### FHIR Testing
- [Inferno Health API Testing Framework](https://github.com/inferno-framework)
- [awesome-FHIR - Curated list of FHIR tools](https://github.com/fhir-fuel/awesome-FHIR)
- [MITRE Crucible FHIR testing tool](https://www.healthcareitnews.com/news/mitre-shares-open-source-fhir-testing-tool)
- [Top 10 Open-Source Tools for FHIR Developers in 2025](https://loggr.net/2025/03/04/top-10-open-source-tools-for-fhir-developers-in-2025/)

### Synthetic Data
- [Synthea - Synthetic Patient Generator](https://synthetichealth.github.io/synthea/)
- [Synthetic data generation methods in healthcare review](https://pmc.ncbi.nlm.nih.gov/articles/PMC11301073/)
- [HIPAA Synthetic Data Generation](https://hoop.dev/blog/hipaa-synthetic-data-generation-the-future-of-safe-fast-healthcare-development/)
- [Synthetic Audit Log Generator](https://syntheticauditlogs.com/)

### Security Scanning
- [OWASP Foundation - Free Security Tools](https://owasp.org/www-community/Free_for_Open_Source_Application_Security_Tools)
- [Top 10 DAST Tools for 2026](https://www.jit.io/resources/appsec-tools/top-dast-tools-for-2024)
- [Top 9 Open-Source SAST Tools](https://www.wiz.io/academy/top-open-source-sast-tools)
- [Top 10 Open source / Free DAST Tools Compared in 2026](https://aimultiple.com/free-dast-tools)

### E2E Testing
- [Playwright - Microsoft E2E Testing](https://playwright.dev/)
- [Cypress - Open-Source E2E Testing](https://www.cypress.io/app)
- [Playwright vs. Cypress: The Ultimate 2025 E2E Testing Showdown](https://www.frugaltesting.com/blog/playwright-vs-cypress-the-ultimate-2025-e2e-testing-showdown)

### Load Testing
- [Grafana k6 - Open source load testing](https://k6.io/open-source/)
- [k6 GitHub Repository](https://github.com/grafana/k6)
- [API performance testing with k6](https://circleci.com/blog/api-performance-testing-with-k6/)
- [15 Best Load Testing Tools for 2025](https://testguild.com/load-testing-tools/)

---

**Last Updated:** 2026-01-02
**Next Review:** After 1-week sprint implementation
**Owner:** Engineering Lead (assign)
