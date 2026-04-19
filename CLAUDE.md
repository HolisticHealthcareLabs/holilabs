# CLAUDE.md — holilabsv2 (HHL Flagship)

## I. GLOBAL EXECUTIVE HEADER
**Project:** holilabsv2 (HHL Flagship) (CGH Venture)
**Executive System:** MEGATRON (Orchestrated from `~/prototypes/openclaude/`)
**Ownership:** Nico (nicola@holilabs.xyz) — São Paulo, Brazil (BRT)
**Protocol Version:** 2.0 (2026-04-03)

> **MANDATE:** This project is governed by the **MEGATRON SOPs**.
> Read `~/prototypes/openclaude/MEGATRON.md` and `PROTOCOLS.md` before execution.

---

## II. EFFICIENCY PROTOCOL
1. **Model Routing:** Haiku/Flash for 80% (search, routine code). Opus/Pro for 20% (architecture, complex bugs).
2. **Context Pruning:** Surgical `read_file` calls only. Never read entire directories without a filter.
3. **Hybrid Fallback:** If cloud credits < 5% or API is down, auto-switch to Local (Ollama) per `openclaude/scripts/setup-hybrid-llm.sh`.
4. **Persistent Memory:** Use `python3 ~/prototypes/openclaude/memory/memory-brain.py [add|search] "content"`.

---

## III. PROJECT SPECS
**Status:** Active / Flagship
**Tech Stack:** Next.js 14 monorepo (pnpm), Prisma, PostgreSQL, Redis, Jest, Playwright.
**Key Commands:**
```bash
pnpm install          # Install all workspace dependencies
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm test             # Run Jest test suites
pnpm typecheck        # TypeScript strict check
npx prisma db push    # Sync schema (NOT migrations — drift was too large)
npx prisma generate   # Regenerate Prisma client
```

**Domain Logic:**
- **Brazil:** TUSS/ANS integration in `research/insurance-codes/`. LGPD governs all patient data.
- **Colombia:** CUPS/RIPS/EPS integration in `apps/web/src/lib/finance/`.
- **SaMD:** Any feature affecting clinical decision-making must be audited for ANVISA RDC 657/2022.
- **ANVISA Class I:** Deterministic CDS only (JSON-Logic). LLMs strictly for context gathering. `engine.ts` MUST stay deterministic.

---

## IV. EXECUTION HOOKS
1. **Morning Brief:** Surface KPI anomalies to the 06:20 BRT standup.
2. **Overnight Pipeline:** Queue long-form research or batch refactors for the 22:00 BRT cycle.
3. **Decision Matrix:** Budget > $1K or strategic hires require a 3-option brief.

---

## IV.B FROZEN UI — CHANGE CONTROL

**MANDATORY.** Read `.claude/rules/frozen-ui.md` before modifying any UI file.

- `src/components/landing/**` → **READ-ONLY** (no Write/Edit/rename)
- `src/lib/i18n/landing.ts` → **STRINGS-ONLY** (values only, no schema changes)
- `src/app/[locale]/page.tsx` → **READ-ONLY**

Before any edit to a frozen zone: describe the change, show the diff against the latest `ui-frozen-*` tag, and wait for explicit `approved` / `go` / `yes`. Plan-mode approval does NOT count. See `.claude/rules/frozen-ui.md` for the full protocol.

---

## V. SECURITY RULES

### V.1 PHI Protection — Zero Tolerance

**NEVER** log, print, console.log, console.error, console.warn, or commit any PHI/PII field.
PHI fields from the Prisma schema (exhaustive list):

| Model | PHI Fields | Encryption Required |
|-------|-----------|---------------------|
| `Patient` | `firstName`, `lastName`, `dateOfBirth`, `gender`, `email`, `phone`, `address`, `city`, `state`, `postalCode`, `mrn`, `externalMrn` | YES (AES-256-GCM, key-versioned) |
| `Patient` | `cpf`, `cns`, `rg`, `municipalityCode`, `healthUnitCNES`, `susPacientId` | YES (Brazilian national IDs — LGPD Art. 5) |
| `User` | `mfaPhoneNumber`, `mfaBackupCodes`, `signingPinHash`, `passwordHash`, `licenseNumber`, `npi` | YES (credentials + PII) |
| `Medication` | `name`, `dose`, `frequency`, `instructions`, `notes` | Context-encrypted (linked to patient) |
| `Prescription` | `medications` (JSON), `instructions`, `diagnosis` | YES (clinical content) |
| `SOAPNote` | `subjective`, `objective`, `assessment`, `plan`, `chiefComplaint`, `vitalSigns` | YES (clinical narrative) |
| `ScribeSession` | `audioFileUrl`, `audioFileName` | YES (voice data is PHI per HIPAA §160.103) |
| `ClinicalEncounter` | `chiefComplaint`, `diagnosis`, `notes` | Context-encrypted |

