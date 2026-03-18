# CORTEX HEALTH — MASTER EXECUTION PROMPT v2.0
## Parallel Agent Orchestration Plan
## For Claude Code CLI · Opus 4.6 (1M context)
## ~/prototypes/holilabsv2/apps/web

---

## ORCHESTRATION MODEL

This prompt runs **two parallel tracks** using multiple Claude CLI agents:

```
TRACK A: MVP LOCKDOWN (Serial — one agent, blocking)
  └─ Get the product tight, deployable, and pilot-ready

TRACK B: VISION UPGRADE (Parallel — multiple agents, non-blocking)
  └─ Regulatory, EHR, CSL, pricing — all run concurrently once Track A gates clear
```

**WHY TWO TRACKS:** Nothing in Track B matters if the MVP can't pass a live demo. Track A is a 4-6 hour sprint that makes the product deployable. Track B is a 12-month strategic build that runs in parallel once the foundation is solid.

**HOW TO USE:** Open one terminal for Track A. Once Track A completes Unit A.3, open 3-4 additional terminals for Track B workstreams. Each agent gets its own workstream section below.

---

## RESOLVED OPEN QUESTIONS

The previous prompt flagged four blocking questions. Here are the working defaults — override any of these by telling the agent directly:

### 1. ANVISA Classification — Working Assumption
**Default:** Treat TLP as CDS-exempt (advisory only, physician always decides). Treat CDRM and DAS as Class II SaMD. File Consulta Previa to confirm within 4 weeks. All code carries `@anvisaClassification()` annotations from day one so reclassification is a metadata change, not a refactor.

### 2. Burn Rate & Runway — Working Assumption
**Default:** Assume 18-month runway from current funding. The Month 3 gate review checks "6+ months remaining." If Nico provides actual numbers, update `docs/finance/runway-model.md`. Until then, optimize for capital efficiency: AWS spot instances, free-tier services where possible, no full-time hires until Month 4.

### 3. EHR Vendor Priority — Decision
**Default: Philips Tasy first.** Rationale: largest installed base in Brazilian private hospitals (our beachhead segment), most mature FHIR R4 API, existing developer sandbox program. MV Sistemas second (SUS/public hospital coverage). Pixeon third (imaging-heavy facilities). Build the FHIR abstraction layer vendor-agnostic so switching costs are near zero.

### 4. Clinical Validation Study PI — Working Assumption
**Default:** Target USP Hospital das Clínicas (largest academic hospital in Latin America, strong research culture). Identify the head of the Informatics or Emergency Medicine department. If no response within 3 weeks, pivot to UNIFESP then Beneficencia Portuguesa. The Clinical Advisory Board recruitment (Unit B4.7) runs in parallel and may surface the PI faster than cold outreach.

---

## CODEBASE CONTEXT

```
Stack:           Next.js 14 + Prisma + Vue.js components
Build:           pnpm build exits 0 ✅
Tests:           4,756/4,991 passing (95%), 120 failing suites remaining
MVP Units:       1-3 complete, Unit 4 (tests) 50%, Unit 5 (invite flow) not started
Infrastructure:  DigitalOcean + Sentry + PostHog
Governance:      CLAUDE.md Cortex Boardroom protocol (8 personas, veto hierarchy)
```

---

## GOVERNANCE — READ BEFORE EVERY SESSION

```bash
# MANDATORY: Read these two files before writing ANY code
cat CLAUDE.md                          # Boardroom protocol, veto invariants, jest rules
cat .cursor/rules/ROUTER.md            # Agent routing and conflict resolution
```

**Veto holders (can block any merge):**
- **RUTH** (CLO, Rank 1): LGPD, ANVISA, consent — supreme veto
- **ELENA** (CMO, Rank 2): Clinical safety, biomarker validity — supreme veto
- **CYRUS** (CISO, Rank 2): RBAC, PII encryption, audit trail — supreme veto
- **QUINN** (QA, Rank 4): Test gates, CI health — quality gate

---

## PRE-FLIGHT CHECKLIST (Run before EVERY unit)

```bash
# 1. Build check
pnpm build 2>&1 | tail -5

# 2. Test state
pnpm test 2>&1 | tail -20

# 3. Clean working tree
git status --short | head -10

# 4. Read governance
head -50 CLAUDE.md
```

If build fails → fix before proceeding.
If git dirty → stash or commit before starting.

---

