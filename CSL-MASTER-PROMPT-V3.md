# CORTEX HEALTH — MASTER EXECUTION PROMPT v3.0
## Launch-First / Build-Aside Architecture
## For Claude Code CLI · Opus 4.6 (1M context)
## ~/prototypes/holilabsv2/apps/web

---

## PHILOSOPHY: LAUNCH FIRST, BUILD ASIDE, MARRY LATER

This prompt supersedes V1 (sequential monolith) and V2 (two-track parallel). Both suffered from the same flaw: they treated the launch and the vision build as a single coupled system. They are not.

**The insight:** Our product already exists. 35+ dashboard routes, CDSS engine, patient management, consent model, clinical command center, billing, analytics, reminders, prevention hub — it's all built. What's missing is the last mile: the build compiles, the tests pass, every screen a pilot user touches works without errors or blank states. That is a **shipping problem**, not a building problem.

Everything else — CSL simulation, EHR vendor integration, ANVISA documentation, pricing models — is **future value**. Important, but it doesn't block a pilot user from logging in and using the product tomorrow.

**The V3 model:**

```
ORBIT 1: LAUNCH READINESS          ← Ship what exists. Fix, harden, deploy.
          (this repo, this branch)     Timeframe: 1 week.

ORBIT 2: STRATEGIC BUILD            ← Build the future. Regulatory, EHR, CSL, commercial.
          (feature branches or         Timeframe: 3-12 months.
           standalone packages)        Develops IN PARALLEL, merges WHEN READY.

ORBIT 3: MARKET VALIDATION          ← Talk to hospitals. Validate pricing. Get feedback.
          (docs + outreach, no code)   Timeframe: starts Week 2, runs continuously.
```

**The key difference from V2:** Orbit 2 develops on **isolated feature branches** or in **standalone packages** (`packages/csl-*`, `packages/ehr-integration/`). It NEVER touches the main branch until its own test suite passes AND a human reviews the merge. This means Orbit 1 ships cleanly — no half-built simulation code, no unfinished EHR stubs, no Prisma migrations for models nobody uses yet.

**MBA framework alignment:**
- **Lean Startup (Ries):** Build → Measure → Learn. You can't measure if you don't ship. Orbit 1 = ship. Orbit 3 = measure. Orbit 2 = learn and build.
- **Operations Management (Goldratt/TOC):** The constraint is not code — it's customer access. Removing code bottlenecks (Orbit 1) unblocks the constraint (Orbit 3).
- **Strategic Management (Porter):** Regulatory barriers are the moat, but moats don't matter if you have no castle. Ship the castle first.
- **Marketing Management (Kotler):** Product-market fit requires a product in market. Documentation and pricing models are hypotheses until a hospital says yes or no.
- **Corporate Finance (Damodaran):** Optionality value. A shipped product with one pilot creates more enterprise value than a perfect product that's never been used. Real options theory says: invest to create the option (ship), then decide whether to exercise (scale).

---

## CODEBASE STATE (as of March 18, 2026)

```
Stack:           Next.js 14 + Prisma + Vue.js components
Build:           pnpm build FAILS — Easing type error in framer-motion component
                 (lucide-react icon errors resolved this session)
Tests:           ~10 failing suites remaining (down from 238 → 120 → ~10)
                 Root causes: logger mock gaps, cuid fixtures, CDSS contract assertions
Dashboard:       35+ routes built (clinical-command, patients, analytics, prevention,
                 billing, governance, escalations, forms, reminders, settings, etc.)
Infrastructure:  DigitalOcean + Sentry + PostHog
Invite Flow:     Exists, tests pass. Needs passwordHash verification in onboarding/complete.
Error Boundaries: 10 exist (dashboard, patients, settings, forms, prevention,
                 admin, clinical-command, my-day, billing, analytics).
                 Missing: agenda, command-center, escalations, governance,
                 reminders, referrals, recordings, tasks, and others.
Loading States:  Only 2 of 35+ dashboard routes have loading.tsx
                 (dashboard root + clinical-command).
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

# ═══════════════════════════════════════════════════════════════
# ORBIT 1: LAUNCH READINESS
# Ship what exists. Fix, harden, deploy.
# All work happens on main branch.
# Target: 1 week to a product a pilot hospital can use daily.
# ═══════════════════════════════════════════════════════════════

## UNIT L.1 — Fix the Build

**Priority:** P0 — NOTHING ELSE RUNS UNTIL THIS PASSES
**Persona:** ARCHIE (CTO)
**Time estimate:** 30 minutes

**Current blocker:** `Type 'number[]' is not assignable to type 'Easing | Easing[] | undefined'` in a framer-motion animation component.

```bash
# Find the offending file
pnpm build 2>&1 | grep -B 10 "Easing"

