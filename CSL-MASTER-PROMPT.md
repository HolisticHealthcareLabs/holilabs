# CORTEX HEALTH — MASTER EXECUTION PROMPT
## Unified Strategic + Technical Execution Plan
## For Claude Code CLI · Opus 4.6 (1M context)
## ~/prototypes/holilabsv2/apps/web

---

**PURPOSE:** This prompt drives the complete Cortex Health execution plan — unifying three strategic documents into a single prioritized work sequence:

1. **PRD-001: Brazilian Healthcare CDSS Market Entry** (`Cortex_Health_PRD_Market_Entry.docx`) — 5 market-entry gaps, 25 requirements across regulatory, product, clinical, commercial, and team domains.
2. **MBA Strategy Implementation Proposal** (`Cortex_MBA_Strategy_Implementation_Proposal.docx`) — 3 rate-limiting gates, 25 initiatives sequenced across 12 months with go/no-go decision gates at Months 3, 6, and 12.
3. **Cortex Boardroom 3-Day Summit** (`cortex-boardroom-summit-march-2026.md`) — Cortex Swarm Layer (CSL) population simulation engine, 16-risk mitigation register with full deliverables.

Each work unit is ordered by business criticality and dependency. Complete them in sequence. Do not skip ahead.

**CONTEXT:** The holilabsv2 codebase is a Next.js + Prisma + Vue.js healthtech CDSS platform targeting Brazilian hospitals. The production build passes (`pnpm build` exits 0). 95% of tests pass (4,756/4,991). There are 120 remaining failing test suites. Units 1–3 of the MVP Pilot Launch are complete. Unit 4 (test fixes) is 50% done. Unit 5 (pilot invite flow) is not started.

**THE FIVE MARKET-ENTRY GAPS (from PRD-001):**
1. Regulatory gap — ANVISA SaMD classification not filed
2. Integration gap — No working EHR integration (Philips Tasy, MV Sistemas, Pixeon)
3. Evidence gap — No peer-reviewed clinical validation on Brazilian cohort
4. Pricing gap — Value-based model not validated with hospital/operadora customers
5. Competitive clock — 18–24 month window before EHR vendor envelopment

**THE THREE RATE-LIMITING GATES (from MBA Strategy):**
1. ANVISA Regulatory Pathway — 6–12 month lead time, blocks all commercial activity
2. EHR Integration — Without it, no hospital can deploy. 6 months to demo.
3. Clinical Validation Study — 50–100 cases, peer-reviewed publication, 12 months to completion

**THE CSL OPPORTUNITY (from Summit):** Build the Cortex Swarm Layer — a population simulation engine using Mesa + GraphRAG — that transforms the CDSS from reactive to predictive. This is the 18-month competitive moat play.

**CODEBASE GOVERNANCE:** All work follows the Cortex Boardroom protocol defined in `CLAUDE.md`. Read `CLAUDE.md` first. Then read `.cursor/rules/ROUTER.md` before activating any persona. All veto invariants from RUTH (legal), ELENA (clinical), and CYRUS (security) are binding. No code merges without QUINN's test gates.

**STRATEGIC DOCUMENTS — Read these before starting any phase:**
- `Cortex_Health_PRD_Market_Entry.docx` — Full PRD with requirements (REQ-R01 through REQ-T02)
- `Cortex_MBA_Strategy_Implementation_Proposal.docx` — Full MBA strategy with gate reviews
- `cortex-boardroom-summit-march-2026.md` — 3-Day Summit decisions
- `cortex-swarm-layer-risk-register-march-2026.md` — 16-risk register
- `risk-mitigation/RISK-001 through RISK-016` — Individual mitigation deliverables

---

## PRE-FLIGHT CHECKLIST

Before starting any work unit, run this sequence:

```bash
# 1. Verify build still passes
pnpm build 2>&1 | tail -5

# 2. Check current test state
pnpm test 2>&1 | tail -20

# 3. Verify git is clean
git status --short | head -10
```

If build fails, fix it before proceeding. If git is dirty, stash or commit before starting.

---

## EXECUTION SEQUENCE

> **Phases 0–1** stabilize the MVP and close the three rate-limiting gates from the MBA strategy.
> **Phases 2–5** build the Cortex Swarm Layer (CSL) from the Summit plan.
> **Phase 6** executes Market Entry (Phase 3 of the MBA strategy).
> Gate reviews at Months 3, 6, and 12 per the MBA Strategy document.

---

### PHASE 0 — STABILIZE THE FOUNDATION (Complete MVP Units 4 & 5)

These must complete before any other work begins. The CDSS platform is the substrate.

---

#### UNIT 0.1 — Fix Remaining Test Failures (Unit 4 completion)

**Priority:** P0 — Blocking
**Persona:** QUINN (QA Lead)
**Estimated time:** 2–3 hours
**Reference:** Current state: 120 failing suites, 232 failed tests out of 4,991 total

**Instructions:**

1. Run `pnpm test 2>&1 | grep "FAIL" | head -30` to identify the top failing suites.
2. Categorize failures into root causes:
   - Mock configuration issues (most common: missing `jest.mock()` for Prisma, logger, or route guards)
   - Import path errors (ESM/CJS mismatch, missing `@/` aliases)
   - Stale snapshot tests
   - Component selector issues (ambiguous `getByText` calls)
   - Missing environment variables in test context
