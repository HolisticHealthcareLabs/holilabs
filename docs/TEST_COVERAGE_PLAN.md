# Test Coverage Improvement Plan
**Version:** 1.0
**Last Updated:** 2026-01-03
**Target:** 70%+ overall coverage (90%+ for security layer)
**Current:** ~5% overall coverage

---

## Current State Analysis

### Existing Test Files (20 total)

**API Routes (5 tests):**
- ✅ `/api/cds/__tests__/evaluate.test.ts`
- ✅ `/api/cds/hooks/__tests__/cds-hooks.test.ts`
- ✅ `/api/ai/insights/__tests__/route.test.ts`
- ✅ `/api/review-queue/__tests__/route.test.ts`
- ✅ `/api/review-queue/[id]/__tests__/route.test.ts`

**Security Layer (1 test):**
- ✅ `/lib/security/__tests__/encryption.test.ts` (62/62 passing)

**Business Logic (9 tests):**
- ✅ `/lib/__tests__/api-scribe.test.ts`
- ✅ `/lib/__tests__/api-billing-export.test.ts`
- ✅ `/lib/__tests__/api-auth.test.ts`
- ✅ `/lib/__tests__/api-patients.test.ts`
- ✅ `/lib/api/__tests__/middleware-basic.test.ts`
- ✅ `/lib/api/__tests__/rate-limit.test.ts` (749 lines, comprehensive)
- ✅ `/lib/jobs/__tests__/correction-aggregation.test.ts`
- ✅ `/lib/notifications/__tests__/opt-out.test.ts`
- ✅ `/lib/services/__tests__/cdss.service.test.ts`
- ✅ `/lib/services/__tests__/review-queue.service.test.ts`

**Clinical Features (5 tests):**
- ✅ `/__tests__/soap-generator/confidence-scoring.test.ts`
- ✅ `/__tests__/soap-generator/soap-parser.test.ts`
- ✅ `/lib/clinical-notes/__tests__/version-control.test.ts`

### Coverage Gaps (Priority Order)

#### 🔴 CRITICAL - Security & PHI (Priority 1)
**Missing Tests:**
1. `/lib/audit.ts` - Audit logging (HIPAA critical)
2. `/lib/db/encryption-extension.ts` - Prisma encryption extension
3. `/lib/api/middleware.ts` - Protected route middleware (RBAC)
4. `/lib/fhir/fhir-client.ts` - FHIR integration security

**Risk:** HIPAA violations, PHI exposure

#### 🟡 HIGH - Patient API Routes (Priority 2)
**Missing Tests:**
5. `/api/patients/route.ts` - Create/list patients
6. `/api/patients/[id]/route.ts` - Get/update/delete patient
7. `/api/patients/search/route.ts` - Patient search
8. `/api/patients/export/route.ts` - Data export (rate limiting critical)
9. `/api/prescriptions/route.ts` - Prescription management
10. `/api/prescriptions/[id]/send-to-pharmacy/route.ts`

**Risk:** Production bugs, PHI exposure

#### 🟢 MEDIUM - Core Features (Priority 3)
**Missing Tests:**
11. `/lib/fhir/resource-mappers.ts` - FHIR resource mapping
12. `/lib/prevention/lab-result-monitors.ts` - Preventive care
13. `/lib/ai/embeddings.ts` - AI embeddings
14. `/lib/cache/cache-manager.ts` - Cache layer
15. `/lib/api/validation.ts` - Input validation

**Risk:** Feature bugs, performance issues

---

## Test Coverage Goals

### Overall Target: 70%+

| Layer | Current | Target | Priority |
|-------|---------|--------|----------|
| Security Layer | 62/62 tests | **90%+** | 🔴 CRITICAL |
| API Routes (PHI) | ~10% | **80%+** | 🔴 CRITICAL |
| Middleware | 12/12 tests | **85%+** | 🟡 HIGH |
| Business Logic | ~40% | **70%+** | 🟡 HIGH |
| UI Components | ~5% | **60%+** | 🟢 MEDIUM |
| Utilities | ~30% | **80%+** | 🟢 MEDIUM |

---

## Implementation Plan

### Phase 1: Security Layer Tests (Days 1-2) - 🔴 CRITICAL

#### Test 1: Audit Logging (`/lib/security/__tests__/audit.test.ts`)
**Coverage Target:** 95%

**Test Cases:**
1. ✅ Create audit log entry (all required fields)
2. ✅ Audit log with metadata (JSON serialization)
3. ✅ Audit log for PHI access (READ/UPDATE/DELETE)
4. ✅ Failed operation audit log (status: FAILURE)
5. ✅ Query audit logs (filtering, pagination)
6. ✅ Audit trail integrity (tamper detection)
7. ⚠️ Concurrent audit log creation (race conditions)
8. ⚠️ Audit log with invalid data (error handling)

#### Test 2: Encryption Extension (`/lib/db/__tests__/encryption-extension.test.ts`)
**Coverage Target:** 90%

**Test Cases:**
1. ✅ Encrypt field on create (name, email, ssn)
2. ✅ Decrypt field on read
3. ✅ Search encrypted field (should fail - by design)
4. ✅ Update encrypted field (re-encryption)
5. ⚠️ Encryption key rotation (simulate key change)
6. ⚠️ Corrupted ciphertext handling (graceful failure)
7. ⚠️ Null/undefined field encryption

#### Test 3: Protected Route Middleware (`/lib/api/__tests__/middleware.test.ts`)
**Coverage Target:** 85%

**Test Cases:**
1. ✅ Authenticated request (valid JWT)
2. ✅ Unauthenticated request (401 response)
3. ✅ RBAC check (authorized user)
4. ✅ RBAC check (unauthorized user - 403 response)
5. ✅ Audit log creation (automatic)
6. ✅ Rate limiting (429 response)
7. ✅ CSRF token validation
8. ⚠️ Expired JWT (401 response)
9. ⚠️ Invalid JWT signature (401 response)

---

### Phase 2: Patient API Routes (Days 3-4) - 🟡 HIGH

#### Test 4: Patient CRUD (`/app/api/patients/__tests__/crud.test.ts`)
**Coverage Target:** 80%

**Test Cases:**
1. ✅ POST /api/patients - Create patient (encrypted PHI)
2. ✅ GET /api/patients - List patients (organization-scoped)
3. ✅ GET /api/patients/[id] - Get single patient
4. ✅ PATCH /api/patients/[id] - Update patient
5. ✅ DELETE /api/patients/[id] - Soft delete
6. ✅ Audit log for all operations
7. ⚠️ Create patient with invalid data (validation)
8. ⚠️ Update non-existent patient (404)
9. ⚠️ Access patient from different organization (403)

#### Test 5: Patient Search (`/app/api/patients/__tests__/search.test.ts`)
**Coverage Target:** 80%

**Test Cases:**
1. ✅ Search by name (case-insensitive)
2. ✅ Search by MRN (exact match)
3. ✅ Search by DOB (date range)
4. ✅ Search with multiple criteria (AND logic)
5. ✅ Search results limited (50 max)
6. ✅ Search with pagination (offset/limit)
7. ✅ Audit log for search
8. ⚠️ SQL injection attempt (should be blocked)
9. ⚠️ Search with empty query (validation error)

#### Test 6: Patient Export (`/app/api/patients/__tests__/export.test.ts`)
**Coverage Target:** 85%

**Test Cases:**
1. ✅ Export patients to CSV (encrypted download)
2. ✅ Export with de-identification (Safe Harbor)
3. ✅ Export rate limiting (10/min)
4. ✅ Export audit log
5. ✅ Export with filters (date range, status)
6. ⚠️ Export exceeding rate limit (429 response)
7. ⚠️ Export unauthorized (403 response)

---

### Phase 3: E2E Test Expansion (Days 5-6) - 🟢 MEDIUM

#### Test 7: Patient Portal E2E (`/tests/e2e/patient-portal.spec.ts`)
**Coverage Target:** Key user flows