# Fix: Cast the array or use the correct framer-motion type
# This is likely an ease array like [0, 0, 0.2, 1] that needs to be typed as Easing
```

All lucide-react icon errors are already resolved (this session).

**Exit criteria:** `pnpm build` exits 0. Period.

**Commit:**
```
fix(build): resolve framer-motion Easing type error

Cast animation easing array to correct framer-motion type.
Build now compiles cleanly for production deployment.
```

---

## UNIT L.2 — Fix Remaining Test Failures

**Priority:** P0 — BLOCKING
**Persona:** QUINN (QA Lead)
**Time estimate:** 2-3 hours

**Known root causes (from codebase analysis):**

| Category | Suites | Fix |
|----------|--------|-----|
| Logger mock missing `warn`/`error`/`debug` | 4 | Add missing methods to logger mock |
| CDSS contract assertions for unimplemented fields | 1 (28 tests) | Update contract test expectations or mark as `test.skip` with TODO |
| Zod cuid validation in send-reminder | 1 | Fix test fixtures to use valid cuid format |
| ICS Content-Disposition header | 1 | Add missing header assertion in export-calendar |

**Strategy: Fix root causes, not individual tests.**

```bash
# Step 1: Run and categorize
pnpm test 2>&1 | grep "FAIL" | head -20

# Step 2: Fix logger mocks (biggest bang for buck)
# Files: analytics/dashboard, auth/patient/logout, ai/generate-note, ai/patient-context
# Pattern: Add warn, error, debug to the logger mock object

# Step 3: Fix cuid fixtures
# File: send-reminder test
# Pattern: Replace plain string IDs with valid cuid format (e.g., clxxxxxxxxxxxxxxxxxxxxxxxxx)

# Step 4: Handle CDSS contract tests
# File: cdss-contract.test.ts
# Decision: If fields (provenance.timestamp, provenance.model, metadata.processingMethod)
# are not yet implemented, skip those specific assertions with:
# test.skip('field not yet implemented — tracked in Orbit 2')
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

**Exit criteria:** Failing suites < 5. Remaining failures documented as known issues.

**Commit:**
```
fix(tests): resolve remaining test failures for launch readiness

Systematic logger mock fixes, cuid fixture updates, CDSS contract skips.
<N> suites remaining — all documented, none blocking pilot deployment.
```

---

## UNIT L.3 — Pilot Invite Flow Verification

**Priority:** P0 — BLOCKING
**Persona:** PAUL (CPO) + CYRUS (CISO)
**Time estimate:** 1 hour

**Trace and verify the critical path:**
```
Waitlist signup → Admin approval → Resend email sent → Token in link →
User clicks → Account created → Redirect to /dashboard/clinical-command
```

**Specific risk:** The `/api/onboarding/complete` route may attempt to write `passwordHash` — a field that was removed from the Prisma schema. If it does, the onboarding flow silently fails or throws.

```bash
# Check for passwordHash in onboarding
grep -rn "passwordHash" src/app/api/onboarding/ --include="*.ts"

# If found, remove the field from the write operation
```