# ═══════════════════════════════════════════
# TRACK A: MVP LOCKDOWN
# Serial execution. One agent. Complete all units before opening Track B.
# Target: 4-6 hours to a demo-ready product.
# ═══════════════════════════════════════════

## UNIT A.1 — Fix Remaining Test Failures

**Priority:** P0 — BLOCKING (nothing else runs until this clears)
**Persona:** QUINN (QA Lead)
**Time estimate:** 2-3 hours
**Current state:** 120 failing suites, 232 failed tests / 4,991 total

**Strategy: Fix root causes, not individual tests.**

```bash
# Step 1: Identify failure categories
pnpm test 2>&1 | grep "FAIL" | head -40

# Step 2: Group by root cause
# Category A: Missing jest.mock() — usually Prisma, logger, route guards
# Category B: Import path drift — ESM/CJS, missing @/ aliases
# Category C: Stale snapshots — pnpm test -- -u for affected suites
# Category D: Ambiguous selectors — getByText matching multiple elements
# Category E: Missing env vars in test context
```

**Jest Mocking Rules (MANDATORY — from CLAUDE.md):**
```typescript
// ✅ CORRECT: Mock first, then require
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
  },
}));
const { prisma } = require('@/lib/prisma');
// NEVER use ES6 import to resolve mocked modules
```

**Exit criteria:** Failing suites < 20. Run full suite, verify no regressions.

**Commit:**
```
fix(tests): reduce failing test suites from 120 to <N>

Systematic mock fixes across [categories]. One root-cause fix per batch.
Remaining <N> failures are [description] and do not block pilot deployment.
```

---

## UNIT A.2 — Verify Pilot Invite Flow End-to-End

**Priority:** P0 — BLOCKING
**Persona:** PAUL (CPO) + CYRUS (CISO)
**Time estimate:** 1-2 hours

**Trace the critical path:**
1. `src/app/(auth)/` — find waitlist signup and admin approval pages
2. `src/app/api/` — find invite/approval API routes
3. Find Resend email integration (`@/lib/resend` or similar)
4. Find token generation + validation logic

**Verify the complete flow:**
```
Waitlist signup → Admin approval → Resend email sent → Token in link →
User clicks → Account created → Redirect to /dashboard/clinical-command
```

**CYRUS gates:**
- [ ] Only admin roles can approve invites (`createProtectedRoute` guard in place)
- [ ] Token is single-use, time-limited, cryptographically random
- [ ] No PII leaked in URL parameters

**Write or fix tests for the critical path. Then manually walk through with `pnpm dev`.**

**Commit:**
```
feat(auth): verify and harden pilot invite flow end-to-end

[What was verified/fixed]. Token validation, RBAC guards confirmed.
Pilot onboarding path functional for first hospital partners.
```

---

## UNIT A.3 — MVP Hardening Sweep

**Priority:** P0 — BLOCKING (last gate before Track B opens)
**Persona:** ARCHIE (CTO) + QUINN (QA)
**Time estimate:** 1-2 hours

This unit does a final sweep to make the product demo-ready:

1. **Dead route audit:** Find any routes that 404 or throw unhandled errors.
   ```bash
   grep -r "createProtectedRoute\|router\." src/app/api/ | head -30
   ```
2. **Console.log cleanup:** Remove all `console.log` from production code paths.
   ```bash
   grep -rn "console\.log" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "node_modules" | head -20
   ```
3. **Environment variable audit:** Ensure all required env vars have defaults or clear error messages.
4. **Error boundary check:** Verify React error boundaries wrap major page sections.
5. **Loading states:** Ensure no blank screens during data fetches on critical paths (dashboard, patient view, clinical command).
6. **Mobile viewport:** Quick check that `/dashboard/clinical-command` doesn't break on tablet width (768px).

**Exit criteria:** A non-technical person can walk through: login → dashboard → patient view → clinical command without hitting an error, blank screen, or confusing UI state.

**Commit:**
```
fix(mvp): hardening sweep — dead routes, console cleanup, error boundaries

[Specific fixes]. Product now demo-ready for pilot hospital walkthrough.
```

---

## TRACK A GATE: MVP LOCKDOWN COMPLETE

Before opening Track B, verify ALL of these:
```
[ ] pnpm build exits 0
[ ] pnpm test: <20 failing suites
[ ] Invite flow works end-to-end (manual verification)
[ ] No console.log in production code
[ ] Dashboard loads without errors on desktop and tablet
[ ] Git is clean, all changes committed
```

