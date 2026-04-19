# Agent 6 — PHI Route Hardening & AI Output Sanitization

**Branch:** `fix/phi-route-hardening`
**Base:** `main`
**Estimated duration:** 45-60 minutes

---

## PHASE 1 — GROUND (Read before writing a single line)

You are hardening a Brazilian clinical healthcare platform (EHR + AI Scribe + CDS) for a first-clinic pilot launching mid-May 2026. A prior security audit (Agent 5) identified two actionable findings. Your job is to fix them surgically — no refactors, no scope creep.

### Required reading (ingest each file fully before proceeding):

1. **`docs/security/ATTACK-SURFACE-AUDIT.md`** — The audit report. Focus on SEC-01 (unprotected routes) and SEC-02 (AI output injection). Note: the "75 unprotected routes" count is inflated. Many are false positives using legitimate alternative auth patterns.

2. **`docs/security/ROUTE-AUTH-MATRIX.md`** — Every route mapped to its auth function, roles, PII status, and rate limiting. This is your source of truth for which routes need changes.

3. **`apps/web/src/lib/api/middleware.ts`** — The middleware layer. Understand:
   - `createProtectedRoute()` — RBAC + CSRF + audit trail + rate limiting
   - `createPublicRoute()` — Error handling + CORS only, NO auth
   - `requireAuthOrPatientSession()` — Dual-auth for patient portal routes
   - `verifyInternalToken()` — HMAC-based machine-to-machine auth for internal agent/cron routes

4. **`apps/web/src/app/api/scribe/sessions/[id]/finalize/route.ts`** — The AI Scribe finalization route. Lines 219-223 run Presidio de-identification. Lines 315-364 run Zod validation on Claude output. The gap: no HTML/XSS sanitization on SOAP text fields between Claude's response and DB write.

