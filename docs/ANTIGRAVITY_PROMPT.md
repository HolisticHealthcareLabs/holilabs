# Antigravity Master Prompt — HoliLabs Sprint 6 Continuation
## April 5, 2026

**Classification:** CONFIDENTIAL — L3
**Purpose:** Single self-contained prompt for Antigravity to execute all remaining Sprint 6 work.
**Estimated compute time:** 2.5–3.5 hours sequential

---

## SITUATION REPORT — READ THIS FIRST

You are continuing Sprint 6 of a healthcare SaaS platform called HoliLabs. Six specialized agents were planned. Three humans (Agents 1-3) finished their work. Two AI tools (Gemini CLI) completed or started Agents 4-5. You are picking up what remains.

### What Is Already Done (DO NOT REDO)

| Agent | Branch | Status | What It Did |
|-------|--------|--------|-------------|
| **Agent 1** — IEC 62304 Lifecycle Docs | `feat/iec62304-lifecycle-docs` | COMMITTED @ `78ab098f` | 7 regulatory docs: Software Dev Plan, Requirements Spec (41 reqs), Architecture Doc, Risk Management File (10 hazards), V&V Plan, Traceability Matrix, ANVISA Checklist |
| **Agent 2** — OWASP ASVS L2 Audit | `feat/owasp-asvs-l2-hardening` | COMMITTED | 4 source files fixed + ASVS checklist. Password max-length, body size limits, content-type validation, referrer-policy, structured logging. 3,014 tests passed. |
| **Agent 3** — Production Infrastructure | `feat/production-infrastructure` | COMMITTED | Startup probe, metrics.ts, sentry-config.ts (PHI scrubbing), Dockerfile labels/healthcheck, docker-compose.yml. 49/49 health tests pass. |
| **Agent 4** — LGPD Compliance | `feat/lgpd-compliance-package` | COMMITTED @ `81aee25b` | 5 LGPD docs created: RIPD, processing records, privacy policy, incident response plan, DPO designation template. All in Brazilian Portuguese. |
| **Agent 5** — TypeScript + Cleanup | `feat/type-safety-and-test-stabilization` | LIKELY DONE (verify) | Fixed `any` types across 8+ critical files, created NextAuth upgrade plan (DEFER recommendation), console.log cleanup. Gemini was actively working — may have committed or may have stopped mid-execution. |

### What Strategy Documents Exist (DO NOT RECREATE)

| Document | Path | Purpose |
|----------|------|---------|
| Business Strategy | `docs/BUSINESS_STRATEGY.md` | Full go-to-market strategy, TAM/SAM/SOM, unit economics, Porter's Five Forces |
| PRD | `docs/PRD.md` | 4 personas, 16 requirements (P0-P2), acceptance criteria, success metrics |
| Handoff Doc | `docs/HANDOFF_SPRINT6.md` | Master context for LLM CLI agents |
| Work Split | `docs/WORK_SPLIT.md` | Original task division between tools |
| Execution Plan | `docs/EXECUTION_PLAN.md` | 6-agent plan with self-critique |

---

## YOUR MISSION

Execute the following tasks **in order**. Each task has a pre-flight check — if the pre-flight fails, handle it before proceeding.

---

## TASK 0: ORIENTATION AND GAP ANALYSIS (5 min)

Before writing any code, understand the project:

```bash
# 1. Read the project governance
cat CLAUDE.md

# 2. Read the security rules
cat .claude/rules/security.md

# 3. Check what branches exist and their latest commits
git branch -a | grep -E "feat/|sprint"
git log --oneline --all -20

# 4. Check if Agent 5 (TypeScript cleanup) actually committed
git log --oneline feat/type-safety-and-test-stabilization -3 2>/dev/null || echo "BRANCH MISSING OR NO COMMITS"

# 5. Check if any of the new feature branches already exist
git branch -a | grep -E "offline|csv-patient|import"

# 6. Get a sense of the codebase structure
ls apps/web/src/lib/
ls apps/web/src/app/api/ | head -20
ls docs/
```

**Decision point after Task 0:**

- If `feat/type-safety-and-test-stabilization` has commits and looks complete → skip to Task 2
- If that branch exists but is incomplete → complete Task 1 (finish Agent 5)
- If that branch doesn't exist → execute Task 1 fully

---

## TASK 1: FINISH AGENT 5 — TypeScript Strictness + Console Cleanup (IF NEEDED)