**CYRUS gates:**
- [ ] Only admin roles can approve invites (`createProtectedRoute` guard)
- [ ] Token is single-use, time-limited, cryptographically random
- [ ] No PII leaked in URL parameters

**Exit criteria:** Full invite flow works end-to-end. Tests pass.

**Commit:**
```
feat(auth): verify and harden pilot invite flow

[What was verified/fixed]. Token validation and RBAC guards confirmed.
Pilot onboarding path functional for first hospital partners.
```

---

## UNIT L.4 — Error Boundaries for Every Dashboard Section

**Priority:** P1 — Required for production
**Persona:** PAUL (CPO)
**Time estimate:** 1-2 hours

10 routes already have error.tsx (dashboard, patients, settings, forms, prevention, admin, clinical-command, my-day, billing, analytics). The remaining high-traffic routes need them.

**Add error.tsx to these MISSING routes:**

```bash
# Priority 1 — High-traffic, currently missing
src/app/dashboard/agenda/error.tsx
src/app/dashboard/command-center/error.tsx

# Priority 2 — Medium-traffic, currently missing
src/app/dashboard/escalations/error.tsx
src/app/dashboard/governance/error.tsx
src/app/dashboard/reminders/error.tsx

# Priority 3 — Lower-traffic, currently missing
src/app/dashboard/tasks/error.tsx
src/app/dashboard/referrals/error.tsx
src/app/dashboard/recordings/error.tsx
src/app/dashboard/co-pilot-v2/error.tsx
```

**Template (copy existing dashboard/error.tsx pattern, adapt per section):**
Each error boundary should:
1. Catch the error
2. Show a friendly message in Portuguese + English
3. Offer a "Tentar novamente" / "Try again" button
4. Log to Sentry (if configured)

**Exit criteria:** Every Priority 1 and 2 route has an error.tsx. A thrown error in `/agenda` doesn't crash `/analytics`.

**Commit:**
```
fix(ui): add error boundaries to all high-traffic dashboard routes

Prevents cascading failures. Each section catches errors independently.
Users see a retry prompt instead of a blank screen.
```

---

## UNIT L.5 — Loading States for High-Traffic Routes

**Priority:** P1 — Required for production UX
**Persona:** PAUL (CPO)
**Time estimate:** 1-2 hours

Only 2 of 35+ dashboard routes have `loading.tsx`. Without them, users see blank screens during data fetches.

**Add loading.tsx to these routes (at minimum):**

```bash
src/app/dashboard/patients/loading.tsx
src/app/dashboard/clinical-command/loading.tsx
src/app/dashboard/agenda/loading.tsx
src/app/dashboard/analytics/loading.tsx
src/app/dashboard/command-center/loading.tsx
src/app/dashboard/prevention/loading.tsx
src/app/dashboard/escalations/loading.tsx
src/app/dashboard/billing/loading.tsx
src/app/dashboard/reminders/loading.tsx
src/app/dashboard/settings/loading.tsx
```

**Template:** Skeleton loading screens matching the layout of each page. Use the same pattern as the existing `loading.tsx` files. Keep it lightweight — pulsing gray boxes that match the page structure.

**Exit criteria:** Navigating to any high-traffic route shows a skeleton screen, not a blank page.

**Commit:**
```
fix(ui): add skeleton loading states to all high-traffic dashboard routes

Users see content placeholders instead of blank screens during data loads.
Covers patients, clinical-command, agenda, analytics, and 6 more routes.
```

---

## UNIT L.6 — Final Hardening Sweep

**Priority:** P1 — Last gate before deploy
**Persona:** ARCHIE (CTO) + QUINN (QA)
**Time estimate:** 1-2 hours

**Checklist:**

1. **Console.log audit:**
   ```bash
   grep -rn "console\.log" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "node_modules" | grep -v "\.d\.ts"
   ```
   Remove all instances. Replace with logger calls if needed.