3. Fix root causes, not individual tests. One mock fix should resolve 10–20 suites.
4. Target: reduce failing suites from 120 to <20. Absolute zero is not required for pilot, but <20 is the QUINN quality gate.
5. After each fix batch, run the full test suite and verify no regressions.

**Jest Mocking Rules (from CLAUDE.md — MANDATORY):**
```typescript
// ✅ CORRECT: Mock first, then require
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
  },
}));
const { prisma } = require('@/lib/prisma');
```

NEVER use ES6 `import` to resolve mocked modules.

**Commit when:** Failing suites < 20. Message format:
```
fix(tests): reduce failing test suites from 120 to N

Applied systematic mock fixes across [categories].
Remaining failures are [description] and do not block pilot.
```

---

#### UNIT 0.2 — Verify Pilot Invite Flow (Unit 5)

**Priority:** P0 — Blocking
**Persona:** PAUL (CPO) + CYRUS (CISO)
**Estimated time:** 1–2 hours

**Instructions:**

1. Trace the invite flow end-to-end:
   - `src/app/(auth)/` — find the waitlist and approval pages
   - `src/app/api/` — find the invite/approval API routes
   - Check for Resend email integration (`@/lib/resend` or similar)
   - Check token generation and validation logic
2. Verify RBAC: only admin roles can approve invites. Confirm `createProtectedRoute` guards are in place.
3. Verify the flow: waitlist signup → admin approval → email sent via Resend → token in email → user clicks link → account created → redirect to `/dashboard/clinical-command`
4. Write or fix tests for the critical path.
5. Manual verification: start the dev server (`pnpm dev`) and walk through the flow.

**Commit when:** Invite flow verified end-to-end. Message format:
```
feat(auth): verify and fix pilot invite flow end-to-end

[Description of what was verified/fixed].
Pilot onboarding path is now functional for first hospital partners.
```

---

### PHASE 0.5 — CLOSE THE THREE RATE-LIMITING GATES (MBA Strategy Phases 1 & 2)

These run in parallel with CSL work. They address the PRD's five market-entry gaps and the MBA Strategy's three blocking gates. Each unit maps to specific PRD requirements.

---

#### UNIT 0.5.1 — ANVISA Regulatory Pathway Initiation [REQ-R01, REQ-R03]

**Priority:** P0 — MUST HAVE (longest lead time, blocks all commercial activity)
**Persona:** RUTH (CLO)
**MBA Strategy ref:** Section 1.2 — Initiate ANVISA Regulatory Pathway
**PRD ref:** REQ-R01 (ANVISA SaMD Classification & Submission)
**Risk addressed:** RISK-002 (ANVISA SaMD classification)
**Reference doc:** `risk-mitigation/RISK-002-anvisa-samd-classification-analysis.md`

**Instructions:**
1. Read RISK-002 mitigation doc.
2. Read PRD Section 6.1 (REQ-R01, REQ-R02, REQ-R03) for full acceptance criteria.
3. Engage external Brazilian health regulatory counsel (per RISK-002 mitigation).
4. Create `docs/regulatory/` directory with:
   - `anvisa-classification-memo.md` — Analysis of Class II vs III under RDC 657/2022
   - `technical-file-scope.md` — Software documentation structure, intended use statement, risk analysis per ISO 14971
   - `cds-exemption-analysis.md` — 4-part test analysis for CDS exemption pathway
5. Create `docs/regulatory/cfm/` directory with:
   - `cfm-alignment-checklist.md` — Product compliance with CFM Resolution 2227/2018
   - `liability-allocation.md` — Physician vs Cortex responsibility matrix
6. Build the compliance annotation system into the codebase:
   - Every API route that influences clinical decisions must carry an ANVISA classification annotation
   - Implement as TypeScript decorator or middleware: `@anvisaClassification('Class-II-advisory')`

**PRD Acceptance Criteria (from REQ-R01):**
- [ ] ANVISA classification confirmed as Class II or III by Month 2
- [ ] Technical file structure initiated
- [ ] Pre-submission meeting with ANVISA requested by Month 4
- [ ] CDS exemption pathway evaluated in parallel

**Commit when:** Regulatory documentation structure created, classification annotations implemented.

---

#### UNIT 0.5.2 — LGPD Compliance Framework [REQ-R02]

**Priority:** P0 — MUST HAVE (blocks all hospital engagement)
**Persona:** RUTH (CLO) + CYRUS (CISO)
**MBA Strategy ref:** Section 1.6 — LGPD Compliance Audit + Contract Templates
**PRD ref:** REQ-R02 (LGPD Compliance Framework)
**Risk addressed:** RISK-001 (LGPD residency), RISK-010 (Consent architecture)
**Reference docs:**
- `risk-mitigation/RISK-001-lgpd-cloud-gpu-audit.md`
- `risk-mitigation/RISK-010-consent-ux-specification.md`

**Instructions:**
1. Read both reference docs + PRD REQ-R02.
2. Perform internal data handling audit: map ALL PHI flows, storage locations, sub-processors.
3. Create `docs/compliance/lgpd/` directory with:
   - `data-flow-audit.md` — Complete map of PHI flows in the system
   - `dpa-template-pt.md` — Data Processing Agreement template in Portuguese
   - `baa-template-en.md` — Business Associate Agreement for US-facing contracts
   - `breach-notification-protocol.md` — 72-hour LGPD breach notification procedure
   - `dpo-designation-plan.md` — Data Protection Officer appointment plan
