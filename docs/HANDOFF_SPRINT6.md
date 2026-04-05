# Sprint 6 Handoff — Continuation Protocol
## HoliLabs Clinical Intelligence Platform

**Classification:** CONFIDENTIAL — L3
**Created:** April 4, 2026
**Handoff From:** Claude Opus 4.6 (Cowork session)
**Handoff To:** Any LLM CLI agent (Gemini, Claude Code, etc.)
**Purpose:** Enable seamless continuation of Sprint 6 hospital-ready work

---

## 1. SITUATION REPORT

### What Has Been Done (Completed)

| Agent | Branch | Commit | Status | Key Deliverables |
|-------|--------|--------|--------|-----------------|
| **Agent 1** — IEC 62304 Lifecycle Docs | `feat/iec62304-lifecycle-docs` | `78ab098f` | COMMITTED | 7 regulatory documents: Software Dev Plan, Requirements Spec (41 reqs), Architecture Doc (5 diagrams), Risk Management File (10 hazards), V&V Plan, Traceability Matrix (0 orphans), ANVISA Notification Checklist |
| **Agent 2** — OWASP ASVS L2 Audit | `feat/owasp-asvs-l2-hardening` | Committed (check `git log`) | COMMITTED | 4 source files fixed + ASVS checklist. Fixes: password max-length (V2.1.2), body size limits (V13.1.3), content-type validation (V13.1.5), referrer-policy (V14.4.5), structured logging (V7.1.1). 3,014 tests passed. |
| **Agent 3** — Production Infrastructure | `feat/production-infrastructure` | Committed (check `git log`) | COMMITTED | Startup probe, metrics.ts, sentry-config.ts (PHI scrubbing), Dockerfile labels/healthcheck, docker-compose.yml. 49/49 health tests pass. |
| **Agent 4** — LGPD Compliance | `feat/lgpd-compliance-package` | Not started | PENDING | See prompt below |
| **Agent 5** — TypeScript + Cleanup | `feat/type-safety-and-test-stabilization` | Not started | PENDING | See prompt below |
| **Agent 6** — Integration + Vendor Questionnaire | `sprint6/hospital-ready` | Not started | PENDING | See prompt below |

### What Has Been Written (Strategy Documents)

| Document | Path | Purpose |
|----------|------|---------|
| Business Strategy | `docs/BUSINESS_STRATEGY.md` | Full go-to-market strategy with TAM/SAM/SOM, unit economics, Porter's Five Forces, 18-month roadmap |
| PRD | `docs/PRD.md` | Product Requirements Document with 4 personas, 16 requirements (P0-P2), acceptance criteria, success metrics |
| Execution Plan | `docs/EXECUTION_PLAN.md` | Original 6-agent plan with self-critique of first audit |
| Agent 4-6 Prompts | `docs/AGENT_PROMPTS_WAVE2.md` | Updated prompts incorporating Agent 1-3 results |

### What Needs To Happen Next (Priority Order)

```
1. Agent 4 — LGPD Compliance Package        (no dependencies, run now)
2. Agent 5 — TypeScript + Console Cleanup    (depends on Agent 4 finishing)
3. Agent 6 — Integration + Vendor Questionnaire (depends on ALL agents 1-5)
4. Staging deployment + end-to-end validation (depends on Agent 6)
5. Pilot clinic outreach + onboarding materials (parallel to #4)
```

---

## 2. PROJECT ARCHITECTURE

### Tech Stack
- **Framework:** Next.js 14 monorepo (pnpm workspaces)
- **ORM:** Prisma 6.7.0, PostgreSQL 16
- **Cache:** Redis 7 (Upstash)
- **Auth:** next-auth 5.0.0-beta.30 (risk — beta in prod healthcare)
- **Testing:** Jest (unit/integration), Playwright (E2E, a11y, visual regression), k6 (load)
- **CI/CD:** 24 GitHub Actions workflows, SHA-pinned, security scanning built-in
- **AI:** Gemini 2.5 Flash (primary), Claude (complex), GPT-4o (fallback), Ollama (local fallback)

