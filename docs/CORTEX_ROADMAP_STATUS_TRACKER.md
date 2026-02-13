# Cortex Roadmap Status Tracker

<!-- CORTEX_AUTOMATION:START -->
## Update Metadata

- Last Updated: 2026-02-13
- Owner: PL
- Cadence: friday
- Last Run Mode: friday
- Next Recommended Update: 2026-02-20
<!-- CORTEX_AUTOMATION:END -->

**Source plan:** `docs/CORTEX_LATAM_EXECUTION_ROADMAP_2026.md`  
**Snapshot date:** 2026-02-10  
**Owner:** Product Lead  
**Update cadence:** Weekly (before board scorecard export)

---

## 1) Overall Stage

- **Current stage:** Pre-pilot execution readiness (early Sprint 1 posture)
- **Summary:** Strategy, positioning, and operating templates are complete; core production pilot outcomes are not yet proven with live multi-country data.
- **PRD source of truth:** `docs/CORTEX_PRODUCT_REQUIREMENTS_DOC_V1.md`

---

## 2) Current vs Target Checklist

Status key:
- `DONE` = implemented and usable now
- `IN PROGRESS` = partially implemented / not yet validated in pilot operations
- `NOT STARTED` = planned but no meaningful execution yet

| Area | Target (from roadmap) | Status | Evidence | Next step |
|------|------------------------|--------|----------|-----------|
| Strategic plan | 12-week LATAM execution plan with owners and KPI gates | DONE | `docs/CORTEX_LATAM_EXECUTION_ROADMAP_2026.md` | Keep weekly updates in tracker |
| Board ops | Weekly board scorecard template | DONE | `docs/CORTEX_WEEKLY_BOARD_SCORECARD_TEMPLATE.md` | Start using with real site data |
| Pilot ops | Per-site Friday tracker template | DONE | `docs/CORTEX_PILOT_TRACKER_TEMPLATE.md` | Use one per active site |
| Data ops | Multi-site aggregation CSV template | DONE | `docs/CORTEX_MULTI_SITE_BOARD_AGGREGATION_TEMPLATE.csv` | Append weekly rows from live pilots |
| Reporting automation | Sheets rollup formulas + board export layout | DONE | `docs/CORTEX_SHEETS_ROLLUP_GUIDE.md`, `docs/CORTEX_BOARD_EXPORT_LAYOUT.md` | Build shared Google Sheet and lock formulas |
| Trust-safe positioning | Remove overclaims and align messaging to deterministic safety | DONE | Landing changes in `apps/web/src/components/landing/*` | Keep claims governance in release checklist |
| Product identity | Cortex by Holi Labs + split CTA (clinic vs enterprise) | DONE | `apps/web/src/components/landing/Hero.tsx`, `LandingHeader.tsx`, `DemoRequest.tsx` | Measure conversion split by CTA |
| Rollout intake UX | Country + payer focus + protocol mode fields | DONE | `apps/web/src/components/onboarding/IntroQuestionnaireModal.tsx` and onboarding API type updates | Confirm values flow into analytics |
| Settings simplification | End-user comm settings simplified (phone/email), BYOK clarified | DONE | `apps/web/src/app/dashboard/settings/page.tsx` | Validate persisted settings behavior in production env |
| Main nav cleanup | Remove emoji-heavy nav and redundant settings entry point | DONE | `apps/web/src/app/dashboard/layout.tsx` | Verify with pilot users |
| DOAC deterministic rule pack v1 | Safety-critical deterministic logic for DOAC checks | IN PROGRESS | Roadmap exists; implementation artifacts not yet validated as complete | Freeze rule definitions + clinical sign-off |
| Mandatory event contract | Event schema enforced across key actions | IN PROGRESS | Event model specified in roadmap; full enforcement/reconciliation pending | Add schema tests + dashboard query parity checks |
| Action Console KPI trust | Cards linked to validated numerator/denominator definitions | IN PROGRESS | Dashboard direction exists; pilot KPI integrity process not fully closed | Publish KPI dictionary and query IDs |
| Follow-up orchestrator | Consent-aware reminders + escalation queue with SLA closure | IN PROGRESS | Communications UX and templates exist; full pilot evidence pending | Run live end-to-end reminder + escalation test |
| Bolivia live proof | 30/60/90 day KPI trend from real cases | NOT STARTED | Example docs exist only (`CORTEX_WEEK1_*_EXAMPLE_*`) | Start live pilot logging week 1 |
| Brazil rollout | Site kickoff with active weekly data | NOT STARTED | Example tracker exists only | Confirm kickoff date + stakeholder roster |
| Argentina rollout | Site kickoff with active weekly data | NOT STARTED | Placeholder row in CSV template | Finalize site selection + start date |
| Evidence pack | Monthly pilot export generated from real operational data | NOT STARTED | Evidence process defined, no live exports yet | Build first real monthly export after 4 weeks data |