4. Implement the three-type consent architecture from RISK-010 (also needed for CSL Phase 1).
5. ANPD registration plan drafted.

**PRD Acceptance Criteria (from REQ-R02):**
- [ ] Data flow audit complete
- [ ] DPA template drafted in Portuguese, reviewed by counsel
- [ ] BAA template for US contracts
- [ ] Consent mechanism: explicit, informed, unambiguous, revocable
- [ ] DPO appointed or designation plan established
- [ ] Breach notification protocol documented and tested
- [ ] ANPD registration completed

---

#### UNIT 0.5.3 — EHR Integration: Vendor Selection & FHIR Build [REQ-E01]

**Priority:** P0 — MUST HAVE (blocks all hospital deployments)
**Persona:** ARCHIE (CTO)
**MBA Strategy ref:** Section 1.3 — Select EHR Integration Partner + Begin Build
**PRD ref:** REQ-E01 (EHR Integration Primary Vendor)

**Instructions:**
1. Read PRD REQ-E01 for full acceptance criteria.
2. Evaluate: Philips Tasy, MV Sistemas, Pixeon, Wareline — select primary partner.
3. Build FHIR R4 server implementation:
   - Patient, Observation, MedicationRequest, AllergyIntolerance resources
   - HL7v2 ADT/ORU message parsing
4. Create `packages/ehr-integration/` directory with:
   - FHIR R4 resource handlers
   - HL7v2 message parser
   - Bidirectional data exchange layer (read patient data + write CDSS recommendations)
   - RNDS connector scope document (Phase 2)
5. Target: working bidirectional demo by Month 6.

**PRD Acceptance Criteria (from REQ-E01):**
- [ ] Primary EHR vendor selected by Month 1
- [ ] Multi-year API access agreement signed
- [ ] FHIR R4 server implementation started
- [ ] HL7v2 ADT/ORU parsing functional by Month 3
- [ ] Bidirectional demo by Month 6

---

#### UNIT 0.5.4 — Safety Firewall: Tiered Alert Architecture [REQ-E02]

**Priority:** P0 — MUST HAVE (no clinical deployment without this)
**Persona:** ARCHIE (CTO) + ELENA (CMO)
**MBA Strategy ref:** Section 1.7 — Alert Fatigue Architecture
**PRD ref:** REQ-E02 (Safety Firewall)

**Instructions:**
1. Read PRD REQ-E02 for full acceptance criteria.
2. Implement four-tier severity system:
   - Critical: hard-stop + documented override (2-click max)
   - High: interruptive + logged override
   - Medium: passive in-workflow notification
   - Low: on-demand reference
3. Five Rights validation engine: right information, right person, right channel, right format, right time.
4. Real-time safety monitoring console: override rates per tier, alert fatigue trending, e-iatrogenesis detection.
5. Governance interface: clinical committee adjusts tier assignments without engineering.
6. Target metrics: <30% override rate for Critical, <50% for High.

---

#### UNIT 0.5.5 — Clinical Validation Study Infrastructure [REQ-E03, REQ-C01]

**Priority:** P0 — MUST HAVE (the single most important sales enabler)
**Persona:** ELENA (CMO) + ARCHIE (CTO)
**MBA Strategy ref:** Section 1.4 — Design Clinical Validation Study
**PRD ref:** REQ-E03 (Validation Infrastructure), REQ-C01 (Validation Execution)

**Instructions:**
1. Read PRD REQ-E03 and REQ-C01 for full acceptance criteria.
2. Build study data capture module: CDSS recommendation, physician consensus, patient outcome, time-to-diagnosis.
3. Metrics calculation: sensitivity, specificity, PPV, NPV, ROC-AUC, alert acceptance rate.
4. De-identification pipeline: LGPD-compliant anonymization for research data export.
5. Dashboard: real-time study enrollment tracking, interim analysis capability.
6. Target: 50–100 cases at academic hospital partner (USP, UNIFESP, or Beneficencia Portuguesa).
7. Hard stop: If AUC < 0.75, pause commercial deployment.

---

#### UNIT 0.5.6 — Value-Based Pricing Model [REQ-G01, REQ-G02]

**Priority:** P0 — MUST HAVE
**Persona:** GORDON (CFO) + VICTOR (CSO)
**MBA Strategy ref:** Section 2.1 — Pricing Model, Section 2.2 — Operadora Economics
**PRD ref:** REQ-G01 (Value-Based Pricing), REQ-G02 (Operadora Financial Model)

**Instructions:**
1. Read PRD REQ-G01 and REQ-G02 for full acceptance criteria.
2. Build pricing models:
   - Hospital: implementation fee ($50–150K) + monthly ($5–25K) + performance bonus
   - Operadora: revenue-share (30% of sinistralidade reduction) with hybrid option
   - Segment pricing: Large private (R$25–30K/mo), Mid-size (R$10–15K/mo), SUS/Teaching (R$3–5K/mo)
3. ROI calculator: input hospital size, admission volume, complication rates → output annual savings.
4. Operadora 3-scenario model for top 5 operadoras by member count.
5. TAM/SAM/SOM validation: $100–200M TAM, $50–80M SAM, $5–10M 3-year SOM.
6. Create as interactive HTML dashboard or spreadsheet.

