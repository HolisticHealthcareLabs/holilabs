# Cortex Demo Week - Final Integration Runbook

**Role:** Agent 6 (Integrator)  
**Priority:** Friday demo reliability over feature breadth  
**Reference docs:** `docs/CORTEX_DEMO_WEEK_AGENT_LOCKMAP.md`, `docs/CORTEX_PRODUCT_REQUIREMENTS_DOC_V1.md`, `docs/CORTEX_DELIVERY_BACKLOG_V1.md`, `docs/CORTEX_ROADMAP_STATUS_TRACKER.md`
**Rerun mode:** Final Integrator rerun (latest available repo artifacts)

---

## 1) Final Merge Runbook

### 1.0 Command bootstrap (set once)

```bash
BASE_BRANCH="main"
INTEGRATION_BRANCH="integration/cortex-demo-week-$(date +%Y%m%d-%H%M)"

# Set these to the verified lane branches from Agent 1-4 outputs.
# Keep defaults if your branch names follow this convention.
BR_B="${BR_B:-lane/b-governance-override}"
BR_A="${BR_A:-lane/a-safety-engine}"
BR_C="${BR_C:-lane/c-console-shell}"
BR_D="${BR_D:-lane/d-reminder-lifecycle}"

git fetch origin --prune
git checkout -b "$INTEGRATION_BRANCH" "origin/$BASE_BRANCH"
```

### 1.1 Locked merge order

`B -> A -> C -> D`

This order preserves safety and governance contract stability before shell/UI and reminder lifecycle additions.

Assumption for rerun:
- If verifier rerun does not explicitly override merge order, keep `B -> A -> C -> D`.

---

### 1.2 Lane B merge (Governance Override)

#### Pre-merge checks

```bash
# Scope check (lock map compliance)
if [ -n "$(git diff --name-only "origin/$BASE_BRANCH...origin/$BR_B" | rg -v '^(apps/web/src/components/governance/OverrideForm.tsx|apps/web/src/app/api/governance/event/route.ts|apps/web/src/lib/governance/shared-types.ts|apps/web/src/lib/socket/events.ts)$' || true)" ]; then
  echo "STOP: Lane B scope violation"
  exit 1
fi

# Contract check: reason codes and validator present
git show "origin/$BR_B:apps/web/src/lib/governance/shared-types.ts" | rg "OVERRIDE_REASON_CODES|isOverrideReasonCode"
git show "origin/$BR_B:apps/web/src/app/api/governance/event/route.ts" | rg "Override requires a valid reason code"
```

#### Merge action

```bash
git merge --no-ff "origin/$BR_B" -m "Merge Lane B governance override"
```

#### Post-merge checks

```bash
pnpm -C apps/web typecheck
```

#### Stop condition + remediation strategy

- Stop if any of:
  - scope violation detected,
  - typecheck fails,
  - override reason enforcement removed/regressed.
- Remediation:
  - `git checkout -b "remediation/lane-b-$(date +%Y%m%d-%H%M)"`,
  - fix only Lane B owned files,
  - rerun `pnpm -C apps/web typecheck`,
  - merge remediation branch before continuing.

---

### 1.3 Lane A merge (Safety Engine)

#### Pre-merge checks

```bash
if [ -n "$(git diff --name-only "origin/$BASE_BRANCH...origin/$BR_A" | rg -v '^(apps/web/src/app/api/clinical/primitives/validate-dose/route.ts|apps/web/src/lib/clinical/lab-decision-rules.ts|apps/web/src/config/clinical-rules.ts)$' || true)" ]; then
  echo "STOP: Lane A scope violation"
  exit 1
fi

git show "origin/$BR_A:apps/web/src/app/api/clinical/primitives/validate-dose/route.ts" | rg "attestation_required|requiresAttestation|rulesetVersion|protocol"
git show "origin/$BR_A:apps/web/src/lib/clinical/lab-decision-rules.ts" | rg "assessRenalDataQuality"
```

#### Merge action

```bash
git merge --no-ff "origin/$BR_A" -m "Merge Lane A deterministic safety engine"
```

#### Post-merge checks

```bash
pnpm -C apps/web typecheck
```

#### Stop condition + remediation strategy

- Stop if any of:
  - no `attestation_required` gate path,
  - deterministic context fields removed,
  - typecheck fails.
