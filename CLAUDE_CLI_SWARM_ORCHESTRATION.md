# CLAUDE CLI — SWARM ORCHESTRATION (YAGNI Edition)

> **Purpose:** Coordinate 2 AI agents to build the DOAC safety engine and KPI dashboard for Cortex MVP. No premature abstractions. No gold-plating. Ship the pilot.
>
> **Last Revision:** 2026-02-11 (Post-architectural review)
> **Architecture:** pnpm monorepo (`apps/web`, `apps/api`, `apps/sidecar`, `packages/*`)
> **Deployment Target:** 20-patient pilot in Bolivia, 4-week runtime

---

## SECTION 0: WHAT CHANGED (Lessons from the Architecture Review)

### The Original Plan: REJECTED ❌

- **6 agents** with complex coordination
- **Shared kernel package** built before any features
- **Comprehensive rule packs** covering diabetes, CV risk, 7 specialties
- **Reminders + escalation + retry logic** for 20 pilot patients
- **Cross-cutting tasks** (FR traceability, evidence export) built speculatively

**Verdict:** Over-engineered. Architecture astronaut territory. Violates YAGNI. Would take 18-26 hours and produce 3,500 LOC, half of which is premature abstraction.

### The New Plan: 2 AGENTS, 7-10 HOURS, 1,500 LOC ✅

- **Agent A (Safety Core):** DOAC rules + attestation + overrides + governance events — built directly in `apps/web/src/lib/clinical/`
- **Agent B (Console):** KPI dashboard + filtering + override ranking — built in `apps/web/src/lib/kpi/` and `apps/web/src/components/console/`
- **Deferred to Post-MVP:** Reminders (Epic C), config persistence (Epic D), cross-cutting tasks, non-DOAC clinical rules

**The ruthless question:** What's the ONE feature that proves the business model?
**Answer:** DOAC safety rules that prevent a contraindicated prescription.

---

## SECTION 1: SYSTEM IDENTITY

You are the **Swarm Orchestrator** — responsible for coordinating 2 parallel agents to ship the Cortex MVP.

**Your job:**
1. Read the codebase audit below
2. Generate 2 task cards with non-overlapping file ownership
3. Ensure every task card has golden test fixtures (not prose)
4. Sequence agents to minimize dependencies
5. Verify output at each gate

**Hard Constraints:**
- **NO shared kernel package** — all logic lives in `apps/web/src/lib/` until proven duplication
- **NO premature abstractions** — no registries, no loaders, no "engines" until you have 3 use cases
- **NO SaMD words** — "diagnose," "detect," "prevent," "treat" are FORBIDDEN
- **NO LLM calls in clinical path** — deterministic only
- **85% line coverage / 95% branch coverage** for clinical logic
- **Audit before create** — agents must `ls -lah` directories before writing
- **Golden tests only** — no prose acceptance criteria

---

## SECTION 2: CODEBASE AUDIT (Ground Truth)

### What EXISTS and WORKS

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| **Web App** | `apps/web/` | WORKING | 286 components, 348+ lib files, 134 Prisma models |
| **Clinical Data** | `data/clinical/sources/` | PARTIAL | 3 JSON files (contraindications, dosing, interactions v1) |
| **Database** | `apps/web/prisma/schema.prisma` | WORKING | GovernanceEvent, Patient, Lab, Prescription models exist |
| **Existing CDS** | `apps/web/src/lib/cds/` | WORKING | 19KB of existing CDS code (must integrate, not replace) |

### What DOES NOT EXIST (Yet)

- `apps/web/src/lib/clinical/doac-safety-engine.ts` — the core DOAC rule engine
- `apps/web/src/lib/clinical/doac-attestation.ts` — stale/missing data detector
- `apps/web/src/lib/clinical/safety-override-handler.ts` — reason code enforcement
- `apps/web/src/lib/clinical/safety-audit-logger.ts` — audit event wrapper
- `data/clinical/sources/doac-rules.json` — DOAC safety rules (20 rules with provenance)
- `apps/web/src/lib/kpi/` — entire KPI module
- `apps/web/src/components/console/` — entire console UI

---

## SECTION 3: THE 2-AGENT PLAN

### Sequencing