**Pre-flight:**
```bash
git checkout feat/type-safety-and-test-stabilization 2>/dev/null
git log --oneline -5
# If this shows meaningful commits about type safety, SKIP THIS TASK
```

**Only execute this if Agent 5 is incomplete or missing.**

```
PROJECT: ~/prototypes/holilabsv2/apps/web
BRANCH: feat/type-safety-and-test-stabilization (create if missing, continue if exists)

DO NOT TOUCH (Agent 2 already modified these):
- src/lib/auth/password-validation.ts
- src/middleware.ts
- src/lib/api/middleware.ts
- src/lib/security-headers.ts

PHASE 1 — TYPE SAFETY:
grep -rn ": any" src/lib/security/ src/lib/auth/ src/lib/clinical/ src/lib/api/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v .test.
Replace each `any` with proper type or `unknown` + type guard. Add JSDoc for exported functions.
Then scan src/services/ src/hooks/ src/components/ (exclude tests).

PHASE 2 — NEXT-AUTH ASSESSMENT:
Read src/lib/auth/ config files + package.json.
Create docs/technical/NEXTAUTH-UPGRADE-PLAN.md if it doesn't exist:
- Current version, risk assessment
- Breaking changes beta.30 → stable
- Migration steps with rollback plan
- Recommendation: upgrade now or after first pilot?
DO NOT actually upgrade.

PHASE 3 — CONSOLE.LOG CLEANUP:
grep -rn "console\.log\|console\.warn\|console\.error" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v .test. | grep -v legacy_archive/
- Logs PHI/tokens/secrets → REMOVE immediately
- Useful diagnostics → Replace with structured logger (find existing logger pattern)
- In catch blocks → Keep error.message only

PHASE 4 — VERIFICATION:
npx tsc --noEmit 2>&1 | tail -20
pnpm test --bail
Create docs/technical/TYPE-SAFETY-REPORT.md with before/after metrics.

Commit: "refactor(types): eliminate any from critical paths, console.log cleanup, next-auth upgrade plan"
```

---

## TASK 2: R0 — OFFLINE/DEGRADED MODE (New P0 Requirement)

**Context:** When a physician is mid-clinical-encounter and WiFi drops, they must not lose their work. One data loss event = lost trust = physician abandons the platform. This was identified by red team review and added as P0 to the PRD.

```bash
# Pre-flight
git checkout main  # or whatever the primary branch is
git checkout -b feat/offline-mode
```

**Implement:**

### 2a. Service Worker (`public/sw.js` or `apps/web/public/sw.js`)
- Cache the app shell (HTML, CSS, JS bundles) for offline access
- Intercept failed API requests (POST/PUT/PATCH to `/api/`) and queue them in IndexedDB
- Use a `pending-requests` IndexedDB store with: `{ id, url, method, headers, body, timestamp, retryCount }`
- On connectivity restore: replay queued requests in FIFO order
- Conflict resolution: last-write-wins with server timestamp comparison
- Max queue size: 50 requests (prevent unbounded growth)
- Max retry: 3 attempts with exponential backoff (1s, 4s, 16s)

### 2b. React Hook (`src/hooks/useConnectionStatus.ts`)
```typescript
interface ConnectionStatus {
  isOnline: boolean;
  isReconnecting: boolean;
  pendingChanges: number;
  lastSyncTime: Date | null;
}
```
- Monitor `navigator.onLine` + periodic fetch to `/api/health/live` (every 30s when online, every 5s when offline)
- Expose the above state
- Trigger sync when transitioning offline → online
- Export: `useConnectionStatus()` returning `ConnectionStatus`