**If gate passes:** Open Track B terminals. Each workstream gets its own agent.
**If gate fails:** Fix the failing items. Do not proceed to Track B.

---

# ═══════════════════════════════════════════
# TRACK B: VISION UPGRADE
# Parallel execution. Each workstream runs in its own CLI agent.
# Start ONLY after Track A gate passes.
# ═══════════════════════════════════════════

Track B has four independent workstreams that can run simultaneously:

```
WORKSTREAM B1: Regulatory & Compliance    (RUTH + CYRUS)
WORKSTREAM B2: EHR Integration            (ARCHIE)
WORKSTREAM B3: CSL Simulation Engine      (ARCHIE + ELENA + CYRUS)
WORKSTREAM B4: Commercial & GTM           (VICTOR + GORDON + ELENA)
```

**Dependency rule:** B3 depends on nothing in B1/B2/B4. B1 and B2 and B4 are fully independent of each other. The only convergence point is the Month 3 Gate Review.

To launch, open four terminals:

```bash
# Terminal 1 — Workstream B1
claude --prompt "Read CSL-MASTER-PROMPT-V2.md. Execute WORKSTREAM B1 starting from Unit B1.1."

# Terminal 2 — Workstream B2
claude --prompt "Read CSL-MASTER-PROMPT-V2.md. Execute WORKSTREAM B2 starting from Unit B2.1."

# Terminal 3 — Workstream B3
claude --prompt "Read CSL-MASTER-PROMPT-V2.md. Execute WORKSTREAM B3 starting from Unit B3.1."

# Terminal 4 — Workstream B4
claude --prompt "Read CSL-MASTER-PROMPT-V2.md. Execute WORKSTREAM B4 starting from Unit B4.1."
```

---

## WORKSTREAM B1: REGULATORY & COMPLIANCE

**Owner personas:** RUTH (CLO) + CYRUS (CISO)
**Strategic docs:** PRD REQ-R01, REQ-R02, REQ-R03 | MBA Strategy Sections 1.2, 1.6
**Risk docs:** RISK-001, RISK-002, RISK-010

### Unit B1.1 — ANVISA Regulatory Documentation [REQ-R01, REQ-R03]

**Reference:** `risk-mitigation/RISK-002-anvisa-samd-classification-analysis.md`

1. Read RISK-002 mitigation doc + PRD Section 6.1.
2. Create `docs/regulatory/` directory:
   - `anvisa-classification-memo.md` — Working classification: TLP=CDS-exempt, CDRM=Class II, DAS=Class II-III
   - `technical-file-scope.md` — ISO 14971 risk analysis structure, intended use statement
   - `cds-exemption-analysis.md` — 4-part CDS exemption test for TLP
3. Create `docs/regulatory/cfm/`:
   - `cfm-alignment-checklist.md` — CFM Resolution 2227/2018 compliance
   - `liability-allocation.md` — Physician vs Cortex responsibility matrix
4. Build compliance annotation middleware:
   ```typescript
   // Every clinical-influence route must carry this
   export function anvisaClassification(classification: 'CDS-exempt' | 'Class-II-advisory' | 'Class-II-diagnostic' | 'Class-III') {
     return (req, res, next) => {
       // Log classification + route to AuditLog
       // Attach classification metadata to response headers
     }
   }
   ```
5. Apply annotations to all existing clinical API routes.

**Acceptance criteria (from PRD REQ-R01):**
- [ ] Classification analysis documented
- [ ] Technical file structure initiated
- [ ] Consulta Previa request letter drafted
- [ ] CDS exemption pathway evaluated
- [ ] All clinical routes carry `@anvisaClassification` annotation

**Commit:** `feat(regulatory): ANVISA classification documentation and route annotations`

---

### Unit B1.2 — LGPD Compliance Framework [REQ-R02]

**Reference:** `risk-mitigation/RISK-001-lgpd-cloud-gpu-audit.md` + `risk-mitigation/RISK-010-consent-ux-specification.md`

1. Read both reference docs + PRD REQ-R02.
2. Map ALL PHI data flows: every Prisma model with PII, every API route that reads/writes PII, every third-party sub-processor.
3. Create `docs/compliance/lgpd/`:
   - `data-flow-audit.md` — Complete PHI flow map
   - `dpa-template-pt.md` — Data Processing Agreement in Portuguese
   - `baa-template-en.md` — Business Associate Agreement for US contracts
   - `breach-notification-protocol.md` — 72-hour LGPD breach procedure
   - `dpo-designation-plan.md` — DPO appointment plan
