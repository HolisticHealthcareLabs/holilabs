# HoliLabs V2 — Codebase Rules

Inherits: ../CLAUDE.md (universal agent protocol, git, circuit breaker, output conventions, tooling).

---

<cortex_boardroom>

## Persona Registry

| Handle | Profile | Domain Authority |
|--------|---------|-----------------|
| ARCHIE | .cursor/rules/CTO_ARCHIE_V2.md | Architecture, tool selection, routing (default) |
| PAUL | .cursor/rules/CPO_PRODUCT_V2.md | UI/UX, frontend, feature scoping, i18n |
| VICTOR | .cursor/rules/CSO_STRATEGY_V2.md | Pricing, B2B sales, GTM, competitive intel |
| GORDON | .cursor/rules/CFO_GORDON_V2.md | Costs, COGS, burn rate, LTV/CAC, runway |
| RUTH | .cursor/rules/CLO_RUTH_V2.md | SaMD, consent, LGPD/HIPAA — supreme veto (Rank 1) |
| ELENA | .cursor/rules/CMO_ELENA_V2.md | Clinical logic, biomarkers, Manchester triage — supreme veto (Rank 2) |
| CYRUS | .cursor/rules/CISO_CYRUS_V2.md | RBAC, tenant isolation, PII encryption — supreme veto (Rank 2) |
| QUINN | .cursor/rules/QA_QUINN_V2.md | Test coverage, Jest, CI pipeline — quality gate (Rank 4) |

## Routing Triggers

architecture / tool choice / schema / CI  → ARCHIE
UI / user flow / frontend / i18n          → PAUL
pricing / GTM / sales / competition       → VICTOR
costs / COGS / burn / runway / tax        → GORDON
SaMD / consent / LGPD / HIPAA            → RUTH (may veto)
clinical logic / biomarkers / ontology    → ELENA (may veto)
RBAC / auth / PII / encryption           → CYRUS (may veto)
tests / coverage / CI / mocking           → QUINN (quality gate)

</cortex_boardroom>

---

<veto_invariants>

## RUTH (Legal — Rank 1)

- No endpoint/UI/model implying SaMD without ANVISA/COFEPRIS annotation
- No collapsed consent (granular types required)
- No cross-border transfer bypassing LGPD Art. 33
- No export/erasure without legalBasis field

## ELENA (Clinical — Rank 2)

- No clinical rule without provenance metadata (sourceAuthority, citationUrl)
- No Bro-Science (Tier 3) sources for clinical rules
- No LLM output as clinical recommendation without human review
- No imputed missing lab values — return INSUFFICIENT_DATA
- Biomarkers require both Pathological and Functional range sets

## CYRUS (Security — Rank 2)

- No route without createProtectedRoute RBAC guard
- No cross-tenant access without verifyPatientAccess()
- No PII (CPF, CNS, RG) written without encryptPHIWithVersion
- No deletion of AuditLog records (LGPD Art. 37)
- No weakening of audit trail hash-chain integrity

</veto_invariants>

---

<jest_mocking>

## Jest — Core Rule

NEVER use ES6 import for mocked modules — use require() after jest.mock().
Full patterns: .cursor/rules/QUINN_JEST_PATTERNS.md

Quick reference:
- Reset: jest.clearAllMocks() in beforeEach()
- Reject: (fn as jest.Mock).mockRejectedValue(err)
- Sequential: mockImplementation() with call-count tracking

</jest_mocking>

---

<ui_validation>

## Post-Implementation Verification

After UI mutations, emit exactly once:

MANUAL VERIFICATION
URL: http://localhost:3000/<path>
Target Node: <specific component or DOM element>
Expected State: <deterministic observable outcome>

All 3 fields mandatory. URL on its own line, fully-qualified localhost. Not gated on tests.

</ui_validation>

---

<sprint6_decisions>

## Sprint 6 Tooling

Full analysis: .cursor/rules/SPRINT6_DECISIONS.md

Summary:
- Nx MCP: INSTALLED (affected-graph scoping)
- wshobson plugins: SKIP (not in marketplace; existing stack covers)
- barkain: SKIP (cherry-picked scratchpad + delegation patterns into parent CLAUDE.md)
- ComposioHQ ao: NOT YET (pilot with openclaude on 1 GitHub Issue first)
- Medplum deepening: YES (Sprint 6 agent mission — ELENA + RUTH oversight)

</sprint6_decisions>

---

<scratchpad_dirs>

## Scratchpad Structure

.scratchpad/
  openclaude/     — research reports, tool evaluations
  nightingale/    — clinical data exports, FHIR bundles
  forge/          — design token builds, asset manifests
  meridian/       — i18n exports, RTL audit reports
  holilabs-main/  — architecture docs, schema migrations

</scratchpad_dirs>
