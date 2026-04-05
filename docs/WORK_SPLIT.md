# Work Split — Antigravity + Gemini CLI
## Sprint 6 Continuation | April 5, 2026

**Total remaining work:** 3 agent tasks + 2 new P0 features + post-agent prep
**Split strategy:** Antigravity gets the heavy code + docs work (Agents 4-5 + new P0 features). Gemini gets the integration merge + business deliverables (Agent 6 + pilot prep).

---

## ANTIGRAVITY — Primary Workload

Run these sequentially. Each task builds on the previous.

### Task A1: Agent 4 — LGPD Compliance Package (30-40 min)

**Prompt:**
```
Read ~/prototypes/holilabsv2/docs/HANDOFF_SPRINT6.md first — it's the master context document.
Then read ~/prototypes/holilabsv2/CLAUDE.md (project governance rules).
Then read ~/prototypes/holilabsv2/.claude/rules/security.md (PHI field inventory).

Execute Agent 4 from Section 3 of the handoff document. Summary:

You are a data protection specialist. Create the complete LGPD compliance documentation package.

PROJECT: ~/prototypes/holilabsv2
BRANCH: Create feat/lgpd-compliance-package

1. VERIFY codebase implements LGPD technical controls:
   - Glob for patient export, erasure, and privacy portal routes
   - Read encryption, audit chain, and consent management code
   - Document any gaps found

2. CREATE 5 documents under docs/regulatory/lgpd/ (ALL in Brazilian Portuguese except DPO template):
   - RIPD-RELATORIO-IMPACTO.md (Art. 38 — data protection impact assessment)
   - REGISTRO-ATIVIDADES-TRATAMENTO.md (Art. 37 — processing records, 12+ activities, CORRECT legal basis per activity)
   - POLITICA-PRIVACIDADE.md (Art. 9 — patient-facing privacy policy)
   - PLANO-RESPOSTA-INCIDENTES.md (Art. 48 — incident response plan)
   - DPO-DESIGNATION.md (Art. 41 — DPO template, bilingual OK)

   CRITICAL: Each processing activity needs its OWN legal basis:
   - Clinical care: Art. 7(VIII) + Art. 11(II)(f)
   - Billing: Art. 7(V)
   - Notifications (SMS/WhatsApp): Art. 7(I) — consent required
   - Analytics (de-identified): Art. 7(IX) + Art. 12
   - Audit logging: Art. 7(II)

3. Cross-reference existing docs:
   - docs/regulatory/iec62304/04-RISK-MANAGEMENT-FILE.md (10 hazards for RIPD risk section)
   - docs/security/OWASP-ASVS-L2-CHECKLIST.md (security evidence for Art. 46)
   - docs/operations/BACKUP-DR-PLAN.md (recovery procedures)

4. FIX any missing code gaps (cookie consent, data retention, consent revocation endpoint)

5. VERIFY: Portuguese grammar correct, all referenced endpoints exist, no real PHI in examples

Commit: "docs(lgpd): complete LGPD compliance package"
```

### Task A2: Agent 5 — TypeScript Strictness + Console Cleanup (45-60 min)

**Prompt:**
```
Read ~/prototypes/holilabsv2/docs/HANDOFF_SPRINT6.md Section 4 for full context.
Read ~/prototypes/holilabsv2/CLAUDE.md §VI (Coding Standards) and §VII (Testing Mandates).

PROJECT: ~/prototypes/holilabsv2/apps/web
BRANCH: Create feat/type-safety-and-test-stabilization

DO NOT TOUCH these files (already modified by Agent 2):
- src/lib/auth/password-validation.ts
- src/middleware.ts
- src/lib/api/middleware.ts
- src/lib/security-headers.ts

1. TYPE SAFETY: grep for ": any" in src/lib/security/, src/lib/auth/, src/lib/clinical/, src/lib/api/ (excluding tests). Replace each with proper types. Then scan src/services/, src/hooks/, src/components/.

2. NEXT-AUTH ASSESSMENT: Read auth config files + package.json. Create docs/technical/NEXTAUTH-UPGRADE-PLAN.md with version, risk, migration steps, recommendation. DO NOT upgrade — plan only.

3. CONSOLE.LOG CLEANUP: Read docs/security/OWASP-ASVS-L2-CHECKLIST.md first (Agent 2 handled some). Grep remaining console.log/warn/error in production code. Remove PHI-leaking ones, replace diagnostics with structured logger, keep justified ones.

4. TYPESCRIPT ERRORS: Run npx tsc --noEmit. Fix errors in your modified files (mandatory) and src/lib/ (should fix). Skip legacy_archive/ and Agent 2/3 files.

5. VERIFY: tsc error count before/after, pnpm test passes, zero any in critical paths. Create docs/technical/TYPE-SAFETY-REPORT.md.

Commit: "refactor(types): eliminate any from critical paths, console.log cleanup, next-auth upgrade plan"
```