### Directory Structure (Key Paths)
```
holilabsv2/
├── apps/web/src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── api/                # 100+ API route files
│   │   │   ├── health/         # Liveness, readiness, startup probes
│   │   │   ├── patients/       # Patient CRUD, export, erasure
│   │   │   ├── prescriptions/  # E-prescriptions with ICP-Brasil signing
│   │   │   └── ...
│   │   ├── (app)/              # Authenticated app pages (dashboard, encounters, etc.)
│   │   └── portal/             # Patient-facing portal (20+ pages)
│   ├── lib/
│   │   ├── auth/               # 21 files — NextAuth, Casbin RBAC, MFA, ICP-Brasil, sessions
│   │   ├── clinical/           # 50+ files — CDS engine, safety envelope, rules, engines
│   │   ├── security/           # 18 files — AES-256-GCM encryption, audit, CSRF, validation
│   │   ├── api/                # Rate limiting, middleware (createProtectedRoute)
│   │   ├── monitoring/         # metrics.ts, sentry-config.ts (Agent 3 created)
│   │   ├── traffic-light/      # engine.ts — deterministic CDS (RED/YELLOW/GREEN)
│   │   ├── brazil-interop/     # ANVISA drug registry, CATMAT codes, schedule classification
│   │   └── db/                 # encryption-extension.ts (auto PHI encrypt/decrypt)
│   └── services/               # Service layer (business logic)
├── prisma/
│   ├── schema.prisma           # 60-80+ models, full PHI field definitions
│   ├── seed.ts                 # Demo data seeding
│   └── seed-clinical-rules.ts  # CDS rule seeding
├── docs/
│   ├── regulatory/
│   │   ├── iec62304/           # Agent 1 output — 7 IEC 62304 documents
│   │   └── lgpd/               # Agent 4 target — LGPD compliance docs (PENDING)
│   ├── security/
│   │   └── OWASP-ASVS-L2-CHECKLIST.md  # Agent 2 output
│   ├── operations/
│   │   └── BACKUP-DR-PLAN.md   # Agent 3 output
│   ├── BUSINESS_STRATEGY.md    # Go-to-market strategy
│   ├── PRD.md                  # Product requirements
│   ├── EXECUTION_PLAN.md       # 6-agent execution plan
│   └── AGENT_PROMPTS_WAVE2.md  # Updated prompts for agents 4-6
├── .claude/
│   ├── rules/security.md       # Data classification, PHI inventory, prohibited patterns
│   └── hooks/                  # pre-commit security check, pre-push validation
├── .github/workflows/          # 24 CI/CD workflows
├── CLAUDE.md                   # Master project governance (10 sections)
├── Dockerfile                  # Multi-stage, OCI labels, healthcheck (Agent 3 enhanced)
└── docker-compose.yml          # Local dev with postgres + redis (Agent 3 enhanced)
```

### Critical Configuration Files to Read First
1. `CLAUDE.md` — Master project rules. PHI protection, coding standards, testing mandates, agent delegation rules. READ THIS FIRST.
2. `.claude/rules/security.md` — PHI field inventory per model, prohibited code patterns, incident classification.
3. `docs/EXECUTION_PLAN.md` — Strategic context, self-critique of first audit, market strategy.
4. `docs/PRD.md` — What the product does, for whom, and the acceptance criteria for "hospital-ready."
5. `docs/AGENT_PROMPTS_WAVE2.md` — The exact prompts for Agents 4-6.

---

## 3. AGENT 4 PROMPT (LGPD Compliance — Run Immediately)

### Pre-Flight Check
```bash
# Verify Agent 1-3 branches exist and are committed
git branch -a | grep -E "iec62304|owasp|production-infrastructure"

# Verify key reference files exist
ls docs/regulatory/iec62304/04-RISK-MANAGEMENT-FILE.md
ls docs/security/OWASP-ASVS-L2-CHECKLIST.md
ls docs/operations/BACKUP-DR-PLAN.md
```

### Full Prompt (Copy-Paste to CLI)

```
You are a data protection specialist with expertise in Brazilian LGPD (Lei Geral de Proteção de Dados). Your job is to produce the complete LGPD compliance documentation package for a healthcare SaaS platform and verify that the codebase implements the required technical controls.

PROJECT: ~/prototypes/holilabsv2
BRANCH: Create and work on feat/lgpd-compliance-package

BEFORE STARTING: Read these files for context:
- CLAUDE.md (project governance, PHI rules)
- .claude/rules/security.md (PHI field inventory)
- docs/regulatory/iec62304/04-RISK-MANAGEMENT-FILE.md (10 hazards — cross-reference in RIPD)
- docs/security/OWASP-ASVS-L2-CHECKLIST.md (security evidence for Art. 46)
- docs/operations/BACKUP-DR-PLAN.md (recovery procedures)

CONTEXT: This platform processes sensitive personal data (dados pessoais sensíveis) as defined by LGPD Art. 5(II) — specifically health data and biometric data (CPF, CNS, RG). Brazil-first market — first pilots in São Paulo clinics.

PHASE 1 — CODEBASE VERIFICATION (10 min):
Verify these LGPD technical requirements exist in code:

Art. 18 — Data Subject Rights:
  Glob for: **/patients/export/**/route.ts (data portability)
  Glob for: **/patients/**/erasure/**/route.ts (right to deletion)
  Glob for: **/portal/dashboard/privacy/**/page.tsx (privacy controls)
  Read each route handler — verify functional, not stub. If missing, document as gap.

Art. 46 — Security Measures:
  Read: apps/web/src/lib/security/hipaa-encryption.ts (verify AES-256-GCM)
  Read: apps/web/src/lib/db/encryption-extension.ts (verify all PHI fields covered)
  Read: apps/web/src/lib/security/audit-chain.ts (verify tamper-evident logging)

Art. 37 — Processing Records:
  Read: prisma/schema.prisma — find AuditLog model, verify it captures processing activities

Art. 48 — Incident Notification:
  Read: .claude/rules/security.md — verify incident response procedures and SLAs

PHASE 2 — GENERATE LGPD DOCUMENTS (20 min):
Create all under docs/regulatory/lgpd/:

ALL DOCUMENTS IN BRAZILIAN PORTUGUESE (except DPO template which can be bilingual).

1. RIPD-RELATORIO-IMPACTO.md (LGPD Art. 38)
   Required sections:
   - Descrição dos processos de tratamento
   - Dados pessoais coletados (inventory EVERY PHI field from .claude/rules/security.md)
   - Dados pessoais sensíveis (health records, CPF, CNS, biometrics)
   - Base legal PER ACTIVITY (not blanket Art. 7(VIII)):
     * Clinical care: Art. 7(VIII) + Art. 11(II)(f)
     * Billing: Art. 7(V) (contract execution)
     * Notifications (SMS/WhatsApp): Art. 7(I) (consent)
     * Analytics (de-identified): Art. 7(IX) + Art. 12
     * Audit logging: Art. 7(II) (legal obligation)
   - Finalidade do tratamento
   - Compartilhamento (SNCR, RNDS, FHIR sync — list each recipient)
   - Medidas de segurança — reference OWASP ASVS L2 checklist and encryption details
   - Riscos — cross-reference 10 hazards from IEC 62304 risk file
   - Tempo de retenção (different for clinical records vs billing vs audit)
   - Direitos dos titulares (Art. 18 rights with implementing endpoint for each)

2. REGISTRO-ATIVIDADES-TRATAMENTO.md (LGPD Art. 37)
   Table: Atividade | Dados Tratados | Base Legal | Finalidade | Compartilhamento | Retenção | Responsável
   Minimum 12 rows covering: patient registration, clinical encounter, prescription, lab order, billing, scheduling, notifications, telehealth, audit logging, analytics, email, backup.
   Each row MUST have correct legal basis per activity.

3. POLITICA-PRIVACIDADE.md (LGPD Art. 9)
   Patient-facing, plain Portuguese. Cover: controller identity, DPO contact placeholder, purposes, legal basis, data sharing, Art. 18 rights, retention, security measures. Mention CPF/CNS processing rationale.

4. PLANO-RESPOSTA-INCIDENTES.md (LGPD Art. 48)
   Detection (reference Sentry + metrics.ts), classification (P0-P3 per security.md), containment, ANPD notification (2 business days), data subject notification, post-incident review. Reference backup/DR plan for recovery.

5. DPO-DESIGNATION.md (LGPD Art. 41)
   Template with placeholders. Bilingual OK.

PHASE 3 — CODE GAPS (10 min):
Check for and implement if missing:
- Cookie consent banner component (LGPD Art. 7(I))
- Data retention enforcement (scheduled cleanup)
- Consent revocation endpoint
- Do NOT duplicate Agent 2's security middleware work

PHASE 4 — VERIFICATION:
1. Portuguese grammar and accents correct (proteção, não, informação)
2. All referenced API endpoints actually exist (glob to verify)
3. All referenced Prisma models exist in schema
4. No real PHI in examples (use "João da Silva" / CPF 000.000.000-00)
5. Every Art. 37 processing activity maps to a data subject right

Commit: "docs(lgpd): complete LGPD compliance package — RIPD, processing records, privacy policy, incident plan, DPO template"
```

---

## 4. AGENT 5 PROMPT (TypeScript + Cleanup — Run After Agent 4)

### Pre-Flight Check
```bash
# Verify Agent 4 committed
git log --oneline feat/lgpd-compliance-package -1

# Check what Agent 2 already modified (avoid double-editing)
git diff --name-only feat/owasp-asvs-l2-hardening
# Expected: password-validation.ts, middleware.ts, api/middleware.ts, security-headers.ts, OWASP checklist
```

### Full Prompt (Copy-Paste to CLI)

```
You are a senior TypeScript engineer responsible for production-quality code in a healthcare application. Three objectives: (1) eliminate every `any` type in security/auth/clinical paths, (2) assess next-auth beta risk, (3) clean up console.log in production code.

PROJECT: ~/prototypes/holilabsv2/apps/web
BRANCH: Create and work on feat/type-safety-and-test-stabilization

BEFORE STARTING: Read CLAUDE.md §VI (Coding Standards) and §VII (Testing Mandates).

DO NOT TOUCH FILES ALREADY MODIFIED BY AGENT 2:
- src/lib/auth/password-validation.ts
- src/middleware.ts
- src/lib/api/middleware.ts
- src/lib/security-headers.ts

PHASE 1 — TYPE SAFETY (10 min):
grep -rn ": any" src/lib/security/ src/lib/auth/ src/lib/clinical/ src/lib/api/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v .test. | grep -v .skip.

For each `any` in critical paths: replace with proper type or `unknown` + type guard. Add JSDoc for exported functions.

Then scan src/services/ src/hooks/ src/components/ (exclude tests). Fix production paths only.
Report: "X fixed, Y remaining (test files only)"

PHASE 2 — NEXT-AUTH ASSESSMENT (10 min):
Read: src/lib/auth/auth.config.ts, auth.ts, server.ts, package.json
Create: docs/technical/NEXTAUTH-UPGRADE-PLAN.md
- Current version + risk assessment
- Every import from next-auth across codebase
- Breaking changes beta.30 → stable
- Migration steps with rollback plan
- Recommendation: upgrade now or after first pilot?
DO NOT actually upgrade — plan only.

PHASE 3 — CONSOLE.LOG CLEANUP (15 min):
Read docs/security/OWASP-ASVS-L2-CHECKLIST.md first (Agent 2 addressed some).
grep -rn "console\.log\|console\.warn\|console\.error" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v .test. | grep -v .skip. | grep -v legacy_archive/ | grep -v README | grep -v .disabled

Skip files Agent 2 already fixed. For remaining:
- Logs PHI/tokens/secrets → REMOVE
- Useful diagnostic → Replace with structured logger (find pino or src/lib/logging/)
- In catch block → Keep error.message only
- JSDoc/comment → Leave
Report: "Removed X, replaced Y, Z remaining (justified)"

PHASE 4 — TYPESCRIPT ERRORS (15 min):
npx tsc --noEmit 2>&1 | head -200
Fix errors in YOUR modified files (mandatory) and src/lib/ (should fix).
Skip legacy_archive/ and Agent 2/3 modified files.
Never use @ts-ignore or @ts-expect-error.

PHASE 5 — VERIFICATION:
1. npx tsc --noEmit — before/after error count
2. pnpm test --bail — must pass
3. Zero `any` in critical paths (excluding tests)
4. Create docs/technical/TYPE-SAFETY-REPORT.md

Commit: "refactor(types): eliminate any from critical paths, console.log cleanup, next-auth upgrade plan"
```

---

## 5. AGENT 6 PROMPT (Integration — Run After ALL Others)

### Pre-Flight Check
```bash
# ALL five branches must exist and be committed
for branch in feat/iec62304-lifecycle-docs feat/owasp-asvs-l2-hardening feat/production-infrastructure feat/lgpd-compliance-package feat/type-safety-and-test-stabilization; do
  echo "=== $branch ==="
  git log --oneline $branch -1 2>/dev/null || echo "MISSING"
done

# Each branch should pass tests independently
# If any fails, fix it before proceeding to Agent 6
```

### Full Prompt (Copy-Paste to CLI)

```
You are the integration lead. Five feature agents have completed their work on separate branches. Your job: (1) merge everything cleanly, (2) run full verification, (3) produce vendor security questionnaire.

PROJECT: ~/prototypes/holilabsv2
BRANCH: Create sprint6/hospital-ready from current main development branch

PHASE 1 — PRE-MERGE VALIDATION (5 min):
For EACH branch (iec62304, owasp, production-infra, lgpd, type-safety):
  git checkout <branch>
  npx tsc --noEmit 2>&1 | tail -5
  pnpm test --bail 2>&1 | tail -10
If ANY branch fails, STOP and report. Do NOT merge broken branches.

PHASE 2 — MERGE (10 min):
Order (least → most conflict risk):
1. feat/iec62304-lifecycle-docs (docs only)
2. feat/lgpd-compliance-package (docs + small code)
3. feat/production-infrastructure (new files)
4. feat/owasp-asvs-l2-hardening (security middleware)
5. feat/type-safety-and-test-stabilization (broadest changes)

Conflicts: security files → keep more restrictive. Docs → keep both. Tests → keep both.

PHASE 3 — VERIFICATION (10 min):
1. pnpm install && npx tsc --noEmit && pnpm test --bail
2. Spot-check 5 critical files exist:
   - docs/regulatory/iec62304/06-TRACEABILITY-MATRIX.md
   - docs/security/OWASP-ASVS-L2-CHECKLIST.md
   - apps/web/src/app/api/health/startup/route.ts
   - docs/regulatory/lgpd/RIPD-RELATORIO-IMPACTO.md
   - docs/technical/TYPE-SAFETY-REPORT.md
3. No .env files committed
4. ASVS checklist: zero P0 FAILs
5. Traceability matrix: spot-check 5 file path references

PHASE 4 — VENDOR SECURITY QUESTIONNAIRE (10 min):
Create docs/sales/VENDOR-SECURITY-QUESTIONNAIRE.md (SIG Lite format):

Sections with EVIDENCE (file paths for every claim):
1. Organization & Governance → security.md, CLAUDE.md, IEC 62304 SDP
2. Access Control → auth/ (21 files), Casbin RBAC, 8 roles, MFA
3. Data Protection → AES-256-GCM, key versioning, L1-L4 classification
4. Application Security → OWASP ASVS L2 checklist, CodeQL SAST, 24 CI workflows
5. Infrastructure → Health probes, Dockerfile, backup/DR plan
6. Compliance → LGPD package, IEC 62304, ISO 14971, ANVISA Class I
7. Brazil-Specific → ICP-Brasil, SNCR, RNDS, AFE status

PHASE 5 — DELIVERY REPORT:
Create docs/SPRINT6_DELIVERY_REPORT.md:
- All 5 agent contributions summarized
- Integration results, test counts
- Security posture (ASVS compliance %)
- Regulatory readiness
- Recommendation: SHIP TO PILOT / HOLD / NEEDS WORK

Commit: "chore(integration): merge all sprint6 agents — hospital-ready verification complete"
```

---

## 6. POST-AGENT WORK (Human + AI Assisted)

After all 6 agents complete, these tasks remain before first clinic pilot:

### Week 3-4: Validation
| Task | Who | Notes |
|------|-----|-------|
| Deploy to staging with real credentials | Nico (Eng) | 40+ env vars from .env.example |
| Walk through complete clinical encounter flow | Nico + Physician advisor | Create patient → encounter → SOAP → prescribe → sign → close |
| Run k6 load tests against staging | AI agent | Scripts exist in repo |
| Commission lightweight pentest ($2-5K) | Nico | Automated scan + manual spot-check |
| Submit AFE application to ANVISA | Nico + Regulatory consultant | 30-60 day processing — start NOW |

### Week 5: Pilot Prep
| Task | Who | Notes |
|------|-----|-------|
| Create 2-page clinician quickstart guide | AI agent | Portuguese, screenshots |
| Create known-limitations doc | Nico | Honest list of what works, what's coming |
| Set up feedback channel (WhatsApp group) | Nico | Brazilian standard for clinic comms |
| Identify and contact 5-10 São Paulo clinics | Nico (BD) | 5-15 providers, physician-owner, paper-based |
| Sign evaluation agreements | Nico + Legal | Covers pre-ANVISA pilot period |
| Designate DPO (LGPD Art. 41) | Nico (Legal) | Even if temporary, must be named |

### Prompts for Post-Agent Tasks

**Staging Deployment Validation:**
```
You are a DevOps engineer validating a healthcare platform staging deployment.

PROJECT: ~/prototypes/holilabsv2
TASK: Verify the staging environment is correctly configured and all services are healthy.

1. Read docker-compose.yml and .env.example — list every required env var
2. Check /api/health/ready endpoint response format
3. Verify database connectivity via prisma db push --dry-run
4. Check all 49 health endpoint tests pass
5. Simulate 10 concurrent users with k6 (if k6 scripts exist in repo)
6. Verify Sentry PHI scrubbing works (check sentry-config.ts beforeSend)
7. Verify no console.log leaks PHI in production build
8. Create docs/operations/STAGING-VALIDATION-REPORT.md
```

**Clinician Quickstart Guide:**
```
You are a medical software technical writer creating a quickstart guide for Brazilian physicians.

PROJECT: ~/prototypes/holilabsv2
TASK: Create docs/onboarding/GUIA-RAPIDO-CLINICO.md

Write in Brazilian Portuguese. Target audience: physicians who are NOT tech-savvy.
Keep it to 2 pages max. Include:
1. Login (email + MFA code)
2. Find/create a patient
3. Start an encounter
4. Use AI scribe (dictation → SOAP note)
5. Review and sign the SOAP note
6. Create and sign a prescription
7. Close the encounter
8. View patient history

For each step: one sentence of instruction + describe what they should see on screen.
Reference actual UI routes from the app (check apps/web/src/app/ for page paths).
No jargon. No technical details. A physician should read this in 5 minutes and feel confident.
```

**Known Limitations Document:**
```
You are a product manager preparing an honest limitations doc for pilot clinic partners.

PROJECT: ~/prototypes/holilabsv2
TASK: Create docs/onboarding/KNOWN-LIMITATIONS.md

Read the PRD at docs/PRD.md for context on what's P0 vs P1 vs P2.

Create a table with columns: Feature | Status | Notes
Categories:
1. FULLY WORKING — list all P0 features that pass tests
2. PARTIALLY WORKING — list P1 features with caveats (billing, FHIR sync)
3. COMING SOON — list P2 features with estimated timelines
4. NOT SUPPORTED — list NG items from PRD with brief explanation why

Be honest. Clinics will trust us MORE if we're upfront about limitations.
Write in Portuguese with English technical terms where standard.
```

---

## 7. KEY CONSTRAINTS AND RULES

Any agent continuing this work MUST follow these rules from CLAUDE.md:

### PHI Protection — Zero Tolerance
- NEVER log, print, or commit any PHI field (see .claude/rules/security.md for complete list)
- Use tokenId in logs, never patient names, CPF, CNS, MRN, etc.
- All PHI fields encrypted AES-256-GCM with key versioning

### Code Standards
- TypeScript strict mode, no `any` in critical paths
- All API routes must have Zod input validation
- All routes protected via createProtectedRoute middleware
- No @ts-ignore or @ts-expect-error without linked issue
- Max 300 lines per file