5. **`apps/web/src/lib/security/encryption.ts`** — The `encryptPHIWithVersion` utility. Understand how it works, but do NOT add encryption to routes as part of this task (that's a separate workstream).

6. **`CLAUDE.md`** at project root — Read the Cortex Boardroom protocol. CYRUS (CISO) owns this domain. Understand the veto invariants.

### Classification rules for the 75 "unprotected" routes:

**KEEP as `createPublicRoute` (false positives — do not touch):**
- CDS Hooks discovery endpoints (spec requires public access)
- Webhook receivers that verify signatures in-handler (Stripe, Deepgram, etc.)
- Patient OTP/auth endpoints (pre-authentication by definition)
- Health check / readiness probes

**MIGRATE to `createProtectedRoute` (true positives — fix these):**
- Any route that reads or writes PHI and currently uses `createPublicRoute` with a hand-rolled auth check (e.g., `api/admin/invitations` with its `isAdmin()` function)
- Any route that calls `auth()` or `getSession()` internally but wraps in `createPublicRoute`
- Telemetry/stream endpoints that handle user-specific data

**ADD `verifyInternalToken` guard (cron/job routes):**
- Any `api/jobs/*` or `api/cron/*` route that currently has no auth at all
- Pattern: check `Authorization: Bearer <token>` header against `verifyInternalToken()`, return 401 if invalid

---

## PHASE 2 — PRODUCE

### Task A: Route Hardening (~20-30 routes)

For each route in the ROUTE-AUTH-MATRIX that is marked `Auth Required: No` and `Handles PII: Yes`:

1. Open the route file
2. Classify it using the rules above (false positive vs. true positive)
3. If true positive, migrate from `createPublicRoute` to `createProtectedRoute` with appropriate `roles` array
4. If it's a cron/job route, add `verifyInternalToken` check instead
5. Update the route's test file to mock `createProtectedRoute` instead of `createPublicRoute`

**Specific fixes required:**

```
api/admin/invitations/route.ts
  - REMOVE: hand-rolled isAdmin() function
  - REPLACE: createPublicRoute → createProtectedRoute({ roles: ['ADMIN'] })
  - UPDATE: all 3 handlers (GET, POST, DELETE)

api/telemetry/stream/route.ts
  - REPLACE: createPublicRoute → createProtectedRoute (no role restriction, any authenticated user)
  - REMOVE: manual auth() call inside handler (redundant once middleware handles it)

api/jobs/*/route.ts (all job routes)
  - ADD: verifyInternalToken check at top of handler
  - RETURN: 401 if token invalid
  - Pattern already exists in the codebase — grep for verifyInternalToken usage examples
```

### Task B: AI Output Sanitization

Create a new utility: `apps/web/src/lib/security/sanitize-ai-output.ts`

```typescript
/**
 * Sanitize AI-generated clinical text before database persistence.
 * Strips HTML tags, script injections, and markdown-based XSS vectors
 * while preserving clinical formatting (bullet points, numbered lists, line breaks).
 */
export function sanitizeAIOutput(text: string): string {
  // 1. Strip all HTML tags
  // 2. Remove javascript: protocol URIs
  // 3. Remove data: URIs (except plain text)
  // 4. Strip event handler attributes (onerror, onload, etc.)
  // 5. Preserve markdown structure (bullets, numbered lists, headers)
  // 6. Return cleaned text
}
```

Then integrate it in the finalize route, between Claude's response parsing and Zod validation (around line 318):

```typescript
// After generateSOAPNote returns, before CreateSOAPNoteSchema.parse:
soapNote.subjective = sanitizeAIOutput(soapNote.subjective);
soapNote.objective = sanitizeAIOutput(soapNote.objective);
soapNote.assessment = sanitizeAIOutput(soapNote.assessment);
soapNote.plan = sanitizeAIOutput(soapNote.plan);
soapNote.chiefComplaint = sanitizeAIOutput(soapNote.chiefComplaint || '');
```

### Task C: Write Tests

For the sanitization utility:
- Test that HTML tags are stripped: `<script>alert('xss')</script>` → `alert('xss')`
- Test that markdown is preserved: `## Assessment\n- Finding 1\n- Finding 2` → unchanged
- Test that javascript: URIs are removed
- Test empty string and null safety
- Test that clinical abbreviations and special characters survive: `BP: 120/80 mmHg`, `SpO₂: 98%`, `HbA1c < 7%`

For the route migrations:
- Verify that previously-public routes now return 401 without a valid session
- Verify that cron routes return 401 without a valid internal token

---

## PHASE 3 — CONSTRAIN

### What you must NOT do:
- Do NOT touch routes classified as false positives (webhooks, CDS discovery, health checks, patient auth)
- Do NOT add `encryptPHIWithVersion` calls — that's a separate workstream
- Do NOT modify the Prisma schema
- Do NOT change the `createProtectedRoute` or `createPublicRoute` middleware signatures
- Do NOT install new npm packages — use string manipulation for sanitization, not DOMPurify (server-side, no DOM)
- Do NOT modify any route's business logic — only change the auth wrapper
- Do NOT use `--no-verify` when committing

### Pre-commit gates:
- `pnpm test` must pass (exit code 0) before committing
- `git diff --staged` must contain zero `console.log`, hardcoded secrets, or TODO markers
- Commit message: Conventional Commits format, 3-sentence body

### CYRUS veto invariants (do not violate):
- Every route that accesses PHI must use `createProtectedRoute` RBAC guard
- Cross-tenant data access requires `verifyPatientAccess()` (don't remove existing checks)
- PII fields must use `encryptPHIWithVersion` (don't remove existing encryption)
- Audit trail integrity must be preserved (don't modify AuditLog writes)

---

## PHASE 4 — VERIFY

After all changes:

1. Run `pnpm test` — all tests must pass
2. Run `grep -r "createPublicRoute" apps/web/src/app/api/ --include="*.ts" -l` — review each remaining instance and confirm it's a legitimate false positive
3. Count routes changed and document in commit message
4. Create `docs/security/HARDENING-CHANGELOG.md` with:
   - Routes migrated (with before/after auth function)
   - Routes skipped (with justification)
   - Sanitization utility: what it strips, what it preserves
   - Remaining known gaps for future work

5. Emit the architecture review snapshot:
```
[ARCHITECTURE REVIEW — CYRUS]
type_safety:            <pass | fail>
backward_compatibility: <pass | fail — no breaking API changes?>
kernel_integrity:       <pass | fail — audit chain / RBAC strengthened?>
ci_status:              <tests passing count / total>
```