### Task A3: R0 — Offline/Degraded Mode (NEW P0 from Red Team) (30-40 min)

**Prompt:**
```
Read ~/prototypes/holilabsv2/docs/PRD.md — find requirement R0 (Offline/Degraded Mode). This was added by red team review as a P0 requirement.

Read ~/prototypes/holilabsv2/CLAUDE.md for project rules.

PROJECT: ~/prototypes/holilabsv2/apps/web
BRANCH: Create feat/offline-mode

THE PROBLEM: When a physician is mid-clinical-encounter and WiFi drops, they must not lose their work. This is a trust-destroying event in healthcare — one occurrence and the physician abandons the platform.

IMPLEMENT:
1. Create a service worker (src/service-worker.ts or public/sw.js) that:
   - Caches the app shell for offline access
   - Intercepts failed API requests and queues them in IndexedDB
   - Syncs queued requests when connectivity restores
   - Uses a "last-write-wins with server timestamp" conflict resolution strategy

2. Create a React hook (src/hooks/useConnectionStatus.ts) that:
   - Monitors navigator.onLine + periodic fetch to /api/health/live
   - Exposes { isOnline, isReconnecting, pendingChanges } state
   - Triggers sync when transitioning from offline → online

3. Create a connection status indicator component (src/components/ConnectionStatus.tsx):
   - Shows nothing when online (don't distract)
   - Shows yellow "Offline — changes will sync when connected" banner when offline
   - Shows green "Syncing..." briefly when reconnecting
   - Shows red "Sync failed — X changes pending" if sync fails

4. Integrate with the encounter workflow:
   - Read src/app/(app)/ or wherever clinical encounters are managed
   - Ensure SOAP note auto-saves to IndexedDB every 30 seconds during an encounter
   - On reconnect, POST the saved note to the server
   - If the server already has a newer version, present a conflict resolution dialog

5. TESTS:
   - Unit test the hook (mock navigator.onLine)
   - Unit test the service worker queue/sync logic
   - Test the conflict resolution (local older, local newer, same timestamp)

6. VERIFY: pnpm typecheck passes, pnpm test passes, no PHI stored unencrypted in IndexedDB (encrypt the local cache using the same key derivation as the server, or at minimum use a session-scoped key).

Commit: "feat(offline): service worker + IndexedDB queue for offline encounter resilience"
```

### Task A4: R0b — Data Migration CSV Import (NEW P0 from Red Team) (20-30 min)

**Prompt:**
```
Read ~/prototypes/holilabsv2/docs/PRD.md — find requirement R0b (Data Migration / Import).

Read ~/prototypes/holilabsv2/CLAUDE.md (especially §V — PHI protection rules).
Read ~/prototypes/holilabsv2/.claude/rules/security.md for the PHI field inventory.

PROJECT: ~/prototypes/holilabsv2/apps/web
BRANCH: Create feat/csv-patient-import

THE PROBLEM: Clinics transitioning from paper or legacy systems have no way to import existing patients. Without historical medication data, the CDS engine can't check drug interactions — destroying the core value proposition.

IMPLEMENT:
1. Create API route: src/app/api/patients/import/route.ts
   - POST endpoint, accepts multipart/form-data with CSV file
   - Protected via createProtectedRoute — requires ADMIN role
   - Zod validation on every row
   - Maximum file size: 5MB (configurable)

2. CSV parsing and validation:
   - Required columns: firstName, lastName, dateOfBirth, cpf (or externalMrn)
   - Optional columns: gender, email, phone, address, city, state, postalCode, medications (semicolon-separated)
   - Validate: CPF format (###.###.###-##), date format, no empty required fields
   - Duplicate detection: match on CPF first, externalMrn second
   - For duplicates: skip (don't overwrite) and report in error log

3. PHI handling (CRITICAL):
   - Every imported field goes through the same encryption pipeline as manual entry
   - Use src/lib/db/encryption-extension.ts — the Prisma extension auto-encrypts
   - Create AuditLog entry for each imported patient: action="patient_imported", accessReason="data_migration"
   - If medications column is present, create Medication records linked to the patient

4. Response format:
   {
     imported: number,
     skipped: number,  // duplicates
     errors: Array<{ row: number, field: string, message: string }>,
     warnings: Array<{ row: number, message: string }>
   }

5. Frontend (minimal):
   - Add an "Import Patients" button to the admin dashboard (wherever patient management is)
   - Simple file upload dialog with a progress indicator
   - Show results summary after import (X imported, Y skipped, Z errors)
   - Download error report as CSV

6. Create a sample CSV template: public/templates/patient-import-template.csv
   - Header row with all supported columns
   - 3 example rows with FAKE data (never real PHI): "João da Silva", CPF 000.000.000-00, etc.

7. TESTS:
   - Happy path: 10-row CSV imports correctly
   - Duplicate detection: same CPF skips
   - Validation: bad CPF format, missing required fields, invalid dates
   - PHI: verify imported records are encrypted in DB
   - Auth: verify non-ADMIN users get 403

Commit: "feat(import): CSV patient import with PHI encryption, validation, and duplicate detection"
```

---

## GEMINI CLI — Secondary Workload

Run these AFTER Antigravity completes Agents 4-5 (Tasks A1-A2). Tasks G1-G2 can run in parallel.

### Task G1: Agent 6 — Integration Merge + Vendor Questionnaire (30-40 min)

**Prompt:**
```
Read ~/prototypes/holilabsv2/docs/HANDOFF_SPRINT6.md completely. This is your master context.
Then read ~/prototypes/holilabsv2/CLAUDE.md.

You are the integration lead. Multiple feature branches need to be merged and verified.

PROJECT: ~/prototypes/holilabsv2
BRANCH: Create sprint6/hospital-ready

STEP 1 — Verify each branch passes tests independently:
git branch -a | grep feat/
For each feature branch:
  git checkout <branch>
  pnpm test --bail 2>&1 | tail -10
  git checkout -   # return to previous branch
If ANY fails, STOP and report.

STEP 2 — Create integration branch and merge in order:
git checkout -b sprint6/hospital-ready
1. git merge feat/iec62304-lifecycle-docs --no-ff
2. git merge feat/lgpd-compliance-package --no-ff
3. git merge feat/production-infrastructure --no-ff
4. git merge feat/owasp-asvs-l2-hardening --no-ff
5. git merge feat/type-safety-and-test-stabilization --no-ff
6. git merge feat/offline-mode --no-ff (if exists)
7. git merge feat/csv-patient-import --no-ff (if exists)

If conflicts: security files → keep more restrictive version. Read both sides.

STEP 3 — Verify merged state:
pnpm install && npx tsc --noEmit && pnpm test --bail
Spot-check that key files exist from each agent.

STEP 4 — Create docs/sales/VENDOR-SECURITY-QUESTIONNAIRE.md
SIG Lite format. 7 sections with FILE PATH EVIDENCE for every claim:
1. Organization & Governance
2. Access Control (Casbin RBAC, 8 roles, MFA, sessions)
3. Data Protection (AES-256-GCM, key versioning, L1-L4 classification)
4. Application Security (OWASP ASVS L2, CodeQL, 24 CI workflows)
5. Infrastructure (health probes, Dockerfile, backup/DR)
6. Compliance (LGPD, IEC 62304, ISO 14971, ANVISA Class I)
7. Brazil-Specific (ICP-Brasil, SNCR, RNDS, AFE status)

STEP 5 — Create docs/SPRINT6_DELIVERY_REPORT.md
Summary of all contributions, test results, security posture, regulatory readiness.
Final recommendation: SHIP TO PILOT / HOLD / NEEDS WORK.

Commit: "chore(integration): merge all sprint6 agents — hospital-ready verification complete"
```

### Task G2: Pilot Onboarding Materials (20-30 min)

**Prompt:**
```
Read ~/prototypes/holilabsv2/docs/PRD.md for product context.
Read ~/prototypes/holilabsv2/docs/BUSINESS_STRATEGY.md §2.3 (Go-to-Market) for pilot strategy.
Read ~/prototypes/holilabsv2/CLAUDE.md for project rules.

PROJECT: ~/prototypes/holilabsv2

Create three onboarding documents for the first clinic pilots:

1. docs/onboarding/GUIA-RAPIDO-CLINICO.md
   Clinician quickstart guide. Brazilian Portuguese. 2 pages max.
   Steps: Login → Find patient → Start encounter → Dictate (AI scribe) → Review SOAP → Sign → Prescribe → Close encounter → View history.
   Check actual page paths in apps/web/src/app/ so instructions match real UI routes.
   No jargon. A physician should read this in 5 minutes.

2. docs/onboarding/KNOWN-LIMITATIONS.md
   Honest table of what works, what's partial, and what's coming.
   Categories: FULLY WORKING (P0 features), PARTIALLY WORKING (P1 with caveats), COMING SOON (P2 with timelines), NOT SUPPORTED (non-goals with brief explanation).
   Reference docs/PRD.md for P0/P1/P2 classification.
   Write in Portuguese with standard English technical terms.

3. docs/onboarding/GUIA-ADMINISTRADOR.md
   Administrator quickstart guide. Brazilian Portuguese.
   Steps: Invite providers → Set roles → Configure schedule → Import patients (CSV) → Manage billing → View audit logs → Handle LGPD requests (export, erasure).
   Check actual admin page paths in apps/web/src/app/.

Commit: "docs(onboarding): clinician quickstart, known limitations, admin guide — pilot prep"
```

### Task G3: Customer Discovery Interview Guide (15 min)

**Prompt:**
```
Read ~/prototypes/holilabsv2/docs/BUSINESS_STRATEGY.md §0 (Honest Assessment) — this was added by red team review and identifies that ZERO customer discovery has been done.

Create docs/sales/CUSTOMER-DISCOVERY-GUIDE.md

This is an interview guide for Nico to use when talking to São Paulo clinic owners. Use the Mom Test methodology (ask about their problems, not whether they'd buy our product).

Structure:
1. Pre-interview (2 min): Who are we talking to? Clinic size? Current tools? How did we get the intro?

2. Opening questions (understand their world):
   - "Walk me through a typical day at your clinic — from first patient to last."
   - "What takes up more of your time than you'd like?"
   - "How do you handle prescriptions today? What's the most annoying part?"
   - "When was the last time you had a billing claim rejected? What happened?"

3. Pain validation (dig into specific problems):
   - "How much time does documentation take per patient? What would you do with that time back?"
   - "Have you ever caught a drug interaction that was almost missed? How?"
   - "What happened the last time your internet went down during clinic hours?"
   - "How do you handle LGPD requests from patients today?"

4. Current solution understanding:
   - "What software/tools do you use today? What do you like about them? What drives you crazy?"
   - "Have you looked at other systems? What happened? Why didn't you switch?"
   - "What would a new system need to do to make switching worth the hassle?"

5. Pricing signals (indirect):
   - "What do you pay for your current tools per month?"
   - "If a system saved each physician 2 hours per day in documentation, what would that be worth to the clinic?"

6. Close:
   - "Is there anything I didn't ask about that I should have?"
   - "Would you be open to seeing a demo in a few weeks?"

7. Post-interview notes template:
   - Clinic name, size, location, current tools
   - Top 3 pain points mentioned (in their words, not ours)
   - Willingness to try something new (1-5 scale)
   - Pricing sensitivity signals
   - Follow-up action items

Write in Portuguese (the interviews will be in Portuguese).
Include 5-10 follow-up probing questions for when they give vague answers.

Commit: "docs(sales): customer discovery interview guide — Mom Test methodology"
```

---

## Execution Order

```
ANTIGRAVITY (sequential):
A1: Agent 4 — LGPD docs           ─── 30-40 min
A2: Agent 5 — TypeScript cleanup   ─── 45-60 min
A3: R0 — Offline mode              ─── 30-40 min
A4: R0b — CSV patient import       ─── 20-30 min

GEMINI CLI (after A1+A2 complete):
G1: Agent 6 — Integration merge    ─── 30-40 min  ┐
G2: Pilot onboarding materials     ─── 20-30 min  ├─ G2+G3 can run
G3: Customer discovery guide       ─── 15 min     ┘  parallel to G1

Total: ~3.5-4.5 hours of compute
```

## Dependency Chain

```
A1 (LGPD) ──→ A2 (TypeScript) ──→ G1 (Integration)
                                        ↓
A3 (Offline) ─────────────────────→ G1 merges if ready
A4 (CSV Import) ──────────────────→ G1 merges if ready

G2 (Onboarding) ──→ no dependency, run anytime
G3 (Discovery)  ──→ no dependency, run anytime
```

## If Time Runs Short

**Cut in this order (last = cut first):**
1. G3 (Customer discovery guide) — Nico can write this himself
2. A3 (Offline mode) — important but can be Sprint 7
3. A4 (CSV import) — important but can be Sprint 7
4. G2 (Onboarding materials) — needed for pilot but can be done week of
5. A2 (TypeScript cleanup) — technical hygiene, not blocking
6. G1 (Integration merge) — CRITICAL, cannot cut
7. A1 (LGPD docs) — CRITICAL, cannot cut