**Prohibited patterns:**
```typescript
// NEVER — will be blocked by pre-commit hook
console.log(patient.firstName);
console.log(`Patient: ${patient.cpf}`);
logger.info({ mrn: patient.mrn });
SELECT * FROM patients;  // Use explicit column lists

// ALWAYS — use tokenized identifiers in logs
logger.info({ tokenId: patient.tokenId, action: 'viewed' });
```

### V.2 Access Control & Audit

- All patient data access MUST create an `AuditLog` entry with `accessReason`.
- No direct Prisma queries on Patient/Medication/Prescription outside of service layer.
- RBAC enforced via `createProtectedRoute` middleware — never bypass with raw handlers.
- Session tokens: HttpOnly, Secure, SameSite=Strict. No localStorage for auth tokens.

### V.3 Secrets Management

- **NEVER** hardcode secrets, API keys, passwords, tokens, JWTs, or connection strings.
- All secrets via environment variables. Verify `.env` is in `.gitignore`.
- No `--dangerously-skip-permissions` in any script, doc, or config.
- Encryption keys use versioned rotation: `PHI_ENCRYPTION_KEY_V{n}` with `PHI_ENCRYPTION_KEY_VERSION`.

### V.4 Network Security

- CORS locked to known origins in production (`NEXT_PUBLIC_APP_URL` only).
- Rate limiting enabled on ALL environments (see `src/lib/api/rate-limit.ts`).
- All API routes MUST have Zod input validation — no unvalidated `req.body` or `req.query`.
- CSP headers enforced in `next.config.js` and `middleware.ts`.

### V.5 Patch Management (CVE-2026-4747 Informed)

- **Critical CVEs:** Patched within 24 hours of disclosure. Not 60 days — 24 hours.
- **High CVEs:** Patched within 72 hours.
- Dependency updates for security advisories are **P0 incidents** — same SLA as production outages.
- Any new network-facing endpoint MUST include threat analysis in PR description.
- `npm audit --audit-level=high` runs in CI and blocks merges on failure.
- All GitHub Actions pinned to commit SHA (not tags) to prevent supply chain attacks.

### V.6 Incident Classification

| Severity | Definition | Response SLA | Examples |
|----------|-----------|-------------|----------|
| **P0 — Critical** | Active data breach, PHI exposure, auth bypass | 15 min acknowledge, 1 hour contain | Leaked PHI, SQL injection in prod, auth bypass |
| **P1 — High** | Vulnerability in prod, failed security scan | 1 hour acknowledge, 24 hour fix | Critical CVE in dependency, secrets in logs |
| **P2 — Medium** | Security misconfiguration, missing validation | 4 hours acknowledge, 72 hour fix | Missing rate limit, CSP bypass, weak CORS |
| **P3 — Low** | Security improvement, hardening opportunity | Next sprint | Dependency update, header improvement |

---

## VI. CODING STANDARDS

### VI.1 TypeScript

- **Strict mode everywhere.** `"strict": true` in all tsconfig files.
- **No `any`.** Use `unknown` + type guards. No `@ts-ignore` or `@ts-expect-error` without linked issue.
- **No type assertions** (`as Type`) unless provably safe with a comment explaining why.
- Prefer `readonly` properties, `const` declarations, and `Object.freeze` for config objects.
- Use discriminated unions over boolean flags for state machines.

### VI.2 File Organization

- **File naming:** `kebab-case.ts` for modules, `PascalCase.tsx` for React components.
- **Maximum file length:** 300 lines. Split into focused modules if longer.
- **Imports:** Group as: (1) node built-ins, (2) external packages, (3) internal `@/` aliases, (4) relative.
- **Barrel exports:** Only at package boundaries. Never re-export within `src/`.

### VI.3 Error Handling

- **Never swallow errors.** Every `catch` must log with context or re-throw.
- Use structured error types: `AppError`, `ValidationError`, `AuthorizationError`.
- API routes return consistent error shape: `{ error: string, code: string, details?: unknown }`.
- Database errors: catch Prisma-specific codes (`P2002` unique, `P2025` not found) — never expose raw DB errors to clients.

### VI.4 Functions & Documentation

- All exported functions MUST have JSDoc with `@param` and `@returns`.
- Internal functions: JSDoc only where logic is non-obvious.
- Prefer pure functions. Side effects isolated to service layer boundaries.
- Maximum function parameters: 3. Use options object for more.

### VI.5 Immutability & Data Patterns

- Prefer `map`/`filter`/`reduce` over mutation loops.
- Never mutate function arguments. Clone first if transformation needed.
- Database results: treat as readonly. Transform into DTOs at service boundary.
- Config objects: `Object.freeze()` or `as const`.

---

## VII. TESTING MANDATES

### VII.1 Coverage Thresholds

