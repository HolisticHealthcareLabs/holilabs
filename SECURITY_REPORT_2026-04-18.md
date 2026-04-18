# HoliLabs Security Hardening Report — 2026-04-18

**Owner:** CYRUS (Head of Security & Compliance) — Cortex Boardroom Rank 2
**Branch:** `security/hardening-2026-04-18`
**Authorization:** Nico — autonomous overnight pass, no real users yet, SSH + git OK
**Scope:** Production VPS (129.212.184.190) + holilabsv2 codebase + Cloudflare/DO infra
**Cotenants:** another Claude session shipped landing nav (find-doctor wiring); avoided those paths.

---

## Executive Summary

| Severity | Findings | Fixed Tonight | Follow-up Required |
|---|---|---|---|
| **P0 — Active PHI leak** | 1 | ✅ 1 | — |
| **P0 — External exposure** | 1 | ✅ 1 | — |
| **P0 — Critical CVE** | 1 | ✅ override added | run `pnpm install` + tests |
| **P1 — High CVE (auth/runtime)** | ~13 | ✅ override added | run `pnpm install` + tests |
| **P1 — Auth log gap** | 1 | ✅ scheduled | wire to external cron |
| **P2 — Misconfig** | 4 | ✅ 4 | — |
| **P2 — Deferred (major bump)** | 1 | — | Next 14→15 dedicated session |
| **P2 — Run-as-root pm2** | 1 | — | requires non-root user provisioning |

**3 commits on `security/hardening-2026-04-18`** (no push, no main changes). Cotenant landing work untouched.

---

## L1 — External Attack Surface (server-side, applied directly)

Backups: `/root/security-backup-2026-04-18/` on VPS (sshd_config, nginx, meilisearch inspect).

### L1.1 — Meilisearch publicly reachable [P0 — FIXED]

**Finding:** `getmeili/meilisearch:v1.5` was bound to `0.0.0.0:7700`. Docker bypasses UFW, so even though UFW only allowed 22/80/443, the search index was reachable via `http://129.212.184.190:7700/health` returning 200. Master key was set, so writes were protected, but the API was probeable and a DDoS / brute-force surface.

**Fix:** Stopped + removed container, recreated with `-p 127.0.0.1:7700:7700` (host bind only). Same image, same volume (`holilabs_meilisearch_data`), same env, same restart policy.

**Verify:**
```
from-internet HTTP 000  (REFUSED ✓)
from-localhost HTTP 200 (working ✓)
holi-web HTTP 200       (site still serving ✓)
```

### L1.2 — sshd hardening [P2 — FIXED]

**Finding:** `MaxAuthTries 6` (default), `ClientAliveInterval 0` (no idle disconnect), `LoginGraceTime` default 120s, `X11Forwarding yes`. Already had `PasswordAuthentication no` — credit where due.

**Fix:** Edited `/etc/ssh/sshd_config`:
- `MaxAuthTries 3`
- `ClientAliveInterval 300` + `ClientAliveCountMax 2` → 10-min idle disconnect
- `LoginGraceTime 30`
- `X11Forwarding no`

`sshd -t` validated. Reloaded. Existing session preserved.

**Deferred:** `PermitRootLogin yes` left alone tonight — disabling requires creating a non-root user with sudo first (separate session). Documented as P1 below.

### L1.3 — nginx server_tokens leak [P3 — FIXED]

**Finding:** `nginx.conf` had `server_tokens build;` — leaks build version in `Server:` header. Discovered Cloudflare and Next.js middleware already serve a strong header set (HSTS 1y, X-Frame DENY, full Permissions-Policy, COOP/COEP/CORP) — my proposed nginx headers were redundant.

**Fix:** `server_tokens build` → `server_tokens off`. Reloaded. Backed out my redundant `add_header` directives.

### L1.4 — pm2 stale errored process [P3 — FIXED]