---

## 3) Progress by Sprint Track

## Sprint 1-2: Safety Core
- **Target:** DOAC deterministic checks, attestations, override taxonomy, baseline events.
- **Status:** `IN PROGRESS`
- **Gap to close this week:**
  1. Clinical sign-off on rule set and override taxonomy
  2. Event emission completeness for all safety actions
  3. UAT results documented

## Sprint 3-4: Console + Country Profiles
- **Target:** KPI console, country profiles, payer metadata, protocol mode controls.
- **Status:** `IN PROGRESS` (foundational elements live, operational validation pending)
- **Gap to close:**
  1. KPI query reconciliation
  2. Country metadata surfaced in reporting
  3. Admin controls validated in pilot workflow

## Sprint 5-6: Follow-up + Evidence
- **Target:** Reminder orchestration, escalations, evidence exports.
- **Status:** `NOT STARTED` (beyond preparatory UX/copy)
- **Gap to close:**
  1. End-to-end reminder flow test
  2. Escalation SLA policy implementation
  3. Monthly export artifact generation

---

## 4) Go/No-Go Readiness Snapshot

| Gate | Target | Current | Status |
|------|--------|---------|--------|
| Checklist completion | >= 90% by day 90 | No live pilot baseline | NOT STARTED |
| Median verification time | <= 90s | No live pilot baseline | NOT STARTED |
| Reminder reach | >= 95% | No live pilot baseline | NOT STARTED |
| WAU | >= 70% enrolled users | No live pilot baseline | NOT STARTED |
| Champion confidence | >= 8/10 | No live pilot baseline | NOT STARTED |

---

## 5) Top 5 Immediate Priorities (Next 14 Days)

1. Finalize and sign off DOAC deterministic rule pack v1 with named clinical approver.
2. Enforce mandatory event schema and add automated reconciliation checks.
3. Launch first live Bolivia pilot week with real KPI capture (no placeholder data).
4. Stand up the shared Sheets rollup and generate the first real board export PDF.
5. Confirm Brazil kickoff plan and stakeholder commitments (date, unit, champion, quality lead).

---

## 6) Demo Week Integration Sync (Agent 6 - Final Rerun)

**Runbook source:** `docs/CORTEX_DEMO_WEEK_FINAL_RUNBOOK.md`  
**Locked merge order:** `B -> A -> C -> D`

### Final pre-merge status

- No new merge commits were executed in this rerun.
- Integration queue remains locked and command-ready for `B -> A -> C -> D`.
- Scope boundaries remain enforced by `docs/CORTEX_DEMO_WEEK_AGENT_LOCKMAP.md`.
- Latest lane-scope drift observed vs `origin/main` is concentrated in:
  - Lane B: `apps/web/src/app/api/governance/event/route.ts`, `apps/web/src/lib/governance/shared-types.ts`, `apps/web/src/lib/socket/events.ts`
  - Lane C: `apps/web/src/app/dashboard/console/page.tsx`, `apps/web/src/app/api/governance/manifest/route.ts`
  - Lane D: `apps/web/src/app/api/reminders/send/route.ts`, `apps/web/src/lib/consent/reminder-service.ts`, `apps/web/src/lib/notifications/appointment-reminders.ts`, `apps/web/src/lib/notifications/reminder-policy.ts`
- Lane A updates were not detected in this local rerun diff and should be reconfirmed from verifier/lane handoff before merge execution.

### Blockers and risks