- Remediation:
  - `git checkout -b "remediation/lane-a-$(date +%Y%m%d-%H%M)"`,
  - preserve deterministic + attestation contract first,
  - defer non-critical cosmetics.

---

### 1.4 Lane C merge (Console Shell)

#### Pre-merge checks

```bash
if [ -n "$(git diff --name-only "origin/$BASE_BRANCH...origin/$BR_C" | rg -v '^(apps/web/src/app/dashboard/console/page.tsx|apps/web/src/app/api/telemetry/stream/route.ts|apps/web/src/app/api/governance/manifest/route.ts)$' || true)" ]; then
  echo "STOP: Lane C scope violation"
  exit 1
fi

git show "origin/$BR_C:apps/web/src/app/dashboard/console/page.tsx" | rg "country|site|unit|date|metricDefinitions"
git show "origin/$BR_C:apps/web/src/app/api/governance/manifest/route.ts" | rg "metricDefinitions|filters"
```

#### Merge action

```bash
git merge --no-ff "origin/$BR_C" -m "Merge Lane C console shell and filters"
```

#### Post-merge checks

```bash
pnpm -C apps/web typecheck
```

#### Stop condition + remediation strategy

- Stop if any of:
  - filter echo or KPI definition hooks disappear,
  - stream route no longer returns filter-aware payload,
  - typecheck fails.
- Remediation:
  - `git checkout -b "remediation/lane-c-$(date +%Y%m%d-%H%M)"`,
  - restore static KPI shell with definition links + filter echo,
  - postpone non-essential visual changes.

---

### 1.5 Lane D merge (Reminder Lifecycle)

#### Pre-merge checks

```bash
if [ -n "$(git diff --name-only "origin/$BASE_BRANCH...origin/$BR_D" | rg -v '^(apps/web/src/app/api/reminders/send/route.ts|apps/web/src/lib/notifications/reminder-policy.ts|apps/web/src/lib/notifications/appointment-reminders.ts|apps/web/src/lib/consent/reminder-service.ts)$' || true)" ]; then
  echo "STOP: Lane D scope violation"
  exit 1
fi

git show "origin/$BR_D:apps/web/src/lib/notifications/reminder-policy.ts" | rg "evaluateReminderConsent|buildReminderLifecycleEvent|DEFAULT_REMINDER_RETRY_POLICY"
git show "origin/$BR_D:apps/web/src/app/api/reminders/send/route.ts" | rg "consentDecision|stage: 'fail'|stage: 'success'|stage: 'escalation'"
```

#### Merge action

```bash
git merge --no-ff "origin/$BR_D" -m "Merge Lane D reminder lifecycle and consent gate"
```

#### Post-merge checks

```bash
pnpm -C apps/web typecheck
pnpm -C apps/web exec tsx -e "import { evaluateReminderConsent } from './src/lib/notifications/reminder-policy'; const blocked=evaluateReminderConsent({channel:'SMS',category:'appointment',preferences:{smsEnabled:true,smsAppointments:true},activeConsentTypes:[]}); const allowed=evaluateReminderConsent({channel:'SMS',category:'appointment',preferences:{smsEnabled:true,smsAppointments:true,smsConsentedAt:new Date().toISOString()},activeConsentTypes:['APPOINTMENT_REMINDERS']}); console.log(JSON.stringify({blocked,allowed},null,2));"
```

#### Stop condition + remediation strategy

- Stop if any of:
  - no-consent path is not blocked,
  - lifecycle events/retry metadata no longer emitted,
  - typecheck fails.
- Remediation:
  - `git checkout -b "remediation/lane-d-$(date +%Y%m%d-%H%M)"`,
  - keep consent gate + lifecycle event emission,
  - if unstable, disable reminder send path in demo and switch to dry-mode demonstration.

---

### 1.6 Final integration validation (after D)

```bash
pnpm -C apps/web typecheck

# Optional dry-run contract sanity
pnpm -C apps/web exec tsx -e "import { buildReminderLifecycleEvent } from './src/lib/notifications/reminder-policy'; console.log(JSON.stringify(buildReminderLifecycleEvent({stage:'escalation',patientId:'demo-patient',channel:'SMS',templateName:'Demo Reminder',category:'appointment',error:'demo-fallback'}),null,2));"

git status --short
```

---

### 1.7 Branch-safe integration plan (bundled-commit tolerant)

Use this when lane branches contain mixed-scope commits or patch bundles (for example "7/8/9" patches folded into one branch).