```
PHASE 1 (Agent A — Safety Core):
  └── Build DOAC rules, attestation, overrides, governance in apps/web/src/lib/clinical/
       └── GATE: 85% line coverage, 95% branch coverage, all golden tests pass

PHASE 2 (Agent B — Console):
  └── Build KPI dashboard, filtering, override ranking in apps/web/src/lib/kpi/
       └── GATE: Dashboard renders, filters apply, no TypeScript errors
```

**No blocking dependency.** Both agents can start simultaneously if desired. Agent A is higher priority.

---

## AGENT A: SAFETY CORE (The Money Feature)

**Priority:** CRITICAL — This is what prevents lawsuits.
**Model Recommendation:** Claude Sonnet 4 / GPT o3
**Estimated Effort:** 4-6 hours
**Deliverable:** Working DOAC safety checks with attestation gating and override enforcement

### Mission

Build the deterministic DOAC safety engine that flags contraindicated prescriptions, enforces attestation for missing/stale data, and logs all overrides with reason codes.

**What ships to production:**
- A doctor enters a DOAC prescription (rivaroxaban, apixaban, edoxaban, dabigatran)
- The system checks: CrCl, weight, age, interacting meds, recent labs
- If CrCl < 15 ml/min → BLOCK with rationale
- If labs are >72h old → ATTESTATION_REQUIRED
- If doctor overrides → reason code required → governance event logged

### STEP 1: Audit Existing Files (CRITICAL)

Before writing ANY code, run these commands and report what you find:

```bash
# Check if directories already exist
ls -lah apps/web/src/lib/cds/
ls -lah apps/web/src/lib/clinical/
ls -lah apps/web/src/lib/governance/
ls -lah data/clinical/sources/

# Check existing API routes
ls -lah apps/web/src/app/api/cds/
```

**Update your file ownership list** based on findings. Use **MODIFY** for existing directories, **CREATE** for new ones.

### File Ownership (READ/WRITE)

**Create these new files:**
```
apps/web/src/lib/clinical/
  ├── doac-safety-engine.ts              (CREATE — deterministic rule evaluation)
  ├── doac-attestation.ts                (CREATE — check for missing/stale critical fields)
  ├── safety-override-handler.ts         (CREATE — enforce reason code, log governance event)
  ├── safety-audit-logger.ts             (CREATE — wrapper for audit event persistence)
  └── index.ts                           (CREATE — barrel export)

apps/web/src/lib/clinical/__tests__/
  ├── doac-safety-engine.test.ts         (CREATE — golden test fixtures, edge cases)
  ├── doac-attestation.test.ts           (CREATE)
  ├── safety-override-handler.test.ts    (CREATE)
  └── safety-audit-logger.test.ts        (CREATE)

data/clinical/sources/
  └── doac-rules.json                    (CREATE — 20 rules with full provenance)

apps/web/src/app/api/cds/
  ├── attestation/route.ts               (CREATE — POST /api/cds/attestation)
  └── override/route.ts                  (CREATE — POST /api/cds/override)
```

**Modify these existing files:**
```
apps/web/src/app/api/cds/evaluate/route.ts  (MODIFY — wire in doac-safety-engine)
```

**Read-Only References:**
```
apps/web/src/lib/cds/                    (READ — existing CDS patterns)
apps/web/src/lib/logger.ts               (READ — existing logger)
apps/web/prisma/schema.prisma            (READ — Patient, Lab, Prescription, GovernanceEvent models)
data/clinical/sources/*.json             (READ — existing rule format)
```

**FORBIDDEN:**
- Do NOT create `packages/shared-kernel/`
- Do NOT modify `prisma/schema.prisma` (database changes need separate migration)
- Do NOT create UI components (Agent B owns that)

### Technical Requirements

**TypeScript Strict Mode:**
- Zero `any` types
- All functions explicitly typed
- No `@ts-ignore` or `@ts-expect-error`

**Coverage Requirements:**
- **85% line coverage** for `apps/web/src/lib/clinical/*.ts`
- **95% branch coverage** for `apps/web/src/lib/clinical/*.ts`
- Must test: null inputs, missing fields, stale data, edge ages (0, 120), edge weights (30kg, 200kg), edge CrCl (1, 200)

**Governance Requirements:**
- Every function that reads patient data → logs `GOVERNANCE_EVENT` with: `actor`, `action`, `resource`, `legalBasis`, `timestamp`, `traceId`
- Override handler → logs `OVERRIDE_SUBMITTED` event with `reasonCode`, `overriddenRule`, `originalSeverity`
- **CRITICAL: Governance events MUST be persisted to Postgres database via Prisma `GovernanceEvent` model. Console.log is NOT sufficient.** All logging must write to database AND console.
- Events must be immutable after creation (no updates, only inserts)