---

#### UNIT 0.5.7 — Beachhead Hospital Pipeline [REQ-G03, REQ-C02]

**Priority:** P0 — MUST HAVE
**Persona:** VICTOR (CSO) + ELENA (CMO)
**MBA Strategy ref:** Section 2.4 — Beachhead Pipeline, Section 1.5 — Advisory Board
**PRD ref:** REQ-G03 (Beachhead Pipeline), REQ-C02 (Clinical Advisory Board)
**Risk addressed:** RISK-005 (Competitive window)
**Reference doc:** `risk-mitigation/RISK-005-competitive-intelligence-brief.md`

**Instructions:**
1. Read RISK-005 competitive brief + PRD requirements.
2. Build target list: 10–15 academic hospitals in São Paulo and Rio (150–500 beds).
3. Top 3 targets with named clinical champions: USP, UNIFESP, Beneficencia Portuguesa.
4. Relationship engagement sequence (multi-month, relationship-first per Brazilian culture).
5. Consultative sales scripts: CMO-first approach.
6. Map top 5 operadora decision-makers for Phase 2 bridge.
7. Clinical Advisory Board: recruit 3–5 physicians from target hospitals by Month 2.

---

#### MONTH 3 GATE REVIEW (MBA Strategy)

Before committing Phase 2+ resources, verify:
- [ ] Regulatory lead hired and onboarded
- [ ] EHR partner selected, API access negotiated
- [ ] Clinical validation protocol designed, IRB submitted
- [ ] Advisory board: 3+ members recruited
- [ ] LGPD audit complete, DPA templates ready
- [ ] Safety Firewall architecture spec approved

**If any gate fails:** See MBA Strategy Section "Phase 1 Gate Review" for fail actions.

---

### PHASE 1 — CSL INFRASTRUCTURE (Weeks 1–4)

These are the foundational pieces for the Cortex Swarm Layer. They run in parallel with Phase 0.5 market-entry work. Order matters.

---

#### UNIT 1.1 — Provision Self-Hosted LLM Inference Endpoint

**Priority:** P1 — Critical path
**Persona:** ARCHIE (CTO) + RUTH (CLO) for LGPD sign-off
**Risk addressed:** RISK-001 (Critical), RISK-004 (High)
**Reference docs:**
- `risk-mitigation/RISK-001-lgpd-cloud-gpu-audit.md`
- `risk-mitigation/RISK-004-gpu-compute-vendor-review.md`

**Instructions:**

1. Read both reference docs in full.
2. Create `packages/csl-inference/` directory for the inference service configuration.
3. Write a Docker Compose file for self-hosted vLLM serving Llama 3.3 70B (AWQ 4-bit quantized):
   ```yaml
   # Target: AWS sa-east-1 (São Paulo) p4d.24xlarge or equivalent
   # Must NOT route ANY data outside Brazilian jurisdiction
   # Temperature: 0.0 for agent decision calls
   ```
4. Create `packages/csl-inference/config.ts` with:
   - Inference endpoint URL (configurable, defaults to localhost:8000)
   - Jurisdiction validation: every call checks endpoint resolves to BR IP range
   - Model version pinning (exact checkpoint hash)
   - Temperature settings (0.0 for agent logic, 0.7 for report narrative)
5. Create `packages/csl-inference/__tests__/jurisdiction.test.ts`:
   - Test that inference calls to non-BR endpoints are rejected
   - Test that model version is pinned and logged
   - Test that temperature overrides are blocked for agent logic calls
6. RUTH sign-off: Add LGPD Art. 33 compliance annotation as a code comment on the endpoint configuration.

**RISK-001 LGPD compliance checklist (all must be true before merge):**
- [ ] Inference endpoint resolves to Brazilian IP range
- [ ] No data forwarded to Alibaba Qwen-Plus or any external API
- [ ] Model weights stored on Brazilian infrastructure
- [ ] Every inference call logged in AuditLog with jurisdiction metadata
- [ ] CYRUS alert configured for non-BR IP resolution

**Commit when:** Docker Compose + config + tests pass. Message:
```
feat(csl): provision self-hosted LLM inference endpoint for LGPD compliance

vLLM serving Llama 3.3 70B-AWQ on Brazilian infrastructure.
Jurisdiction validation rejects non-BR endpoints per RISK-001 mitigation.
```

---

#### UNIT 1.2 — Build Synthetic Patient Profile Generator

**Priority:** P1 — Critical path
**Persona:** ARCHIE (CTO) + ELENA (CMO) for clinical review + CYRUS (CISO) for PHI boundary
**Risk addressed:** RISK-003 (Critical), RISK-008 (High)
**Reference docs:**
- `risk-mitigation/RISK-003-reidentification-prevention-spec.md`
- `risk-mitigation/RISK-008-simulation-abuse-prevention.md`

**Instructions:**

