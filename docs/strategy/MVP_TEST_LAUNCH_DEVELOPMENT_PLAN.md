# Cortex MVP Test Launch — Development Plan

**Board-approved pre-launch gates and agent ownership (MBA-aligned)**

*Confidential — Internal | March 2026*

---

## 1. Scope Definition

**"MVP for testing"** = first external-facing validation (demo or limited pilot) using either:

- **(a) Synthea/demo data only** — no real patient data; no BAA required.
- **(b) Real patient data** — only after BAAs are signed and RUTH/CYRUS gates pass.

**Explicit rule:** No production PHI until RUTH and CYRUS sign off. Demo mode bypasses BAA requirement.

**Current status** (from [WHAT_IS_CORTEX](../WHAT_IS_CORTEX.md)):

| Dimension | Status |
|-----------|--------|
| Product readiness | 95% production-ready |
| Test coverage | 1,587 tests passing |
| Launch blocker | Vendor BAA signatures (non-technical) |

---

## 2. Agent Pre-Launch Gates (Veto-Rank Order)

### RUTH — CLO (Rank 1)

**Role:** Regulatory and compliance gate. Supreme veto on any PHI-related launch.

**Pre-launch gates:**
- [ ] BAA status confirmed OR explicit "demo-only / no PHI" mode locked
- [ ] Consent flows verified for any real patient data path
- [ ] SaMD word scan complete on all test-facing copy (no "diagnose," "detect," "prevent," "treat")
- [ ] Data export and erasure paths present and documented

**Owned artifacts:** [BAA Vendor Outreach Plan](../BAA_VENDOR_OUTREACH_PLAN.md), consent guard, [legal/](../legal/)

**MBA tie-in (Aron & Singh):** No partnership (LLM, hosting, comms) that cedes data ownership or creates structural risk before launch. Codifiability and structural risk evaluated first.

---

### ELENA — CMO (Rank 2)

**Role:** Clinical safety gate. Veto on any clinical logic or protocol without provenance.

**Pre-launch gates:**
- [ ] Clinical sign-off for protocols in scope (DOAC wedge) per [docs/CLINICAL_SIGNOFF_TEMPLATE.md](docs/CLINICAL_SIGNOFF_TEMPLATE.md)
- [ ] Deterministic rule provenance documented (source, version, date)
- [ ] No Bro-Science (Tier 3) sources for clinical rules
- [ ] Manchester triage (RED/ORANGE/YELLOW/GREEN) on all test-facing alerts
- [ ] MVD / INSUFFICIENT_DATA behavior defined for missing inputs

**Owned artifacts:** [Clinical Signoff Template](../CLINICAL_SIGNOFF_TEMPLATE.md), [Clinical Workflow Verification](../CLINICAL_WORKFLOW_VERIFICATION.md)

**MBA tie-in (McAfee & Brynjolfsson):** "Management revolution" framing ready for pilot stakeholders — lead with outcomes (governed decisions, auditable overrides), not feature list.

---

### CYRUS — CISO (Rank 2)

**Role:** Security gate. Veto on any route without RBAC, unencrypted PII, or weakened audit trail.

**Pre-launch gates:**
- [ ] All PHI routes behind RBAC (`createProtectedRoute`)
- [ ] No secrets in repo (pre-commit scan clean)
- [ ] Audit trail intact and hash-chain verified for test environment
- [ ] Session timeout (15 min idle, 8 hr absolute) and encryption verified

**Owned artifacts:** [Security Guidelines](../SECURITY_GUIDELINES.md), [security/](../security/), RBAC audit manifest

**MBA tie-in (Porter & Heppelmann):** Test environment must not expose Clinical Ground Truth or override data to unauthorized parties. Data loop protection is a security requirement.

---

### ARCHIE — CTO (Rank 3)

**Role:** Architecture and build gate. Ensures deployability and kernel integrity.

**Pre-launch gates:**
- [ ] `pnpm build` succeeds
- [ ] Typecheck clean (`pnpm -C apps/web typecheck`)
- [ ] No `any` type in `packages/shared-kernel/`
- [ ] Migration/schema state documented for target test deploy
- [ ] FHIR/data sovereignty boundaries clear for pilot (we retain control)

**Owned artifacts:** [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md), [Dev Setup](../DEV_SETUP.md), [ADRs](../adr/)

**MBA tie-in (Porter & Heppelmann):** Pilot config and docs must not present Cortex as "EHR add-on." Data loop metrics (override volume, Safety Firewall) must be measurable in test.

---

### GORDON — CFO (Rank 4)

**Role:** Financial gate. COGS and runway visibility for test phase.

**Pre-launch gates:**
- [ ] COGS/runtime cost estimate for test environment (DigitalOcean, WhatsApp, LLM)
- [ ] Runway impact of test phase documented
- [ ] BRL + USD where relevant (per GC-006)

**Owned artifacts:** [financial/](../financial/) or inline cost assumptions in this plan

**MBA tie-in (Shapiro & Varian):** Pilot pricing (if any) and positioning aligned with value narrative, not cost. Price on value delivered.

---

### QUINN — QA (Rank 4)

**Role:** Quality gate. Tests must pass; demo critical paths covered.

**Pre-launch gates:**
- [ ] `pnpm test` exit 0
- [ ] Demo critical paths covered per [Demo Day Checklist](../agent-runs/demo-week/DEMO_DAY_CHECKLIST.md)
- [ ] No flaky tests in gate
- [ ] Circuit breaker respected (no 3-consecutive-failure retry loops)