**Forbidden SaMD Words:**
Use approved alternatives only:
- ❌ "diagnose" → ✅ "highlight risk factor"
- ❌ "detect" → ✅ "identify data pattern"
- ❌ "prevent" → ✅ "suggest protocol adjustment"
- ❌ "treat" → ✅ "monitor adherence"

### Acceptance Criteria (Golden Test Fixtures)

Replace prose with executable tests:

```typescript
// TEST 1: CrCl < 15 blocks rivaroxaban
test('DOAC-CrCl-001: CrCl < 15 blocks rivaroxaban', () => {
  const result = evaluateDOACRule({
    medication: 'rivaroxaban',
    patient: {
      creatinineClearance: 12, // ml/min
      age: 78,
      weight: 65
    }
  });

  expect(result.severity).toBe('BLOCK');
  expect(result.rationale).toContain('CrCl < 15 ml/min');
  expect(result.ruleId).toBe('DOAC-CrCl-Rivaroxaban-001');
  expect(result.citationUrl).toMatch(/doi\.org/);
});

// TEST 2: Labs >72h require attestation
test('DOAC-Stale-001: Renal labs >72h require attestation', () => {
  const result = checkAttestation({
    medication: 'apixaban',
    patient: {
      creatinineClearance: 50,
      labTimestamp: new Date(Date.now() - 73 * 60 * 60 * 1000) // 73 hours ago
    }
  });

  expect(result.required).toBe(true);
  expect(result.reason).toBe('STALE_RENAL_LABS');
  expect(result.staleSince).toBe(73);
  expect(result.threshold).toBe(72);
});

// TEST 3: Override without reason code is rejected
test('DOAC-Override-001: Override without reason code returns 400', () => {
  expect(() => {
    handleOverride({
      ruleId: 'DOAC-CrCl-001',
      severity: 'BLOCK',
      reasonCode: null // missing
    });
  }).toThrow('reasonCode is required');
});

// TEST 4: Valid override emits governance event
test('DOAC-Override-002: Valid override emits OVERRIDE_SUBMITTED event', () => {
  const logSpy = jest.spyOn(logger, 'info');

  handleOverride({
    ruleId: 'DOAC-CrCl-001',
    severity: 'BLOCK',
    reasonCode: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
    actor: 'dr-elena-123'
  });

  expect(logSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      event: 'OVERRIDE_SUBMITTED',
      ruleId: 'DOAC-CrCl-001',
      reasonCode: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
      actor: 'dr-elena-123'
    })
  );
});

// TEST 5: Null input handling
test('DOAC-Null-001: Null CrCl returns ATTESTATION_REQUIRED', () => {
  const result = evaluateDOACRule({
    medication: 'rivaroxaban',
    patient: {
      creatinineClearance: null, // missing data
      age: 65,
      weight: 70
    }
  });

  expect(result.severity).toBe('ATTESTATION_REQUIRED');
  expect(result.missingFields).toContain('creatinineClearance');
});

// TEST 6: Edge case — extreme age
test('DOAC-Age-001: Age 120 does not crash', () => {
  const result = evaluateDOACRule({
    medication: 'apixaban',
    patient: {
      creatinineClearance: 50,
      age: 120, // edge case
      weight: 50
    }
  });

  expect(result.severity).toBeOneOf(['BLOCK', 'FLAG', 'PASS', 'ATTESTATION_REQUIRED']);
});

// TEST 7: Edge case — extreme weight
test('DOAC-Weight-001: Weight 30kg triggers FLAG', () => {
  const result = evaluateDOACRule({
    medication: 'dabigatran',
    patient: {
      creatinineClearance: 80,
      age: 25,
      weight: 30 // very low weight
    }
  });

  expect(result.severity).toBeOneOf(['FLAG', 'ATTESTATION_REQUIRED']);
  expect(result.rationale).toMatch(/weight.*low/i);
});
```

### Clinical Data: doac-rules.json

**Requirement:** 20 rules covering:
- **Rivaroxaban:** 5 rules (CrCl thresholds, age, weight, interactions)
- **Apixaban:** 5 rules
- **Edoxaban:** 5 rules
- **Dabigatran:** 5 rules

**Provenance (MANDATORY):**
Every rule MUST include:
```json
{
  "ruleId": "DOAC-CrCl-Rivaroxaban-001",
  "medication": "rivaroxaban",
  "condition": "creatinineClearance < 15",
  "severity": "BLOCK",
  "rationale": "Rivaroxaban is contraindicated when CrCl < 15 ml/min due to increased bleeding risk",
  "provenance": {
    "sourceAuthority": "European Society of Cardiology",
    "sourceDocument": "2024 ESC Guidelines on Chronic Coronary Syndromes",
    "sourceVersion": "2024.1",
    "effectiveDate": "2024-08-30",
    "citationUrl": "https://doi.org/10.1093/eurheartj/ehae177",
    "evidenceGrade": "A",
    "reviewedBy": "Elena (CMO)",
    "lastReviewDate": "2026-02-11"
  }
}
```

**No fabricated citations.** If you don't have a real DOI, use:
- FDA label: `https://www.accessdata.fda.gov/drugsatfda_docs/label/...`
- UpToDate summary URL
- Or mark as `"evidenceGrade": "Expert Consensus"` with `"reviewedBy": "Elena (CMO)"`

### Definition of Done (Agent A)

- [ ] All 4 source files created in `apps/web/src/lib/clinical/`
- [ ] `doac-rules.json` with 20 rules, full provenance, valid JSON
- [ ] All golden tests pass (7+ test cases covering happy path + edge cases + nulls)
- [ ] Coverage: `pnpm jest apps/web/src/lib/clinical --coverage` shows ≥85% lines, ≥95% branches
- [ ] Zero TypeScript errors: `pnpm -C apps/web typecheck`
- [ ] Zero ESLint errors: `pnpm -C apps/web lint`
- [ ] API routes return proper status codes:
  - `/api/cds/evaluate` returns 200 with `{severity, rationale, ruleId, citationUrl}`
  - `/api/cds/attestation` returns 200 with `{required, reason, missingFields}`
  - `/api/cds/override` returns 400 if `reasonCode` missing, 200 with `{eventId}` if valid
- [ ] Governance events logged for all patient data access
- [ ] No SaMD words in comments/UI/API responses
- [ ] JSDoc comments on all exported functions

---

## AGENT B: CONSOLE (The God View)

**Priority:** HIGH — Admins need visibility.
**Model Recommendation:** Claude Sonnet 4 / GPT o3
**Estimated Effort:** 3-4 hours
**Deliverable:** KPI dashboard with filtering and override reason ranking

### Mission

Build the Action Console that shows admins: (1) key performance indicators, (2) filterable by date range, (3) override reasons ranked by frequency.

**What ships to production:**
- Admin opens `/dashboard/console`
- Sees 4 KPI cards: Total evaluations, Block rate, Override rate, Attestation compliance
- Applies date filter → KPIs update
- Views override reasons ranked by count: "Clinical Judgment (Palliative Care)" → 15 (45%)

### STEP 1: Audit Existing Files (CRITICAL)

```bash
# Check if directories already exist
ls -lah apps/web/src/lib/kpi/
ls -lah apps/web/src/components/console/
ls -lah apps/web/src/components/dashboard/
ls -lah apps/web/src/app/api/kpi/

# Check existing dashboard patterns
ls -lah apps/web/src/app/dashboard/
```

### File Ownership (READ/WRITE)

**Create these new files:**
```
apps/web/src/lib/kpi/
  ├── kpi-queries.ts                     (CREATE — Prisma queries for 4 KPIs)
  ├── filter-state.ts                    (CREATE — date range filter model)
  ├── override-aggregator.ts             (CREATE — ranked override reasons query)
  └── index.ts                           (CREATE — barrel export)

apps/web/src/lib/kpi/__tests__/
  ├── kpi-queries.test.ts                (CREATE)
  ├── filter-state.test.ts               (CREATE)
  └── override-aggregator.test.ts        (CREATE)

apps/web/src/app/api/kpi/
  ├── route.ts                           (CREATE — GET /api/kpi?startDate=&endDate=)
  └── overrides/route.ts                 (CREATE — GET /api/kpi/overrides?ranked=true)

apps/web/src/components/console/
  ├── KPICard.tsx                        (CREATE — single KPI card with tooltip)
  ├── KPIGrid.tsx                        (CREATE — grid of 4 KPI cards)
  ├── ConsoleFilterBar.tsx               (CREATE — date range picker)
  ├── OverrideReasonsRanking.tsx         (CREATE — ranked list with percentages)
  └── index.ts                           (CREATE — barrel export)
```

**Read-Only References:**
```
apps/web/src/components/dashboard/       (READ — existing dashboard component patterns)
apps/web/src/lib/kpi/                    (READ — if exists, check what's there)
apps/web/prisma/schema.prisma            (READ — GovernanceEvent, GovernanceLog models)
```

**FORBIDDEN:**
- Do NOT modify existing dashboard components outside `/components/console/`
- Do NOT modify `apps/web/src/lib/clinical/` (Agent A owns that)
- Do NOT create API routes in `/api/command-center/` (existing namespace)

### Acceptance Criteria (Golden Test Fixtures)

```typescript
// TEST 1: KPI queries return correct structure
test('KPI-001: Total evaluations query returns count', async () => {
  const result = await getKPI('totalEvaluations', {
    startDate: '2026-02-01',
    endDate: '2026-02-11'
  });

  expect(result).toEqual({
    value: expect.any(Number),
    unit: 'count',
    label: 'Total Evaluations'
  });
});

// TEST 2: Block rate calculation
test('KPI-002: Block rate is (blocks / total evaluations)', async () => {
  const result = await getKPI('blockRate', {
    startDate: '2026-02-01',
    endDate: '2026-02-11'
  });

  expect(result.value).toBeGreaterThanOrEqual(0);
  expect(result.value).toBeLessThanOrEqual(100);
  expect(result.unit).toBe('percentage');
});

// TEST 3: Override aggregator returns ranked list
test('KPI-Override-001: Overrides ranked by count descending', async () => {
  const result = await getOverrideReasons({ ranked: true });

  expect(result).toEqual([
    {
      reasonCode: expect.any(String),
      reasonLabel: expect.any(String),
      count: expect.any(Number),
      percentage: expect.any(Number)
    }
  ]);

  // Verify descending order
  for (let i = 1; i < result.length; i++) {
    expect(result[i].count).toBeLessThanOrEqual(result[i-1].count);
  }
});

// TEST 4: Date filter applies correctly
test('KPI-Filter-001: Date filter limits results', async () => {
  const allResults = await getKPI('totalEvaluations', {});
  const filteredResults = await getKPI('totalEvaluations', {
    startDate: '2026-02-10',
    endDate: '2026-02-11'
  });

  expect(filteredResults.value).toBeLessThanOrEqual(allResults.value);
});

// TEST 5: API returns 200 with correct headers
test('KPI-API-001: GET /api/kpi returns 200 with JSON', async () => {
  const response = await fetch('/api/kpi?startDate=2026-02-01&endDate=2026-02-11');

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('application/json');

  const data = await response.json();
  expect(data).toHaveProperty('totalEvaluations');
  expect(data).toHaveProperty('blockRate');
  expect(data).toHaveProperty('overrideRate');
  expect(data).toHaveProperty('attestationCompliance');
});
```

### KPI Definitions (Exactly 4, Not 6)

**KPI 1: Total Evaluations**
- **Numerator:** `COUNT(*) FROM GovernanceEvent WHERE action = 'RULE_EVALUATION'`
- **Denominator:** N/A
- **Unit:** count
- **Target:** N/A (raw metric)

**KPI 2: Block Rate**
- **Numerator:** `COUNT(*) FROM GovernanceEvent WHERE action = 'RULE_EVALUATION' AND severity = 'BLOCK'`
- **Denominator:** `COUNT(*) FROM GovernanceEvent WHERE action = 'RULE_EVALUATION'`
- **Unit:** percentage
- **Target:** <5% (lower is better, means fewer contraindications)

**KPI 3: Override Rate**
- **Numerator:** `COUNT(*) FROM GovernanceEvent WHERE action = 'OVERRIDE_SUBMITTED'`
- **Denominator:** `COUNT(*) FROM GovernanceEvent WHERE action = 'RULE_EVALUATION' AND severity IN ('BLOCK', 'FLAG')`
- **Unit:** percentage
- **Target:** <10% (lower is better, means providers trust the system)

**KPI 4: Attestation Compliance**
- **Numerator:** `COUNT(*) FROM GovernanceEvent WHERE action = 'ATTESTATION_SUBMITTED'`
- **Denominator:** `COUNT(*) FROM GovernanceEvent WHERE action = 'RULE_EVALUATION' AND severity = 'ATTESTATION_REQUIRED'`
- **Unit:** percentage
- **Target:** >95% (higher is better, means providers are attesting when required)

**Defer to Post-MVP:**
- ❌ Consent coverage (no consent module yet)
- ❌ Average response time (premature optimization)
- ❌ Week-over-week trends (need 2 weeks of data first)

### Definition of Done (Agent B)

- [ ] All 4 source files created in `apps/web/src/lib/kpi/`
- [ ] All 4 React components created in `apps/web/src/components/console/`
- [ ] All golden tests pass (5+ test cases)
- [ ] API routes return correct JSON structure
- [ ] UI components render with Tailwind CSS + dark mode support
- [ ] Date filter applies to all 4 KPIs
- [ ] Override reasons ranked correctly (descending by count)
- [ ] Zero TypeScript errors: `pnpm -C apps/web typecheck`
- [ ] Zero ESLint errors: `pnpm -C apps/web lint`
- [ ] Components have loading states, error states, empty states

---

## SECTION 4: VERIFICATION GATES

### Phase 1 Verification (After Agent A)

Run these commands. **All must pass.**

```bash
# 1. Type check
pnpm -C apps/web typecheck

# 2. Lint
pnpm -C apps/web lint

# 3. Run clinical tests with coverage
pnpm jest apps/web/src/lib/clinical --coverage \
  --coverageThreshold='{"./apps/web/src/lib/clinical/**/*.ts": {"lines": 85, "branches": 95}}'

# 4. Validate JSON
node -e "
  const fs = require('fs');
  const rules = JSON.parse(fs.readFileSync('data/clinical/sources/doac-rules.json'));

  if (!Array.isArray(rules) || rules.length < 20) {
    console.error('ERROR: doac-rules.json must contain array of 20+ rules');
    process.exit(1);
  }

  rules.forEach(r => {
    if (!r.ruleId || !r.provenance || !r.provenance.citationUrl) {
      console.error('ERROR: Missing provenance on rule', r.ruleId);
      process.exit(1);
    }
  });

  console.log('✓ Clinical data valid: 20 rules with full provenance');
"

# 5. Start dev server and smoke test API
pnpm -C apps/web dev &
DEV_PID=$!
sleep 15

curl -sf http://localhost:3000/api/cds/evaluate -X POST \
  -H 'Content-Type: application/json' \
  -d '{"medication":"rivaroxaban","patient":{"creatinineClearance":12}}' \
  | grep -q '"severity":"BLOCK"' \
  && echo "✓ DOAC evaluator works" \
  || (echo "✗ DOAC evaluator failed" && kill $DEV_PID && exit 1)

curl -sf http://localhost:3000/api/cds/attestation -X POST \
  -H 'Content-Type: application/json' \
  -d '{"medication":"apixaban","patient":{"labTimestamp":"2026-02-08T00:00:00Z"}}' \
  | grep -q '"required":true' \
  && echo "✓ Attestation gate works" \
  || (echo "✗ Attestation gate failed" && kill $DEV_PID && exit 1)

kill $DEV_PID
```

**If ANY command fails:**
1. Do NOT proceed to Phase 2
2. Collect error output
3. Re-spawn Agent A with error context appended to prompt
4. Repeat until gate passes

### Phase 2 Verification (After Agent B)

```bash
# 1. Type check
pnpm -C apps/web typecheck

# 2. Lint
pnpm -C apps/web lint

# 3. Run KPI tests
pnpm jest apps/web/src/lib/kpi --coverage

# 4. Start dev server and smoke test API
pnpm -C apps/web dev &
DEV_PID=$!
sleep 15

curl -sf http://localhost:3000/api/kpi?startDate=2026-02-01&endDate=2026-02-11 \
  | grep -q '"totalEvaluations"' \
  && echo "✓ KPI API works" \
  || (echo "✗ KPI API failed" && kill $DEV_PID && exit 1)

curl -sf http://localhost:3000/api/kpi/overrides?ranked=true \
  | grep -q '\[' \
  && echo "✓ Override ranking works" \
  || (echo "✗ Override ranking failed" && kill $DEV_PID && exit 1)

kill $DEV_PID
```

### Rollback Protocol (If Verification Fails)

```bash
# Tag before starting each phase
git tag -a phase-1-start -m "Before Agent A"
git tag -a phase-2-start -m "Before Agent B"

# If Phase 1 fails after 3 attempts:
git reset --hard phase-1-start
git tag -d phase-1-agent-a-attempt-{N}  # clean up failed tags

# If Phase 2 fails:
git reset --hard phase-2-start
```

**Escalation:** If an agent fails 3 times on the same error, STOP and alert the human.

---

## SECTION 5: AGENT PROMPT TEMPLATE

Use this template when spawning each agent:

```
You are Agent {A or B}: {ROLE_NAME}.

## CONTEXT
Working in: `apps/web/` (Next.js 14, React 18, Tailwind, Prisma, pnpm monorepo)
Deployment: 20-patient pilot in Bolivia, 4-week runtime
Quality bar: Healthcare SaaS, lives depend on this code

## MISSION
{Paste the Mission section from above}

## STEP 1: AUDIT BEFORE WRITING
Run these commands FIRST and report findings:
{Paste the "Audit Existing Files" commands}

Update your file list: Use MODIFY for existing dirs, CREATE for new ones.

### CONFLICT PROTOCOL (CRITICAL)

If a file you intend to create **already exists**, do NOT overwrite it:
1. Create a new file with a `doac-` prefix or `-v2` suffix instead
2. Update your imports to reference the new file
3. Report the conflict and your resolution in your final summary

Example: If `clinical/evaluator.ts` exists, create `clinical/doac-safety-engine.ts` instead.

## FILE OWNERSHIP
You may ONLY create/modify:
{Paste File Ownership list}

Read-only references:
{Paste Read-Only list}

FORBIDDEN:
{Paste FORBIDDEN list}

## ACCEPTANCE CRITERIA (Golden Tests)
{Paste the Golden Test section}

You MUST implement these exact tests. No prose acceptance criteria.

## TECHNICAL CONSTRAINTS
- TypeScript strict mode, zero `any` types
- Clinical code: 85% line coverage, 95% branch coverage
- Forbidden SaMD words: "diagnose," "detect," "prevent," "treat"
- Use alternatives: "highlight risk," "identify pattern," "suggest protocol," "monitor"
- All patient data access → log governance event
- No LLM calls in clinical path (deterministic only)
- No `console.log` with patient data

## VERIFICATION GATE
{Paste the relevant Phase Verification commands}

All commands must pass. If ANY fails, you have NOT completed your mission.

## DEFINITION OF DONE
{Paste Definition of Done checklist}

## BEGIN
1. Run the audit commands (Step 1)
2. Report what you found
3. Implement each file top to bottom
4. Write tests as you go (not at the end)
5. Run verification gate
6. Report: PASS or FAIL with error output
```

---

## SECTION 6: DEFERRED TO POST-MVP

The following were in the original plan but are EXPLICITLY DEFERRED:

### Epic C — Follow-up Orchestration (Reminders)
**Why deferred:** 20 pilot patients, manual follow-up works fine at this scale. Build when pilot proves patients respond to reminders.

**What was planned:**
- Consent-gated reminder dispatch
- Retry policy (3 attempts, exponential backoff)
- Escalation queue + dead-letter handling
- Lifecycle event tracking (SENT/DELIVERED/FAILED/OPENED/CLOSED)

**Effort saved:** 3-5 hours, ~500 LOC

### Epic D — Rollout Config + Cross-Cutting Tasks
**Why deferred:** Premature configuration infrastructure. Use env vars for MVP.

**What was planned:**
- `complianceCountry` + `insurerFocus` persistence
- Protocol mode enum (DETERMINISTIC_FIRST | HYBRID | PROBABILISTIC_ONLY)
- Runtime diagnostics endpoint
- FR traceability matrix
- KPI integrity job
- Evidence export command

**Effort saved:** 2-3 hours, ~300 LOC

### Shared Kernel Package
**Why deferred:** Classic premature abstraction. You don't extract shared code until you've written the same thing THREE times in production.

**What was planned:**
- `packages/shared-kernel/src/clinical/` (rule engine, content loader, content registry)
- `packages/shared-kernel/src/governance/` (event emitter, override reasons)
- `packages/shared-kernel/src/consent/` (consent guard)
- `packages/shared-kernel/src/audit/` (audit emitter)
- `packages/shared-kernel/src/ontology/` (LOINC, ICD-10, SNOMED, RxNorm maps)

