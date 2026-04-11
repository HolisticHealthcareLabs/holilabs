# HoliLabs v2 — Execution Plan: Hospital-Ready in 6 Sprints

**Date:** 2026-04-04
**Author:** Nico + Claude (Staff Eng)
**Supersedes:** `docs/HoliLabs_Readiness_Audit.md` (corrected — see §1 below)

---

## 1. Self-Critique: What the First Audit Got Wrong

The readiness audit from earlier today contained **five material errors** that would have wasted 2-3 sprints if acted on blindly:

### Error 1: Phantom `any` Count (7× overestimate)

**Claimed:** ~2,500 `any` type annotations — "highest-priority technical debt."
**Actual:** ~337 occurrences across 130 files. More importantly, the three critical paths — `src/lib/security/` (17), `src/lib/auth/` (12), and `src/lib/clinical/` (0 in core, a few in tests) — are essentially clean. The bulk of `any` lives in test files, legacy_archive/, and component __tests__/ where the blast radius is contained.

**Impact of the error:** Would have assigned an engineer for 2 full sprints to fix a problem that's a 3-day focused cleanup.

### Error 2: Inflated `console.log` Count

**Claimed:** 207 console.log statements in production code — "any one could leak PHI."
**Actual:** 208 occurrences, but 130+ are in `.skip.ts`, `.manual.skip.ts`, `README.md`, and `__tests__/` files that never execute in production. The real production-path count is ~40-60.

**Impact of the error:** Correct diagnosis (console.log in prod is a HIPAA risk), but wrong severity. A focused grep + replace session handles this in half a day, not a sprint.

### Error 3: Wrong Market Sequencing

**Claimed:** "Sign BAAs with all infrastructure providers" as P0 — implying US hospital sales are imminent.
**Reality:** HoliLabs is built Brazil-first. The codebase has deep Brazilian interop (ICP-Brasil, SNCR, CATMAT/ANVISA, CPF/CNS/RG, TUSS/ANS billing, RNDS FHIR profiles) but no US-specific integrations. The regulatory path is ANVISA Class I notification (simplified, 30-60 days), not HIPAA certification.

US market entry requires HITRUST CSF ($60-200K, 6-12 months) — that's a Series A decision, not a sprint task. BAAs matter, but they're Phase 2.

**Impact of the error:** Would have initiated an expensive cloud migration (DO → AWS/Azure for BAA) when the first 5 pilots will be Brazilian clinics that need LGPD compliance, not HIPAA.

### Error 4: Missing the AFE Prerequisite

**Not mentioned at all:** Before ANVISA will accept a Class I SaMD notification, the company needs an AFE (Autorização de Funcionamento de Empresa) — a company operating license that takes 30-60 days to obtain. This requires: active CNPJ, registered security manager in the Solicita System, local health authority inspection, and TFVS fee payment. **This is the actual critical path for the Brazil launch, not code quality.**