1. **Verifier artifact visibility risk:** standalone verifier rerun file was not found in `docs/`; integration order remains default unless verifier states otherwise.
2. **Lane D runtime instability risk:** reminder dispatch may degrade due external dependencies (Twilio/email/provider config).
3. **Lane C definition mismatch risk:** KPI shell may diverge from metric definition hooks/filters during final bundling.
4. **Governance context mismatch risk:** override/governance payload may lose `protocolVersion`/country/site context if cross-lane edits leak.
5. **Typecheck regression risk:** bundled or conflict fixes can introduce cross-module TS breaks.
6. **Messaging trust risk:** investor-facing copy may overstate compliance/certification or imply live evidence where data is synthetic.

### Demo go/no-go criteria

- `GO` only when:
  1. Merge sequence completed exactly `B -> A -> C -> D`.
  2. `pnpm -C apps/web typecheck` passes after every merge.
  3. `attestation_required` safety gate is confirmed.
  4. Override without valid reason code is rejected; valid reason is accepted.
  5. Console filter echo + KPI definition hooks are visible.
  6. Reminder flow demonstrates both consent-blocked and lifecycle-emitted path (live or dry-mode fallback).
- `NO-GO` if deterministic safety/override path is unstable or lane collisions remain unresolved.

### Next-day actions (24h)

1. Confirm verifier rerun output location and record "critical blocker" status in tracker.
2. Validate Lane A handoff branch and ensure lockmap path compliance before integration starts.
3. Execute merge queue with per-lane stop conditions from `docs/CORTEX_DEMO_WEEK_FINAL_RUNBOOK.md`.
4. Run one full deterministic demo dry-run plus one fallback dry-run and capture pass/fail.
5. Freeze scope after green dry-run and prepare board packet export snapshot.

### Board packet readiness

- Board packet remains generatable from existing templates:
  - `docs/CORTEX_WEEKLY_BOARD_SCORECARD_TEMPLATE.md`
  - `docs/CORTEX_PILOT_TRACKER_TEMPLATE.md`
  - `docs/CORTEX_MULTI_SITE_BOARD_AGGREGATION_TEMPLATE.csv`
  - `docs/CORTEX_BOARD_EXPORT_LAYOUT.md`
  - `docs/CORTEX_SHEETS_ROLLUP_GUIDE.md`
- Recommended pre-export metadata sync:
  - `pnpm docs:cortex:update:tracker`

### Evidence export checklist (operator-ready)

Run this sequence for every weekly/monthly export:

1. Validate `raw_data` append-only integrity (no overwritten historical rows).
2. Set target period in `weekly_rollup!B1` and refresh `weekly_rollup -> country_rollup -> board_export`.
3. Confirm metric IDs/query refs in notes match:
   - `METRIC-TRUST-SCORE-V1` (`qry.governance.trust_score.v1`)
   - `METRIC-INTERVENTIONS-V1` (`qry.governance.interventions.count.v1`)
   - `METRIC-HARD-BRAKES-V1` (`qry.governance.interventions.hard_brakes_ratio.v1`)
   - `METRIC-UPTIME-V1` (`qry.governance.runtime.uptime.v1`)
   - `METRIC-PROTOCOLS-ACTIVE-V1` (`qry.governance.protocols.active_ratio.v1`)
4. Generate deterministic artifact names:
   - Weekly: `cortex-board-packet-weekly-YYYY-MM-DD.pdf`, `cortex-board-raw-data-weekly-YYYY-MM-DD.csv`, `cortex-board-notes-weekly-YYYY-MM-DD.md`
   - Monthly: `cortex-board-packet-monthly-YYYY-MM.pdf`, `cortex-board-raw-data-monthly-YYYY-MM.csv`, `cortex-board-notes-monthly-YYYY-MM.md`
5. Run helper plan check (dry mode):
   - `node scripts/cortex-export-helper.js --mode weekly --week-ending YYYY-MM-DD --dry-run`

---

## 7) Weekly Update Template (copy/paste)

```md
### Week Ending: YYYY-MM-DD
- Overall status: Green/Yellow/Red
- What moved to DONE:
- What remains IN PROGRESS:
- New blockers:
- Decisions needed:
- Next week top 3:
```

---

## Weekly Auto Log

### 2026-02-13 (FRIDAY)
- Progress this week:
- KPI highlights:
- Blockers encountered:
- Next week commitments:


### 2026-02-10 (FRIDAY)
- Progress this week:
- KPI highlights:
- Blockers encountered:
- Next week commitments:


### 2026-02-10 (WEEKLY)
- Progress this week:
- KPI highlights:
- Blockers encountered:
- Next week commitments:

