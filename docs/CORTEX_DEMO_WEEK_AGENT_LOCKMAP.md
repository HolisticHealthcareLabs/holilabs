# Cortex Demo Week Agent Lockmap

**Week target:** Demo-ready by end of week  
**Owner:** Product Lead  
**Version:** 1.0

---

## 1) Objective

Deliver a reliable end-to-end demo flow without agent collisions:
1. Dose validation runs deterministically.
2. Missing/stale renal data triggers attestation-required state.
3. Override requires reason + logs governance event context.
4. Console shows filter-aware KPI shell and metric definitions.
5. Reminder flow is consent-gated and emits lifecycle telemetry.

---

## 2) Lock Map (No-Overlap Rule)

Each lane owns only its file scope. No cross-lane edits this week.

| Lane | FR IDs | Owner Agent | File Scope (ONLY) |
|------|--------|-------------|-------------------|
| A - Safety Engine | FR-A1, FR-A2 | Builder A | `apps/web/src/app/api/clinical/primitives/validate-dose/route.ts`, `apps/web/src/lib/clinical/lab-decision-rules.ts`, `apps/web/src/config/clinical-rules.ts` |
| B - Governance Override | FR-A3, FR-A4 | Builder B | `apps/web/src/components/governance/OverrideForm.tsx`, `apps/web/src/app/api/governance/event/route.ts`, `apps/web/src/lib/governance/shared-types.ts`, `apps/web/src/lib/socket/events.ts` |
| C - Console Shell | FR-B1, FR-B2 | Builder C | `apps/web/src/app/dashboard/console/page.tsx`, `apps/web/src/app/api/telemetry/stream/route.ts`, `apps/web/src/app/api/governance/manifest/route.ts` |
| D - Reminder Lifecycle | FR-C1, FR-C2, FR-C3 | Builder D | `apps/web/src/app/api/reminders/send/route.ts`, `apps/web/src/lib/notifications/reminder-policy.ts`, `apps/web/src/lib/notifications/appointment-reminders.ts`, `apps/web/src/lib/consent/reminder-service.ts` |

---

## 3) Model Assignment by Lane

| Lane | GPT | Gemini | Anthropic | Why |
|------|-----|--------|-----------|-----|
| A | GPT-5.3 Codex High | Pro | Sonnet | Clinical logic + deterministic behavior |
| B | GPT-5.3 Codex High | Pro | Sonnet | Safety governance and strict typing |
| C | GPT-5.3 Codex Fast | Flash | Haiku (or Sonnet) | UI/filter wiring and KPI shell |
| D | GPT-5.3 Codex High | Pro | Sonnet | Consent + lifecycle + retry/escalation |
| Verifier | GPT-5.3 Codex High | Pro | Sonnet | Cross-lane regression and scope policing |

---

## 4) Demo Acceptance Commands (Global)

Run after each lane merge and at final integration:

```bash
pnpm -C apps/web typecheck
```

Optional sanity checks (manual):
- Open `/dashboard/console` and verify filters render.
- Trigger `validate-dose` with missing renal context and verify `attestation_required`.
- Submit override without reason (must fail) and with reason (must pass).
- Trigger reminder send with and without consent and verify behavior.

---

## 5) Merge Protocol (Strict)

1. Merge order: **B -> A -> C -> D**.
2. After each merge, run `pnpm -C apps/web typecheck`.
3. If fail:
   - rollback merge candidate (or fix immediately within same lane scope),
   - do not proceed to next lane.
4. Verifier signs off after all four lanes.

---

## 6) Day-by-Day Plan (Demo Week)

## Day 1 (today)
- Freeze lane scopes and launch builders A/B/C/D.
- Require each builder to return:
  - files changed
  - acceptance criteria pass/fail
  - typecheck result
  - risks/blockers

## Day 2
- Merge B then A.
- Run integration checks for safety + governance path.
- Patch any contract mismatches (`attestation_required` handling).

## Day 3
- Merge C then D.
- Run consent/lifecycle checks and console sanity pass.

## Day 4
- Verifier pass + defect burn-down.
- Freeze scope; no new features.

## Day 5 (demo day)
- Run final scripted demo path.
- Export board scorecard snapshot.
- Prepare fallback script if one lane degrades.

---

## 7) Demo Script (Single Path)

1. Open console and show selected country/site/unit filter.
2. Run dose check with missing renal input -> see attestation required.
3. Submit attestation and proceed.
4. Trigger override flow:
   - without reason -> blocked
   - with reason -> accepted
5. Show governance event entry and metric shell.
6. Trigger reminder send:
   - no consent -> blocked
   - consent present -> sent/success or fail/escalation lifecycle event

---

## 8) Hard Rules for Agents

- No editing outside allowed paths.
- No renaming unrelated symbols or components.
- No copy/branding changes unless requested.
- No schema changes outside lane scope.
- If blocked, return `BLOCKED:` with exact file + reason.

---

## 9) FR Traceability Stub

| FR ID | Lane | Branch | Status | Test Result |
|-------|------|--------|--------|-------------|
| FR-A1 | A |  |  |  |
| FR-A2 | A |  |  |  |
| FR-A3 | B |  |  |  |
| FR-A4 | B |  |  |  |
| FR-B1 | C |  |  |  |
| FR-B2 | C |  |  |  |
| FR-C1 | D |  |  |  |
| FR-C2 | D |  |  |  |
| FR-C3 | D |  |  |  |