4. Implement three-type consent architecture (also needed by B3):
   - `TREATMENT_CONSENT` (existing)
   - `POPULATION_RESEARCH_CONSENT` (new)
   - `PREDICTION_SERVICE_CONSENT` (new)
5. Each consent individually toggleable and revocable. **RUTH VETO: Never collapse into single checkbox.**
6. Bilingual UI: Portuguese primary, English secondary.
7. Draft ANPD registration plan.

**Acceptance criteria (from PRD REQ-R02):**
- [ ] Data flow audit complete
- [ ] DPA template in Portuguese
- [ ] BAA template for US
- [ ] Consent: explicit, informed, unambiguous, revocable — 3 separate types
- [ ] DPO designation plan
- [ ] Breach notification protocol documented
- [ ] ANPD registration plan drafted

**Commit:** `feat(compliance): LGPD framework with granular three-type consent architecture`

---

## WORKSTREAM B2: EHR INTEGRATION

**Owner persona:** ARCHIE (CTO)
**Strategic docs:** PRD REQ-E01 | MBA Strategy Section 1.3
**Decision:** Philips Tasy first, MV Sistemas second, Pixeon third

### Unit B2.1 — FHIR R4 Abstraction Layer [REQ-E01]

1. Read PRD REQ-E01.
2. Create `packages/ehr-integration/`:
   ```
   packages/ehr-integration/
   ├── src/
   │   ├── interface/
   │   │   ├── ehr-client.ts          # Vendor-agnostic interface
   │   │   ├── fhir-r4-client.ts      # FHIR R4 implementation
   │   │   └── hl7v2-parser.ts        # HL7v2 ADT/ORU message parsing
   │   ├── vendors/
   │   │   ├── tasy/                   # Philips Tasy adapter
   │   │   ├── mv-sistemas/            # MV adapter (stub)
   │   │   └── pixeon/                 # Pixeon adapter (stub)
   │   ├── resources/
   │   │   ├── patient.ts              # FHIR Patient resource handler
   │   │   ├── observation.ts          # FHIR Observation
   │   │   ├── medication-request.ts   # FHIR MedicationRequest
   │   │   └── allergy-intolerance.ts  # FHIR AllergyIntolerance
   │   └── sync/
   │       ├── inbound.ts              # EHR → Cortex data sync
   │       └── outbound.ts             # Cortex recommendations → EHR
   ├── tests/
   │   ├── fhir-client.test.ts
   │   ├── hl7v2-parser.test.ts
   │   └── tasy-adapter.test.ts
   └── package.json
   ```
3. **Vendor-agnostic interface** — switching from Tasy to MV should require only a new adapter, not pipeline changes.
4. FHIR R4 resources: Patient, Observation, MedicationRequest, AllergyIntolerance.
5. HL7v2 ADT (admission/discharge/transfer) and ORU (observation result) message parsing.
6. Bidirectional: read patient data IN, write CDSS recommendations OUT.
7. Create `docs/ehr/rnds-connector-scope.md` — scope document for RNDS (Brazil national health data network) integration in Phase 2.

**Acceptance criteria (from PRD REQ-E01):**
- [ ] Vendor-agnostic EHR client interface defined
- [ ] Tasy adapter implemented with mock data
- [ ] FHIR R4 resource handlers for 4 resource types
- [ ] HL7v2 ADT/ORU parsing functional
- [ ] MV and Pixeon stubs in place
- [ ] Tests pass for all handlers

**Commit:** `feat(ehr): FHIR R4 abstraction layer with Philips Tasy primary adapter`

---

### Unit B2.2 — Safety Firewall: Tiered Alert Architecture [REQ-E02]

**Reference:** MBA Strategy Section 1.7, PRD REQ-E02
**Personas:** ARCHIE (CTO) + ELENA (CMO)

1. Read PRD REQ-E02.
2. Implement four-tier severity system:
   - **Critical:** Hard-stop + documented override (2-click max)
   - **High:** Interruptive + logged override
   - **Medium:** Passive in-workflow notification
   - **Low:** On-demand reference
3. Five Rights validation: right information, right person, right channel, right format, right time.
4. Real-time monitoring console: override rates per tier, alert fatigue trending.
5. Governance interface: clinical committee adjusts tier assignments without engineering.
6. Target: <30% override for Critical, <50% for High.

**Commit:** `feat(safety): four-tier alert architecture with Five Rights validation`

---

## WORKSTREAM B3: CSL SIMULATION ENGINE

