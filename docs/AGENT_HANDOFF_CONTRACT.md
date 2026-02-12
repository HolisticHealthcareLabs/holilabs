# Agent Handoff Contract & Codebase Navigation Map

**Repo:** `holilabsv2` (monorepo)  
**Anchor commit:** `47203c8`  
**Tag:** `demo-cortex-2026-02-11-r1`  
**Last verified:** 2026-02-11  
**Status:** Typecheck PASS, Lint PASS, Prisma PASS, Telemetry 7 events, Manifest signoff SIGNED_OFF

---

## 1) Monorepo Structure

```
holilabsv2/
├── apps/
│   ├── web/          # Next.js 14 (main product — Cortex)
│   ├── api/          # Fastify API service
│   ├── sidecar/      # Electron desktop companion
│   └── edge/         # Edge worker (logs)
├── packages/         # Shared packages
├── data/             # Clinical content sources + bundles
├── scripts/          # Automation (doc metadata, clinical bundle build, export helper)
├── configs/          # Doc automation config profiles
├── docs/             # Strategy, PRD, roadmap, templates, governance
├── tests/            # (under apps/web/tests/) contract + lifecycle tests
└── public/           # Static assets
```

---

## 2) Key Documentation (read these first)

| Document | Path | Purpose |
|----------|------|---------|
| **PRD v1** | `docs/CORTEX_PRODUCT_REQUIREMENTS_DOC_V1.md` | Implementation contract: FR-A..D, NFR, KPIs, milestones |
| **Delivery Backlog** | `docs/CORTEX_DELIVERY_BACKLOG_V1.md` | FR-mapped epics/stories/tasks with sprint allocation |
| **Roadmap Status Tracker** | `docs/CORTEX_ROADMAP_STATUS_TRACKER.md` | Current vs target checklist, sprint progress, go/no-go gates |
| **Execution Roadmap** | `docs/CORTEX_LATAM_EXECUTION_ROADMAP_2026.md` | 12-week build plan, country rollout, KPI thresholds |
| **Clinical Content Governance** | `docs/CLINICAL_CONTENT_GOVERNANCE_V1.md` | Rule lifecycle: DRAFT->REVIEW->APPROVED->ACTIVE->DEPRECATED |
| **Clinical Signoff Template** | `docs/CLINICAL_SIGNOFF_TEMPLATE.md` | Per-version clinical approval evidence format |
| **Clinical Rule Change Log** | `docs/CLINICAL_RULE_CHANGE_LOG_TEMPLATE.md` | Changelog template for rule content updates |
| **Board Export Layout** | `docs/CORTEX_BOARD_EXPORT_LAYOUT.md` | Cell-by-cell blueprint for board packet PDF |
| **Sheets Rollup Guide** | `docs/CORTEX_SHEETS_ROLLUP_GUIDE.md` | Google Sheets formulas for KPI rollups |
| **Pilot Tracker Template** | `docs/CORTEX_PILOT_TRACKER_TEMPLATE.md` | Per-site weekly pilot tracking |
| **Board Scorecard Template** | `docs/CORTEX_WEEKLY_BOARD_SCORECARD_TEMPLATE.md` | Weekly board scorecard format |
| **Demo Runbook** | `docs/CORTEX_DEMO_WEEK_FINAL_RUNBOOK.md` | Merge order, fallback plan, go/no-go criteria |
| **Agent Lockmap** | `docs/CORTEX_DEMO_WEEK_AGENT_LOCKMAP.md` | Lane scopes, model assignments, file ownership |
| **Doc Automation Setup** | `docs/CORTEX_DOC_AUTOMATION_SETUP.md` | Script + GitHub Actions for metadata updates |

---

## 3) Critical Code Paths (by domain)

### 3.1 Safety Engine (Epic A)