#### Strategy A: preferred clean merge

1. Run the lane pre-check scope gate.
2. If all changed files are inside lane ownership, use normal merge (`git merge --no-ff`).
3. Continue only when post-merge `typecheck` is green.

#### Strategy B: scoped cherry-pick remediation for bundled commits

```bash
# Example for Lane C bundled branch
LANE_NAME="C"
LANE_BRANCH="$BR_C"
REM_BRANCH="remediation/lane-${LANE_NAME,,}-scoped-$(date +%Y%m%d-%H%M)"

git checkout -b "$REM_BRANCH"

# List candidate commits from lane branch after base
git log --oneline --reverse "origin/$BASE_BRANCH..origin/$LANE_BRANCH"

# Apply one commit at a time without committing
COMMIT_SHA="<set_from_log>"
git cherry-pick -n "$COMMIT_SHA"

# Keep only allowed lane paths (example: Lane C)
git restore --staged --worktree -- . \
  ':(exclude)apps/web/src/app/dashboard/console/page.tsx' \
  ':(exclude)apps/web/src/app/api/telemetry/stream/route.ts' \
  ':(exclude)apps/web/src/app/api/governance/manifest/route.ts'

# Verify residue is only lane scope
git diff --name-only | rg -v '^(apps/web/src/app/dashboard/console/page.tsx|apps/web/src/app/api/telemetry/stream/route.ts|apps/web/src/app/api/governance/manifest/route.ts)$' && echo "STOP: residue out of scope"
```

If `STOP` appears, abort and re-run with smaller commit slices. Keep all remediations reversible and lane-scoped.

#### Conflict-resolution protocol (minimal risk)

1. **Pause queue:** do not merge next lane while conflict exists.
2. **Prioritize contracts:** deterministic/attestation and override reason enforcement before shell cosmetics.
3. **Resolve only owner paths:** no cross-lane refactors during demo week.
4. **Re-run guard checks:** lane pre-check + `pnpm -C apps/web typecheck`.
5. **Escalate unresolved conflicts:** branch `hotfix/integration-conflict-<timestamp>` and keep fallback demo script ready.

---

### 1.8 Assumptions and unresolved inputs

- No standalone "Agent 5 verifier rerun" artifact was discovered in `docs/` during this rerun.
- No dedicated patch-note docs labeled "7/8/9" were discovered in repo documentation.
- Current plan assumes:
  - lockmap is source of scope truth,
  - merge order remains `B -> A -> C -> D`,
  - verifier status is represented by "no critical blockers" gate in Go/No-Go card.

If a newer verifier rerun file appears, re-run section 1.1 merge order and stop conditions before starting integration.

---

## 2) Demo Script (Presenter Version)

1. **Open the Cortex console and set filters.**  
   "We are looking at one operational slice of the network by country, site, unit, and time window."

2. **Run the deterministic dose safety check.**  
   "For the same clinical inputs, Cortex always returns the same decision and rationale."

3. **Show attestation-required guardrail.**  
   "When critical renal data is missing or stale, completion is blocked until attestation."

4. **Show override governance control.**  
   "An override without a reason is rejected; with a required reason code it is accepted and audited."

5. **Show governance context and KPI shell.**  
   "Governance context and metric definitions remain filter-aware, so leaders can trust what they are seeing."

6. **Show reminder policy branch.**  
   "Without explicit consent, reminders are blocked. With consent, reminder lifecycle events are emitted for traceability."

7. **Close with trust-safe framing.**  
   "Cortex uses deterministic safety logic for critical decisions and produces auditable operational evidence."

Expected visible outcomes:
- Filter chips/selections visible on console.
- Safety check result shows deterministic status and rationale.
- Attestation gate visibly blocks completion.
- Override without reason fails; with reason succeeds.
- Governance context/metrics visible for selected filters.
- Reminder branch clearly shows blocked vs lifecycle-emitted outcomes.

---

## 3) Demo Script (Technical Version)

### 3.1 Console and filter context

- Open `/dashboard/console`.
- Set `country=BO`, `site=Site-A`, `unit=ICU`, `date=24h`.
- Expected:
  - KPI cards render with metric definition hooks,
  - filter context echoed in console narrative and manifest payload.

### 3.2 Deterministic dose check + attestation-required

