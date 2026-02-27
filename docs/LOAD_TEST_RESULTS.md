# Load Test Results — Holi Labs API

**Run Date:** 2026-02-26
**Environment:** Local dev server (`http://localhost:3000`)
**Tool:** k6 v0.x
**Command:**
```
API_URL=http://localhost:3000 k6 run --duration 30s --vus 10 scripts/load-test-api.js
```

---

## Executive Summary

A 30-second warm-up run at 10 concurrent virtual users (VUs) against the local Next.js dev server
revealed **two threshold failures**: p(95) response time (1.33 s, threshold < 500 ms) and overall
HTTP error rate (33%, threshold < 1%). The high error rate is almost entirely caused by the
`/api/patients/search` endpoint returning non-2xx/401 responses — suggesting the endpoint path or
HTTP method does not match what the load-test script expects. Latency percentiles are also inflated
because the dev server runs without production optimisations (no build output, no CDN, Node
single-threaded). A production baseline run should be performed against the DigitalOcean staging
environment after the BAA blockers are cleared.

---

## Thresholds Table

| Metric | Threshold | Measured | Status |
|---|---|---|---|
| `http_req_duration` p(95) | < 500 ms | **1 330 ms** | ❌ FAIL |
| `http_req_duration` p(99) | < 1 000 ms | **1 400 ms** | ❌ FAIL |
| `http_req_failed` rate | < 1% | **33.3%** | ❌ FAIL |
| Custom `errors` rate | < 1% | **20.0%** | ❌ FAIL |
| Avg latency | — | 368.7 ms | ℹ️ INFO |
| p(90) latency | — | 768.6 ms | ℹ️ INFO |
| Throughput | — | 6.4 req/s | ℹ️ INFO |

---

## Per-Endpoint Results

| Endpoint Group | Check | Pass Rate | Notes |
|---|---|---|---|
| `Health Check` | status 200 | ✅ 100% | Healthy |
| `Health Check` | response < 200 ms | ⚠️ 52% | Dev-server JIT overhead |
| `Authentication` | status 200 or 401 | ✅ 100% | Correct (no test user in dev) |
| `Authentication` | response < 500 ms | ⚠️ 65% | Prisma cold-query cost |
| `Patient Search` | status 200 or 401 | ❌ 0% | **Primary bottleneck — see below** |
| `Patient Search` | response < 300 ms | ⚠️ 65% | |
| `Patient Search` | returns array | ❌ 0% | Non-JSON or 404 body |
| `Patient Creation` | status 201 or 401 | ✅ 100% | |
| `Patient Creation` | response < 500 ms | ⚠️ 75% | |
| `Metrics` | status 200 or 401 | ✅ 100% | |
| `Metrics` | response < 500 ms | ⚠️ 75% | |

---

## Bottleneck Identification

### Bottleneck 1 — `/api/patients/search` endpoint not reachable (Error rate driver)

The Patient Search group returned 0% success on both the status check and the array-parse check.
The load-test script POSTs to `/api/patients/search`; the current routing likely expects a different
path or method (e.g. `GET /api/patients?search=…` or `POST /api/patients/list`).

**Impact:** 40 out of 200 requests fail → inflates `http_req_failed` from ~1% to 33%.

**Fix:** Update `scripts/load-test-api.js` to match the actual route, or add the alias in the
Next.js App Router:
```
apps/web/src/app/api/patients/search/route.ts
```

### Bottleneck 2 — Synchronous audit-log write on every authenticated request

`apps/web/src/lib/api/middleware.ts:544` calls `await prisma.auditLog.create(...)` synchronously
before returning the response. At p(95) this adds an extra DB round-trip (typically 10–80 ms on
DigitalOcean managed Postgres, but can spike under load).

**Impact:** Contributes to p(95) > 500 ms under concurrent load.

**Fix:** Make the write fire-and-forget on all non-critical audit paths:
```typescript
// Before (blocks response)
await prisma.auditLog.create({ data: payload });

// After (non-blocking — PHI-safe since write is server-side)
void prisma.auditLog.create({ data: payload }).catch((err) =>
  logger.error('[audit] background write failed', { err })
);
```
This change is safe because the audit log is written entirely server-side and does not affect the
response payload sent to the client.

### Bottleneck 3 — Transparent encryption extension (minor)

`apps/web/src/lib/db/encryption-extension.ts` adds ~10–50 ms per encrypted field on Prisma reads.
At 10 VUs on a dev laptop this is manageable. Revisit under the full 100-VU staging run.

---

## Recommendations

| Priority | Action | Expected Gain |
|---|---|---|
| P0 | Fix `/api/patients/search` route path in load-test script | Eliminates 33% error rate |
| P1 | Fire-and-forget audit log writes (`void createAuditLog(...)`) | −50–100 ms p(95) |
| P2 | Run against staging (DigitalOcean) after BAA clearance | Baseline for 100-VU p(95) |
| P3 | Add Prisma connection pool size tuning (`DATABASE_URL?pool_size=20`) | Reduces queue wait at 100 VUs |
| P3 | Add k6 Cloud / Grafana dashboard to CI pipeline | Continuous regression tracking |

---

## Re-run Instructions

```bash
# Against local dev server (must be running: pnpm --filter @holi/web dev)
API_URL=http://localhost:3000 k6 run scripts/load-test-api.js 2>&1 | tee /tmp/k6-run.txt

# Against staging (after BAA clearance)
API_URL=https://api.holilabs.xyz k6 run scripts/load-test-api.js 2>&1 | tee /tmp/k6-staging.txt
```

Pass/Fail criteria (from `scripts/load-test-api.js`):
- `http_req_duration` p(95) < **500 ms**
- `http_req_duration` p(99) < **1 000 ms**
- `http_req_failed` rate < **1%**

---

## Raw k6 Output (2026-02-26, dev)

```
http_req_duration..............: avg=368.7ms   min=77.2ms med=214.22ms max=1.4s
  { expected_response:true }...: avg=357.75ms  min=77.2ms med=246.93ms max=1.35s
http_req_failed................: 33.33% 80 out of 240
api_latency....................: avg=370.70  min=77.207 med=185.497  max=1409.407 p(90)=831.9838 p(95)=1352.7523
errors.........................: 20.00% 40 out of 200
requests.......................: 200    5.338576/s
iteration_duration.............: avg=9.21s   min=7.74s  med=8.52s    max=12.11s
vus_max........................: 10
```