**Owner personas:** ARCHIE (CTO) + ELENA (CMO) + CYRUS (CISO)
**Strategic docs:** Summit decisions | All 16 risk mitigation docs
**Architecture:** Mesa (NOT OASIS) per RISK-006 ADR

### Unit B3.1 — Self-Hosted LLM Inference Endpoint

**Reference:** `risk-mitigation/RISK-001-lgpd-cloud-gpu-audit.md` + `RISK-004-gpu-compute-vendor-review.md`

1. Read both reference docs.
2. Create `packages/csl-inference/`:
   - Docker Compose for vLLM serving Llama 3.3 70B (AWQ 4-bit quantized)
   - Target: AWS sa-east-1 (São Paulo)
   - **LGPD Art. 33: NO data leaves Brazilian jurisdiction**
3. `packages/csl-inference/config.ts`:
   - Jurisdiction validation: endpoint must resolve to BR IP range
   - Model version pinning (exact checkpoint hash)
   - Temperature: 0.0 for agent logic, 0.7 for report narrative
4. Tests: non-BR endpoints rejected, model version pinned, temperature overrides blocked for agent calls.
5. RUTH sign-off annotation on endpoint config.

**LGPD checklist (all true before merge):**
- [ ] Endpoint resolves to Brazilian IP
- [ ] No data to Alibaba Qwen-Plus or external APIs
- [ ] Model weights on Brazilian infrastructure
- [ ] Every call logged in AuditLog with jurisdiction metadata
- [ ] Alert for non-BR IP resolution

**Commit:** `feat(csl): self-hosted LLM inference endpoint for LGPD compliance`

---

### Unit B3.2 — Synthetic Patient Profile Generator

**Reference:** `risk-mitigation/RISK-003-reidentification-prevention-spec.md` + `RISK-008-simulation-abuse-prevention.md`

1. Read both reference docs.
2. Create `packages/csl-agent-factory/` (Python):
   ```
   src/
   ├── distribution_extractor.py    # Anonymized stats from CDSS DB
   ├── differential_privacy.py      # OpenDP Laplace, ε ≤ 1.0
   ├── agent_generator.py           # Synthetic agent JSON profiles
   ├── schema_validator.py          # Typed schema, no free text
   └── output_sanitizer.py          # CPF/CNS/RG pattern detection
   ```
3. Agent profile schema — **STRICT TYPING, zero free-text fields:**
   ```json
   {
     "age": "integer 0-120",
     "sex": "enum: M/F",
     "comorbidities": "array of ICD-10 enum",
     "bmi_category": "enum: underweight/normal/overweight/obese",
     "adherence_propensity": "float 0.0-1.0",
     "care_seeking_frequency": "enum: low/medium/high",
     "socioeconomic_proxy": "enum: A/B/C/D/E (IBGE)",
     "geographic_zone": "enum from approved list"
   }
   ```
4. Differential privacy: OpenDP Laplace. ε = 0.8 for n < 500, ε = 1.5 for n ≥ 500.
5. Hard floor: n < 50 → return `INSUFFICIENT_POPULATION_DATA`.
6. ELENA gate: No impossible biomarker combos (pediatric + age > 18, pregnant + M).
7. CYRUS gate: Zero PHI in profiles or intermediates. Output sanitizer catches CPF/CNS/RG patterns.

**Commit:** `feat(csl): synthetic patient generator with differential privacy`

---

### Unit B3.3 — Mesa Simulation Engine Foundation

**Reference:** `risk-mitigation/RISK-006-oasis-framework-adr.md`

**CRITICAL: Mesa, NOT OASIS.** Read the full ADR before writing any code.

1. Create `packages/csl-simulation/` (Python):
   ```
   src/engine/
   ├── base_model.py          # Mesa Model subclass
   ├── patient_agent.py       # Mesa Agent with clinical behavior
   ├── environment.py         # Hospital/community model
   └── scheduler.py           # Deterministic activation scheduler
   src/behaviors/
   ├── triage_presentation.py # Present to ED
   ├── medication_adherence.py# Take/skip medication
   ├── symptom_escalation.py  # Symptoms worsen/improve
   └── care_seeking.py        # Seek/avoid care
   src/interface/
   ├── simulation_runner.py   # Orchestration
   └── report_generator.py    # Prediction reports
   src/audit/
   └── simulation_audit.py    # AuditLog integration
   ```