| Component | Path | What it does |
|-----------|------|-------------|
| DOAC dose validation API | `apps/web/src/app/api/clinical/primitives/validate-dose/route.ts` | Deterministic dose check + attestation gating + provenance metadata |
| Clinical rule config (legacy) | `apps/web/src/config/clinical-rules.ts` | 7 rules with json-logic, DOAC aliases, renal policy; bridge to registry |
| Lab decision rules | `apps/web/src/lib/clinical/lab-decision-rules.ts` | Renal data quality assessment, critical lab alerts, treatment recommendations |
| Content types | `apps/web/src/lib/clinical/content-types.ts` | Provenance interfaces, domain/severity enums, validation helpers |
| Content registry | `apps/web/src/lib/clinical/content-registry.ts` | In-memory rule registry with getById/listByDomain/getBundleMetadata |
| Content loader | `apps/web/src/lib/clinical/content-loader.ts` | Runtime bundle validator + loader (fail-fast on malformed provenance) |
| Governance policy | `apps/web/src/lib/clinical/governance-policy.ts` | Lifecycle gates, activation policy, signoff state management |
| Content sources | `data/clinical/sources/*.json` | Provenance-tagged rule source files |
| Built bundle | `data/clinical/bundles/latest.json` | Deterministic checksummed bundle output |
| Bundle build script | `scripts/clinical/build-content-bundle.ts` | Source ingestion -> normalize -> stable sort -> SHA-256 -> output |

### 3.2 Console & Governance (Epic B)

| Component | Path | What it does |
|-----------|------|-------------|
| Console page | `apps/web/src/app/dashboard/console/page.tsx` | KPI cards, filters, code presets, override reason ranking, live stream |
| Governance event API | `apps/web/src/app/api/governance/event/route.ts` | Strict event contract validation, override/block/flag emission, fail-soft DB |
| Governance manifest API | `apps/web/src/app/api/governance/manifest/route.ts` | Metric definitions, content bundle metadata, signoff state |
| Governance shared types | `apps/web/src/lib/governance/shared-types.ts` | Event types, override reason codes, validation functions |
| Governance service | `apps/web/src/lib/governance/governance.service.ts` | DB persistence for overrides/logs with structured error handling |
| Socket event types | `apps/web/src/lib/socket/events.ts` | GovernanceLogEvent, GovernanceOverrideEvent, GovernanceBlockedEvent |
| Telemetry stream API | `apps/web/src/app/api/telemetry/stream/route.ts` | Synthetic + filtered demo telemetry, case-insensitive filters |
| Adversarial auditor | `apps/web/src/services/adversarial-auditor.service.ts` | Hardened DB interaction for audit scenarios |

### 3.3 Follow-up Orchestration (Epic C)

| Component | Path | What it does |
|-----------|------|-------------|
| Reminder send API | `apps/web/src/app/api/reminders/send/route.ts` | Consent-gated dispatch, retry execution, lifecycle telemetry |
| Reminder policy | `apps/web/src/lib/notifications/reminder-policy.ts` | Retry state machine, escalation callbacks, lifecycle event builder |
| Appointment reminders | `apps/web/src/lib/notifications/appointment-reminders.ts` | WhatsApp/email/push dispatch with consent gating + correlation IDs |
| Consent reminder service | `apps/web/src/lib/consent/reminder-service.ts` | Consent-expiration flow with standardized lifecycle logging |

### 3.4 Rollout & Configuration (Epic D)

| Component | Path | What it does |
|-----------|------|-------------|
| Onboarding profile API | `apps/web/src/app/api/onboarding/profile/route.ts` | Persist country/insurerFocus/protocolMode with normalization |
| Onboarding modal | `apps/web/src/components/onboarding/IntroQuestionnaireModal.tsx` | Country, payer, protocol mode capture UI |
| Settings page | `apps/web/src/app/dashboard/settings/page.tsx` | Rollout context visibility + role-gated editing |

### 3.5 Landing & Auth (Public Surfaces)