1. Read both reference docs in full.
2. Create `packages/csl-agent-factory/` directory.
3. Implement the synthetic profile generator in Python (this is the simulation pipeline, not the Next.js app):
   ```
   packages/csl-agent-factory/
   ├── src/
   │   ├── distribution_extractor.py    # Pulls anonymized stats from CDSS DB
   │   ├── differential_privacy.py      # OpenDP Laplace mechanism, ε ≤ 1.0
   │   ├── agent_generator.py           # Creates synthetic agent JSON profiles
   │   ├── schema_validator.py          # Typed schema enforcement, no free text
   │   └── output_sanitizer.py          # CPF/CNS/RG pattern detection
   ├── tests/
   │   ├── test_differential_privacy.py
   │   ├── test_agent_schema.py
   │   ├── test_reidentification.py     # No agent >5% re-id probability
   │   └── test_population_fidelity.py  # Chi-squared vs source distribution
   ├── schemas/
   │   └── agent_profile.json           # JSON Schema for agent profiles
   └── pyproject.toml
   ```
4. Agent profile schema — STRICT TYPING, no free text fields:
   ```json
   {
     "age": "integer, 0-120",
     "sex": "enum: M/F",
     "comorbidities": "array of enum from ICD-10 approved list",
     "bmi_category": "enum: underweight/normal/overweight/obese",
     "adherence_propensity": "float 0.0-1.0",
     "care_seeking_frequency": "enum: low/medium/high",
     "socioeconomic_proxy": "enum: A/B/C/D/E (IBGE classification)",
     "geographic_zone": "enum from approved list",
     "NO_FREE_TEXT_FIELDS": true
   }
   ```
5. Differential privacy: Use OpenDP library. Laplace mechanism. ε = 0.8 for populations < 500, ε = 1.5 for populations ≥ 500.
6. Population floor: Hard reject if source population < 50 for any condition. Return `INSUFFICIENT_POPULATION_DATA`.
7. ELENA review gate: Generated profiles must not contain impossible biomarker combinations (e.g., pediatric + age > 18, pregnant + sex = M). Write validation rules.
8. CYRUS review gate: No PHI identifiers (CPF, CNS, RG, email, name) anywhere in agent profiles or intermediate representations. Output sanitizer scans all outputs.

**Commit when:** Generator produces valid synthetic profiles, all tests pass, differential privacy verified. Message:
```
feat(csl): synthetic patient profile generator with differential privacy

OpenDP Laplace mechanism (ε ≤ 1.0 for small populations).
Hard n≥50 population floor. Typed schema with zero free-text fields.
Addresses RISK-003 (re-identification) and RISK-008 (simulation abuse).
```

---

#### UNIT 1.3 — Simulation Engine Foundation (Mesa, NOT OASIS)

**Priority:** P1 — Critical path
**Persona:** ARCHIE (CTO)
**Risk addressed:** RISK-006 (High)
**Reference doc:** `risk-mitigation/RISK-006-oasis-framework-adr.md`

**CRITICAL ARCHITECTURE DECISION:** The ADR concluded that OASIS is NOT production-grade for clinical use. The primary recommendation is **Mesa** (Python agent-based modeling framework). Mesa provides full determinism, 350+ healthcare research papers, and no LLM non-determinism in agent decision logic.

**Instructions:**

1. Read the ADR in full.
2. Create `packages/csl-simulation/` directory:
   ```
   packages/csl-simulation/
   ├── src/
   │   ├── engine/
   │   │   ├── __init__.py
   │   │   ├── base_model.py          # Mesa Model subclass for clinical simulation
   │   │   ├── patient_agent.py       # Mesa Agent subclass with clinical behavior
   │   │   ├── environment.py         # Hospital/community environment model
   │   │   └── scheduler.py           # Deterministic activation scheduler
   │   ├── behaviors/
   │   │   ├── triage_presentation.py # Agent behavior: present to ED
   │   │   ├── medication_adherence.py# Agent behavior: take/skip medication
   │   │   ├── symptom_escalation.py  # Agent behavior: symptoms worsen/improve
   │   │   └── care_seeking.py        # Agent behavior: seek/avoid care
   │   ├── interface/
   │   │   ├── simulation_runner.py   # Orchestrates simulation runs
   │   │   └── report_generator.py    # Generates prediction reports
   │   └── audit/
   │       └── simulation_audit.py    # AuditLog integration for every run
   ├── tests/
   │   ├── test_determinism.py        # Same seed = identical output (±15%)
   │   ├── test_agent_behavior.py
   │   ├── test_audit_trail.py
   │   └── test_population_fidelity.py
   └── pyproject.toml
   ```
3. Key design principles:
   - **Deterministic:** Every simulation run takes a `random_seed` parameter. Same seed + same input = identical output.
   - **Rule-based agent decisions:** Agent behavior is governed by probabilistic rules derived from clinical literature, NOT LLM calls. LLM is used only for report narrative generation (post-simulation).
   - **Provenance on every output:** Every simulation report carries `sourceAuthority="CSL-Simulation-v{n}"`, `simulationRunId`, `agentCount`, `randomSeed`, `modelVersion`.
   - **Abstraction layer:** Define a `SimulationEngine` interface that Mesa implements. If we later need to swap to AgentScope or a custom engine, we swap the implementation, not the product.
4. Implement the Triage Load Predictor (TLP) simulation model first:
   - Input: N synthetic patient agents (from Unit 1.2) + environmental signals (season, day of week, holiday flag)
   - Simulation: Each agent decides probabilistically whether to present to ED in each 8-hour window over 72 hours
   - Output: Distribution of expected P1–P5 arrivals per 8-hour window, with confidence intervals from N runs