2. **Dead import cleanup:**
   ```bash
   # Build will catch unused imports if strict mode is on
   pnpm build 2>&1 | grep "unused"
   ```

3. **Environment variable audit:**
   All required env vars either have defaults or throw clear error messages at startup.

4. **Mobile viewport sanity:**
   Check that `/dashboard/clinical-command` and `/dashboard/patients` don't break at 768px width.

5. **Full build + test gate:**
   ```bash
   pnpm build && pnpm test 2>&1 | tail -20
   ```

**Exit criteria:** A non-technical person can walk through: login → dashboard → patient view → clinical command without hitting an error, blank screen, or confusing UI state.

**Commit:**
```
fix(mvp): final hardening sweep — console cleanup, env audit, mobile check

Product is demo-ready for pilot hospital walkthrough.
All launch readiness gates pass.
```

---

## ORBIT 1 GATE: LAUNCH READY

Before moving to Orbit 2 or deploying to production, verify ALL of these:

```
[ ] pnpm build exits 0
[ ] pnpm test: <5 failing suites (all documented)
[ ] Invite flow works end-to-end (manual verification)
[ ] No console.log in production code
[ ] Error boundaries on all Priority 1+2 routes
[ ] Loading states on all high-traffic routes
[ ] Dashboard loads without errors on desktop and tablet
[ ] Git is clean, all changes committed
```

**If gate passes:** Deploy to production. Begin Orbit 3 (market validation). Open Orbit 2 branches.
**If gate fails:** Fix the failing items. Do not start anything else.

---

# ═══════════════════════════════════════════════════════════════
# ORBIT 2: STRATEGIC BUILD
# Build the future on isolated branches. Merge when ready.
# NEVER breaks the main branch. NEVER blocks the launch.
# ═══════════════════════════════════════════════════════════════

## BRANCHING STRATEGY

Every Orbit 2 workstream develops on its own long-lived feature branch:

```bash
# Branch naming convention
git checkout -b orbit2/regulatory     # B1: ANVISA + LGPD
git checkout -b orbit2/ehr            # B2: FHIR + EHR vendor integration
git checkout -b orbit2/csl            # B3: Simulation engine (standalone packages)
git checkout -b orbit2/commercial     # B4: Pricing, validation, pipeline (docs only)
```

**Merge rules:**
1. Feature branch must pass `pnpm build` and `pnpm test` independently
2. Human reviews the diff before merging to main
3. Prisma migrations are coordinated — only one branch migrates at a time
4. No branch depends on another branch (they all branch from main after Orbit 1)

**For standalone packages (CSL, EHR):**
These live in `packages/` and have their own test suites. They can develop entirely independently:
```bash
# CSL packages — Python, no impact on Next.js app until explicitly wired
packages/csl-inference/        # Self-hosted LLM endpoint config
packages/csl-agent-factory/    # Synthetic patient generator (Python)
packages/csl-simulation/       # Mesa simulation engine (Python)
packages/csl-pipeline/         # Orchestration pipeline

# EHR package — TypeScript, no impact on app until adapter is imported
packages/ehr-integration/      # FHIR R4 + HL7v2 + vendor adapters
```

These packages are developed, tested, and validated independently. They are "married" to the main app only when:
- Their own test suites pass
- A dashboard widget or API route is ready to consume them
- A human approves the integration PR

---

## WORKSTREAM B1: REGULATORY & COMPLIANCE (orbit2/regulatory)

**Owner personas:** RUTH (CLO) + CYRUS (CISO)
**Timeline:** Month 1-3
**Impact on main branch:** Minimal until consent types are ready to merge

### Unit B1.1 — ANVISA Regulatory Documentation
- Create `docs/regulatory/` structure (classification memo, technical file, CDS exemption analysis)
- Create `docs/regulatory/cfm/` (CFM alignment, liability allocation)
- Build `@anvisaClassification()` annotation middleware
- Apply to all clinical API routes
- **This is mostly documentation + lightweight middleware. Safe to merge early.**