| Component | Path | What it does |
|-----------|------|-------------|
| Landing header | `apps/web/src/components/landing/LandingHeader.tsx` | Responsive header, mobile-safe, next/image logos |
| Hero section | `apps/web/src/components/landing/Hero.tsx` | Responsive hero with stacked CTAs on mobile |
| Verification workflow | `apps/web/src/components/landing/VerificationWorkflow.tsx` | Interactive "endowed progress" demo component |
| How it works | `apps/web/src/components/landing/HowItWorks.tsx` | Section wrapper for VerificationWorkflow |
| Architecture | `apps/web/src/components/landing/Architecture.tsx` | Technical pillars section |
| Governance section | `apps/web/src/components/landing/Governance.tsx` | Audit/dashboard section |
| High stakes section | `apps/web/src/components/landing/HighStakes.tsx` | Use cases section |
| Demo request | `apps/web/src/components/landing/DemoRequest.tsx` | CTA section with split clinic/enterprise paths |
| Footer | `apps/web/src/components/landing/Footer.tsx` | Landing footer |
| Language selector | `apps/web/src/components/LanguageSelector.tsx` | Compact (mobile) + full (desktop) locale switcher |
| Language context | `apps/web/src/contexts/LanguageContext.tsx` | Locale state: saved pref -> English default |
| Providers wrapper | `apps/web/src/components/Providers.tsx` | SessionProvider > ThemeProvider > LanguageProvider |
| Login page | `apps/web/src/app/auth/login/page.tsx` | Auth login with demo credentials |
| Register page | `apps/web/src/app/auth/register/page.tsx` | Registration with demo mode card at top |
| Landing page | `apps/web/src/app/page.tsx` | Composes all landing sections |

### 3.6 Dashboard Layout & Navigation

| Component | Path | What it does |
|-----------|------|-------------|
| Dashboard layout | `apps/web/src/app/dashboard/layout.tsx` | Sidebar nav with Command Center, Patients, Console tiles |
| Dashboard home | `apps/web/src/app/dashboard/page.tsx` | Redirects to command center |
| Command center page | `apps/web/src/app/dashboard/command-center/page.tsx` | Fleet-aware overview |
| Patients list | `apps/web/src/app/dashboard/patients/page.tsx` | Patient management |
| Patient detail | `apps/web/src/app/dashboard/patients/[id]/page.tsx` | Individual patient view |

### 3.7 Database & Middleware

| Component | Path | What it does |
|-----------|------|-------------|
| Prisma schema | `apps/web/prisma/schema.prisma` | Full data model including governance tables |
| Latest migration | `apps/web/prisma/migrations/20260210235900_governance_schema_completeness/` | Governance enums + tables + indexes |
| Middleware | `apps/web/src/middleware.ts` | Auth, locale, security headers; bypasses static/internal assets |
| Synthetic demo data | `apps/web/src/lib/demo/synthetic.ts` | Demo patients, notifications, telemetry events |
| Environment config | `apps/web/src/lib/env.ts` | Environment variable validation |

### 3.8 Tests

| Test | Path | What it validates |
|------|------|-------------------|
| Governance event contract | `apps/web/tests/governance-event-contract.test.ts` | Schema validation: valid accepted, missing rejected, bad enum rejected, override without reason rejected |
| Reminder lifecycle | `apps/web/tests/reminders/reminder-policy.lifecycle.test.ts` | Retry state machine, escalation transitions, consent denial paths |

### 3.9 Automation & Scripts

| Script | Path | What it does |
|--------|------|-------------|
| Clinical bundle builder | `scripts/clinical/build-content-bundle.ts` | Deterministic bundle from source JSON |
| Doc metadata updater | `scripts/update-cortex-docs-metadata.js` | Automated Last Updated/Owner/Cadence in Markdown |
| Evidence export helper | `scripts/cortex-export-helper.js` | Weekly/monthly board packet artifact planner |
| GitHub Actions: doc automation | `.github/workflows/cortex-doc-automation.yml` | Scheduled doc metadata sync with PR creation |

---

## 4) Agent Handoff Protocol (for future multi-agent runs)

### 4.1 Required information per agent lane

Every agent MUST report on completion:

```
1. Branch name: agent/<lane>-<YYYY-MM-DD>
2. Commit SHA: <full 40-char SHA>
3. Files changed: <exact list with +/- line counts>
4. Files NOT changed (but read): <list>
5. Acceptance criteria: <each criterion PASS/FAIL with evidence>
6. Commands run + output summary:
   - pnpm -C apps/web typecheck
   - eslint on touched files
   - any domain-specific validation
7. Risks/blockers: <list>
8. Merge readiness: READY / BLOCKED (with reason)
```

### 4.2 Integrator merge protocol

