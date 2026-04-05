# Agent Prompts — Wave 2 & 3
## Updated April 4, 2026 — Incorporating Agent 1-3 Results

**Context:** Agents 1-3 have completed successfully:
- **Agent 1** (IEC 62304): 7 documents committed at `78ab098f` on `feat/iec62304-lifecycle-docs`. 41 traced requirements, 10 hazards, 5 Mermaid diagrams, 0 orphans.
- **Agent 2** (OWASP ASVS L2): 4 source files + 1 checklist modified. Password max-length, body size limits, content-type validation, referrer-policy, structured logging fixed. 3,014 tests passed.
- **Agent 3** (Production Infra): Startup probe, metrics.ts, sentry-config.ts, Dockerfile labels, docker-compose.yml updated. 49/49 health tests pass.

---

## Agent 4: LGPD Compliance Documentation Package

**Estimated time:** 30-40 min
**Branch:** `feat/lgpd-compliance-package`

```
You are a data protection specialist with expertise in Brazilian LGPD (Lei Geral de Proteção de Dados). Your job is to produce the complete LGPD compliance documentation package for a healthcare SaaS platform and verify that the codebase implements the required technical controls.

PROJECT: ~/prototypes/holilabsv2
BRANCH: Create and work on feat/lgpd-compliance-package

CONTEXT: This platform processes sensitive personal data (dados pessoais sensíveis) as defined by LGPD Art. 5(II) — specifically health data and biometric data (CPF, CNS, RG). The legal basis for processing is Art. 7(VIII) (health protection) and Art. 11(II)(f) (health data by health professionals). Brazil-first market — first pilots will be in São Paulo clinics.

IMPORTANT CONTEXT FROM COMPLETED AGENTS:
- Agent 1 delivered IEC 62304 docs at docs/regulatory/iec62304/ — the risk management file (04-RISK-MANAGEMENT-FILE.md) contains 10 hazards relevant to your RIPD's risk section. Cross-reference it instead of inventing risks from scratch.
- Agent 2 delivered OWASP ASVS L2 checklist at docs/security/OWASP-ASVS-L2-CHECKLIST.md — reference this as evidence of security measures (Art. 46) in the RIPD.
- Agent 3 delivered backup/DR plan at docs/operations/BACKUP-DR-PLAN.md — reference this for data retention and recovery procedures.

PHASE 1 — CODEBASE VERIFICATION (10 min):
Verify these LGPD technical requirements are implemented:

Art. 18 — Data Subject Rights:
  Check: /api/patients/export/ exists (right to data portability)
  Check: /api/patients/[id]/erasure/ exists (right to deletion)
  Check: Patient portal privacy page exists (/portal/dashboard/privacy/)
  Read: The actual route handlers — verify they work, not just exist
  IMPORTANT: If any endpoint is missing, document it as a gap with a clear TODO — do NOT invent fake endpoints in the RIPD.

Art. 46 — Security Measures:
  Read: src/lib/security/hipaa-encryption.ts — verify AES-256-GCM
  Read: src/lib/db/encryption-extension.ts — verify all PHI fields covered
  Read: src/lib/security/audit-chain.ts — verify tamper-evident logging
  Reference: docs/security/OWASP-ASVS-L2-CHECKLIST.md for comprehensive security evidence

Art. 37 — Processing Records:
  Check: Does an audit log capture ALL data processing activities? Read AuditLog model in schema.prisma

Art. 49 — Incident Notification:
  Read: .claude/rules/security.md — check incident response procedures

PHASE 2 — GENERATE LGPD DOCUMENTS (20 min):
Create all under docs/regulatory/lgpd/:

CRITICAL: All documents MUST be written in proper Brazilian Portuguese. Not "Portuguese with English sprinkles." These are regulatory documents that may be reviewed by ANPD. The only exception is the DPO designation template, which can be bilingual.

1. docs/regulatory/lgpd/RIPD-RELATORIO-IMPACTO.md
   (Relatório de Impacto à Proteção de Dados Pessoais — LGPD Art. 38)
   Sections:
   - Descrição dos processos de tratamento (data processing description)
   - Dados pessoais coletados (personal data inventory — from Prisma schema, list EVERY PHI field from .claude/rules/security.md)
   - Dados pessoais sensíveis (sensitive data — health records, CPF, CNS, biometrics)
   - Base legal PER PROCESSING ACTIVITY — do NOT blanket everything under Art. 7(VIII):
     * Clinical care: Art. 7(VIII) + Art. 11(II)(f)
     * Billing/insurance claims: Art. 7(V) (contract execution)
     * Scheduling notifications (SMS/WhatsApp/email): Art. 7(I) (consent) — patient must opt-in
     * Analytics (de-identified): Art. 7(IX) (legitimate interest) + Art. 12 (anonymization)
     * Audit logging: Art. 7(II) (legal obligation under CFM/ANVISA requirements)
   - Finalidade do tratamento (purpose: clinical care, CDS, billing, scheduling)
   - Compartilhamento (data sharing: external APIs, FHIR sync, SNCR, RNDS — list each recipient)
   - Medidas de segurança — reference OWASP ASVS L2 checklist, IEC 62304 risk file, encryption details
   - Riscos identificados e mitigações — cross-reference the 10 hazards from Agent 1's risk file (docs/regulatory/iec62304/04-RISK-MANAGEMENT-FILE.md)
   - Tempo de retenção (retention periods — different for clinical records vs. billing vs. audit logs)
   - Direitos dos titulares (how data subject rights are implemented — list each Art. 18 right with the implementing API endpoint or portal page)

2. docs/regulatory/lgpd/REGISTRO-ATIVIDADES-TRATAMENTO.md
   (Record of Processing Activities — LGPD Art. 37)
   Table format with columns:
   - Atividade | Dados Tratados | Base Legal | Finalidade | Compartilhamento | Retenção | Responsável
   One row for EACH processing activity (minimum 12):
   - Cadastro de paciente (patient registration)
   - Consulta clínica (clinical encounter)
   - Prescrição médica (prescription)
   - Solicitação de exames (lab order)
   - Faturamento/cobrança (billing claim)
   - Agendamento (scheduling)
   - Notificações (appointment reminders)
   - Teleconsulta (telehealth documentation)
   - Registro de auditoria (audit logging)
   - Análise estatística (analytics — de-identified)
   - Notificação de e-mail (email notifications)
   - Backup de dados (data backup)
   Each row must have the CORRECT legal basis — not all are Art. 7(VIII).

3. docs/regulatory/lgpd/POLITICA-PRIVACIDADE.md
   (Privacy Policy — LGPD Art. 9)
   - Written for patients (plain language, Portuguese)
   - Cover: identity of controller, DPO contact placeholder, purposes, legal basis, data sharing, rights, retention, security measures
   - Include specific mention of CPF/CNS processing and why it's necessary
   - Reference Art. 18 rights (access, correction, portability, deletion, consent revocation)
   - Must include mandatory LGPD disclosures: controller identity, DPO contact, international transfers (if any)

4. docs/regulatory/lgpd/PLANO-RESPOSTA-INCIDENTES.md
   (Incident Response Plan — LGPD Art. 48)
   - Detection procedures (monitoring, alerts — reference Sentry config and metrics.ts from Agent 3)
   - Classification (P0-P3 per .claude/rules/security.md)
   - Containment steps
   - ANPD notification procedure (Art. 48 — "prazo razoável" = 2 business days per ANPD guidance)
   - Data subject notification procedure
   - Post-incident review
   - Reference the backup/DR plan from Agent 3 (docs/operations/BACKUP-DR-PLAN.md) for recovery procedures

5. docs/regulatory/lgpd/DPO-DESIGNATION.md
   - Template for DPO (Encarregado) designation per LGPD Art. 41
   - Placeholder for name, contact, responsibilities
   - Publication requirements (must be publicly accessible)
   - This one can be bilingual (Portuguese with English annotations).

PHASE 3 — CODE GAPS (10 min):
If any technical control from Phase 1 is missing or incomplete, implement it:

Likely gaps:
- Cookie consent banner component for the patient portal (LGPD Art. 7(I)) — check if one exists before creating
- Data retention automated enforcement — check if there's a scheduled cleanup job
- Right to revoke consent — check if there's an API endpoint or if it needs to be created
- Processing activity logging — distinct from audit logging

For each gap found: create the file, write the implementation, add a test.
Do NOT duplicate work Agent 2 already did on security middleware.

PHASE 4 — VERIFICATION:
1. All Portuguese documents: verify proper grammar and accents (não, proteção, informação, etc.)
2. All referenced API endpoints actually exist (verify paths with glob search)
3. All referenced Prisma models exist in schema.prisma
4. No real PHI examples in any document (use "João da Silva" / CPF 000.000.000-00 as examples)
5. Cross-reference: every processing activity in the Art. 37 record has a matching data subject right implementation
6. Verify legal bases are correct per activity (not all blanket Art. 7(VIII))

Commit: "docs(lgpd): complete LGPD compliance package — RIPD, processing records, privacy policy, incident plan, DPO template"
```