**Owned artifacts:** [Test Coverage Plan](../TEST_COVERAGE_PLAN.md), [Demo Day Checklist](../agent-runs/demo-week/DEMO_DAY_CHECKLIST.md)

**MBA tie-in (Zillow lesson):** Governance and deterministic behavior tested. No "data without guardrails" in test scope.

---

### VICTOR — CSO (Rank 5)

**Role:** Strategy and buyer gate. Named pilot or explicit demo-only scope.

**Pre-launch gates:**
- [ ] Named pilot/buyer OR explicit "demo-only, no commercial claim"
- [ ] Pilot success thresholds and KPIs attached (from [docs/CORTEX_LATAM_EXECUTION_ROADMAP_2026.md](docs/CORTEX_LATAM_EXECUTION_ROADMAP_2026.md) Section 7)
- [ ] One-line pitch per buyer type ready (from [MBA Frameworks](../../.cursor/rules/MBA_FRAMEWORKS.md))

**Owned artifacts:** [Holi Labs Advisor Brief](HOLI_LABS_ADVISOR_BRIEF_2026.md), [Pilot Tracker Template](../CORTEX_PILOT_TRACKER_TEMPLATE.md)

**MBA tie-in (Four Strategic Bets):** Pilot design owns data loop (override capture), sells management transformation, and avoids structural dependency with any single partner.

---

### PAUL — CPO (Rank 6)

**Role:** UX and product gate. Demo mode and i18n.

**Pre-launch gates:**
- [ ] Demo mode / Synthea path works end-to-end
- [ ] i18n audit for any strings shown in test (en/es/pt) — no hardcoded copy
- [ ] Manual verification payload documented: test URL + target node + expected state

**Owned artifacts:** [Synthea Demo Data](../SYNTHEA_DEMO_DATA.md), LanguageContext usage

**MBA tie-in (Cognitive lock-in):** Test flow should showcase personalization/override memory if available, so pilot stakeholders see "earned lock-in" narrative.

---

## 3. MBA-Aligned Pre-Launch Principles

From [MBA Synthesis](MBA_DT_SYNTHESIS_2026.md) and [MBA Frameworks](../../.cursor/rules/MBA_FRAMEWORKS.md):

| Principle | Application |
|-----------|-------------|
| **Data loop** | Override capture and governance events must be on and measurable in test. No launch if data architecture is bypassed or owned by a partner. |
| **Partnership risk** | Any vendor used for test (hosting, LLM, comms) scored per [MBA Synthesis Section 9](MBA_DT_SYNTHESIS_2026.md#9-partnership-decision-matrix). No RED partnerships for core capabilities. |
| **Management transformation** | Pilot narrative and materials lead with outcomes ("governed decisions," "auditable overrides") not feature list. |
| **Structural risk** | No exclusive or single-source dependency for data, auth, or clinical logic that would block future pivot. |

---

## 4. Ordered Launch Checklist

Execute in sequence. Each item links to the agent section above.

| # | Owner | Gate | Reference |
|---|-------|------|-----------|
| 1 | RUTH | Confirm BAA status OR lock to demo-only mode (no PHI) | [BAA Plan](../BAA_VENDOR_OUTREACH_PLAN.md) |
| 2 | ELENA | Sign off DOAC wedge for test scope | [Clinical Signoff Template](../CLINICAL_SIGNOFF_TEMPLATE.md) |
| 3 | CYRUS | Confirm RBAC and audit coverage for test env | [Security Guidelines](../SECURITY_GUIDELINES.md) |
| 4 | ARCHIE | Build and migration green for target deploy | [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md) |
| 5 | QUINN | Demo critical path tests passing | [Demo Day Checklist](../agent-runs/demo-week/DEMO_DAY_CHECKLIST.md) |
| 6 | VICTOR | Pilot KPIs and named contact attached (or "demo-only" declared) | [Execution Roadmap Section 7](../CORTEX_LATAM_EXECUTION_ROADMAP_2026.md#7-pilot-success-thresholds-go-no-go) |
| 7 | PAUL | Demo mode and i18n pass | [Synthea Demo Data](../SYNTHEA_DEMO_DATA.md) |
| 8 | GORDON | Test-phase cost and runway note filed | [Financial docs](../financial/) |

---

## 5. Owner Map and Next Steps

### RACI-Lite

| Role | Responsibility |
|------|-----------------|
| **Document owner** | Product Lead (PL) |
| **Checklist runner** | Engineering Lead (EL) or PL |
| **Go for test launch (demo-only)** | PL + EL sign-off |
| **Go for test launch (with PHI)** | RUTH + ELENA + CYRUS sign-off required |

### Next Steps

1. **Execute checklist in order** — resolve any gate failure with the owning agent before proceeding.
2. **Record go/no-go and date** — in [CORTEX_ROADMAP_STATUS_TRACKER](../CORTEX_ROADMAP_STATUS_TRACKER.md) or in the "Launch Log" section below.
3. **Re-run checklist** — after any material change (new protocol, new integration, BAA status change).

### Launch Log

| Date | Mode | Result | Sign-off |
|------|------|--------|----------|
| _TBD_ | Demo-only / Pilot | _Pending_ | _—_ |

---

*Last updated: March 2026*