### Testing
- 80% coverage threshold (branches, functions, lines, statements)
- pnpm test --bail must pass before any commit
- pnpm typecheck must pass before any commit

### Git Safety
- NEVER git push (human only)
- NEVER commit without passing tests
- NEVER --no-verify on src/ or apps/ files
- 3 consecutive test failures → CIRCUIT BREAKER → halt and await human

### Security
- All secrets via environment variables
- No hardcoded tokens, keys, passwords, connection strings
- Critical CVEs patched within 24 hours
- CORS locked to NEXT_PUBLIC_APP_URL in production

---

## 8. CURRENT BRANCH STATE

To understand where to pick up:

```bash
# Show all feature branches
git branch -a | grep -E "feat/|sprint"

# Show recent commits on main development branch
git log --oneline -10

# Show what Agent 1 committed
git log --oneline feat/iec62304-lifecycle-docs -5

# Show Agent 2 changes
git diff --stat feat/owasp-asvs-l2-hardening

# Show Agent 3 changes
git diff --stat feat/production-infrastructure
```

---

## 9. QUALITY BAR

This project targets hospital deployment. The quality bar is:

- **Regulatory:** ANVISA RDC 657/2022 Class I notification-ready. IEC 62304 Class A. LGPD Art. 38 RIPD complete.
- **Security:** OWASP ASVS Level 2 verified. AES-256-GCM PHI encryption. Casbin RBAC default-deny.
- **Clinical:** Zero false negatives on RED CDS alerts. Every AI suggestion requires physician attestation.
- **Operations:** RPO 1 hour, RTO 4 hours. Health probes for Kubernetes. Canary deploys with auto-rollback.
- **Testing:** 3,000+ tests, 80%+ coverage, 24 CI/CD workflows.

A physician will use this to make clinical decisions. A bug is not just a bug — it's a potential patient safety issue. Act accordingly.

---

---

## 10. RED TEAM FINDINGS (April 4, 2026)

A red team review of all Sprint 6 deliverables identified 7 material weaknesses. Findings 1-3 have been patched into the Business Strategy and PRD. Remaining findings require human action.

### Patched (in documents):
1. **No customer discovery.** Added §0 to BUSINESS_STRATEGY.md acknowledging evidence gaps and requiring 15-20 interviews before capital deployment.
2. **Single founder risk understated.** Upgraded from "Risk #1 with documentation mitigation" to "existential risk requiring co-founder search as #1 priority." Added professional liability insurance requirement.
3. **No offline mode.** Added R0 (Offline/Degraded Mode) as P0 requirement in PRD.
4. **No data migration.** Added R0b (CSV Import) as P0 requirement in PRD.
5. **G2 unprovable.** Reworded "zero false negatives" to specify "relative to reference database" with disclosure requirement.
6. **Unit economics ignored support.** Added support cost line item to break-even analysis in BUSINESS_STRATEGY.md.
7. **Hospital-ready checklist was all technical.** Added physician validation and customer discovery requirements.

### Requires Human Action:
- **Professional liability insurance:** Obtain E&O insurance before pilot launch (R$10-30K/year).
- **Customer discovery:** 15-20 structured interviews with São Paulo clinic owners using Mom Test methodology.
- **Drug interaction database:** Identify, license, and document the reference database for CDS rules. Determine update cadence and coverage.
- **Co-founder search:** Begin immediately. Target: healthcare industry experience, complementary to technical founder.
- **Payment infrastructure:** How do clinics pay? Boleto, Pix, credit card? Nota fiscal electronic requirements for SaaS in Brazil.

### For the Receiving Agent:
- If using Gemini CLI: tool names and file access patterns may differ from Claude Code. The prompts use `git checkout -b`, `git merge --no-ff`, and `pnpm` commands — verify these work in your environment before starting.
- If any agent creates broken code: `git stash` the changes, report the error, and do NOT proceed to the next agent. Broken merges in healthcare code are P0 incidents.
- The disk space issue from earlier sessions may recur. If bash commands fail with ENOSPC, use file tools (Read/Write/Edit/Glob) which access the mounted filesystem directly and bypass the sandbox.

---

*End of handoff document. The receiving agent should read CLAUDE.md and this document before executing any work.*
