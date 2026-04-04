# Software Development Plan

**Document ID:** SDP-HHL-001  
**IEC 62304 Reference:** Clause 5 — Software Development Planning  
**Safety Classification:** Class A (No injury possible)  
**Version:** 1.0  
**Date:** 2026-04-04  
**Author:** Holi Labs Engineering  
**Status:** Draft — Pending QA Review

---

## 1. Scope

This Software Development Plan (SDP) governs the development lifecycle of **holilabsv2**, a web-based healthcare SaaS platform providing clinical decision support (CDS) for Brazilian healthcare providers. The system is built as a Next.js 14 monorepo and deployed as a cloud-hosted application.

**Product Name:** Holi Labs Clinical Platform  
**Intended Market:** Brazil (ANVISA jurisdiction)  
**Regulatory Pathway:** ANVISA Class I SaMD notification under RDC 657/2022  
**Applicable Standards:**
- IEC 62304:2006+AMD1:2015 — Medical device software lifecycle processes
- ISO 14971:2019 — Application of risk management to medical devices
- IEC 82304-1:2016 — Health software — General requirements for product safety
- LGPD (Lei 13.709/2018) — Brazilian data protection law

---

## 2. Safety Classification Rationale

The software is classified as **IEC 62304 Class A** based on the following determination:

| Criterion | Assessment |
|-----------|-----------|
| Can the software cause or contribute to a hazardous situation? | No — all CDS outputs are advisory only |
| Does the software make autonomous clinical decisions? | No — clinician override is always available |
| Processing method | Deterministic (JSON-Logic rule engine, not AI/ML) |
| Clinician in the loop? | Yes — traffic light pattern (RED/YELLOW/GREEN) with mandatory override capability |
| Patient harm pathway | None — software presents recommendations that clinicians accept or reject |

**Key architectural evidence:**
- `apps/web/src/lib/clinical/safety-envelope.ts` wraps every CDS response with a disclaimer: *"The treating physician retains full responsibility for all clinical decisions."*
- `apps/web/src/lib/traffic-light/engine.ts` implements override logic at line 478: even RED signals can be overridden with supervisor approval; YELLOW signals require justification only
- The rule engine (`apps/web/src/lib/clinical/rule-engine.ts`) uses a deterministic JSON-Logic evaluator with a strict operation allowlist (line 40–51), ensuring no non-deterministic behavior

---

## 3. Development Model

### 3.1 Lifecycle Model

Agile development with 2-week sprints, following a continuous integration / continuous delivery (CI/CD) pipeline.

| Phase | IEC 62304 Activity | Implementation |
|-------|-------------------|----------------|
| Sprint Planning | 5.1 Software Development Planning | JIRA/Linear backlog grooming |
| Development | 5.5 Software Coding & Verification | Feature branches, TypeScript strict mode |
| Code Review | 5.5.3 Code Review | Pull request reviews with 2-approver requirement for security paths |
| Testing | 5.7 Software Verification | Jest (unit), Playwright (E2E), AxeBuilder (a11y) |
| Release | 5.8 Software Release | GitHub Actions CI/CD pipeline |
| Maintenance | 5.6 Software Maintenance | Hotfix branches, CVE monitoring |

### 3.2 Sprint Cadence

- **Sprint duration:** 2 weeks
- **Daily standup:** 06:20 BRT
- **Sprint review:** End of sprint
- **Retrospective:** End of sprint

---

## 4. Development Environment & Tools

### 4.1 Languages & Frameworks

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend | Next.js | 14.x |
| Language | TypeScript | 5.x (strict mode) |
| ORM | Prisma | Latest |
| Database | PostgreSQL | 15+ |
| Cache | Redis | 7+ |
| Package Manager | pnpm | 9+ |
| Runtime | Node.js | 20.0.0+ |

### 4.2 Testing Tools

| Tool | Purpose | Reference |
|------|---------|-----------|
| Jest | Unit and integration testing | `pnpm test` |
| Playwright | End-to-end and accessibility testing | `apps/web/playwright.config.ts` |
| AxeBuilder | WCAG 2.1 AA accessibility validation | Integrated with Playwright |
| k6 | Load and performance testing | `scripts/load-test-api.js` |

### 4.3 CI/CD Pipeline

| Stage | Tool | Trigger |
|-------|------|---------|
| Linting | ESLint + TypeScript compiler | Every push |
| Unit Tests | Jest | Every push |
| E2E Tests | Playwright | PR merge to main |
| Security Scan | npm audit (audit-level=high) | Every push |
| Build | Next.js production build | PR merge to main |
| Deployment | GitHub Actions | Manual approval from protected branch |