2. **Design principles:**
   - **Deterministic:** `random_seed` param. Same seed + input = identical output.
   - **Rule-based:** Agent behavior from clinical literature probabilities, NOT LLM calls. LLM only for post-simulation report narrative.
   - **Provenance:** Every output carries `sourceAuthority`, `simulationRunId`, `agentCount`, `randomSeed`, `modelVersion`.
   - **Abstraction layer:** `SimulationEngine` interface that Mesa implements. Swap to AgentScope later without product changes.
3. Implement TLP (Triage Load Predictor) model first:
   - Input: N synthetic agents + environment signals (season, day of week, holiday)
   - Simulation: Each agent probabilistically presents to ED in 8-hour windows over 72 hours
   - Output: P1-P5 arrival distributions per window with confidence intervals from N runs

**Commit:** `feat(csl): Mesa-based simulation engine with TLP model`

---

### Unit B3.4 — SimulationRun Audit Trail

**Reference:** `risk-mitigation/RISK-008-simulation-abuse-prevention.md`
**Personas:** CYRUS (CISO) + QUINN (QA)

1. Add `SimulationRun` model to Prisma schema:
   ```prisma
   model SimulationRun {
     id              String   @id @default(cuid())
     tenantId        String
     runType         String   // "TLP" | "CDRM" | "DAS"
     agentCount      Int
     randomSeed      Int
     seedDataVersion String
     modelVersion    String
     legalBasis      String   // MANDATORY — RUTH invariant
     initiatedBy     String
     startedAt       DateTime
     completedAt     DateTime?
     outputHash      String?  // SHA-256 of output
     status          String   // "running" | "completed" | "failed" | "aborted"
     createdAt       DateTime @default(now())
     updatedAt       DateTime @updatedAt
     auditLogs       AuditLog[]
     tenant          Tenant   @relation(fields: [tenantId], references: [id])
     @@index([tenantId])
     @@index([status])
   }
   ```
2. Hash-chain integrity: linked into existing AuditLog hash chain. **Records NEVER destroyed.**
3. Run migration: `npx prisma migrate dev --name add_simulation_run_model`
4. Tests: creation with all fields, rejection if legalBasis missing, tenant isolation, hash-chain verification.

**Commit:** `feat(csl): SimulationRun audit trail with hash-chain integrity`

---

### Unit B3.5 — TLP Pipeline + API + Dashboard Widget

Wire the full pipeline and expose it:

1. `packages/csl-pipeline/` — Seed Builder → Agent Factory → Mesa Simulation → Report Generator
2. API: `POST /api/csl/simulation/tlp` — `createProtectedRoute`, hospital admin only
3. Rate limit: 10 runs/tenant/24h (CYRUS)
4. Dashboard widget in `src/components/csl/TLPWidget.tsx`:
   - 72-hour forecast by severity tier (P1-P5) with confidence bands
   - "Explain this prediction" drill-down
   - **Mandatory:** `SIMULATION — Population Level` badge (always visible)
   - **During pilot:** Amber `PILOT VALIDATION MODE` banner
   - Confidence intervals on every prediction
   - LGPD consent disclosure on first use
5. Every call writes to SimulationRun audit trail.

**Commit:** `feat(csl): TLP pipeline, API endpoint, and dashboard widget`

---

## WORKSTREAM B4: COMMERCIAL & GTM

**Owner personas:** VICTOR (CSO) + GORDON (CFO) + ELENA (CMO)
**Strategic docs:** PRD REQ-G01-G05, REQ-C01-C02 | MBA Strategy Sections 1.4, 1.5, 2.1-2.4

### Unit B4.1 — Value-Based Pricing Model [REQ-G01, REQ-G02]

1. Read PRD REQ-G01 and REQ-G02.
2. Build pricing models:
   - **Hospital:** $50-150K implementation + $5-25K/mo + performance bonus
   - **Operadora:** 30% sinistralidade reduction share with hybrid option
   - **Segments:** Large private (R$25-30K/mo), Mid-size (R$10-15K/mo), SUS/Teaching (R$3-5K/mo)
3. ROI calculator: input hospital size, admissions, complication rates → annual savings.
4. Operadora 3-scenario model for top 5 by member count.
5. TAM/SAM/SOM validation: $100-200M TAM, $50-80M SAM, $5-10M 3-year SOM.
6. Create as interactive HTML dashboard or spreadsheet in `docs/commercial/`.

**Commit:** `feat(commercial): value-based pricing model with ROI calculator`

---

### Unit B4.2 — Clinical Validation Study Infrastructure [REQ-E03, REQ-C01]