### Unit B1.2 — LGPD Compliance Framework
- Create `docs/compliance/lgpd/` (data flow audit, DPA, BAA, breach protocol, DPO plan)
- Add 2 new consent types to ConsentType enum: `POPULATION_RESEARCH_CONSENT`, `PREDICTION_SERVICE_CONSENT`
- **Prisma migration required — coordinate timing with other branches**
- **RUTH VETO: Never collapse consent types into a single checkbox**

**Full specifications:** See CSL-MASTER-PROMPT-V2.md Units B1.1 and B1.2 for detailed instructions.

---

## WORKSTREAM B2: EHR INTEGRATION (orbit2/ehr)

**Owner persona:** ARCHIE (CTO)
**Timeline:** Month 1-6
**Impact on main branch:** Zero until adapter is imported into an API route

### Unit B2.1 — FHIR R4 Package Extraction
- Create `packages/ehr-integration/` as standalone TypeScript package
- Vendor-agnostic interface → Tasy adapter (primary), MV/Pixeon stubs
- Re-export from existing `apps/web/src/lib/ehr/` and `src/lib/fhir/` where applicable
- **Develops entirely in packages/ — zero impact on main app**

### Unit B2.2 — Safety Firewall: Tiered Alert Architecture
- Four-tier severity (Critical/High/Medium/Low) with Five Rights validation
- Governance interface for clinical committee
- **This modifies the main app — merge carefully after Orbit 1**

**Full specifications:** See CSL-MASTER-PROMPT-V2.md Units B2.1 and B2.2 for detailed instructions.

---

## WORKSTREAM B3: CSL SIMULATION ENGINE (standalone packages)

**Owner personas:** ARCHIE (CTO) + ELENA (CMO) + CYRUS (CISO)
**Timeline:** Month 1-6
**Impact on main branch:** ZERO until B3.5 (dashboard widget) is ready to merge

This is the most isolated workstream. All four foundation units develop as standalone Python/Docker packages with their own test suites. They never touch the Next.js app.

### Unit B3.1 — Self-Hosted LLM Inference Endpoint
- `packages/csl-inference/` — Docker Compose + config + jurisdiction validation
- **Standalone. No impact on main.**

### Unit B3.2 — Synthetic Patient Profile Generator
- `packages/csl-agent-factory/` — Python package with OpenDP differential privacy
- **Standalone. No impact on main.**

### Unit B3.3 — Mesa Simulation Engine Foundation
- `packages/csl-simulation/` — Python Mesa-based TLP model
- **Standalone. No impact on main.**

### Unit B3.4 — SimulationRun Prisma Model
- Add `SimulationRun` model to Prisma schema + migration
- **This touches main — must coordinate merge timing**
- **Only merge when B3.5 is also ready to ship**

### Unit B3.5 — TLP Pipeline + API + Dashboard Widget
- Wire everything together: API endpoint + dashboard widget
- **Depends on B3.1-B3.4. This is the "marriage" unit.**
- **Only merge to main when the full pipeline works end-to-end**

**Full specifications:** See CSL-MASTER-PROMPT-V2.md Units B3.1-B3.5 for detailed instructions.

**Execution order within B3:**
```
B3.1 + B3.2 + B3.3 (parallel, all standalone)
    ↓
B3.4 (Prisma model — needs B3.1-3 context to be correct)
    ↓
B3.5 (integration — wires everything to main app)
    ↓
Merge to main (single coordinated PR, human-reviewed)
```

---

## WORKSTREAM B4: COMMERCIAL & GTM (docs only — no code)

**Owner personas:** VICTOR (CSO) + GORDON (CFO) + ELENA (CMO)
**Timeline:** Month 1-3
**Impact on main branch:** ZERO — this is pure documentation