**Commit when:** TLP simulation runs deterministically, all tests pass. Message:
```
feat(csl): Mesa-based simulation engine with TLP model

Deterministic rule-based patient agents. Abstraction layer for engine swap.
Full provenance metadata on every simulation output.
Addresses RISK-006 (OASIS replaced with production-grade Mesa).
```

---

#### UNIT 1.4 — Audit Trail Extension for Simulation

**Priority:** P1 — Required by CYRUS
**Persona:** CYRUS (CISO) + QUINN (QA)
**Risk addressed:** RISK-008 (High)
**Reference doc:** `risk-mitigation/RISK-008-simulation-abuse-prevention.md`

**Instructions:**

1. Read the reference doc.
2. Add `SimulationRun` model to Prisma schema:
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
     outputHash      String?  // SHA-256 of output report
     status          String   // "running" | "completed" | "failed" | "aborted"
     createdAt       DateTime @default(now())
     updatedAt       DateTime @updatedAt

     // Relation to existing AuditLog
     auditLogs       AuditLog[]

     // Tenant isolation
     tenant          Tenant   @relation(fields: [tenantId], references: [id])

     @@index([tenantId])
     @@index([status])
   }
   ```
3. Hash-chain integrity: Every `SimulationRun` entry is linked into the existing AuditLog hash chain. CYRUS invariant: audit records are NEVER destroyed.
4. Write migration: `npx prisma migrate dev --name add_simulation_run_model`
5. Write tests for:
   - SimulationRun creation with all required fields
   - Rejection if `legalBasis` is missing
   - Rejection if `tenantId` does not match authenticated user's tenant
   - Hash-chain integrity verification
   - Audit trail query: "What data was used for simulation X on date Y?"

**Commit when:** Migration runs, all tests pass. Message:
```
feat(csl): SimulationRun audit trail model with hash-chain integrity

Every simulation call logged with tenantId, legalBasis, outputHash.
Hash-chain integrity per LGPD Art. 37 — records never destroyed.
Addresses RISK-008 (simulation audit trail).
```

---

#### UNIT 1.5 — Consent Architecture for Simulation

**Priority:** P1 — Required by RUTH (veto)
**Persona:** RUTH (CLO) + PAUL (CPO)
**Risk addressed:** RISK-010 (Medium)
**Reference doc:** `risk-mitigation/RISK-010-consent-ux-specification.md`

**Instructions:**

1. Read the reference doc.
2. Implement three distinct consent types in the consent model:
   - `TREATMENT_CONSENT` (existing)
   - `POPULATION_RESEARCH_CONSENT` (new — use of anonymized data for population distribution training)
   - `PREDICTION_SERVICE_CONSENT` (new — simulation-derived insights used in clinical workflow planning)
3. Each consent type is individually toggleable and individually revocable.
4. RUTH invariant: NEVER collapse these into a single checkbox. This is a hard veto.
5. UI: Progressive disclosure flow — present in a single session but with clear separation.
6. Bilingual: Portuguese (primary) and English.
7. Write the consent copy from the reference doc.
8. Tests: Verify that simulation initialization fails if `PREDICTION_SERVICE_CONSENT` is not active for the tenant.

**Commit when:** Consent model + UI + tests pass. Message:
```
feat(consent): granular three-type consent architecture for CSL