---

## Agent 5: TypeScript Strictness + next-auth Assessment + Console Cleanup

**Estimated time:** 45-60 min
**Branch:** `feat/type-safety-and-test-stabilization`

**IMPORTANT:** Run this AFTER Agent 4, not in parallel. Agent 2 already touched security middleware files. Agent 5 touches the broadest set of files and must be based on the latest state.

```
You are a senior TypeScript engineer responsible for production-quality code in a healthcare application. Your three objectives: (1) eliminate every `any` type in security/auth/clinical paths, (2) assess the next-auth beta risk and create an upgrade plan, (3) clean up console.log statements in production code.

PROJECT: ~/prototypes/holilabsv2/apps/web
BRANCH: Create and work on feat/type-safety-and-test-stabilization

IMPORTANT CONTEXT FROM COMPLETED AGENTS:
- Agent 2 (OWASP ASVS L2) already modified these files — DO NOT touch them unless strictly necessary:
  * src/lib/auth/password-validation.ts (added max-length check)
  * src/middleware.ts (replaced console.warn with structured JSON)
  * src/lib/api/middleware.ts (added validateBodySize + validateContentType)
  * src/lib/security-headers.ts (Referrer-Policy hardening)
- Agent 2 already scanned for console.log in production paths as part of ASVS V7. Check the OWASP checklist at docs/security/OWASP-ASVS-L2-CHECKLIST.md to see what was already addressed before running your own scan.
- Agent 3 created new files: src/lib/monitoring/metrics.ts, src/lib/monitoring/sentry-config.ts, src/app/api/health/startup/route.ts — verify these are type-clean but do not refactor them.

PHASE 1 — TYPE SAFETY AUDIT (10 min):
Run: grep -rn ": any" src/lib/security/ src/lib/auth/ src/lib/clinical/ src/lib/api/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v .test. | grep -v .skip.

For each `any` found in these critical paths:
- Read the file and understand what type is actually needed
- Replace with a proper type (use `unknown` + type guard if the actual type isn't clear)
- Add JSDoc if the function is exported
- DO NOT change files that Agent 2 already modified unless the `any` is unrelated to Agent 2's changes

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

PHASE 3 — CONSOLE.LOG CLEANUP (15 min):
First, read docs/security/OWASP-ASVS-L2-CHECKLIST.md to see what Agent 2 already addressed for V7 (Error Handling).

Then run: grep -rn "console\.log\|console\.warn\|console\.error" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v .test. | grep -v .skip. | grep -v legacy_archive/ | grep -v README | grep -v .disabled

Exclude any files Agent 2 already fixed (check git log for feat/owasp-asvs-l2-hardening changes).

For each remaining match in PRODUCTION code:
- If it logs potentially sensitive data (patient fields, tokens, secrets): REMOVE immediately
- If it's a useful diagnostic: Replace with the structured logger (find it — likely src/lib/logging/ or pino)
- If it's in a catch block: Keep but ensure it logs error.message only, never the full error object
- If it's in a JSDoc comment or example: Leave it (not executed code)

Report: "Removed X console statements, replaced Y with structured logger, Z remaining (justified)"

PHASE 4 — FIX TYPESCRIPT ERRORS (15 min):
Run: npx tsc --noEmit 2>&1 | head -200

Categorize errors:
1. Errors in files YOU modified (must fix — zero tolerance)
2. Errors in src/lib/ (should fix — these are core logic)
3. Errors in test files (lower priority — fix if time permits)
4. Errors in legacy_archive/ (skip — these are archived)
5. Errors in files Agent 2 or Agent 3 modified (skip — they verified their own files)

Fix categories 1 and 2. For each fix:
- Read the file
- Understand the type error
- Apply the minimal correct fix (prefer adding types over suppressing errors)
- Never add @ts-ignore or @ts-expect-error

For category 3, if there are common patterns (e.g., missing mock types), create a src/types/test-helpers.d.ts with proper mock type definitions rather than fixing each test individually.

PHASE 5 — VERIFICATION:
1. Run: npx tsc --noEmit 2>&1 | wc -l — report before/after error count
2. Run: pnpm test --bail — must pass
3. Run: grep -c ": any" on the critical paths — must be zero (excluding test files)
4. Run: grep for console.log in production paths — report final count
5. Create: docs/technical/TYPE-SAFETY-REPORT.md with full metrics

Commit: "refactor(types): eliminate any from critical paths, console.log cleanup, next-auth upgrade plan"
```

