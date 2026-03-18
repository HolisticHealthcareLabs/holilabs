# Project Context

## Overview

This is a **Clinical Decision Support System (CDSS)** with sophisticated governance and compliance controls.

## Key Characteristics

- **Regulatory:** Software as a Medical Device (SaMD); ANVISA/COFEPRIS regulated
- **Privacy:** LGPD-compliant (Brazil); cross-border LATAM data protection
- **Clinical:** Biomarker analysis, Manchester triage protocols, drug interaction rules
- **Architecture:** Eight-persona governance (Cortex Boardroom); zero-trust DAG routing
- **Security:** Tenant isolation, PII encryption, immutable audit trails
- **Quality:** Jest testing, circuit-breaker patterns, pre-commit gates

## Core Files

- `.cursor/rules/ROUTER.md` — Single source of truth for agent routing
- `.cursor/rules/CTO_ARCHIE_V2.md` — Architecture & orchestration rules
- `.cursor/rules/CPO_PRODUCT_V2.md` — UX & feature scoping rules
- `.cursor/rules/CLO_RUTH_V2.md` — Legal & compliance rules
- `.cursor/rules/CMO_ELENA_V2.md` — Clinical evidence & safety rules
- `.cursor/rules/CISO_CYRUS_V2.md` — Security & RBAC rules
- `.cursor/rules/QA_QUINN_V2.md` — Test coverage & CI rules

## Critical Constraints (Unconditional)

### Version Control
- NEVER `git push` (human-only)
- Tests must pass (exit 0) before any commit
- No console.log, secrets, or dead code in staged changes
- Commit messages follow Conventional Commits spec

### Code Quality
- No ES6 `import` for mocks — use `require()` after `jest.mock()`
- All tests must pass before `git add`
- Circuit breaker halts after 3 consecutive failures
- Manual UI verification required after any visible change

### Compliance & Safety
- Supreme veto agents (RUTH, ELENA, CYRUS) can block work
- AuditLog records are never destroyed (LGPD Art. 37)
- Audit trail hash-chain integrity is non-negotiable
- Clinical rules require sourceAuthority & citationUrl metadata

## Tech Stack

(To be filled in as discovered during development)