### Unit B4.1 — Value-Based Pricing Model
- `docs/commercial/pricing-model.md` — Hospital/operadora tiers
- `docs/commercial/roi-calculator.md` — Input hospital metrics → output savings
- `docs/commercial/tam-sam-som.md` — Market sizing
- **NOTE:** The R$1,500/month pilot price from V2 is a HYPOTHESIS. Orbit 3 validates it. Do not hardcode pricing into the app until hospitals confirm willingness to pay.

### Unit B4.2 — Clinical Validation Study Infrastructure
- Study data capture form + metrics dashboard
- ValidationCase Prisma model
- De-identification pipeline
- **This has code but is only useful after a hospital is onboarded. Build on branch, merge when needed.**

### Unit B4.3 — Beachhead Hospital Pipeline
- `docs/commercial/pipeline/hospital-targets.md` — 10-15 SP/RJ hospitals
- `docs/commercial/pipeline/advisory-board-plan.md` — 3-5 physician recruits
- `docs/commercial/pipeline/engagement-sequence.md` — CMO-first outreach
- **Pure docs. Can start immediately.**

### Unit B4.4 — Pilot Agreement Template
- `docs/commercial/pilot-agreement-template.md`
- Research-phase language, outcome-linked bonus, liability allocation
- **Pure docs. Can start immediately.**

**Full specifications:** See CSL-MASTER-PROMPT-V2.md Units B4.1-B4.4 for detailed instructions.

---

# ═══════════════════════════════════════════════════════════════
# ORBIT 3: MARKET VALIDATION
# Talk to hospitals. Validate assumptions. Feed back into Orbit 2.
# No code. Just conversations, documents, and decisions.
# Starts the day after Orbit 1 ships.
# ═══════════════════════════════════════════════════════════════

## WHY THIS IS A SEPARATE ORBIT

The biggest risk for Cortex Health is not a failing test suite or an unbuilt simulation engine. It's **building the wrong thing**.

From the MBA (Strategic Management — Porter's competitive strategy, Marketing Management — Kotler's STP framework, Health Care System Fundamentals — Brazilian health system structure):

- We assume hospitals want triage load predictions. Do they?
- We assume R$1,500/month is the right pilot price. Is it?
- We assume USP/UNIFESP are the right beachhead. Are they?
- We assume EHR integration is the #1 hospital requirement. Is it, or do they care more about billing automation or prevention protocols?
- We assume CDSS alert fatigue is a problem worth solving. For which specialties?

**These are all testable hypotheses.** And the fastest way to test them is to put the product in front of a clinical champion and ask.

## WEEK 2-3: INITIAL OUTREACH

1. **Identify 3 clinical champions** at São Paulo academic hospitals (USP HC, UNIFESP, Beneficencia Portuguesa)
2. **Schedule demo calls** using the shipped product (not mockups, not slides — the real thing)
3. **Demo script:** Walk through clinical-command → patient view → CDSS recommendations → prevention hub
4. **After demo, ask:**
   - "What would make this useful for your daily workflow?"
   - "What's missing that would prevent you from using this tomorrow?"
   - "How does your hospital currently handle triage load planning?"
   - "What would you pay for a tool that does X?" (anchor high, negotiate down)

## WEEK 4-6: FEEDBACK INTEGRATION

1. **Synthesize feedback** into a prioritized feature list
2. **Update Orbit 2 priorities** based on what hospitals actually want
3. **Validate or invalidate pricing hypothesis** — adjust B4.1 accordingly
4. **Decide:** Is the CSL simulation engine (B3) the right next investment? Or do hospitals want something else more urgently?

## ONGOING: ADVISORY BOARD FORMATION