Source: [ANVISA AFE Requirements](https://www.freyrsolutions.com/what-is-afe-or-ae)

### Error 5: No IEC 62304 Awareness

**Not mentioned at all:** ANVISA RDC 657/2022 references IEC 62304 (Medical device software — Software life cycle processes) as the governing standard for SaMD development lifecycle. This international standard requires: Software Development Plan, Requirements Specification, Architecture Documentation, Detailed Design, Unit/Integration/System Testing evidence, Risk Management File (ISO 14971), and a Traceability Matrix linking requirements → design → tests → risks.

None of these documents exist in the repo. **This documentation gap — not code quality — is the actual blocker for ANVISA filing.**

Source: [IEC 62304 Guide](https://www.jamasoftware.com/blog/an-in-depth-guide-to-iec-62304-software-lifecycle-processes-for-medical-devices/)

---

## 2. Corrected Strategy

### Market: Brazil First, US Later

The codebase screams Brazil-first: ICP-Brasil signing, ANVISA drug registry, SNCR e-prescriptions, CPF/CNS/RG encryption, TUSS/ANS billing, RNDS FHIR profiles. Leaning into this strength means:

1. **ANVISA Class I notification** (simplified path for deterministic CDS)
2. **LGPD compliance documentation** (RIPD, DPO designation, processing records)
3. **SBIS-CFM certification** (progressive — start with basic level)
4. First pilots at **Brazilian clinics** (lower procurement complexity than hospitals)

US market entry (HIPAA/HITRUST) is a funded Phase 2 after revenue from Brazil pilots.

### Benchmarks Applied

| Standard | Level | Why |
|----------|-------|-----|
| **IEC 62304** | Class A (low risk — deterministic CDS) | ANVISA references this for SaMD lifecycle. Class A has lighter documentation requirements than B/C |
| **OWASP ASVS 4.0** | Level 2 (Standard) | [Recommended for healthcare applications](https://owasp.org/www-project-application-security-verification-standard/) that handle sensitive data. Level 3 is for military/financial — overkill for Class I SaMD |
| **ISO 14971** | Full | Risk management for medical devices — mandatory companion to IEC 62304 |
| **LGPD** | Full compliance | Arts. 5, 7, 11, 18, 37, 38, 41 — all applicable to health data processing |
| **ANVISA RDC 657/2022** | Class I notification | Deterministic CDS qualifies. Notification (not full registration) required |

### What "Hospital-Ready" Actually Means

After researching [actual hospital procurement processes](https://medium.com/@vidur.bhatnagar/5-lessons-from-building-selling-healthcare-saas-b2beb9b8f4af):

1. **IT/Security review** — They'll send a vendor security questionnaire (SIG Lite or custom). You need: pentest report, architecture diagram, data flow diagram, encryption details, incident response plan, backup/DR documentation.
2. **Legal review** — BAA/DPA (data processing agreement for LGPD), SLA terms, liability, insurance.
3. **Clinical review** — For CDS tools: evidence of deterministic behavior, override capability, audit trail, regulatory classification.
4. **Integration review** — FHIR conformance, HL7 interop, SSO capability, data export.
5. **Pilot structure** — 30-90 day pilot with defined success metrics, dedicated support, and a kill switch.

A hospital **will not** ask for your test coverage numbers or TypeScript strictness. They will ask for your ANVISA notification receipt, your pentest report, and your SLA.

---

## 3. The Six Agent Prompts

These are designed to run in Claude Code CLI against `~/prototypes/holilabsv2`. They can be executed in two waves:

**Wave 1 (parallel):** Agents 1, 2, 3 — no dependencies between them.
**Wave 2 (parallel, after Wave 1):** Agents 4, 5 — depend on outputs from Wave 1.
**Wave 3 (sequential):** Agent 6 — integration verification after everything lands.

---

### Agent 1: IEC 62304 Compliance Documentation Generator

**Estimated time:** 45-60 min
**Branch:** `feat/iec62304-lifecycle-docs`
**Benchmark:** IEC 62304:2015 Class A + ISO 14971:2019

```
You are a regulatory affairs engineer specializing in IEC 62304 (Medical device software lifecycle) and ISO 14971 (Risk management for medical devices). Your job is to generate the minimum viable documentation package for an ANVISA Class I SaMD notification under RDC 657/2022.

PROJECT: ~/prototypes/holilabsv2
BRANCH: Create and work on feat/iec62304-lifecycle-docs

CONTEXT: This is a healthcare SaaS platform (Next.js 14 monorepo) with deterministic clinical decision support (JSON-Logic rule engine — not AI/ML). The CDS uses a "traffic light" pattern: RED (block), YELLOW (warn), GREEN (proceed). It qualifies as ANVISA Class I because it provides clinical support that clinicians can override — it does not autonomously make treatment decisions.

PHASE 1 — CODEBASE ANALYSIS (10 min):
Read these files to understand the actual architecture:
- apps/web/src/lib/clinical/rule-engine.ts (deterministic rule engine)
- apps/web/src/lib/clinical/safety-envelope.ts (transparency wrapper)
- apps/web/src/lib/clinical/safety-audit-logger.ts (audit trail)
- apps/web/src/lib/traffic-light/engine.ts (traffic light CDS)
- apps/web/src/lib/security/hipaa-encryption.ts (PHI encryption)
- apps/web/src/lib/auth/casbin.ts (RBAC)
- apps/web/src/lib/auth/icp-brasil-signer.ts (digital signatures)
- apps/web/src/lib/brazil-interop/anvisa-drug-registry.ts (ANVISA drug codes)
- prisma/schema.prisma (data model — read first 200 lines + AuditLog model)
- CLAUDE.md (project governance)
Do NOT read entire directories. Use surgical file reads only.

PHASE 2 — GENERATE IEC 62304 CLASS A DOCUMENTS (30 min):
Create all files under docs/regulatory/iec62304/. Use professional technical writing. Reference actual file paths, function names, and architecture from Phase 1. These must be specific to THIS codebase, not generic templates.

1. docs/regulatory/iec62304/01-SOFTWARE-DEVELOPMENT-PLAN.md
   - Scope: holilabsv2 web application (Next.js 14)
   - Safety classification: Class A (no injury possible — clinician always in the loop)
   - Development model: Agile (2-week sprints) with continuous integration
   - Tools: TypeScript, Prisma, Jest, Playwright, GitHub Actions
   - Reference: CLAUDE.md coding standards as the coding guidelines
   - Configuration management: Git, branch protection rules from CLAUDE.md §IX

2. docs/regulatory/iec62304/02-SOFTWARE-REQUIREMENTS-SPEC.md
   - Extract functional requirements from the actual route structure (apps/web/src/app/)
   - Extract security requirements from .claude/rules/security.md
   - Extract clinical requirements from the rule engine and safety envelope
   - Trace each requirement to an ID (REQ-FUNC-001, REQ-SEC-001, REQ-CLIN-001, etc.)
   - Include performance requirements (response times, availability targets)

3. docs/regulatory/iec62304/03-SOFTWARE-ARCHITECTURE.md
   - System context diagram (Mermaid): User → Next.js → Prisma → PostgreSQL, with Redis, S3, external APIs
   - Component diagram: Auth, Clinical, Billing, FHIR, Scheduling subsystems
   - Data flow diagram: PHI encryption flow from user input → encrypted storage → decrypted display
   - Security architecture: RBAC (Casbin), session management, MFA, audit chain
   - CDS architecture: Rule engine → Safety envelope → Governance log (emphasize deterministic nature)

4. docs/regulatory/iec62304/04-RISK-MANAGEMENT-FILE.md (ISO 14971)
   - Intended use statement: Clinical decision support for Brazilian healthcare providers
   - Hazard analysis: Identify top 10 hazards (wrong drug interaction alert, missed contraindication, audit trail failure, PHI exposure, etc.)
   - Risk estimation: Severity × Probability matrix
   - Risk control measures: Map each hazard to existing controls (safety envelope, rule engine validation, audit logging, encryption)
   - Residual risk assessment
   - NOTE: Emphasize that the CDS is deterministic (JSON-Logic) and always presents override capability

5. docs/regulatory/iec62304/05-VERIFICATION-VALIDATION-PLAN.md
   - Unit testing strategy (Jest — reference actual test patterns from CLAUDE.md §VII)
   - Integration testing (API routes with supertest)
   - E2E testing (Playwright — reference the 45 security tests)
   - Accessibility testing (WCAG 2.1 AA with axe-core)
   - Security testing (OWASP ASVS Level 2 — reference security E2E suite)
   - Clinical validation plan: How the CDS rules are validated against clinical guidelines

6. docs/regulatory/iec62304/06-TRACEABILITY-MATRIX.md
   - Table: Requirement ID → Design Component → Test Case → Risk Control
   - Must cover all REQ-CLIN-* requirements
   - Must cover all REQ-SEC-* requirements
   - Include file paths for each design component and test case

PHASE 3 — ANVISA NOTIFICATION PREP (10 min):
7. docs/regulatory/anvisa/NOTIFICATION-CHECKLIST.md
   - Pre-requisites: AFE (Autorização de Funcionamento), CNPJ, local VISA inspection
   - Notification form fields mapped to actual product details
   - Technical dossier contents (reference the IEC 62304 docs above)
   - ANVISA Class I classification rationale (deterministic CDS, clinician override, no autonomous decisions)
   - Reference: RDC 657/2022 Articles 4-8 for classification criteria

PHASE 4 — VERIFICATION:
- Ensure no PHI, real patient data, or secrets appear in any document
- Verify all referenced file paths actually exist in the codebase
- Check that Mermaid diagrams render correctly (valid syntax)
- Confirm the traceability matrix has no orphaned requirements

Commit: "docs(regulatory): IEC 62304 Class A lifecycle documentation for ANVISA Class I SaMD notification"
```

---

### Agent 2: OWASP ASVS Level 2 Audit & Hardening

**Estimated time:** 40-50 min
**Branch:** `feat/owasp-asvs-l2-hardening`
**Benchmark:** OWASP ASVS 4.0.3, Level 2

```
You are a senior application security engineer. Your job is to audit this healthcare application against OWASP ASVS 4.0 Level 2 (the recommended level for healthcare applications per OWASP guidance) and fix every gap you find in code.

PROJECT: ~/prototypes/holilabsv2/apps/web
BRANCH: Create and work on feat/owasp-asvs-l2-hardening

BENCHMARK: OWASP ASVS 4.0.3 Level 2 — specifically these chapters:
- V1: Architecture (security architecture documentation)
- V2: Authentication (password policy, credential storage, MFA)
- V3: Session Management (timeouts, token security, concurrent sessions)
- V4: Access Control (RBAC enforcement, path traversal prevention)
- V5: Validation (input validation, output encoding, injection prevention)
- V7: Error Handling & Logging (no sensitive data in errors/logs, structured logging)
- V8: Data Protection (PHI encryption at rest and in transit, key management)
- V9: Communication (TLS, certificate validation, HSTS)
- V13: API Security (rate limiting, input size limits, content type validation)
- V14: Configuration (security headers, dependency management)

PHASE 1 — SYSTEMATIC AUDIT (15 min):
For each ASVS chapter above, read the relevant source files and check compliance:

V2 Authentication:
  Read: src/lib/auth/auth.config.ts, src/lib/auth/password-validation.ts, src/lib/auth/mfa.ts
  Check: Password complexity requirements, bcrypt cost factor, MFA enforcement options, credential recovery

V3 Session Management:
  Read: src/lib/auth/session-tracking.ts, src/lib/auth/session-security.ts, src/lib/auth/token-revocation.ts
  Check: Session timeout values, secure cookie flags, concurrent session limits

V4 Access Control:
  Read: src/lib/auth/casbin.ts, src/lib/auth/casbin-middleware.ts, src/lib/api/middleware.ts
  Check: Default-deny, RBAC on every route, horizontal privilege escalation prevention

V5 Input Validation:
  Read: src/lib/security/validation.ts, src/lib/security/input-sanitization.ts
  Grep: Find API routes WITHOUT Zod validation: search for "req.json()" or "req.body" not preceded by schema.parse
  Check: SQL injection prevention (parameterized queries only), XSS output encoding

V7 Error Handling:
  Read: All error.tsx files in src/app/
  Grep: Find "console.log" in production paths (exclude __tests__/, *.test.*, *.skip.*, legacy_archive/, README)
  Check: No stack traces, error messages, or PHI in client-facing errors

V8 Data Protection:
  Read: src/lib/security/hipaa-encryption.ts, src/lib/db/encryption-extension.ts, src/lib/security/redact-phi.ts
  Check: All PHI fields encrypted per CLAUDE.md §V.1, key rotation mechanism, de-identification capability

V13 API Security:
  Read: src/lib/api/rate-limit.ts, middleware.ts
  Check: Rate limiting on all routes, request body size limits, content-type enforcement

V14 Configuration:
  Read: next.config.js, middleware.ts (CSP headers)
  Check: Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy)
  Check: poweredByHeader: false (confirmed in Sprint 5)

PHASE 2 — PRODUCE COMPLIANCE CHECKLIST (5 min):
Create docs/security/OWASP-ASVS-L2-CHECKLIST.md with:
- Every ASVS L2 requirement checked (PASS/FAIL/N-A)
- File path evidence for each PASS
- Specific gap description for each FAIL
- Priority (P0-P3) for each FAIL

PHASE 3 — FIX ALL P0/P1 GAPS IN CODE (20 min):
For every FAIL rated P0 or P1, make the fix:

Likely fixes (based on common gaps):
1. Add missing Zod validation to any unvalidated API routes
2. Remove remaining console.log from production code paths (NOT test files — leave those)
3. Add missing security headers if any are absent
4. Add request body size limits if missing
5. Ensure all error boundaries return generic messages (Sprint 5 hardened most — verify none were missed)
6. Add session idle timeout if not configured
7. Verify CSRF protection covers all state-changing endpoints

For each fix:
- Read the file first
- Make the minimal surgical edit
- Add a comment referencing the ASVS requirement (e.g., // ASVS V5.1.3)

PHASE 4 — VERIFICATION:
1. Run: pnpm typecheck (in apps/web/) — confirm zero NEW errors introduced
2. Run: pnpm test --bail — confirm tests still pass
3. Grep: Verify zero console.log in production paths (re-run the grep from Phase 1)
4. Review: Re-check all P0/P1 items are now PASS

Commit: "security(asvs): OWASP ASVS Level 2 audit + P0/P1 remediation — healthcare hardening"
```

---

### Agent 3: Production Infrastructure — Health Endpoints, Dockerfile, Monitoring

**Estimated time:** 35-45 min
**Branch:** `feat/production-infrastructure`
**Benchmark:** 12-Factor App, Kubernetes readiness, DigitalOcean App Platform

```
You are a senior platform/SRE engineer. Your job is to make this healthcare application production-deployable with proper health checks, containerization, and monitoring hooks. The first deployment target is DigitalOcean App Platform (current), with a near-term migration path to Kubernetes.

PROJECT: ~/prototypes/holilabsv2
BRANCH: Create and work on feat/production-infrastructure

PHASE 1 — HEALTH ENDPOINTS (10 min):
The deploy pipeline (see .github/workflows/deploy.yml) calls /api/health/live and /api/health/ready but these endpoints DON'T EXIST. This is the #1 production blocker.

Create apps/web/src/app/api/health/live/route.ts:
- Kubernetes liveness probe pattern
- Returns 200 with { status: "ok", timestamp: ISO8601 }
- No authentication required
- No database call (must respond even if DB is down)
- Must respond within 200ms

Create apps/web/src/app/api/health/ready/route.ts:
- Kubernetes readiness probe pattern
- Checks: database connectivity (Prisma.$queryRaw`SELECT 1`), Redis connectivity (ping)
- Returns 200 with { status: "ready", checks: { database: "ok", cache: "ok" } }
- Returns 503 with { status: "not_ready", checks: { ... } } if any check fails
- No authentication required
- 5-second timeout on each check

Create apps/web/src/app/api/health/startup/route.ts:
- Kubernetes startup probe pattern
- Checks: Prisma client initialized, encryption keys loaded
- Returns 200 or 503

Write tests: apps/web/src/app/api/health/__tests__/route.test.ts
- Test each endpoint's happy path and failure modes
- Mock Prisma and Redis for failure scenarios

PHASE 2 — DOCKERFILE (10 min):
Read package.json and next.config.js to understand the build.

Create Dockerfile (multi-stage, production-optimized):
- Stage 1 (deps): node:20-alpine, pnpm install --frozen-lockfile
- Stage 2 (build): Copy source, pnpm build, prisma generate
- Stage 3 (runtime): node:20-alpine, copy only .next/standalone + .next/static + public + prisma
- Non-root user (node:node)
- HEALTHCHECK using /api/health/live
- Expose 3000
- Labels: org.opencontainers.image.* for registry metadata

Create docker-compose.yml (local development):
- web: builds from Dockerfile, ports 3000, depends_on postgres + redis
- postgres: postgres:16-alpine, volume for data persistence, health check
- redis: redis:7-alpine, health check
- Environment variables from .env.local (not .env — that's production)

Create .dockerignore:
- node_modules, .next, .git, .env*, *.log, coverage/, .scratchpad/

PHASE 3 — MONITORING HOOKS (10 min):
Read docs/OBSERVABILITY_PLAN.md to understand the target state.

Create apps/web/src/lib/monitoring/metrics.ts:
- Export functions for key business metrics:
  - trackApiLatency(route, method, statusCode, durationMs)
  - trackAuthEvent(event: 'login_success' | 'login_failure' | 'mfa_challenge' | 'session_expired')
  - trackClinicalEvent(event: 'cdss_query' | 'prescription_signed' | 'soap_saved')
  - trackPhiAccess(resourceType, action, userId) — for audit correlation
- Use console.info with structured JSON (compatible with any log aggregator)
- NO PHI in any metric — only tokenized IDs and event types

Create apps/web/src/lib/monitoring/sentry-config.ts:
- Read existing Sentry config if any, enhance with:
  - beforeSend hook that strips PHI fields from error events
  - denyUrls for health check endpoints (reduce noise)
  - tracesSampleRate: 0.1 for production, 1.0 for development
  - PHI field scrubbing list from CLAUDE.md §V.1

PHASE 4 — BACKUP STRATEGY DOCUMENT (5 min):
Create docs/operations/BACKUP-DR-PLAN.md:
- PostgreSQL: pg_dump daily to encrypted S3, 30-day retention
- Point-in-time recovery via WAL archiving
- Redis: snapshot + AOF, 7-day retention
- RPO: 1 hour (WAL), RTO: 4 hours
- Restore procedure (step-by-step)
- DR test schedule: quarterly
- Note: This is the PLAN — implementation requires infrastructure access

PHASE 5 — VERIFICATION:
1. Run: pnpm typecheck — zero new errors
2. Run: pnpm test --bail — tests pass including new health endpoint tests
3. Verify: docker build . --no-cache (dry run — confirm Dockerfile syntax is valid)
4. Verify: No secrets or PHI in any new file
5. Verify: Health endpoints don't bypass auth intentionally (they're public by design — document why)

Commit: "feat(infra): health endpoints, Dockerfile, monitoring hooks, backup/DR plan — production readiness"
```

---

### Agent 4: LGPD Compliance Documentation Package

**Estimated time:** 30-40 min
**Branch:** `feat/lgpd-compliance-package`
**Benchmark:** LGPD (Lei 13.709/2018), ANPD guidelines
**Depends on:** Can run parallel to Agents 1-3, but benefits from Agent 1's risk file

```
You are a data protection specialist with expertise in Brazilian LGPD (Lei Geral de Proteção de Dados). Your job is to produce the complete LGPD compliance documentation package for a healthcare SaaS platform and verify that the codebase implements the required technical controls.

PROJECT: ~/prototypes/holilabsv2
BRANCH: Create and work on feat/lgpd-compliance-package

CONTEXT: This platform processes sensitive personal data (dados pessoais sensíveis) as defined by LGPD Art. 5(II) — specifically health data and biometric data (CPF, CNS, RG). The legal basis for processing is Art. 7(VIII) (health protection) and Art. 11(II)(f) (health data by health professionals). Brazil-first market — first pilots will be in São Paulo clinics.

PHASE 1 — CODEBASE VERIFICATION (10 min):
Verify these LGPD technical requirements are implemented:

Art. 18 — Data Subject Rights:
  Check: /api/patients/export/ exists (right to data portability)
  Check: /api/patients/[id]/erasure/ exists (right to deletion)
  Check: Patient portal privacy page exists (/portal/dashboard/privacy/)
  Read: The actual route handlers — verify they work, not just exist

Art. 46 — Security Measures:
  Read: src/lib/security/hipaa-encryption.ts — verify AES-256-GCM
  Read: src/lib/db/encryption-extension.ts — verify all PHI fields covered
  Read: src/lib/security/audit-chain.ts — verify tamper-evident logging

Art. 37 — Processing Records:
  Check: Does an audit log capture ALL data processing activities? Read AuditLog model in schema.prisma

Art. 49 — Incident Notification:
  Read: .claude/rules/security.md — check incident response procedures

PHASE 2 — GENERATE LGPD DOCUMENTS (20 min):
Create all under docs/regulatory/lgpd/:

1. docs/regulatory/lgpd/RIPD-RELATORIO-IMPACTO.md
   (Relatório de Impacto à Proteção de Dados Pessoais — LGPD Art. 38)
   Sections:
   - Descrição dos processos de tratamento (data processing description)
   - Dados pessoais coletados (personal data inventory — from Prisma schema)
   - Dados pessoais sensíveis (sensitive data — health records, CPF, CNS, biometrics)
   - Base legal (Art. 7(VIII) health protection + Art. 11(II)(f))
   - Finalidade do tratamento (purpose: clinical care, CDS, billing, scheduling)
   - Compartilhamento (data sharing: external APIs, FHIR sync, SNCR, RNDS)
   - Medidas de segurança (security measures: encryption, RBAC, MFA, audit)
   - Riscos identificados e mitigações (risks and mitigations)
   - Tempo de retenção (retention periods)
   - Direitos dos titulares (how data subject rights are implemented)
   Write in Portuguese (this is a Brazilian regulatory document).

2. docs/regulatory/lgpd/REGISTRO-ATIVIDADES-TRATAMENTO.md
   (Record of Processing Activities — LGPD Art. 37)
   Table format with columns:
   - Atividade | Dados Tratados | Base Legal | Finalidade | Compartilhamento | Retenção | Responsável
   One row for each processing activity:
   - Patient registration, Clinical encounter, Prescription, Lab order, Billing claim, Scheduling, Telehealth, Audit logging, Analytics (anonymized), Email notifications
   Write in Portuguese.

3. docs/regulatory/lgpd/POLITICA-PRIVACIDADE.md
   (Privacy Policy — LGPD Art. 9)
   - Written for patients (plain language, Portuguese)
   - Cover: identity of controller, DPO contact, purposes, legal basis, data sharing, rights, retention, security measures
   - Include specific mention of CPF/CNS processing and why it's necessary
   - Reference Art. 18 rights (access, correction, portability, deletion, consent revocation)

4. docs/regulatory/lgpd/PLANO-RESPOSTA-INCIDENTES.md
   (Incident Response Plan — LGPD Art. 48)
   - Detection procedures (monitoring, alerts)
   - Classification (P0-P3 per .claude/rules/security.md)
   - Containment steps
   - ANPD notification procedure (Art. 48 — "prazo razoável" = 2 business days per ANPD guidance)
   - Data subject notification procedure
   - Post-incident review
   Write in Portuguese.

5. docs/regulatory/lgpd/DPO-DESIGNATION.md
   - Template for DPO (Encarregado) designation per LGPD Art. 41
   - Placeholder for name, contact, responsibilities
   - Publication requirements (must be publicly accessible)
   Write in Portuguese with English annotations.

PHASE 3 — CODE GAPS (10 min):
If any technical control from Phase 1 is missing or incomplete, implement it:

Likely gaps:
- Cookie consent banner for the patient portal (LGPD Art. 7(I))
- Data retention automated enforcement (delete records past retention period)
- Right to revoke consent (API endpoint to withdraw consent and halt processing)
- Processing activity logging (distinct from audit logging — tracks WHAT processing occurs, not just access)

For each gap found: create the file, write the implementation, add a test.

PHASE 4 — VERIFICATION:
1. All Portuguese documents pass spell-check (run aspell or similar)
2. All referenced API endpoints actually exist (verify paths)
3. All referenced Prisma models exist in schema
4. No PHI examples in any document (use "João da Silva" / CPF 000.000.000-00 as examples)
5. Cross-reference: every processing activity in the Art. 37 record has a matching data subject right implementation

Commit: "docs(lgpd): complete LGPD compliance package — RIPD, processing records, privacy policy, incident plan, DPO template"
```

---

### Agent 5: TypeScript Strictness + next-auth Upgrade + Test Stabilization

**Estimated time:** 45-60 min
**Branch:** `feat/type-safety-and-test-stabilization`
**Benchmark:** TypeScript strict mode (zero `any` in critical paths), 80% coverage threshold
**Depends on:** Run after Agents 1-3 to avoid merge conflicts

```
You are a senior TypeScript engineer responsible for production-quality code in a healthcare application. Your three objectives: (1) eliminate every `any` type in security/auth/clinical paths, (2) assess the next-auth beta risk and create an upgrade plan, (3) fix the remaining TypeScript compilation errors.

PROJECT: ~/prototypes/holilabsv2/apps/web
BRANCH: Create and work on feat/type-safety-and-test-stabilization

PHASE 1 — TYPE SAFETY AUDIT (10 min):
Run: grep -rn ": any" src/lib/security/ src/lib/auth/ src/lib/clinical/ src/lib/api/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v .test. | grep -v .skip.

For each `any` found in these critical paths:
- Read the file and understand what type is actually needed
- Replace with a proper type (use `unknown` + type guard if the actual type isn't clear)
- Add JSDoc if the function is exported

Then run the same grep on: src/services/ src/hooks/ src/components/ (excluding __tests__)
- Fix any in production code paths only (not test files — those are lower priority)
- Count and report: "X `any` types fixed, Y remaining (all in test files)"

PHASE 2 — NEXT-AUTH ASSESSMENT (10 min):
Read: src/lib/auth/auth.config.ts, src/lib/auth/auth.ts, src/lib/auth/server.ts, package.json

Determine:
- Exact next-auth version in use (expected: 5.0.0-beta.30)
- Which next-auth APIs are used (getServerSession, authOptions, providers, callbacks, etc.)
- Whether the migration to stable v5 is straightforward or requires breaking changes

Create: docs/technical/NEXTAUTH-UPGRADE-PLAN.md
- Current version and risk assessment (beta in production healthcare auth)
- API surface used (list every import from next-auth across the codebase)
- Breaking changes between beta.30 and stable (research from next-auth changelog)
- Migration steps (ordered, with rollback plan)
- Testing requirements (which auth flows must be verified after upgrade)
- Recommendation: Upgrade timeline and whether to do it now or after first pilot

Do NOT actually upgrade next-auth — just produce the plan. The upgrade needs human review.

PHASE 3 — FIX TYPESCRIPT ERRORS (20 min):
Run: npx tsc --noEmit 2>&1 | head -200

Categorize errors:
1. Errors in files YOU modified (must fix — zero tolerance)
2. Errors in src/lib/ (should fix — these are core logic)
3. Errors in test files (lower priority — fix if time permits)
4. Errors in legacy_archive/ (skip — these are archived)

Fix categories 1 and 2. For each fix:
- Read the file
- Understand the type error
- Apply the minimal correct fix (prefer adding types over suppressing errors)
- Never add @ts-ignore or @ts-expect-error

For category 3, if there are common patterns (e.g., missing mock types), create a src/types/test-helpers.d.ts with proper mock type definitions rather than fixing each test individually.

PHASE 4 — CONSOLE.LOG CLEANUP (10 min):
Run: grep -rn "console\.log\|console\.warn\|console\.error" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v .test. | grep -v .skip. | grep -v legacy_archive/ | grep -v README | grep -v .disabled

For each match in PRODUCTION code:
- If it logs potentially sensitive data (patient fields, tokens, secrets): REMOVE immediately
- If it's a useful diagnostic: Replace with the structured logger (src/lib/logging/ or src/lib/logger.ts)
- If it's in a catch block: Keep but ensure it logs error.message only, never the full error object

Report: "Removed X console statements, replaced Y with structured logger, Z remaining (justified)"

PHASE 5 — VERIFICATION:
1. Run: npx tsc --noEmit 2>&1 | wc -l — report before/after error count
2. Run: pnpm test --bail — must pass
3. Run: grep -c ": any" on the critical paths — must be zero (excluding test files)
4. Run: grep for console.log in production paths — report final count
5. Create: docs/technical/TYPE-SAFETY-REPORT.md with full metrics

Commit: "refactor(types): eliminate any from critical paths, TS error reduction, console.log cleanup, next-auth upgrade plan"
```

---

### Agent 6: Integration Verification & Vendor Security Questionnaire

**Estimated time:** 30-40 min
**Branch:** `sprint6/hospital-ready` (merge target)
**Depends on:** All five previous agents must be complete

```
You are the integration lead. All five feature agents have completed their work. Your job is to: (1) merge everything cleanly, (2) run full verification, and (3) produce the vendor security questionnaire response that hospitals will actually ask for.

PROJECT: ~/prototypes/holilabsv2
BRANCH: Create sprint6/hospital-ready from sprint5/multi-agent-delivery

PHASE 1 — MERGE (10 min):
Merge in this order (least conflicting → most):
1. feat/production-infrastructure (new files, minimal conflict risk)
2. feat/lgpd-compliance-package (docs only, no code conflicts)
3. feat/iec62304-lifecycle-docs (docs only, no code conflicts)
4. feat/owasp-asvs-l2-hardening (security fixes, may touch middleware)
5. feat/type-safety-and-test-stabilization (broadest code changes, merge last)

For each: git merge feat/<branch> --no-ff -m "merge: integrate <branch> into hospital-ready"
If conflicts: security changes always win. Read both sides, keep the more restrictive version.

PHASE 2 — INTEGRATED VERIFICATION (15 min):
1. pnpm install
2. npx tsc --noEmit — count errors (must be ≤ pre-merge count)
3. pnpm test --bail — must pass
4. Verify health endpoints: grep for /api/health/live, /api/health/ready, /api/health/startup in src/app/api/
5. Verify no .env files committed: git diff --name-only sprint5/multi-agent-delivery..HEAD | grep -i '\.env'
6. Verify no duplicate middleware registrations
7. Verify OWASP ASVS checklist exists and has zero P0 FAILs remaining
8. Verify IEC 62304 traceability matrix references valid file paths
9. Verify LGPD RIPD references valid API endpoints

PHASE 3 — VENDOR SECURITY QUESTIONNAIRE (10 min):
Create docs/sales/VENDOR-SECURITY-QUESTIONNAIRE.md

This is the document hospital IT teams will actually request. Based on the SIG Lite format, answer these sections using EVIDENCE from the codebase:

1. Organization & Governance
   - Security policies (reference .claude/rules/security.md, CLAUDE.md §V)
   - Roles and responsibilities (reference RBAC roles from Casbin)
   - Incident response (reference LGPD incident plan)

2. Access Control
   - Authentication methods (NextAuth, MFA via Twilio)
   - Authorization model (Casbin RBAC — list all roles)
   - Session management (timeouts, token revocation)
   - Admin access controls

3. Data Protection
   - Encryption at rest (AES-256-GCM, key-versioned — reference hipaa-encryption.ts)
   - Encryption in transit (TLS 1.2+ via hosting provider)
   - Data classification (L1-L4 per security.md)
   - PHI handling procedures
   - De-identification capability (reference deid/ package)

4. Application Security
   - SDLC (reference IEC 62304 Software Development Plan)
   - Security testing (reference OWASP ASVS L2 checklist)
   - Penetration testing (status: scheduled — provide timeline)
   - Vulnerability management (reference CVE SLA from CLAUDE.md §V.5)
   - Code review process (reference CLAUDE.md §VIII-IX)

5. Infrastructure & Operations
   - Hosting (DigitalOcean App Platform — current; Kubernetes migration planned)
   - Monitoring (reference metrics.ts + OBSERVABILITY_PLAN.md)
   - Backup & DR (reference BACKUP-DR-PLAN.md)
   - Health checks (reference /api/health/* endpoints)

6. Compliance & Certifications
   - LGPD (reference RIPD, processing records, privacy policy)
   - ANVISA RDC 657/2022 (reference IEC 62304 docs, Class I classification)
   - IEC 62304 (reference lifecycle documentation)
   - OWASP ASVS Level 2 (reference checklist)
   - SOC 2 / HITRUST (status: planned for Phase 2, post-revenue)

7. Regulatory (Brazil-specific)
   - ANVISA notification status
   - AFE status
   - SBIS certification status
   - ICP-Brasil digital signature capability

For each answer: include the file path or document reference as evidence. Hospitals verify claims.

PHASE 4 — FINAL REPORT:
Create docs/SPRINT6_DELIVERY_REPORT.md:
- Summary of all 5 agent contributions
- Integration issues encountered and resolution
- Test results (TypeScript errors before/after, test pass rate)
- Security posture (OWASP ASVS L2 compliance %)
- Regulatory readiness (IEC 62304 complete, LGPD complete, ANVISA checklist)
- Known gaps and next steps
- Recommendation: SHIP TO PILOT / HOLD / NEEDS WORK

Commit: "chore(integration): merge all sprint6 agents — hospital-ready verification complete"
```

---

## 4. Execution Sequence

```
Week 1 (Wave 1 — parallel):
├── Agent 1: IEC 62304 docs          ─── 60 min
├── Agent 2: OWASP ASVS L2 audit     ─── 50 min
└── Agent 3: Production infra         ─── 45 min

Week 1 (Wave 2 — parallel, after Wave 1):
├── Agent 4: LGPD compliance          ─── 40 min
└── Agent 5: Type safety + next-auth  ─── 60 min

Week 1 (Wave 3 — sequential):
└── Agent 6: Integration + vendor questionnaire ─── 40 min

Total agent runtime: ~5 hours of Claude Code execution
Human review: ~2 hours (regulatory docs need domain expert sign-off)
```

## 5. What These Agents Do NOT Cover (Requires Humans)

1. **AFE application** — Requires CNPJ, local health authority inspection, fee payment. Cannot be automated.
2. **Pentest engagement** — Must be contracted with a qualified firm. Budget $15-25K, schedule 4-6 weeks out.
3. **DPO appointment** — Legal designation. Template provided by Agent 4, but a human must be named.
4. **ANVISA notification submission** — Agent 1 prepares the dossier, but a regulatory affairs professional should review and submit.
5. **next-auth upgrade execution** — Agent 5 produces the plan, but the actual upgrade needs human testing of all auth flows.
6. **Cloud migration** (if needed for US market) — Architecture decision that depends on fundraising and market timing.

---

## References

- [ANVISA RDC 657/2022 — SaMD Regulation](https://www.freyrsolutions.com/blog/resolution-for-regulation-of-software-as-medical-device-samd-in-brazil)
- [ANVISA AFE Requirements](https://www.freyrsolutions.com/what-is-afe-or-ae)
- [IEC 62304 Guide](https://www.jamasoftware.com/blog/an-in-depth-guide-to-iec-62304-software-lifecycle-processes-for-medical-devices/)
- [OWASP ASVS 4.0](https://owasp.org/www-project-application-security-verification-standard/)
- [HITRUST vs SOC 2 for Healthcare](https://intuitionlabs.ai/articles/hipaa-soc-2-vs-hitrust-guide)
- [SBIS Certification Overview](https://pmc.ncbi.nlm.nih.gov/articles/PMC11623028/)
- [Healthcare SaaS Pilot Lessons](https://medium.com/@vidur.bhatnagar/5-lessons-from-building-selling-healthcare-saas-b2beb9b8f4af)
- [Vendor Security Questionnaires (SIG/HECVAT)](https://www.saltycloud.com/blog/sig-vs-hecvat-vs-caiq-which-is-best/)