- Execute deterministic dose check via product flow or route contract (`/api/clinical/primitives/validate-dose`).
- Use DOAC input with missing or stale renal reference.
- Expected:
  - `status = "attestation_required"`,
  - `completionState.canComplete = false`,
  - deterministic metadata includes ruleset version context.

### 3.3 Override required reason

- Submit governance override with empty/invalid reason.
- Expected: HTTP 400 + `"Override requires a valid reason code"`.
- Submit with one valid code from `OVERRIDE_REASON_CODES`.
- Expected: success response + override/governance log event emitted.

### 3.4 Governance context in stream and metrics

- Confirm governance payload includes context fields:
  - `protocolVersion`,
  - `country`,
  - `siteId`.
- Confirm `/api/governance/manifest` returns `filters` echo + `metricDefinitions`.

### 3.5 Reminder flow

- **Case 1 (No consent):**
  - Expected: blocked with explicit reason (`Missing explicit reminder consent...` or channel consent denial),
  - fail/escalation lifecycle payload present in logs/metadata.
- **Case 2 (Consent granted):**
  - Expected: allowed path,
  - lifecycle stages include at least `sent` and either `success` or `fail/escalation` with retry metadata.

---

## 4) Rollback Matrix

| Symptom | Action | Owner | ETA |
|---------|--------|-------|-----|
| Lane D instability (timeouts/errors/noisy failures) | Stop presenter from using live reminder send route; switch to dry-mode consent policy demo via `evaluateReminderConsent` and lifecycle builder command; keep consent gating narrative | Integrator + Lane D owner | 15 min |
| Lane C KPI shell regression (missing cards/filters/definitions) | Serve static shell fallback: keep filter echo + metric definitions from manifest; defer dynamic stream dependency | Integrator + Lane C owner | 20 min |
| Lane A/B contract conflict (`attestation_required` or override reason enforcement broken) | Preserve deterministic + override control first; revert conflicting cosmetic/UI deltas; defer non-critical polish | Integrator + Lane A/B owners | 30 min |
| Cross-lane scope collision detected | Halt merge queue; branch remediation from current integration HEAD; fix only offending lane-owned files | Integrator + offending lane owner | 30 min |
| Late demo-day regression with unknown root cause | Switch to minimum viable demo script (below) and freeze new merges | Integrator + Product Lead | 10 min |

### Minimum viable demo fallback script

1. Open console with filters and show filter echo + KPI definition hooks.
2. Run deterministic dose check and show `attestation_required`.
3. Show override reason enforcement (reject invalid, accept valid).
4. Run dry-mode reminder consent check:
   - no consent -> blocked,
   - consent granted -> allowed + lifecycle sample emitted.

---

## 5) Go/No-Go Decision Card

### GO only if all are true

1. Merge order completed exactly `B -> A -> C -> D`.
2. After each merge, `pnpm -C apps/web typecheck` passes.
3. No scope violations against lock map.
4. Deterministic safety gate works (`attestation_required` path verified).
5. Override reason contract enforced (invalid rejected, valid accepted).
6. Console filter echo + KPI definition hooks visible.
7. Reminder consent gate demonstrates blocked + lifecycle-emitted path (live or dry-mode fallback).
8. Fallback script rehearsed and timed (< 7 minutes).

### NO-GO triggers

- Any blocker in deterministic safety/override governance path.
- Any unresolved lane collision.
- Any trust/compliance messaging overclaim present in script.

### Compliance/trust messaging risks (explicit)

- Do **not** claim certifications not formally granted (e.g., "HIPAA certified").
- Do **not** present synthetic/demo data as live patient outcomes.
- Do **not** claim clinical efficacy improvements without validated pilot evidence.
- Preferred phrasing: "deterministic safety checks," "auditable governance events," "pilot evidence in progress."

---

## Board packet readiness

Board packet generation remains supported with existing templates:
- `docs/CORTEX_WEEKLY_BOARD_SCORECARD_TEMPLATE.md`
- `docs/CORTEX_PILOT_TRACKER_TEMPLATE.md`
- `docs/CORTEX_MULTI_SITE_BOARD_AGGREGATION_TEMPLATE.csv`
- `docs/CORTEX_BOARD_EXPORT_LAYOUT.md`
- `docs/CORTEX_SHEETS_ROLLUP_GUIDE.md`

Suggested metadata refresh before export:

```bash
pnpm docs:cortex:update:tracker
```