---

## Agent 6: Integration Verification & Vendor Security Questionnaire

**Estimated time:** 30-40 min
**Branch:** `sprint6/hospital-ready` (merge target)
**Depends on:** ALL five previous agents must be complete and committed.

```
You are the integration lead. All five feature agents have completed their work. Your job is to: (1) merge everything cleanly, (2) run full verification, and (3) produce the vendor security questionnaire response that hospitals will actually ask for.

PROJECT: ~/prototypes/holilabsv2
BRANCH: Create sprint6/hospital-ready from the current main development branch

CONTEXT FROM COMPLETED AGENTS:
- Agent 1: feat/iec62304-lifecycle-docs — 7 regulatory documents, commit 78ab098f
- Agent 2: feat/owasp-asvs-l2-hardening — 4 source files + ASVS checklist (changes may or may not be committed yet — check with git log)
- Agent 3: feat/production-infrastructure — health endpoints, Dockerfile, monitoring, backup plan
- Agent 4: feat/lgpd-compliance-package — LGPD documentation + any code gaps fixed
- Agent 5: feat/type-safety-and-test-stabilization — Type safety, console cleanup, next-auth plan

PHASE 1 — PRE-MERGE VALIDATION (5 min):
Before merging anything, verify each branch independently:
For each branch (1-5):
  git checkout <branch>
  npx tsc --noEmit 2>&1 | tail -5   (check for new errors)
  pnpm test --bail 2>&1 | tail -10   (check tests pass)
  git log --oneline -3               (verify commits exist)

If any branch fails tests, STOP and report which branch and what failed. Do NOT merge broken branches.

PHASE 2 — MERGE (10 min):
Create the integration branch, then merge in this order (least conflicting → most):
1. feat/iec62304-lifecycle-docs (docs only — zero conflict risk)
2. feat/lgpd-compliance-package (docs + possibly small code changes)
3. feat/production-infrastructure (new files + Dockerfile changes)
4. feat/owasp-asvs-l2-hardening (security fixes, may touch middleware)
5. feat/type-safety-and-test-stabilization (broadest code changes, merge last)

For each: git merge feat/<branch> --no-ff -m "merge: integrate <branch> into hospital-ready"
If conflicts:
- In security files: keep the more restrictive version
- In docs: keep both (concatenate if same file)
- In tests: keep both test cases
- In middleware: carefully merge — Agent 2 added validation, Agent 5 may have typed it

PHASE 3 — INTEGRATED VERIFICATION (10 min):
1. pnpm install (in case dependencies changed)
2. npx tsc --noEmit — count errors, compare to pre-merge
3. pnpm test --bail — ALL tests must pass
4. Verify these critical files exist and are valid:
   - docs/regulatory/iec62304/06-TRACEABILITY-MATRIX.md (Agent 1)
   - docs/security/OWASP-ASVS-L2-CHECKLIST.md (Agent 2)
   - apps/web/src/app/api/health/startup/route.ts (Agent 3)
   - docs/regulatory/lgpd/RIPD-RELATORIO-IMPACTO.md (Agent 4)
   - docs/technical/TYPE-SAFETY-REPORT.md (Agent 5)
5. Verify no .env files committed: git diff --name-only <base>..HEAD | grep -i '\.env'
6. Verify OWASP ASVS checklist has zero P0 FAILs
7. Verify IEC 62304 traceability matrix references valid file paths (spot-check 5 paths)
8. Verify LGPD RIPD references valid API endpoints (spot-check 3 endpoints)

PHASE 4 — VENDOR SECURITY QUESTIONNAIRE (10 min):
Create docs/sales/VENDOR-SECURITY-QUESTIONNAIRE.md

This is the document hospital IT teams will actually request during procurement. Based on the SIG Lite format, answer these sections using EVIDENCE from the codebase (file paths, document references):

1. Organization & Governance
   - Security policies → reference .claude/rules/security.md, CLAUDE.md §V
   - Software development lifecycle → reference docs/regulatory/iec62304/01-SOFTWARE-DEVELOPMENT-PLAN.md
   - Risk management → reference docs/regulatory/iec62304/04-RISK-MANAGEMENT-FILE.md
   - Incident response → reference docs/regulatory/lgpd/PLANO-RESPOSTA-INCIDENTES.md

2. Access Control
   - Authentication: NextAuth 5.x, bcrypt, MFA via Twilio Verify, WebAuthn biometric
   - Authorization: Casbin RBAC, 8 roles (list them), default-deny policy
   - Session management: 30-min JWT, 15-min idle timeout, 8-hr absolute, 3 concurrent max
   - Evidence: src/lib/auth/ (21 files)

3. Data Protection
   - Encryption at rest: AES-256-GCM, key-versioned, per-field → src/lib/security/hipaa-encryption.ts
   - Encryption in transit: TLS 1.2+ enforced, HSTS 1yr+preload
   - Data classification: L1-L4 per .claude/rules/security.md
   - PHI handling: 15+ fields encrypted, audit-logged with accessReason
   - De-identification: deid package, age bands, region codes
   - Evidence: src/lib/db/encryption-extension.ts

4. Application Security
   - SDLC: IEC 62304 Class A lifecycle → docs/regulatory/iec62304/
   - Security testing: OWASP ASVS L2 verified → docs/security/OWASP-ASVS-L2-CHECKLIST.md
   - Penetration testing: Status — engagement being scheduled, estimated Q2 2026
   - Vulnerability management: Critical CVEs patched within 24 hours (CLAUDE.md §V.5)
   - SAST: CodeQL in CI → .github/workflows/security-continuous.yml
   - Dependency scanning: Trivy, npm audit → .github/workflows/ci.yml
   - Evidence: 24 CI/CD workflows, pre-commit security hooks

5. Infrastructure & Operations
   - Hosting: DigitalOcean App Platform (current), Kubernetes migration planned
   - Monitoring: Sentry (PHI-scrubbed), BetterStack, PostHog, structured JSON metrics
   - Backup & DR: Daily pg_dump, WAL PITR (RPO 1h, RTO 4h) → docs/operations/BACKUP-DR-PLAN.md
   - Health checks: /api/health/live, /ready, /startup → 49 passing tests
   - Evidence: Dockerfile, docker-compose.yml, health endpoint tests

6. Compliance & Certifications
   - LGPD: Complete documentation package → docs/regulatory/lgpd/
   - ANVISA RDC 657/2022: Class I SaMD, notification in preparation → docs/regulatory/iec62304/NOTIFICATION-CHECKLIST.md
   - IEC 62304: Class A lifecycle documentation → docs/regulatory/iec62304/ (7 documents)
   - ISO 14971: Risk management file → docs/regulatory/iec62304/04-RISK-MANAGEMENT-FILE.md
   - OWASP ASVS Level 2: Verified → docs/security/OWASP-ASVS-L2-CHECKLIST.md
   - SOC 2: Planned for Phase 2 (post-revenue, pre-hospital)
   - SBIS-CFM: Basic level planned for Q4 2026

7. Regulatory (Brazil-specific)
   - ANVISA notification: In preparation (AFE prerequisite in process)
   - ICP-Brasil: Digital signature verification implemented → src/lib/auth/icp-brasil-signer.ts
   - SNCR: E-prescription formatting → src/lib/brazil-interop/anvisa-drug-registry.ts
   - RNDS: FHIR R4 profiles supported (feature-flagged)

For EVERY answer: include the file path or document reference as evidence. Hospitals verify claims — vague answers get rejected.

PHASE 5 — SPRINT 6 DELIVERY REPORT:
Create docs/SPRINT6_DELIVERY_REPORT.md:
- Summary of all 5 agent contributions (what was delivered, key metrics)
- Integration results (conflicts resolved, test results)
- Security posture: OWASP ASVS L2 compliance percentage
- Regulatory readiness: IEC 62304 status, LGPD status, ANVISA checklist status
- Known gaps and explicit next steps
- Recommendation: SHIP TO PILOT / HOLD / NEEDS WORK (with justification)

Commit: "chore(integration): merge all sprint6 agents — hospital-ready verification complete"
```

---

## Execution Sequence

```
NOW (launch immediately):
└── Agent 4: LGPD compliance package                    ─── 30-40 min

AFTER Agent 4 commits:
└── Agent 5: Type safety + console cleanup + next-auth  ─── 45-60 min

AFTER Agent 5 commits:
└── Agent 6: Integration merge + vendor questionnaire    ─── 30-40 min

Total remaining agent runtime: ~2 hours
Human review after Agent 6: ~1-2 hours (regulatory docs need domain sign-off)
```

## Pre-Launch Checklist

Before running each agent, verify:

- [ ] Agent 4: Confirm Agent 1's branch (feat/iec62304-lifecycle-docs) is committed and available
- [ ] Agent 4: Confirm Agent 2's ASVS checklist exists at docs/security/
- [ ] Agent 4: Confirm Agent 3's backup plan exists at docs/operations/
- [ ] Agent 5: Confirm Agent 4 has committed (to avoid file conflicts)
- [ ] Agent 5: Check Agent 2's modified files list to avoid double-editing
- [ ] Agent 6: ALL five branches committed and passing tests independently