### 2c. Connection Status Component (`src/components/ConnectionStatus.tsx`)
- Online: render nothing (don't distract the physician)
- Offline: yellow banner — "Modo offline — alterações serão sincronizadas quando a conexão voltar"
- Reconnecting: green pulse — "Sincronizando..."
- Sync failed: red banner — "Falha na sincronização — X alterações pendentes"
- Position: fixed bottom of viewport, z-index above content but below modals

### 2d. Encounter Integration
- Find where clinical encounters/SOAP notes are managed (check `src/app/(app)/` paths)
- Add auto-save to IndexedDB every 30 seconds during active encounter
- On reconnect: POST saved note to server
- If server has newer version: present conflict resolution dialog (keep local / keep server / merge)
- **CRITICAL: Encrypt local cache.** PHI in IndexedDB must be encrypted. Use a session-scoped AES key derived from the user's auth token, or use the same encryption pattern as `src/lib/db/encryption-extension.ts`. NEVER store plaintext PHI in IndexedDB.

### 2e. Tests
- Unit test `useConnectionStatus` hook (mock `navigator.onLine`)
- Unit test service worker queue/sync logic
- Test conflict resolution (local older, local newer, same timestamp)
- Test encryption of IndexedDB entries
- Test max queue size enforcement

### 2f. Verification
```bash
npx tsc --noEmit
pnpm test --bail
# Verify no unencrypted PHI in IndexedDB code
grep -rn "indexedDB\|IDBDatabase" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__
# Every IndexedDB write should go through an encrypt function
```

**Commit:** `feat(offline): service worker + IndexedDB queue for offline encounter resilience`

---

## TASK 3: R0b — CSV PATIENT IMPORT (New P0 Requirement)

**Context:** Clinics transitioning from paper or legacy systems need to import existing patients. Without historical medication data, the CDS engine can't check drug interactions — destroying the core value proposition. This was identified by red team review and added as P0 to the PRD.

```bash
git checkout main
git checkout -b feat/csv-patient-import
```

**Implement:**

### 3a. API Route (`src/app/api/patients/import/route.ts`)
- POST endpoint, accepts `multipart/form-data` with CSV file
- Protected via `createProtectedRoute` — requires ADMIN role
- Zod validation on every row
- Maximum file size: 5MB (configurable via env var `MAX_IMPORT_FILE_SIZE`)
- Rate limited: 1 import per 5 minutes per clinic

### 3b. CSV Parsing and Validation
- Required columns: `firstName`, `lastName`, `dateOfBirth`, `cpf` (or `externalMrn`)
- Optional columns: `gender`, `email`, `phone`, `address`, `city`, `state`, `postalCode`, `medications` (semicolon-separated)
- Validate: CPF format (`###.###.###-##` with check digit), date format (ISO 8601 or DD/MM/YYYY), no empty required fields
- Duplicate detection: match on CPF first, `externalMrn` second
- Duplicates: skip (don't overwrite) and report in error log

### 3c. PHI Handling (CRITICAL — read `.claude/rules/security.md`)
- Every imported field goes through the SAME encryption pipeline as manual entry
- Use `src/lib/db/encryption-extension.ts` — the Prisma extension auto-encrypts
- Create `AuditLog` entry for each imported patient: `action="patient_imported"`, `accessReason="data_migration"`
- If `medications` column present: create `Medication` records linked to patient
- NEVER log any imported PHI field — use `tokenId` in logs

### 3d. Response Format
```json
{
  "imported": 42,
  "skipped": 3,
  "errors": [
    { "row": 7, "field": "cpf", "message": "Invalid CPF format" }
  ],
  "warnings": [
    { "row": 15, "message": "Duplicate CPF — patient already exists" }
  ]
}
```

### 3e. Frontend (Minimal)
- Add "Importar Pacientes" button to admin dashboard (find patient management page in `src/app/(app)/`)
- Simple file upload dialog with progress indicator
- Show results summary after import (X importados, Y ignorados, Z erros)
- Download error report as CSV

### 3f. Sample Template
- Create `public/templates/patient-import-template.csv`
- Header row with all supported columns
- 3 example rows with FAKE data: "João da Silva", CPF `000.000.000-00`, etc.
- NEVER use real PHI in the template

### 3g. Tests
- Happy path: 10-row CSV imports correctly, all fields encrypted
- Duplicate detection: same CPF is skipped with warning
- Validation: bad CPF format → error, missing required fields → error, invalid dates → error
- PHI verification: imported records are encrypted in DB (not plaintext)
- Auth: non-ADMIN users get 403
- File size: >5MB file is rejected
- Rate limit: second import within 5 minutes is rejected

### 3h. Verification
```bash
npx tsc --noEmit
pnpm test --bail
# Verify no PHI in logs
grep -rn "console\.log\|logger\.info" src/app/api/patients/import/ --include="*.ts" | grep -v tokenId
# Should return nothing or only tokenId-based logging
```

**Commit:** `feat(import): CSV patient import with PHI encryption, validation, and duplicate detection`

---

## TASK 4: AGENT 6 — INTEGRATION MERGE + VENDOR QUESTIONNAIRE

**Pre-flight:** ALL previous branches must be committed and passing tests.

```bash
# Verify every branch exists
for branch in feat/iec62304-lifecycle-docs feat/owasp-asvs-l2-hardening feat/production-infrastructure feat/lgpd-compliance-package feat/type-safety-and-test-stabilization feat/offline-mode feat/csv-patient-import; do
  echo "=== $branch ==="
  git log --oneline $branch -1 2>/dev/null || echo "MISSING — skip in merge"
done
```

### 4a. Create Integration Branch
```bash
git checkout main  # or primary development branch
git checkout -b sprint6/hospital-ready
```

### 4b. Merge in Order (least → most conflict risk)
```bash
git merge feat/iec62304-lifecycle-docs --no-ff -m "merge: Agent 1 IEC 62304 lifecycle docs"
git merge feat/lgpd-compliance-package --no-ff -m "merge: Agent 4 LGPD compliance package"
git merge feat/production-infrastructure --no-ff -m "merge: Agent 3 production infrastructure"
git merge feat/owasp-asvs-l2-hardening --no-ff -m "merge: Agent 2 OWASP ASVS L2 hardening"
git merge feat/type-safety-and-test-stabilization --no-ff -m "merge: Agent 5 type safety and console cleanup"
# Only merge if they exist:
git merge feat/offline-mode --no-ff -m "merge: R0 offline/degraded mode" 2>/dev/null
git merge feat/csv-patient-import --no-ff -m "merge: R0b CSV patient import" 2>/dev/null
```

**Conflict resolution rules:**
- Security files → keep the MORE restrictive version
- Docs → keep BOTH (concatenate if necessary)
- Tests → keep BOTH
- If unsure → read both sides and pick the one that matches CLAUDE.md rules

### 4c. Post-Merge Verification
```bash
pnpm install
npx tsc --noEmit
pnpm test --bail
```

Spot-check critical files exist:
- `docs/regulatory/iec62304/06-TRACEABILITY-MATRIX.md`
- `docs/security/OWASP-ASVS-L2-CHECKLIST.md`
- `apps/web/src/app/api/health/startup/route.ts`
- `docs/regulatory/lgpd/RIPD-RELATORIO-IMPACTO.md`
- `docs/technical/TYPE-SAFETY-REPORT.md` or `NEXTAUTH-UPGRADE-PLAN.md`

Verify: no `.env` files committed, no hardcoded secrets.

### 4d. Vendor Security Questionnaire
Create `docs/sales/VENDOR-SECURITY-QUESTIONNAIRE.md` in SIG Lite format.

7 sections — every claim MUST have a file path as evidence:

**1. Organization & Governance**
- Security rules: `.claude/rules/security.md`
- Project governance: `CLAUDE.md`
- Software lifecycle: `docs/regulatory/iec62304/01-SOFTWARE-DEVELOPMENT-PLAN.md`
- Risk management: `docs/regulatory/iec62304/04-RISK-MANAGEMENT-FILE.md`

**2. Access Control**
- Auth system: `apps/web/src/lib/auth/` (21 files)
- RBAC: Casbin, 8 roles (ADMIN, OWNER, DOCTOR, NURSE, RECEPTIONIST, BILLING, LAB_TECH, PHARMACIST), default-deny
- MFA: TOTP + SMS fallback
- Sessions: HttpOnly, Secure, SameSite=Strict

**3. Data Protection**
- Encryption: AES-256-GCM with key versioning (`src/lib/security/hipaa-encryption.ts`)
- Auto-encryption: Prisma extension (`src/lib/db/encryption-extension.ts`)
- Data classification: L1-L4 levels (`.claude/rules/security.md`)
- LGPD compliance: `docs/regulatory/lgpd/` (5 documents)

**4. Application Security**
- OWASP ASVS L2: `docs/security/OWASP-ASVS-L2-CHECKLIST.md`
- Input validation: Zod schemas on all API routes
- SAST: CodeQL in CI
- CI/CD: 24 GitHub Actions workflows, SHA-pinned

**5. Infrastructure**
- Health probes: liveness, readiness, startup (`src/app/api/health/`)
- Container: Multi-stage Dockerfile with healthcheck
- Backup: `docs/operations/BACKUP-DR-PLAN.md` (RPO 1h, RTO 4h)
- Monitoring: Sentry with PHI scrubbing (`src/lib/monitoring/sentry-config.ts`)

**6. Compliance**
- LGPD: Full package (RIPD, processing records, privacy policy, incident plan, DPO)
- IEC 62304 Class A: 7 lifecycle documents
- ISO 14971: Risk management file with 10 identified hazards
- ANVISA RDC 657/2022: Class I notification pathway (deterministic CDS only)

**7. Brazil-Specific**
- ICP-Brasil: Digital signatures for controlled substance prescriptions
- SNCR: Electronic prescription formatting
- RNDS: National health data network interoperability
- AFE: Application status — PENDING (prerequisite for commercial distribution)
- CPF/CNS/RG: All encrypted with key versioning per LGPD

### 4e. Sprint 6 Delivery Report
Create `docs/SPRINT6_DELIVERY_REPORT.md`:
- Summary of all agent contributions (what each branch delivered)
- Merged test results and coverage
- Security posture (ASVS compliance %, encryption status)
- Regulatory readiness (which documents exist, what's still needed)
- Known gaps and risks
- **Final recommendation: SHIP TO PILOT / HOLD / NEEDS WORK** with justification

**Commit:** `chore(integration): merge all sprint6 agents — hospital-ready verification complete`

---

## TASK 5: PILOT ONBOARDING MATERIALS

### 5a. Clinician Quickstart Guide
Create `docs/onboarding/GUIA-RAPIDO-CLINICO.md`
- Written in Brazilian Portuguese
- 2 pages maximum
- Target: physicians who are NOT tech-savvy
- Steps: Login → Buscar paciente → Iniciar atendimento → Ditar (IA scribe) → Revisar SOAP → Assinar → Prescrever → Fechar atendimento → Histórico
- Check actual page routes in `apps/web/src/app/` so instructions match real UI
- One sentence per step + describe what they should see on screen
- No jargon. A physician should read this in 5 minutes.

### 5b. Known Limitations Document
Create `docs/onboarding/KNOWN-LIMITATIONS.md`
- Read `docs/PRD.md` for P0/P1/P2 classification
- Table format: Feature | Status | Notes
- Categories:
  - **TOTALMENTE FUNCIONAL** — P0 features that pass tests
  - **PARCIALMENTE FUNCIONAL** — P1 features with caveats
  - **EM BREVE** — P2 features with estimated timelines
  - **NÃO SUPORTADO** — Non-goals with brief explanation
- Be honest. Clinics trust us MORE if we're upfront.
- Portuguese with standard English technical terms.

### 5c. Administrator Quickstart Guide
Create `docs/onboarding/GUIA-ADMINISTRADOR.md`
- Brazilian Portuguese
- Steps: Convidar médicos → Definir permissões → Configurar agenda → Importar pacientes (CSV) → Gerenciar faturamento → Visualizar logs de auditoria → Atender solicitações LGPD (exportação, exclusão)
- Check actual admin page paths in `apps/web/src/app/`

**Commit:** `docs(onboarding): clinician quickstart, known limitations, admin guide — pilot prep`

---

## TASK 6: CUSTOMER DISCOVERY INTERVIEW GUIDE

Create `docs/sales/CUSTOMER-DISCOVERY-GUIDE.md`

**Context:** Read `docs/BUSINESS_STRATEGY.md` §0 (Honest Assessment) — ZERO customer discovery has been done. All pricing and feature priority assumptions are unvalidated. This guide is for Nico to use in São Paulo clinic interviews.

**Methodology:** Mom Test — ask about their current problems, not whether they'd buy our product.

**Structure (write in Brazilian Portuguese):**

1. **Pré-entrevista (2 min):** Quem estamos entrevistando? Tamanho da clínica? Ferramentas atuais? Como conseguimos a introdução?

2. **Perguntas de abertura (entender o dia-a-dia):**
   - "Me conta como é um dia típico na sua clínica — do primeiro paciente ao último."
   - "O que toma mais tempo do que deveria?"
   - "Como vocês fazem prescrições hoje? Qual a parte mais chata?"
   - "Quando foi a última vez que um convênio glosou uma conta? O que aconteceu?"

3. **Validação de dor (investigar problemas específicos):**
   - "Quanto tempo a documentação leva por paciente? O que você faria com esse tempo de volta?"
   - "Já aconteceu de quase perder uma interação medicamentosa? Como descobriram?"
   - "O que acontece quando a internet cai durante o atendimento?"
   - "Como vocês lidam com pedidos de pacientes sobre seus dados (LGPD)?"

4. **Entender a solução atual:**
   - "Que software/ferramentas vocês usam hoje? O que gostam? O que detestam?"
   - "Já olharam outros sistemas? O que aconteceu? Por que não mudaram?"
   - "O que um sistema novo precisaria fazer pra valer a dor de cabeça da mudança?"

5. **Sinais de preço (indiretos):**
   - "Quanto vocês pagam pelas ferramentas atuais por mês?"
   - "Se um sistema economizasse 2 horas por dia de cada médico em documentação, quanto isso valeria pra clínica?"

6. **Encerramento:**
   - "Tem alguma coisa que eu deveria ter perguntado e não perguntei?"
   - "Toparia ver uma demonstração daqui umas semanas?"

7. **Template de notas pós-entrevista:**
   - Nome da clínica, tamanho, localização, ferramentas atuais
   - Top 3 dores mencionadas (nas palavras DELES, não nas nossas)
   - Disposição para experimentar algo novo (escala 1-5)
   - Sinais de sensibilidade a preço
   - Itens de follow-up

8. **Perguntas de aprofundamento** (quando respostas são vagas):
   - "Pode me dar um exemplo concreto?"
   - "Quando foi a última vez que isso aconteceu?"
   - "Quanto isso custou pra clínica (tempo, dinheiro, pacientes)?"
   - "O que vocês tentaram fazer sobre isso?"
   - "Se pudessem resolver um único problema amanhã, qual seria?"

**Commit:** `docs(sales): customer discovery interview guide — Mom Test methodology`

---

## CRITICAL CONSTRAINTS (From CLAUDE.md — Read the Full File)

### PHI Protection — Zero Tolerance
- NEVER log, print, or commit any PHI field
- PHI fields: firstName, lastName, dateOfBirth, gender, email, phone, address, cpf, cns, rg, mrn, medications, diagnosis, SOAP notes, audio files
- Use `tokenId` in logs, never real patient identifiers
- All PHI encrypted AES-256-GCM with key versioning

### Code Standards
- TypeScript strict mode, NO `any` in production code
- All API routes: Zod input validation + `createProtectedRoute` middleware
- No `@ts-ignore` or `@ts-expect-error` without linked issue
- Max 300 lines per file
- kebab-case.ts for modules, PascalCase.tsx for React components

### Testing
- 80% coverage threshold (branches, functions, lines, statements)
- `pnpm test --bail` must pass before ANY commit
- `npx tsc --noEmit` must pass before ANY commit

### Git Safety
- NEVER `git push` — human only
- NEVER commit without passing tests
- NEVER `--no-verify` on src/ or apps/ files
- 3 consecutive test failures → CIRCUIT BREAKER → halt and report to human
- Commit format: `<type>(<scope>): <description>`

### Security
- All secrets via environment variables
- No hardcoded tokens, keys, passwords, connection strings
- CORS locked to `NEXT_PUBLIC_APP_URL` in production
- Rate limiting on ALL endpoints

---

## EXECUTION CHECKLIST

```
[ ] Task 0: Orientation — read CLAUDE.md, check branch state
[ ] Task 1: Agent 5 TypeScript cleanup (IF NEEDED — check first)
[ ] Task 2: R0 Offline/Degraded Mode
[ ] Task 3: R0b CSV Patient Import
[ ] Task 4: Agent 6 Integration Merge + Vendor Questionnaire + Delivery Report
[ ] Task 5: Pilot Onboarding Materials (3 docs)
[ ] Task 6: Customer Discovery Guide
```

**If time runs short, cut in this order (last item = cut first):**
1. Task 6 (Discovery guide) — Nico can write this himself
2. Task 2 (Offline mode) — important but can be Sprint 7
3. Task 3 (CSV import) — important but can be Sprint 7
4. Task 5 (Onboarding) — needed for pilot but can be done week-of
5. Task 1 (TypeScript) — technical hygiene, not blocking
6. Task 4 (Integration) — CRITICAL, do not cut

---

## QUALITY BAR

This platform will be used by physicians to make clinical decisions for real patients. A bug is not a bug — it is a potential patient safety issue.

- **Regulatory:** ANVISA RDC 657/2022 Class I notification-ready. IEC 62304 Class A. LGPD Art. 38 RIPD complete.
- **Security:** OWASP ASVS Level 2 verified. AES-256-GCM PHI encryption. Casbin RBAC default-deny.
- **Clinical:** Zero false negatives on RED CDS alerts relative to reference database. Every AI suggestion requires physician attestation.
- **Operations:** RPO 1 hour, RTO 4 hours. Health probes for Kubernetes. Canary deploys with auto-rollback.
- **Testing:** 3,000+ tests, 80%+ coverage, 24 CI/CD workflows.

Act accordingly.

---

*Start by reading `CLAUDE.md` and running the Task 0 orientation commands. Then execute sequentially.*