1. Read PRD REQ-E03 and REQ-C01.
2. Build study data capture module:
   - Fields: CDSS recommendation, physician consensus, patient outcome, time-to-diagnosis
3. Metrics: sensitivity, specificity, PPV, NPV, ROC-AUC, alert acceptance rate.
4. De-identification pipeline: LGPD-compliant anonymization for research export.
5. Dashboard: enrollment tracking, interim analysis.
6. Target: 50-100 cases at USP Hospital das Clínicas.
7. **Hard stop: AUC < 0.75 → pause commercial deployment.**

**Commit:** `feat(validation): clinical study infrastructure with de-id pipeline`

---

### Unit B4.3 — Beachhead Hospital Pipeline [REQ-G03, REQ-C02]

**Reference:** `risk-mitigation/RISK-005-competitive-intelligence-brief.md`

1. Read RISK-005 competitive brief.
2. Build target list: 10-15 academic hospitals in São Paulo and Rio (150-500 beds).
3. Top 3 with named clinical champions: USP, UNIFESP, Beneficencia Portuguesa.
4. Engagement sequence (relationship-first, Brazilian culture).
5. CMO-first consultative sales scripts.
6. Map top 5 operadora decision-makers for Phase 2 bridge.
7. Clinical Advisory Board: recruit 3-5 physicians by Month 2.
8. Create all materials in `docs/commercial/pipeline/`.

**Commit:** `feat(commercial): beachhead hospital pipeline and advisory board plan`

---

### Unit B4.4 — Pilot Agreement Template

**Reference:** `risk-mitigation/RISK-013-pilot-reputation-runbook.md`

1. Research-phase language, validation-only framing.
2. Nominal R$1,500/month pilot pricing.
3. Outcome-linked bonus structure.
4. Liability allocation per `docs/regulatory/cfm/liability-allocation.md`.
5. Create in `docs/commercial/pilot-agreement-template.md`.

**Commit:** `feat(commercial): pilot agreement template with research-phase framing`

---

# ═══════════════════════════════════════════
# GATE REVIEWS
# ═══════════════════════════════════════════

## MONTH 3 GATE REVIEW

All four workstreams converge here. **ALL** must pass to proceed:

```
B1: [ ] ANVISA classification documented, Consulta Previa filed
    [ ] LGPD data flow audit complete, DPA templates ready
    [ ] Consent architecture implemented (3 types, individually revocable)

B2: [ ] EHR: Philips Tasy adapter functional with mock data
    [ ] Safety Firewall: 4-tier severity system implemented
    [ ] HL7v2 ADT/ORU parsing functional

B3: [ ] CSL: Mesa simulation engine running TLP model deterministically
    [ ] Differential privacy verified (OpenDP, ε ≤ 1.0)
    [ ] SimulationRun audit trail with hash-chain integrity
    [ ] TLP dashboard widget with PILOT VALIDATION MODE banner

B4: [ ] Pricing model built, ROI calculator functional
    [ ] Clinical validation infrastructure ready
    [ ] 3+ Advisory Board members recruited
    [ ] Pipeline: 5+ hospitals in engagement

META: [ ] 6+ months runway remaining (update docs/finance/runway-model.md)
      [ ] pnpm build exits 0, <20 failing test suites
```

**If any gate fails:** See MBA Strategy "Phase 1 Gate Review" for fail actions.

---

## MONTH 6 GATE REVIEW

```
[ ] EHR bidirectional demo working (1 vendor)
[ ] Clinical validation: 10+ cases enrolled
[ ] Pricing validated (2+ hospitals positive)
[ ] Operadora financial model complete
[ ] Safety Firewall operational
[ ] CDRM (Cohort Deterioration Risk Map) model running
```

---

## MONTH 12 GATE REVIEW

```
[ ] 1-2 hospitals live with outcomes data
[ ] 1+ operadora in pilot proposal stage
[ ] Validation: AUC ≥ 0.75, manuscript submitted
[ ] ANVISA submission filed
[ ] Series A pitch deck with real data
[ ] DAS (Drug Adherence Simulation) model functional
```

---

# ═══════════════════════════════════════════
# GLOBAL RULES (Apply to EVERY agent, EVERY unit)
# ═══════════════════════════════════════════