### 4.4 Configuration Management

| Item | Tool | Policy |
|------|------|--------|
| Source control | Git (GitHub) | Branch protection on `main` and `develop` |
| Branching model | Feature branches | `feat/`, `fix/`, `docs/`, `security/` prefixes |
| Commit format | Conventional Commits | `<type>(<scope>): <description>` |
| Force push | Prohibited | On `main` and `develop` branches |
| Security-critical paths | 2-approver PR policy | `auth/`, `encryption/`, `phi/`, `middleware.ts` |

Reference: Project governance defined in `CLAUDE.md` Section IX (PR & Commit Conventions).

---

## 5. Coding Standards

All coding standards are defined in `CLAUDE.md` Section VI and enforced via CI/CD tooling.

### 5.1 TypeScript Standards

- **Strict mode** enabled in all `tsconfig` files (`"strict": true`)
- **No `any` type** — use `unknown` with type guards
- **No type assertions** (`as Type`) without documented justification
- **Prefer `readonly`** properties and `const` declarations
- **Discriminated unions** preferred over boolean flags for state machines

### 5.2 File Organization

- `kebab-case.ts` for modules, `PascalCase.tsx` for React components
- Maximum file length: 300 lines
- Import grouping: (1) Node built-ins, (2) external packages, (3) internal `@/` aliases, (4) relative

### 5.3 Error Handling

- Every `catch` must log with context or re-throw — no swallowed errors
- Structured error types: `AppError`, `ValidationError`, `AuthorizationError`
- API error shape: `{ error: string, code: string, details?: unknown }`
- Prisma errors caught by specific codes (`P2002` unique, `P2025` not found`)

### 5.4 Security Coding Rules

- All API routes require Zod input validation — no unvalidated `req.body`
- All API routes use `createProtectedRoute` middleware — no raw handlers
- PHI fields must be encrypted before storage (AES-256-GCM)
- Logging must use tokenized identifiers (`tokenId`), never PHI field values
- Reference: `.claude/rules/security.md` (data classification L1–L4)

---

## 6. Problem Resolution Process

### 6.1 Defect Classification

| Severity | Definition | Resolution SLA |
|----------|-----------|---------------|
| P0 — Critical | Active data breach, PHI exposure, auth bypass | 15 min acknowledge, 1 hour contain |
| P1 — High | Vulnerability in prod, failed security scan | 1 hour acknowledge, 24 hour fix |
| P2 — Medium | Misconfiguration, missing validation | 4 hours acknowledge, 72 hour fix |
| P3 — Low | Security improvement, hardening opportunity | Next sprint |

### 6.2 CVE Response

- **Critical CVEs (CVSS >= 9.0):** Patched within 24 hours
- **High CVEs:** Patched within 72 hours
- Dependency security advisories are treated as P0 incidents
- GitHub Actions pinned to commit SHA to prevent supply chain attacks

Reference: `CLAUDE.md` Section V.5 (Patch Management).

---

## 7. Risk Management Integration

Risk management activities are performed in accordance with ISO 14971:2019 and documented in `docs/regulatory/iec62304/04-RISK-MANAGEMENT-FILE.md`.

- Hazard analysis is updated whenever clinical logic is modified
- The Safety Audit Logger (`apps/web/src/lib/clinical/safety-audit-logger.ts`) persists all CDS evaluations to the GovernanceLog chain for post-market surveillance
- Override events are captured with clinician rationale for risk monitoring

---

## 8. Document References

| Document | Location |
|----------|----------|
| Software Requirements Specification | `docs/regulatory/iec62304/02-SOFTWARE-REQUIREMENTS-SPEC.md` |
| Software Architecture Description | `docs/regulatory/iec62304/03-SOFTWARE-ARCHITECTURE.md` |
| Risk Management File | `docs/regulatory/iec62304/04-RISK-MANAGEMENT-FILE.md` |
| Verification & Validation Plan | `docs/regulatory/iec62304/05-VERIFICATION-VALIDATION-PLAN.md` |
| Traceability Matrix | `docs/regulatory/iec62304/06-TRACEABILITY-MATRIX.md` |
| Project Governance | `CLAUDE.md` |
| Security Rules | `.claude/rules/security.md` |

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-04-04 | Holi Labs Engineering | Initial release for ANVISA Class I notification |