```
Branches:   80%
Functions:  80%
Lines:      80%
Statements: 80%
```

CI blocks merge if any threshold drops below 80%.

### VII.2 Required Test Types

| Category | Requirement | Runner |
|----------|------------|--------|
| **Unit tests** | Every service, utility, and pure function | Jest |
| **API integration tests** | Every API route (happy path + error cases) | Jest + supertest |
| **Accessibility tests** | Every patient-facing page (WCAG 2.1 AA) | Playwright + AxeBuilder |
| **E2E tests** | All critical user flows (login, prescribe, encounter, export) | Playwright |
| **Visual regression** | All patient-facing pages | Playwright screenshots |
| **Security tests** | Every auth/data endpoint (OWASP Top 10) | Jest (see `__tests__/rbac-isolation.test.ts`) |
| **Load tests** | API endpoints under concurrent load | k6 |

### VII.3 Test Patterns

```typescript
// Jest mocking order — ALWAYS this sequence:
jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: Function) => handler,
}));
// THEN require/import modules that use the mocked dependency
const { handler } = require('../route');
```

- `$transaction` mocks: define in `jest.mock` factory, expose via `_test` props, OR set via `prisma.$transaction.mockImplementation` in `beforeEach`.
- Never use `any` in test types — use `as unknown as MockType` pattern.
- Test file co-location: `__tests__/` directory alongside the module under test.

---

## VIII. AGENT DELEGATION RULES

### VIII.1 Routing

| Change Type | Delegation | Required Checks |
|-------------|-----------|-----------------|
| Backend API routes | Sub-agent with Fastify/Next.js API context | Zod validation + integration test |
| Database schema | ALWAYS review schema diff before `prisma db push` | Backward compat check |
| Security (auth, encryption, PHI) | **Human review required** — cannot auto-merge | Full test suite + security scan |
| Frontend components | Check TypeScript + lint + visual regression | Accessibility audit |
| CI/CD workflows | Validate YAML syntax + dry-run where possible | No `--dangerously-skip-permissions` |
| Clinical logic (`engine.ts`, safety rules) | ELENA veto authority (Rank 2) | Deterministic-only check |

### VIII.2 Veto System (Inherited from MEGATRON)

- **RUTH** (Legal, Rank 1): Blocks anything violating LGPD/HIPAA/ANVISA.
- **ELENA** (Clinical, Rank 2): Blocks non-deterministic clinical logic.
- **CYRUS** (Security, Rank 2): Blocks PHI exposure, auth bypass, unencrypted storage.

Veto format:
```
[VETO — <RUTH|ELENA|CYRUS>] | invariant: <rule> | action: <what was attempted> | fix: <required change>
```

### VIII.3 Context Handoff

- Handoffs between agents: file paths + 1-paragraph summaries, not full contents.
- More than 5 files needed: synthesize to `.scratchpad/`, hand off pointer.
- Every `Write`/`Edit` to `src/` or `apps/` MUST be preceded by `[ACTIVATING: <PERSONA>]`.

---

## IX. PR & COMMIT CONVENTIONS

### IX.1 Commit Format

```
<type>(<scope>): <description>

<body — 3 sentences: what, how, why>

Co-Authored-By: <agent> <email>
```

**Types:** `feat` | `fix` | `docs` | `test` | `refactor` | `perf` | `security` | `chore`

**Scopes:** `api` | `web` | `auth` | `prisma` | `ci` | `sidecar` | `billing` | `cdss` | `i18n` | `a11y`

### IX.2 PR Requirements

Every PR must include:
1. **Summary** — 1-3 bullet points of what changed and why.
2. **Test plan** — Bulleted checklist of how to verify.
3. **Security impact** — Does this touch auth, PHI, encryption, or network exposure? If yes, describe threat model.
4. **Migration notes** — Any database, env var, or config changes needed.

### IX.3 Branch Protection

- No force pushes to `main` or `develop`.
- PRs touching security-critical paths (`auth/`, `encryption/`, `phi/`, `middleware.ts`) require **2 approvers**.
- All CI checks must pass before merge.
- Deploy only from signed commits on protected branches.

### IX.4 Git Safety (Agent-Enforced)

- **NEVER** `git push` — human only.
- **NEVER** commit without passing `pnpm test` (exit 0).
- `--no-verify` ONLY permitted for non-code commits (gitignore, docs cleanup) — never for `src/` or `apps/`.
- **NEVER** commit `console.log`, hardcoded secrets, dead code, or TODO markers.
- 3 consecutive test failures → **CIRCUIT BREAKER** — halt and await human.

---

## X. SCRATCHPAD & OUTPUT CONVENTIONS

- `.scratchpad/` at repo root — gitignored, ephemeral. Write outputs > 200 lines here.
- Move persistent output to `src/` or `docs/`.
- Do not inline > 50-line files in responses; summarize + reference by path.