**Test Cases:**
1. ✅ Patient login flow (OAuth)
2. ✅ View medical records
3. ✅ Request prescription refill
4. ✅ Book appointment
5. ✅ Update profile information
6. ⚠️ Logout and session expiry

#### Test 8: Physician Dashboard E2E (`/tests/e2e/physician-dashboard.spec.ts`)
**Coverage Target:** Key clinical workflows

**Test Cases:**
1. ✅ Search for patient
2. ✅ View patient chart
3. ✅ Create SOAP note (AI scribe)
4. ✅ Order lab test
5. ✅ Prescribe medication
6. ✅ Sign clinical note

---

## Test Infrastructure

### Testing Tools

**Unit Tests:**
- Jest (configured)
- React Testing Library (UI components)
- Supertest (API routes - optional)

**E2E Tests:**
- Playwright (configured)
- Test fixtures for synthetic PHI

**Load Testing:**
- k6 (to be configured)
- Artillery (alternative)

### Test Data

**Synthetic PHI Generation:**
```typescript
// /tests/fixtures/synthetic-patients.ts
export const createSyntheticPatient = () => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
  dob: faker.date.birthdate({ min: 18, max: 90, mode: 'age' }),
  ssn: faker.string.numeric('###-##-####'),
  mrn: `MRN-${faker.string.alphanumeric(10).toUpperCase()}`,
});
```

**Test Database:**
```bash
# Use separate test database
DATABASE_URL="postgresql://holi:holi_dev_password@localhost:5432/holi_test?schema=public"
```

---

## CI/CD Integration

### GitHub Actions Workflow

**`.github/workflows/test.yml`:**
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2

      - name: Install dependencies
        run: pnpm install

      - name: Run unit tests
        run: pnpm test:coverage

      - name: Check coverage threshold
        run: |
          COVERAGE=$(grep "All files" coverage/coverage-summary.json | grep -oP '\d+\.\d+' | head -1)
          if (( $(echo "$COVERAGE < 70" | bc -l) )); then
            echo "❌ Coverage $COVERAGE% < 70%"
            exit 1
          fi
          echo "✅ Coverage $COVERAGE% >= 70%"

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
```

---

## Coverage Monitoring

### Coverage Reports

**Local Development:**
```bash
# Generate coverage report
pnpm test:coverage

# Open HTML report
open coverage/lcov-report/index.html
```

**CI/CD:**
- Codecov integration (badge in README)
- Coverage threshold enforcement (70%)
- Pull request coverage diff

### Coverage Badges

**README.md:**
```markdown
![Coverage](https://img.shields.io/codecov/c/github/holi-labs/holilabsv2)
![Tests](https://img.shields.io/github/actions/workflow/status/holi-labs/holilabsv2/test.yml)
```

---

## Success Metrics

### Coverage Milestones

| Milestone | Target | Timeline |
|-----------|--------|----------|
| Security Layer | 90%+ | Day 2 |
| Patient API Routes | 80%+ | Day 4 |
| Overall Coverage | 70%+ | Day 6 |

### Quality Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Test Coverage | 70%+ | ~5% |
| Failing Tests | 0 | 0 |
| Test Execution Time | < 5 min | ~10s |
| E2E Test Coverage | 10+ flows | 0 |

---

## Maintenance

### Test Review Schedule

**Weekly:**
- Review failing tests
- Update test fixtures
- Analyze coverage reports

**Monthly:**
- Review test effectiveness
- Refactor brittle tests
- Add tests for new features

**Quarterly:**
- Security test audit
- Performance test review
- Update test documentation

---

## Additional Resources

**Testing Best Practices:**
- [OWASP Testing Guide](https://owasp.org/www-project-testing-guide/)
- [Jest Best Practices](https://jestjs.io/docs/getting-started)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)

**HIPAA Testing:**
- Test with synthetic data only
- Never use production PHI
- Audit trail for all tests

---

**Document Version:** 1.0
**Last Updated:** 2026-01-03
**Next Review:** 2026-02-03 (monthly)
**Owner:** Engineering Team