Treatment, Population Research, and Prediction Service consent types.
Individually toggleable and revocable per LGPD and RUTH veto invariant.
Addresses RISK-010 (consent friction mitigation).
```

---

### PHASE 2 — FIRST PRODUCT SURFACE (Weeks 5–10)

---

#### UNIT 2.1 — GraphRAG Knowledge Graph for Triage Prediction

**Priority:** P2
**Persona:** ARCHIE (CTO) + ELENA (CMO)

Build the GraphRAG knowledge graph encoding disease ontologies, seasonal epidemiological signals, and historical triage patterns. This is the "seed material" for the TLP simulation.

**Instructions:**
1. Create `packages/csl-knowledge-graph/`
2. Use LlamaIndex for graph construction
3. Graph entities: Disease, Symptom, Severity (P1–P5), Season, Geography, DayType (weekday/weekend/holiday)
4. Edges: temporal correlations, disease-to-symptom, severity-to-disease
5. Seed with Brazilian DATASUS epidemiological data (publicly available) + our anonymized historical triage distributions
6. ELENA validates ontological correctness of all disease-symptom-severity relationships
7. Provenance metadata on every graph node: `sourceAuthority`, `citationUrl`, `lastValidated`

---

#### UNIT 2.2 — TLP Simulation Pipeline

**Priority:** P2
**Persona:** ARCHIE (CTO)

Wire the full pipeline: Seed Builder → Agent Factory → Simulation Engine → Report Generator.

**Instructions:**
1. Create `packages/csl-pipeline/`
2. Orchestrate: pull population distributions → generate synthetic agents → run Mesa simulation → produce TLP prediction report
3. REST API endpoint: `POST /api/csl/simulation/tlp` — `createProtectedRoute` guarded, hospital admin role only
4. Input: `tenantId`, `predictionWindow` (default 72h), `agentCount` (default 1000, configurable)
5. Output: JSON with P1–P5 predicted counts per 8-hour window, confidence intervals, provenance metadata
6. Every call writes to `SimulationRun` audit trail
7. Rate limiting: max 10 simulation runs per tenant per 24 hours (CYRUS requirement)

---

#### UNIT 2.3 — TLP Dashboard Widget

**Priority:** P2
**Persona:** PAUL (CPO) + QUINN (QA)
**Reference doc:** `risk-mitigation/RISK-013-pilot-reputation-runbook.md`

Build the Triage Load Predictor Vue.js dashboard widget.

**Instructions:**
1. Create component in `src/components/csl/TLPWidget.tsx` (or Vue equivalent matching codebase convention)
2. Displays 72-hour rolling forecast by severity tier (P1–P5) with confidence bands
3. "Explain this prediction" button: drill-down showing which agent behavioral patterns drove the outcome
4. Mandatory UI elements:
   - `SIMULATION — Population Level` badge (always visible, not toggleable)
   - During pilot: amber `PILOT VALIDATION MODE — Do not use for operational decisions` banner
   - Confidence interval displayed on every prediction
   - LGPD consent disclosure on first use
5. `createProtectedRoute` guard — hospital admin role only
6. Tests: Component renders, badge is always visible, banner appears in pilot mode, explain button triggers drill-down

---

### PHASE 3 — PILOT LAUNCH PREPARATION (Week 10)

---

#### UNIT 3.1 — Pilot Agreement Template

**Persona:** RUTH (CLO) + VICTOR (CSO)
**Reference doc:** `risk-mitigation/RISK-013-pilot-reputation-runbook.md`

Create the pilot agreement template with research-phase language, validation-only framing, and nominal R$1,500/month pricing.

---

#### UNIT 3.2 — Model Versioning & Change Management Protocol

**Persona:** ARCHIE (CTO) + ELENA (CMO)
**Reference doc:** `risk-mitigation/RISK-012-model-versioning-change-management.md`

Implement the model pinning policy, version tracking in AuditLog, and the four-stakeholder approval gate for model updates.

---

#### UNIT 3.3 — Infrastructure Resilience & Graceful Degradation

**Persona:** ARCHIE (CTO) + CYRUS (CISO)
**Reference doc:** `risk-mitigation/RISK-014-infrastructure-resilience-runbook.md`

Implement the four-state graceful degradation model. TLP/CDRM/DAS widgets degrade to "Simulation unavailable — last updated [timestamp]". Core CDSS never affected.

---

#### UNIT 3.4 — CI Test Tiering for Simulation

**Persona:** QUINN (QA)
**Reference doc:** `risk-mitigation/RISK-016-ci-test-tiering-strategy.md`

Implement the three-tier test model: PR (<2 min), merge-to-main (<10 min), nightly production-scale (60 min).

---

### PHASE 4 — SECOND PRODUCT SURFACE (Weeks 11–20)

---

#### UNIT 4.1 — Cohort Deterioration Risk Map (CDRM)

Extend agent behavioral profiles with chronic disease management parameters. 30/90/180-day simulation windows. Risk matrix visualization.

---

#### UNIT 4.2 — Health Plan API

REST API for health plan partner integrations. Tenant-scoped auth, rate limiting, per-call audit logging.

---

### PHASE 5 — THIRD PRODUCT SURFACE (Months 6+)

---

#### UNIT 5.1 — Drug Adherence Simulation (DAS)

Behavioral economics parameters in agent model. Pharma GTM alignment.

---

### PHASE 6 — MARKET ENTRY (MBA Strategy Phase 3, Months 7–12)

These units execute once the foundation phases are complete and gate reviews have passed.

---

#### UNIT 6.1 — First Hospital Pilot Deployment [REQ-G03, REQ-E02, REQ-C01]

**Persona:** ARCHIE (CTO) + ELENA (CMO) + VICTOR (CSO)
**MBA Strategy ref:** Section 3.1 — First Hospital Pilot Deployment

Deploy Cortex at 1–2 beachhead academic hospitals with EHR integration, Safety Firewall operational, real-time monitoring dashboard, and KPI tracking (alert acceptance >70% for Critical, sensitivity/specificity, time-to-diagnosis).

6-phase implementation: Discovery (2 weeks) → Design (3 weeks) → Build (4 weeks) → Pilot (4 weeks) → Rollout (4 weeks) → Optimization (ongoing).

---

#### UNIT 6.2 — Operadora Engagement [REQ-G02, REQ-G05]

**Persona:** VICTOR (CSO) + GORDON (CFO)
**MBA Strategy ref:** Section 3.2 — Operadora First Conversation

With hospital pilot data in hand, initiate operadora conversations. Top 3 targets: Amil, Hapvida, SulAmerica. Present 6-month proof-of-value pilot proposal with revenue-share terms and control group methodology.

---

#### UNIT 6.3 — Clinical Validation Publication [REQ-C01]

**Persona:** ELENA (CMO)
**MBA Strategy ref:** Section 3.3 — Clinical Validation Publication

Complete 50–100 case analysis. Submit manuscript. If AUC < 0.75: hard stop on commercial deployment.

---

#### UNIT 6.4 — ANVISA Submission [REQ-R01]

**Persona:** RUTH (CLO) + Regulatory Lead
**MBA Strategy ref:** Section 3.4 — ANVISA Submission

File complete technical file with ANVISA. Estimated review: 6–12 months from submission.

---

#### UNIT 6.5 — Series A Preparation

**Persona:** GORDON (CFO) + Nico (CEO)
**MBA Strategy ref:** Section 3.5 — Series A Preparation

Pitch deck with validated unit economics. 3-year projections. Term sheet negotiation prep. Defensible moat narrative: NLP advantage in Portuguese, proprietary Brazilian clinical dataset, CSL population prediction capability, ANVISA regulatory head start.

---

#### MONTH 6 GATE REVIEW (MBA Strategy)

- [ ] EHR integration demo working (bidirectional with 1 vendor)
- [ ] Clinical validation data collection underway (10+ cases enrolled)
- [ ] Pricing model validated (2+ hospitals responded positively)
- [ ] Operadora financial model complete
- [ ] Safety Firewall implemented and functional

#### MONTH 12 GATE REVIEW (MBA Strategy)

- [ ] 1–2 hospitals live with outcomes data
- [ ] 1+ operadora in pilot proposal stage
- [ ] Validation study: AUC ≥ 0.75, manuscript submitted
- [ ] ANVISA submission filed
- [ ] Series A pitch deck with real data

---

## GLOBAL RULES (Apply to every unit)

1. **Read `CLAUDE.md` before every session.** It contains the Cortex Boardroom protocol, veto invariants, and jest mocking rules.
2. **Read the relevant `risk-mitigation/RISK-NNN-*.md` doc** before starting any unit that references it.
3. **Conventional Commits only.** Format: `type(scope): description`
4. **Never `git push`.** Human-only.
5. **Never commit with `console.log`, hardcoded secrets, dead code, or TODO markers.**
6. **All simulation code must carry provenance metadata:** `sourceAuthority`, `simulationRunId`, `agentCount`, `modelVersion`.
7. **All routes must have `createProtectedRoute` RBAC guard.**
8. **All PHI fields encrypted with `encryptPHIWithVersion`.** Simulation code should never encounter PHI — but enforce the boundary anyway.
9. **Circuit breaker:** If any fix/test cycle fails 3 consecutive times, HALT and emit `CIRCUIT_BREAKER_TRIPPED`.
10. **Post-implementation verification:** After every UI change, emit `MANUAL VERIFICATION` block with URL, Target Node, Expected State.

---

## REFERENCE DOCUMENTS

All located in the project root or `risk-mitigation/` directory:

| Document | Path |
|----------|------|
| **PRD: Market Entry** | `Cortex_Health_PRD_Market_Entry.docx` |
| **MBA Strategy Proposal** | `Cortex_MBA_Strategy_Implementation_Proposal.docx` |
| 3-Day Summit | `cortex-boardroom-summit-march-2026.md` |
| Risk Register | `cortex-swarm-layer-risk-register-march-2026.md` |
| RISK-001: LGPD Cloud GPU Audit | `risk-mitigation/RISK-001-lgpd-cloud-gpu-audit.md` |
| RISK-002: ANVISA SaMD Classification | `risk-mitigation/RISK-002-anvisa-samd-classification-analysis.md` |
| RISK-003: Re-identification Prevention | `risk-mitigation/RISK-003-reidentification-prevention-spec.md` |
| RISK-004: GPU Compute Vendor Review | `risk-mitigation/RISK-004-gpu-compute-vendor-review.md` |
| RISK-005: Competitive Intelligence | `risk-mitigation/RISK-005-competitive-intelligence-brief.md` |
| RISK-006: OASIS Framework ADR | `risk-mitigation/RISK-006-oasis-framework-adr.md` |
| RISK-007: Pilot Economics Model | `risk-mitigation/RISK-007-pilot-economics-model.md` |
| RISK-008: Simulation Abuse Prevention | `risk-mitigation/RISK-008-simulation-abuse-prevention.md` |
| RISK-009: Clinical Trust Research | `risk-mitigation/RISK-009-clinical-trust-research-plan.md` |
| RISK-010: Consent UX Specification | `risk-mitigation/RISK-010-consent-ux-specification.md` |
| RISK-011: Simulation Determinism | `risk-mitigation/RISK-011-simulation-determinism-testing-strategy.md` |
| RISK-012: Model Versioning | `risk-mitigation/RISK-012-model-versioning-change-management.md` |
| RISK-013: Pilot Reputation Runbook | `risk-mitigation/RISK-013-pilot-reputation-runbook.md` |
| RISK-014: Infrastructure Resilience | `risk-mitigation/RISK-014-infrastructure-resilience-runbook.md` |
| RISK-015: OASIS License Review | `risk-mitigation/RISK-015-oasis-license-review.md` |
| RISK-016: CI Test Tiering Strategy | `risk-mitigation/RISK-016-ci-test-tiering-strategy.md` |

---

## HOW TO USE THIS PROMPT

Copy this file's contents and paste it into your Claude Code CLI session as the initial prompt. Then say:

```
Start with UNIT 0.1. Read CLAUDE.md first, then begin.
```

Claude will execute sequentially. After each unit completes and is committed, say:

```
Proceed to UNIT [next number].
```

If a unit encounters a blocking issue, Claude will emit `CIRCUIT_BREAKER_TRIPPED` and wait for guidance.

---

*Master Prompt v1.0 — March 18, 2026*
*Generated by Cortex Boardroom Summit orchestration*
*Classification: Engineering — Internal Use*