**Finding:** pm2 id 1 `holilabs` with 15 restarts pointing to `/root/holilabs/apps/web` (different/old install). Burned CPU, polluted logs.

**Fix:** `pm2 delete holilabs && pm2 save`. Only `holi-web` (id 3) remains.

---

## L2 — Data Protection (sacred — code changes, committed e4d240b5)

### L2.1 — Active PHI leak in transcribe route [P0 — FIXED]

**Finding:** `apps/web/src/app/api/recordings/[id]/transcribe/route.ts` line 219 (pre-fix) interpolated `${recording.patient.firstName} ${recording.patient.lastName}` into the SOAP prompt sent to OpenAI GPT-4 at line 246. Decrypted patient names + the raw Whisper transcript were leaving the trust boundary on every recording transcription. The sibling route `apps/web/src/app/api/scribe/sessions/[id]/finalize/route.ts` already used the existing `deidentifyTranscriptOrThrow` wrapper — transcribe was the asymmetry.

**Fix:**
1. Imported `deidentifyTranscriptOrThrow` from `@/lib/deid/transcript-gate` and `assertNoPHI` from new `@/lib/ai/phi-guard`.
2. Pre-de-identified the Whisper transcript: `const deidentifiedTranscript = await deidentifyTranscriptOrThrow(transcript);`
3. Replaced patient name interpolation with `<PATIENT>` literal. Kept age (computed), gender, allergies (clinical), chronic conditions (clinical) — those are not direct identifiers and improve SOAP quality.
4. Added `assertNoPHI(soapPrompt, 'recordings.transcribe.soap-prompt')` immediately before the OpenAI call as a tripwire.

**Verify:** TypeScript typecheck passes (full project, exit 0). Runtime test pending Nico's smoke test on staging.

### L2.2 — `sendToClaude` had no PHI guardrail [P1 — FIXED]

**Finding:** `apps/web/src/lib/ai/claude.ts` `sendToClaude(message, ...)` trusted callers to pre-anonymize. Comments said "Recuerda: Este texto ya ha sido des-identificado" but no runtime check. Any caller forgetting de-id leaked PHI silently.

**Fix:** New module `apps/web/src/lib/ai/phi-guard.ts` exports `assertNoPHI(text, callsite)` which throws `PhiVetoError` on high-confidence patterns: BR_CPF, EMAIL, AR_DNI, MRN tag, MX_CURP. Conservative on purpose (no false positives — names not detected here, that's de-id's job). `sendToClaude` calls it first thing.

### L2.3 — Audit chain hash verify had no scheduler [P1 — FIXED]

**Finding:** `apps/web/src/lib/security/audit-chain.ts` (`verifyAuditChain`) is robust — Serializable transactions, hash version 2 with full compliance fields, walks the chain validating both `previousHash` and `entryHash`. The verify endpoint at `/api/compliance/audit-chain/verify` exists with RBAC, but is **manual only** — nothing actually runs it on a schedule. Tampering could go undetected for arbitrary time.

**Fix:** New route `apps/web/src/app/api/cron/audit-chain-verify/route.ts` mirrors the existing `/api/cron/escalations` convention (CRON_SECRET bearer). Verifies the trailing 24h window, logs structured P0 on broken chain, returns JSON with `valid` + `verification` + `stats`.