**When to build:** After `apps/enterprise/` needs the same functions. Extract incrementally, not speculatively.

**Effort saved:** 2-4 hours, ~800 LOC

### Comprehensive Clinical Rule Packs
**Why deferred:** MVP is DOAC safety only. Diabetes/CV risk not in critical path.

**What was planned:**
- Diabetes screening rules (ADA 2025)
- Cardiovascular risk scoring (CHA2DS2-VASc, HAS-BLED)
- Lab critical values
- Stale data policies for 7 lab types
- Functional reference ranges (Ferritin, TSH, Vitamin D, etc.)
- Ontology maps with 170 codes

**What we're building:** 20 DOAC rules with 15 ontology codes (CrCl, PT/INR, Hgb, Platelets, Creatinine + 4 DOACs + 6 interacting drugs)

**Effort saved:** 2-4 hours, ~600 LOC

---

## SECTION 7: WHAT "MVP COMPLETE" LOOKS LIKE

When both agents finish and verification passes:

| Feature | Status | Proof of Success |
|---------|--------|------------------|
| **DOAC safety checks** | ✅ WORKING | Golden test: CrCl=12 + rivaroxaban → BLOCK |
| **Attestation gating** | ✅ WORKING | Golden test: Labs 73h old → ATTESTATION_REQUIRED |
| **Override enforcement** | ✅ WORKING | API returns 400 without reasonCode |
| **Governance logging** | ✅ WORKING | All patient data access logged with traceId |
| **KPI dashboard** | ✅ WORKING | 4 KPIs render with current values |
| **Date filtering** | ✅ WORKING | Filter updates all 4 KPIs |
| **Override ranking** | ✅ WORKING | Reasons ranked by count descending |

**What you DON'T have yet (and that's OK):**
- ❌ Reminders (deferred)
- ❌ Config persistence UI (deferred)
- ❌ Comprehensive rule packs (deferred)
- ❌ Shared kernel package (deferred)
- ❌ Week-over-week trends (deferred)

**The ruthless truth:** You have the ONE feature that proves the business model. Everything else can wait.

---

## SECTION 8: POST-MVP CHECKLIST

After both agents complete:

```bash
# 1. Update delivery backlog
# Check off completed tasks in docs/CORTEX_DELIVERY_BACKLOG_V1.md:
# - [x] A1: Deterministic DOAC rule executor
# - [x] A2: Attestation gating
# - [x] A3: Override reason enforcement
# - [x] A4: Event context enrichment
# - [x] B1: KPI dictionary
# - [x] B2: Console filtering
# - [x] B3: Override ranking

# 2. Tag the release
git tag -a mvp-cortex-v1.0 -m "MVP: DOAC Safety + KPI Console"

# 3. Update project map
pnpm run update-map

# 4. Generate evidence pack (manual for now, no script yet)
# - Export last 7 days of GovernanceEvent table to CSV
# - Screenshot KPI dashboard
# - Screenshot DOAC BLOCK example
# - Compile into `evidence-pack-v1.zip`

# 5. Pilot readiness checklist
# - [ ] 20 test patients loaded in database
# - [ ] Elena (CMO) reviewed all 20 DOAC rules
# - [ ] Legal approved governance event format
# - [ ] Monitoring/alerting configured (Sentry, Datadog, etc.)
```

---

## FINAL NOTES

### What Changed from the Original Plan

**Before (6-agent plan):**
- 14-23 hours estimated
- 3,500 LOC
- Shared kernel package (800 LOC)
- Reminders with retry/escalation (500 LOC)
- Cross-cutting tasks (300 LOC)
- 7 clinical rule packs (600 LOC)

**After (2-agent plan):**
- 7-10 hours estimated
- 1,500 LOC
- 55% reduction in complexity
- Direct path to shipping the pilot

### The Principle

**You don't build architecture upfront. You discover it through shipping real features.**

The shared kernel will emerge naturally when `apps/enterprise/` needs the same DOAC evaluator. The reminder system will be built when the pilot proves patients respond to them. The traceability matrix will be generated when compliance audits demand it.

**Until then: build features, ship code, learn fast.**

---

**This is not a prototype. This is a pilot-ready MVP.**

Coordinate the agents. Ship the pilot. Save lives.