1. Merge order: determined by dependency graph (schema first, then services, then UI).
2. After each merge: `pnpm -C apps/web typecheck` must pass.
3. After all merges: full lint + runtime smoke.
4. Tag format: `demo-cortex-YYYY-MM-DD-r<N>`
5. If any merge breaks typecheck: stop, report, do not continue.

### 4.3 File ownership rules

- Each agent owns an explicit file list.
- No agent may edit files outside their list.
- If blocked by out-of-scope bug: report it, do not fix it.
- Shared types: only one agent owns; others consume read-only.

---

## 5) Validation Commands (quick reference)

```bash
# Typecheck
pnpm -C apps/web typecheck

# Lint specific files
pnpm -C apps/web exec eslint src/path/to/file.ts

# Prisma schema validation
pnpm -C apps/web exec prisma validate

# Clinical bundle build (dry run)
tsx scripts/clinical/build-content-bundle.ts --dry-run

# Doc metadata update
pnpm docs:cortex:update:tracker

# Evidence export plan
pnpm docs:cortex:export:plan

# Telemetry smoke
curl -s "http://localhost:3000/api/telemetry/stream" | jq 'length'

# Governance manifest smoke
curl -s "http://localhost:3000/api/governance/manifest" | jq '.contentBundle.signoffStatus'
```

---

## 6) Current PRD Coverage (as of tag demo-cortex-2026-02-11-r1)

| FR | Description | Status | Key file(s) |
|----|-------------|--------|-------------|
| FR-A1 | Deterministic DOAC checks | DONE | `validate-dose/route.ts`, `clinical-rules.ts` |
| FR-A2 | Attestation on missing/stale data | DONE | `validate-dose/route.ts`, `lab-decision-rules.ts` |
| FR-A3 | Override reason enforcement | DONE | `governance/event/route.ts`, `shared-types.ts` |
| FR-A4 | Protocol/country context in events | DONE | `governance/event/route.ts`, `shared-types.ts` |
| FR-B1 | KPI cards with definitions | DONE | `console/page.tsx`, `manifest/route.ts` |
| FR-B2 | Console filtering | DONE | `console/page.tsx`, `telemetry/stream/route.ts` |
| FR-B3 | Override reasons ranking | DONE | `console/page.tsx` |
| FR-C1 | Consent-gated reminders | DONE | `reminders/send/route.ts`, `reminder-policy.ts` |
| FR-C2 | Retry + escalation policy | DONE | `reminder-policy.ts`, `appointment-reminders.ts` |
| FR-C3 | Lifecycle event completeness | DONE | `reminder-policy.ts`, `consent/reminder-service.ts` |
| FR-D1 | Country/payer context persistence | DONE | `onboarding/profile/route.ts`, `IntroQuestionnaireModal.tsx` |
| FR-D2 | Protocol mode visibility | DONE | `settings/page.tsx` |

### Beyond PRD (implemented this cycle)

| Capability | Status | Key file(s) |
|------------|--------|-------------|
| Content provenance pipeline | DONE | `content-types.ts`, `content-registry.ts`, `content-loader.ts`, `build-content-bundle.ts` |
| Clinical governance lifecycle | DONE | `governance-policy.ts`, `CLINICAL_CONTENT_GOVERNANCE_V1.md` |
| Mobile-first landing UX | DONE | `LandingHeader.tsx`, `Hero.tsx`, `VerificationWorkflow.tsx`, `LanguageSelector.tsx` |
| DB governance schema completeness | DONE | `schema.prisma`, governance migration |
| Governance persistence hardening | DONE | `governance.service.ts`, `adversarial-auditor.service.ts` |
| Evidence export runbook | DONE | `cortex-export-helper.js`, `CORTEX_BOARD_EXPORT_LAYOUT.md` |

---

## 7) What Remains (operational, not code)

1. Live pilot kickoff with real patient data (Bolivia first).
2. First real board packet export from production traffic.
3. Clinical sign-off on rule pack v1 (use `CLINICAL_SIGNOFF_TEMPLATE.md`).
4. External dataset integration when US access granted (use content pipeline).
5. Formal PRD sign-off from all function leads.