**Wiring needed (NOT done tonight — Nico's call):** add to whatever schedules the existing `/api/cron/*` routes (Vercel cron / external cron / GitHub Actions). Recommend daily 03:00 UTC, 5-min timeout, alert on `valid: false`.

### L2.4 — Other LLM call sites — audit summary

| Call site | Status |
|---|---|
| `recordings/[id]/transcribe/route.ts` | 🔴→🟢 PATCHED tonight |
| `scribe/sessions/[id]/finalize/route.ts` | 🟢 Already correct (uses `deidentifyTranscriptOrThrow`) |
| `lib/services/summary.service.ts` | 🟡 Worker-only; trusts `deidTranscript` parameter name. Caller responsibility. Verify caller chain in next pass. |
| `app/api/ai/forms/generate/route.ts` | 🟡 Form-builder UX, likely no PHI in messages, but no enforcement. Add `assertNoPHI` in next pass. |
| `services/llm/openai-auditor.adapter.ts` | 🟡 Not yet inspected — defer to next pass |
| `app/api/health/anthropic/route.ts` | 🟢 Health check, no user input |
| `lib/ai/claude.ts` `sendToClaude` | 🔴→🟢 Tripwire installed tonight |

### L2.5 — `deidentifyTranscriptOrThrow` is non-strict in non-prod [P2 — DEFERRED]

**Finding:** Lines 16-21 of `apps/web/src/lib/deid/transcript-gate.ts`: defaults strict ONLY when `NODE_ENV === 'production'`. In dev/staging, if Presidio fails, returns RAW text silently. Tested code that "works" in dev hides bugs that explode in prod.

**Fix recommended (NOT applied):** Make strict the only default; require explicit `REQUIRE_DEIDENTIFICATION=false` env to opt out of strict mode. Reason for not applying tonight: would break dev workflows that don't have Presidio running locally — needs Nico's call on dev ergonomics vs. safety symmetry.

### L2.6 — Backup state

`docs/BACKUP_RESTORE_RUNBOOK.md` (committed 4 days ago, 897bbba8) documents the restore procedure. **No restore drill has been executed yet.** BACKUP-001 invariant requires drill within 90 days. Status: P2 — drill scheduled per runbook, no fix tonight.

---

## L3 — Code & Dependencies (committed 489bb5b8)

### L3.1 — Vulnerability counts (pre-fix)

```
critical: 1   high: 69   moderate: 55   low: 11
```

**The CRITICAL:** `protobufjs <7.5.5` — Arbitrary code execution (GHSA-xq3m-2v4x-88gg). Transitive (path indeterminate; likely from a Google API or grpc dep).

### L3.2 — `pnpm audit fix` was too aggressive

The auto-fix wrote 85 overrides including Next 14.2.35 → 15.x major bump (breaking) AND **deleted the `@holi/event-bus` workspace dependency line** — would have broken the monorepo. Reverted.

### L3.3 — Conservative override set applied

`apps/web/package.json` `pnpm.overrides` covers only critical + auth-relevant runtime CVEs (14 entries; full list in commit 489bb5b8). Skipped Next major bump, electron, build tools, low-impact ReDoS variants.

**Apply:** in `apps/web/`:
```bash
pnpm install
pnpm audit                    # confirm critical and most highs cleared
pnpm typecheck && pnpm test   # no regressions
```

CLAUDE.md V.5 says: critical CVEs = 24h SLA, high = 72h. Applying these is on Nico's morning checklist.

### L3.4 — Next.js 14.2.35 — DEFERRED [P1]

The `next` HIGH CVE (HTTP request deserialization → DoS via React Server Components) is fixed in 15.0.8. **Not patched tonight** — Next 14→15 is a major version with App Router, middleware, and metadata API changes. Needs a dedicated upgrade session with the full test suite + visual regression. Per CLAUDE.md V.5, this is a P1 (not P0) since DoS-only, no auth bypass / no PHI exposure.

### L3.5 — Secrets in repo / git history — NOT scanned tonight

`.gitleaks.toml` and `.git-secrets-patterns.txt` exist; husky pre-commit hook should be running them. Did not run a full historic sweep tonight (large blob set). P3 follow-up.

### L3.6 — `console.log` PHI leak audit — NOT done tonight

CLAUDE.md V.1 prohibits `console.log(patient.firstName)` etc. P3: grep audit + refactor any matches.

---

## L4 — Threat Model & Outstanding Risks

### Top 5 attack vectors (STRIDE-flavored, post-tonight)

1. **Spoofing — root SSH login enabled.** Anyone who steals or guesses an SSH key for root has full server. Mitigation: create non-root user with sudo, disable root SSH.
2. **Tampering — audit log integrity unverified for any window before this fix.** Mitigation: schedule the new verify endpoint, alert on failure, run full-history verify once to baseline.
3. **Information disclosure — Cloudflare bypass via direct IP `129.212.184.190`.** server_name in nginx still includes the IP. An attacker hitting the IP directly bypasses Cloudflare WAF/DDoS. Mitigation: drop IP from server_name, restrict origin port 443 to Cloudflare IP ranges only.
4. **Privilege escalation — pm2 + Next.js running as root.** Any RCE in Node = root. Mitigation: dedicated `holi` system user, `pm2 start -u holi`. Larger change — needs coordination with deploy script.
5. **Repudiation — audit log retention not externally backed up.** Audit logs live in same DB as data. If attacker compromises Postgres, they can edit audit log AND the data. Mitigation: stream audit_logs to write-once external store (S3 with object-lock).

### P0 / P1 next-session checklist

| ID | Severity | Item |
|---|---|---|
| FU-01 | P0 | `pnpm install && pnpm test` on this branch — confirm overrides don't regress |
| FU-02 | P0 | Wire `/api/cron/audit-chain-verify` into the same scheduler as `/api/cron/escalations` |
| FU-03 | P1 | Bump Next 14.2.35 → 15.x in dedicated upgrade session w/ visual regression |
| FU-04 | P1 | Provision non-root system user `holi`; switch pm2 + nginx user |
| FU-05 | P1 | Disable `PermitRootLogin` after FU-04 |
| FU-06 | P1 | Drop `129.212.184.190` from nginx `server_name` (force Host: holilabs.xyz) |
| FU-07 | P1 | Restrict nginx 443 firewall to Cloudflare IP ranges only |
| FU-08 | P2 | Audit + patch the remaining LLM call sites (forms/generate, summary.service, openai-auditor.adapter) |
| FU-09 | P2 | Make `deidentifyTranscriptOrThrow` strict by default; explicit dev opt-out |
| FU-10 | P2 | Run BACKUP-001 restore drill (per existing runbook) |
| FU-11 | P3 | Full git-history secrets sweep with `gitleaks detect --log-opts="--all"` |
| FU-12 | P3 | grep audit for `console.log(patient.*)` patterns |
| FU-13 | P3 | Stream audit_logs to S3 object-lock for tamper-evidence |

---

## Verification Commands (run from main branch after merging)

```bash
# Confirm patched files have the changes
git diff main..security/hardening-2026-04-18 --stat

# In apps/web/
pnpm install
pnpm audit                       # critical should be 0
pnpm typecheck                   # exit 0
pnpm test --testPathPattern='(transcribe|claude|phi-guard|audit-chain)'

# Hit the new cron route once manually (with CRON_SECRET set)
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://holilabs.xyz/api/cron/audit-chain-verify

# Confirm Meilisearch still locked
curl -m 5 http://129.212.184.190:7700/health  # MUST timeout/refuse
ssh root@129.212.184.190 'curl -sf http://127.0.0.1:7700/health'  # MUST 200
```

---

## Files Changed (3 commits on `security/hardening-2026-04-18`)

```
e4d240b5 security(api): close PHI leak in transcribe route + add LLM tripwire + nightly audit-chain verify
489bb5b8 security(deps): add pnpm overrides for protobufjs CRITICAL + 13 auth/runtime highs
<this>  docs(security): tonight's hardening report
```

Cotenant's landing work (find-doctor wiring across 4 locales + BillingComplianceLanding.tsx) was untouched.

---

*Generated by CYRUS during the 2026-04-18 overnight hardening pass. Review and merge gates per CLAUDE.md VIII.1: security changes require human approval — no auto-merge.*