Recruit 3-5 physicians from demo conversations into a Clinical Advisory Board. They become:
- Feature validators (tells you what to build)
- Clinical study partners (provides the cases for validation)
- Reference customers (tells other hospitals it works)
- Pricing anchors (tells you what they'd pay)

---

# ═══════════════════════════════════════════════════════════════
# THE "MARRY" PROTOCOL: How Orbit 2 code merges into main
# ═══════════════════════════════════════════════════════════════

When an Orbit 2 workstream is ready to integrate with the main app:

## Pre-Merge Checklist

```
[ ] Feature branch rebased on latest main
[ ] pnpm build exits 0 on the feature branch
[ ] pnpm test passes on the feature branch (including new tests)
[ ] No console.log, no hardcoded secrets, no TODO markers
[ ] If Prisma migration: verified it doesn't conflict with other pending migrations
[ ] If UI change: MANUAL VERIFICATION payload emitted
[ ] Human has reviewed the full diff
[ ] Commit messages follow Conventional Commits spec
```

## Merge Order Priority

When multiple branches are ready to merge simultaneously:

```
1. B1 (Regulatory) — merges first because consent types affect other features
2. B4.2 (Validation infrastructure) — merges second if a hospital is onboarded
3. B2.2 (Safety Firewall) — merges third, modifies existing components
4. B2.1 (EHR package) — merges fourth, standalone package addition
5. B3 (CSL full stack) — merges last, biggest surface area
```

## Conflict Resolution

If two branches modify the same file:
1. Rebase the lower-priority branch onto the higher-priority one
2. Resolve conflicts in favor of the already-merged branch
3. Re-run full test suite after rebase
4. Human reviews the resolution

---

# ═══════════════════════════════════════════════════════════════
# GATE REVIEWS (unchanged from MBA Strategy)
# ═══════════════════════════════════════════════════════════════

## MONTH 1 GATE: LAUNCH (NEW — not in V1/V2)

```
[ ] Orbit 1 complete — product is live and usable
[ ] At least 1 hospital demo scheduled
[ ] Orbit 2 branches created and development started
[ ] B4.3 (hospital targets) and B4.4 (pilot agreement) drafted
```

## MONTH 3 GATE: STRATEGIC VALIDATION

```
B1: [ ] ANVISA classification documented, Consulta Previa filed
    [ ] LGPD data flow audit complete, DPA templates ready
    [ ] Consent architecture merged to main (3 types, individually revocable)

B2: [ ] EHR: Philips Tasy adapter functional with mock data
    [ ] Safety Firewall: 4-tier severity system implemented

B3: [ ] CSL: Mesa simulation engine running TLP model deterministically
    [ ] Differential privacy verified (OpenDP, ε ≤ 1.0)
    [ ] SimulationRun audit trail ready (may not be merged to main yet)

B4: [ ] Pricing hypothesis validated or invalidated by hospital feedback
    [ ] 3+ Advisory Board members recruited
    [ ] Pipeline: 3+ hospitals in active engagement

ORBIT 3: [ ] At least 2 hospital demos completed
          [ ] Feature priority list updated based on feedback
          [ ] Go/no-go decision on CSL investment timing
```

## MONTH 6 GATE REVIEW

```
[ ] EHR bidirectional demo working (1 vendor)
[ ] Clinical validation: 10+ cases enrolled (if hospital partner confirmed)
[ ] Pricing validated with real hospital feedback
[ ] Safety Firewall operational on main branch
[ ] CSL packages passing their own test suites
```

## MONTH 12 GATE REVIEW

```
[ ] 1-2 hospitals live with outcomes data
[ ] 1+ operadora in pilot proposal stage
[ ] Validation: AUC ≥ 0.75, manuscript submitted
[ ] ANVISA submission filed (or CDS exemption confirmed)
[ ] Series A pitch deck with real data
```

---

# ═══════════════════════════════════════════════════════════════
# GLOBAL RULES (Apply to EVERY agent, EVERY unit, EVERY orbit)
# ═══════════════════════════════════════════════════════════════

1. **Read `CLAUDE.md` before every session.** Boardroom protocol, veto invariants, jest rules.
2. **Read relevant `risk-mitigation/RISK-NNN-*.md`** before any unit that references it.
3. **Conventional Commits only.** `type(scope): description`
4. **Never `git push`.** Human-only.
5. **Never commit with `console.log`, hardcoded secrets, dead code, or TODO markers.**
6. **Orbit 1 agents: work on main branch only.**
7. **Orbit 2 agents: work on feature branches only. NEVER commit to main directly.**
8. **All routes must have `createProtectedRoute` RBAC guard.**
9. **All PHI fields encrypted with `encryptPHIWithVersion`.**
10. **Circuit breaker:** 3 consecutive failures → HALT → emit `CIRCUIT_BREAKER_TRIPPED` → await human.
11. **Post-implementation verification:** After UI changes, emit `MANUAL VERIFICATION` block.
12. **Branch isolation:** If you need something from another branch, document the dependency and move on. Do NOT modify files owned by another workstream.

---

# ═══════════════════════════════════════════════════════════════
# HOW TO USE THIS PROMPT
# ═══════════════════════════════════════════════════════════════

## Step 1 — Launch Readiness (one terminal, main branch)

```bash
claude --prompt "Read CSL-MASTER-PROMPT-V3.md. Execute Orbit 1 starting from Unit L.1. Read CLAUDE.md first."
```

Complete L.1 through L.6 sequentially. This is your sprint.

## Step 2 — Deploy

Once Orbit 1 gate passes, deploy to production. The product is live.

## Step 3 — Open Orbit 2 branches (parallel terminals)

```bash
# Terminal 1: Regulatory (docs + lightweight code)
claude --prompt "Read CSL-MASTER-PROMPT-V3.md. Create branch orbit2/regulatory. Execute Workstream B1. Read CLAUDE.md first."

# Terminal 2: EHR Integration (standalone package)
claude --prompt "Read CSL-MASTER-PROMPT-V3.md. Create branch orbit2/ehr. Execute Workstream B2. Read CLAUDE.md first."

# Terminal 3: CSL Simulation (standalone packages)
claude --prompt "Read CSL-MASTER-PROMPT-V3.md. Execute Workstream B3 as standalone packages. Read CLAUDE.md first."

# Terminal 4: Commercial docs (no code, just docs)
claude --prompt "Read CSL-MASTER-PROMPT-V3.md. Execute Workstream B4. Read CLAUDE.md first."
```

## Step 4 — Begin Orbit 3 (you, Nico, not the AI)

Schedule hospital demos. Talk to clinical champions. Validate hypotheses. Feed findings back into Orbit 2 priorities.

## Step 5 — Marry (when ready)

When an Orbit 2 branch is complete and tested, use the Marry Protocol to merge to main.

---

# ═══════════════════════════════════════════════════════════════
# REFERENCE DOCUMENTS
# ═══════════════════════════════════════════════════════════════

| Document | Path |
|----------|------|
| **PRD: Market Entry** | `Cortex_Health_PRD_Market_Entry.docx` |
| **MBA Strategy Proposal** | `Cortex_MBA_Strategy_Implementation_Proposal.docx` |
| 3-Day Summit | `cortex-boardroom-summit-march-2026.md` |
| Risk Register | `cortex-swarm-layer-risk-register-march-2026.md` |
| RISK-001 through RISK-016 | `risk-mitigation/RISK-NNN-*.md` |
| **V2 Prompt (full unit specs)** | `CSL-MASTER-PROMPT-V2.md` |
| Status Follow-Up | `cortex-status-followup-march-18-2026.md` |

**Note:** For detailed unit specifications (exact file structures, code templates, acceptance criteria), refer to `CSL-MASTER-PROMPT-V2.md`. V3 intentionally keeps Orbit 2 units concise and references V2 for the full spec. This avoids duplication and keeps V3 focused on the execution architecture.

---

*Master Prompt v3.0 — March 18, 2026*
*Launch-First / Build-Aside / Marry-Later architecture*
*"Ship the castle before you build the moat."*