1. **Read `CLAUDE.md` before every session.** Boardroom protocol, veto invariants, jest rules.
2. **Read relevant `risk-mitigation/RISK-NNN-*.md`** before any unit that references it.
3. **Conventional Commits only.** `type(scope): description`
4. **Never `git push`.** Human-only.
5. **Never commit with `console.log`, hardcoded secrets, dead code, or TODO markers.**
6. **All simulation code carries provenance:** `sourceAuthority`, `simulationRunId`, `agentCount`, `modelVersion`.
7. **All routes have `createProtectedRoute` RBAC guard.**
8. **All PHI encrypted with `encryptPHIWithVersion`.** Simulation code never touches PHI — enforce anyway.
9. **Circuit breaker:** 3 consecutive failures → HALT → emit `CIRCUIT_BREAKER_TRIPPED` → await human.
10. **Post-implementation verification:** After UI changes, emit `MANUAL VERIFICATION` block with URL, Target Node, Expected State.
11. **Workstream isolation:** Each agent stays in its own workstream. If you need something from another workstream, document the dependency and move on — do NOT modify files owned by another workstream.

---

# ═══════════════════════════════════════════
# REFERENCE DOCUMENTS
# ═══════════════════════════════════════════

| Document | Path |
|----------|------|
| PRD: Market Entry | `Cortex_Health_PRD_Market_Entry.docx` |
| MBA Strategy | `Cortex_MBA_Strategy_Implementation_Proposal.docx` |
| 3-Day Summit | `cortex-boardroom-summit-march-2026.md` |
| Risk Register | `cortex-swarm-layer-risk-register-march-2026.md` |
| RISK-001 | `risk-mitigation/RISK-001-lgpd-cloud-gpu-audit.md` |
| RISK-002 | `risk-mitigation/RISK-002-anvisa-samd-classification-analysis.md` |
| RISK-003 | `risk-mitigation/RISK-003-reidentification-prevention-spec.md` |
| RISK-004 | `risk-mitigation/RISK-004-gpu-compute-vendor-review.md` |
| RISK-005 | `risk-mitigation/RISK-005-competitive-intelligence-brief.md` |
| RISK-006 | `risk-mitigation/RISK-006-oasis-framework-adr.md` |
| RISK-007 | `risk-mitigation/RISK-007-pilot-economics-model.md` |
| RISK-008 | `risk-mitigation/RISK-008-simulation-abuse-prevention.md` |
| RISK-009 | `risk-mitigation/RISK-009-clinical-trust-research-plan.md` |
| RISK-010 | `risk-mitigation/RISK-010-consent-ux-specification.md` |
| RISK-011 | `risk-mitigation/RISK-011-simulation-determinism-testing-strategy.md` |
| RISK-012 | `risk-mitigation/RISK-012-model-versioning-change-management.md` |
| RISK-013 | `risk-mitigation/RISK-013-pilot-reputation-runbook.md` |
| RISK-014 | `risk-mitigation/RISK-014-infrastructure-resilience-runbook.md` |
| RISK-015 | `risk-mitigation/RISK-015-oasis-license-review.md` |
| RISK-016 | `risk-mitigation/RISK-016-ci-test-tiering-strategy.md` |
| Status Follow-Up | `cortex-status-followup-march-18-2026.md` |

---

## HOW TO USE THIS PROMPT

**Step 1 — MVP Lockdown (one terminal):**
```bash
claude --prompt "Read CSL-MASTER-PROMPT-V2.md. Execute Track A starting from Unit A.1. Read CLAUDE.md first."
```

**Step 2 — After Track A gate passes, open parallel agents:**
```bash
# Terminal 1: Regulatory
claude --prompt "Read CSL-MASTER-PROMPT-V2.md. Execute WORKSTREAM B1. Read CLAUDE.md first."

# Terminal 2: EHR Integration
claude --prompt "Read CSL-MASTER-PROMPT-V2.md. Execute WORKSTREAM B2. Read CLAUDE.md first."

# Terminal 3: CSL Simulation
claude --prompt "Read CSL-MASTER-PROMPT-V2.md. Execute WORKSTREAM B3. Read CLAUDE.md first."

# Terminal 4: Commercial & GTM
claude --prompt "Read CSL-MASTER-PROMPT-V2.md. Execute WORKSTREAM B4. Read CLAUDE.md first."
```

**Step 3 — After each unit completes:**
```
Proceed to Unit [next number in workstream].
```

**Step 4 — At Month 3, reconvene all agents for gate review.**

---

*Master Prompt v2.0 — March 18, 2026*
*Parallel orchestration model with resolved open questions*
*Generated by Cortex Boardroom C-suite session*
