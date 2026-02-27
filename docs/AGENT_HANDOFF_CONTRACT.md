# Agent Handoff Contract & Codebase Navigation Map

**Repo:** `holilabsv2` (monorepo)
**Branch:** `main`
**Latest commit:** `d351afb` (Phase 7 Prevention Hub integration)
**Previous anchor:** `47203c8` (Cortex content provenance pipeline)
**Last verified:** 2026-02-23
**Test status:** 1587 passing, 11 pre-existing failures (email-queue, attestation-gate, hard-gate-usage, governance-events — none in prevention or enterprise)
**Typecheck:** 254 known TypeScript errors (non-blocking, documented in TYPESCRIPT_ERRORS_REMAINING.md — TS2353, TS2339, missing Prisma models)
**Production readiness:** 95% (only blocker: vendor BAA signatures)

---

## 0) Other Key Documents (read these alongside this file)

| Document | Path | Why it matters |
|----------|------|----------------|
| **This file (primary handoff)** | `docs/AGENT_HANDOFF_CONTRACT.md` | Code map, domain paths, agent protocol |
| **CLAUDE.md** | `CLAUDE.md` (repo root) | Git protocol (human-only commits), Jest mocking patterns |
| **PRD v1** | `docs/CORTEX_PRODUCT_REQUIREMENTS_DOC_V1.md` | Feature requirements FR-A through FR-D |
| **Roadmap Status Tracker** | `docs/CORTEX_ROADMAP_STATUS_TRACKER.md` | Sprint progress, go/no-go gates |
| **Delivery Backlog** | `docs/CORTEX_DELIVERY_BACKLOG_V1.md` | FR-mapped epics/stories/tasks |
| **Execution Roadmap** | `docs/CORTEX_LATAM_EXECUTION_ROADMAP_2026.md` | 12-week build plan, country rollout |
| **What's Left Master Plan** | `docs/WHATS_LEFT_MASTER_PLAN.md` | 95% prod ready, launch blocker (vendor BAAs), phase completion |
| **Production Readiness Status** | `docs/PRODUCTION_READINESS_STATUS.md` | Detailed Phase 1-3 status, BAA execution plan |
| **TypeScript Errors Tracker** | `docs/TYPESCRIPT_ERRORS_REMAINING.md` | 254 known TS errors breakdown, missing Prisma models |
| **Implementation Status (root)** | `IMPLEMENTATION_STATUS.md` | Phase 1 foundation report (Oct 2025) |
| **Implementation Status (web)** | `apps/web/IMPLEMENTATION_STATUS.md` | Database, API, frontend phase tracking |
| **Current Status** | `CURRENT_STATUS.md` | Overall production readiness (Jan 2025) |
| **Prevention Status Guide** | `apps/web/PREVENTION_STATUS_MANAGEMENT_GUIDE.md` | Prevention plan lifecycle docs |
| **Clinical Governance** | `docs/CLINICAL_CONTENT_GOVERNANCE_V1.md` | Rule lifecycle: DRAFT->REVIEW->APPROVED->ACTIVE->DEPRECATED |
| **Dev Setup** | `docs/DEV_SETUP.md` | Local development environment |
| **API Reference** | `docs/API_REFERENCE.md` | Endpoint documentation |
| **HIPAA Compliance** | `docs/HIPAA_COMPLIANCE_CHECKLIST.md` | Compliance checklist |
| **Security Guidelines** | `docs/SECURITY_GUIDELINES.md` | Security standards |
| **Testing Quick Start** | `docs/TESTING_QUICK_START.md` | How to run tests |
| **Testing Troubleshooting** | `docs/TESTING_TROUBLESHOOTING.md` | Docker/Java setup fixes, common issues |

---

## 1) Monorepo Structure

```
holilabsv2/
├── apps/
│   ├── web/              # Next.js 14 (main product — Cortex + Prevention Hub + Enterprise)
│   │   ├── prisma/       # Schema + migrations
│   │   ├── src/
│   │   │   ├── app/      # Next.js App Router pages + API routes
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── lib/      # Core libraries, services, utilities
│   │   │   ├── hooks/    # React hooks (including realtime prevention)
│   │   │   ├── services/ # Business logic services
│   │   │   └── config/   # Configuration files
│   │   └── tests/        # Contract + lifecycle tests
│   ├── api/              # Fastify API service
│   ├── mobile/           # React Native mobile app
│   ├── sidecar/          # Electron desktop companion
│   └── edge/             # Edge worker (logs)
├── packages/
│   └── shared-kernel/    # Shared types (CompositeRiskScore, ActuarialPayload, etc.)
├── data/
│   ├── master/           # Master data (tuss.json — 50 TUSS procedure codes)
│   └── clinical/         # Clinical content sources + bundles
├── scripts/              # Automation (doc metadata, clinical bundle build, export)
├── configs/              # Doc automation config profiles
├── docs/                 # Strategy, PRD, roadmap, templates, governance
└── p0-bug-fixes/         # Bug fix worktree (parallel dev)
    p1-ai-validation/     # AI validation worktree
    p1-model-routing/     # Model routing worktree
```

---

## 2) Critical Code Paths (by domain)

### 2.1 Prevention Hub (Phase 7 — JUST COMPLETED)

This is the most recently modified domain. Phase 7 integration was completed 2026-02-23.

**Pages:**

| Page | Path | What it does |
|------|------|-------------|
| Prevention main | `apps/web/src/app/dashboard/prevention/page.tsx` | Hub banner, quick nav grid (Templates, Reminders, Plans, Settings), protocol library |
| Prevention Hub (AI) | `apps/web/src/app/dashboard/prevention/hub/page.tsx` | AI-powered longitudinal prevention hub |
| Template list | `apps/web/src/app/dashboard/prevention/templates/page.tsx` | Templates with bulk actions, search, filters, comment/share count badges, clickable to detail |
| **Template detail** | `apps/web/src/app/dashboard/prevention/templates/[id]/page.tsx` | **NEW** — Integrates CommentsSection + ShareTemplateModal, goals, recommendations, metadata sidebar |
| Template versions | `apps/web/src/app/dashboard/prevention/templates/[id]/versions/page.tsx` | Version history + comparison |
| **Reminders dashboard** | `apps/web/src/app/dashboard/prevention/reminders/page.tsx` | **NEW** — Stats cards, filterable reminder list, complete/dismiss actions |
| **Notification settings** | `apps/web/src/app/dashboard/prevention/settings/page.tsx` | **NEW** — Per-type channel toggles, quiet hours config |
| Plans | `apps/web/src/app/dashboard/prevention/plans/page.tsx` | Prevention plans list |
| Analytics | `apps/web/src/app/dashboard/prevention/analytics/page.tsx` | Prevention analytics |
| Activity | `apps/web/src/app/dashboard/prevention/activity/page.tsx` | Activity feed |
| Audit | `apps/web/src/app/dashboard/prevention/audit/page.tsx` | Audit trail |
| Search | `apps/web/src/app/dashboard/prevention/search/page.tsx` | Search across prevention data |
| Patient history | `apps/web/src/app/dashboard/prevention/history/[patientId]/page.tsx` | Patient prevention history |

**API Routes (20+ endpoints):**

| Route | Path | Methods |
|-------|------|---------|
| Templates CRUD | `apps/web/src/app/api/prevention/templates/route.ts` | GET (with _count), POST |
| Template by ID | `apps/web/src/app/api/prevention/templates/[id]/route.ts` | GET, PUT (auto-versions), DELETE |
| Template comments | `apps/web/src/app/api/prevention/templates/[id]/comments/route.ts` | GET, POST |
| Template shares | `apps/web/src/app/api/prevention/templates/[id]/share/route.ts` | GET, POST, DELETE |
| Template versions | `apps/web/src/app/api/prevention/templates/[id]/versions/route.ts` | GET |
| Version by ID | `apps/web/src/app/api/prevention/templates/[id]/versions/[versionId]/route.ts` | GET |
| Template compare | `apps/web/src/app/api/prevention/templates/[id]/compare/route.ts` | GET |
| Template revert | `apps/web/src/app/api/prevention/templates/[id]/revert/route.ts` | POST |
| Template use | `apps/web/src/app/api/prevention/templates/[id]/use/route.ts` | POST |
| Bulk activate | `apps/web/src/app/api/prevention/templates/bulk/activate/route.ts` | POST |
| Bulk deactivate | `apps/web/src/app/api/prevention/templates/bulk/deactivate/route.ts` | POST |
| Bulk delete | `apps/web/src/app/api/prevention/templates/bulk/delete/route.ts` | POST |
| Bulk export | `apps/web/src/app/api/prevention/templates/bulk/export/route.ts` | POST |
| **Reminders aggregate** | `apps/web/src/app/api/prevention/reminders/route.ts` | **NEW** — GET (filtered+paginated+stats), PATCH (complete/dismiss/schedule) |
| Plan reminders | `apps/web/src/app/api/prevention/plans/[planId]/reminders/route.ts` | GET, POST |
| Auto-generate reminders | `apps/web/src/app/api/prevention/plans/[planId]/reminders/auto-generate/route.ts` | POST |
| Notifications | `apps/web/src/app/api/prevention/notifications/route.ts` | GET |
| Notification by ID | `apps/web/src/app/api/prevention/notifications/[notificationId]/route.ts` | PATCH |
| Mark all read | `apps/web/src/app/api/prevention/notifications/mark-all-read/route.ts` | POST |
| **Notification prefs** | `apps/web/src/app/api/prevention/notifications/preferences/route.ts` | GET, PATCH (Novu sync) |
| Send reminders cron | `apps/web/src/app/api/prevention/notifications/cron/send-reminders/route.ts` | POST |
| Plans CRUD | `apps/web/src/app/api/prevention/plans/route.ts` | GET, POST |
| Plan status | `apps/web/src/app/api/prevention/plans/[planId]/status/route.ts` | PATCH |
| Plan status undo | `apps/web/src/app/api/prevention/plans/[planId]/status/undo/route.ts` | POST |
| Plan goals | `apps/web/src/app/api/prevention/plans/[planId]/goals/route.ts` | PATCH |
| Bulk plans | `apps/web/src/app/api/prevention/plans/bulk/route.ts` | POST |
| Screenings | `apps/web/src/app/api/prevention/screenings/route.ts` | GET, POST |
| Screening by ID | `apps/web/src/app/api/prevention/screenings/[screeningId]/route.ts` | PATCH |
| Analytics | `apps/web/src/app/api/prevention/analytics/route.ts` | GET |
| Activity | `apps/web/src/app/api/prevention/activity/route.ts` | GET |
| Audit | `apps/web/src/app/api/prevention/audit/route.ts` | GET |
| Search | `apps/web/src/app/api/prevention/search/route.ts` | GET |
| Screening triggers | `apps/web/src/app/api/prevention/screening-triggers/route.ts` | POST |
| Prevention Hub patient | `apps/web/src/app/api/prevention/hub/[patientId]/route.ts` | GET |
| Hub export | `apps/web/src/app/api/prevention/hub/[patientId]/export/route.ts` | GET |
| Hub add to plan | `apps/web/src/app/api/prevention/hub/add-to-plan/route.ts` | POST |
| Hub create order | `apps/web/src/app/api/prevention/hub/create-order/route.ts` | POST |
| Hub create task | `apps/web/src/app/api/prevention/hub/create-patient-task/route.ts` | POST |
| Hub create referral | `apps/web/src/app/api/prevention/hub/create-referral/route.ts` | POST |
| Hub mark complete | `apps/web/src/app/api/prevention/hub/mark-complete/route.ts` | POST |
| Process prevention | `apps/web/src/app/api/prevention/process/route.ts` | POST |
| Patient history | `apps/web/src/app/api/prevention/history/[patientId]/route.ts` | GET |

**Components:**

| Component | Path | Lines | What it does |
|-----------|------|-------|-------------|
| CommentsSection | `apps/web/src/components/prevention/CommentsSection.tsx` | 309 | Template comment thread with mentions, auto-resize |
| ShareTemplateModal | `apps/web/src/components/prevention/ShareTemplateModal.tsx` | 374 | Share template with permission levels (VIEW/EDIT/ADMIN) |
| BulkActionToolbar | `apps/web/src/components/prevention/BulkActionToolbar.tsx` | 236 | Bulk activate/deactivate/delete/export toolbar |
| VersionHistory | `apps/web/src/components/prevention/VersionHistory.tsx` | 348 | Version list with revert/compare actions |
| VersionComparison | `apps/web/src/components/prevention/VersionComparison.tsx` | — | Side-by-side version diff |
| PreventionNotificationProvider | `apps/web/src/components/prevention/PreventionNotificationProvider.tsx` | 234 | Real-time notification context |
| PreventionHubSidebar | `apps/web/src/components/prevention/PreventionHubSidebar.tsx` | 590 | AI copilot sidebar with real-time condition detection |
| ActivityFeed | `apps/web/src/components/prevention/ActivityFeed.tsx` | — | Activity stream |
| StatusHistoryTimeline | `apps/web/src/components/prevention/StatusHistoryTimeline.tsx` | — | Plan status change timeline |
| QuickActionsPanel | `apps/web/src/components/prevention/QuickActionsPanel.tsx` | — | Quick action buttons |

**Hooks:**

| Hook | Path | What it does |
|------|------|-------------|
| useRealtimePreventionUpdates | `apps/web/src/hooks/useRealtimePreventionUpdates.ts` | 592-line hook for real-time prevention detection via socket |

**Prisma Models (prevention domain):**

| Model | What it stores |
|-------|---------------|
| PreventionPlan | Patient prevention plans with goals, recommendations, AI insights |
| PreventionPlanTemplate | Reusable plan templates with evidence levels |
| PreventionPlanTemplateVersion | Version snapshots with change tracking |
| PreventionTemplateComment | Comments on templates with @mentions |
| PreventionTemplateShare | Template sharing with VIEW/EDIT/ADMIN permissions |
| PreventiveCareReminder | Screening reminders with status (DUE/OVERDUE/SCHEDULED/COMPLETED/DISMISSED) |
| ScreeningOutcome | Screening results linked to patients |
| PreventionEncounterLink | Links prevention plans to clinical encounters |
| PreventionPlanVersion | Plan version history |

### 2.2 Enterprise / Insurer Portal (Phase 5 — recently built)

| Component | Path | What it does |
|-----------|------|-------------|
| Risk assessment API | `apps/web/src/app/api/enterprise/risk-assessment/route.ts` | Single-patient risk assessment with API key auth |
| Bulk assessment API | `apps/web/src/app/api/enterprise/bulk-assessment/route.ts` | Bulk patient assessment (10 req/min rate limit) |
| Enterprise dashboard | `apps/web/src/app/enterprise/dashboard/page.tsx` | Insurer overview with KPI cards |
| Assessments page | `apps/web/src/app/enterprise/assessments/page.tsx` | Anonymized patient search + domain breakdown |
| Analytics page | `apps/web/src/app/enterprise/analytics/page.tsx` | Tier PieChart, domain RadarChart, trend LineChart, TUSS BarChart |
| Enterprise layout | `apps/web/src/app/enterprise/layout.tsx` | Sidebar with framer-motion navigation |
| Enterprise auth | `apps/web/src/lib/enterprise/auth.ts` | Constant-time API key authentication |
| Rate limiter | `apps/web/src/lib/enterprise/rate-limiter.ts` | Sliding-window rate limiting |
| TUSS catalog | `data/master/tuss.json` | 50 procedure codes across 4 categories, dual-currency (BRL+BOB), actuarial weights |
| Shared kernel types | `packages/shared-kernel/index.d.ts` | CompositeRiskScore, ActuarialPayload types |

**Unstaged enterprise work (in working tree, not yet committed):**

| File | Status | What it does |
|------|--------|-------------|
| `apps/web/src/app/api/enterprise/flywheel/` | NEW | Data flywheel assessment stats |
| `apps/web/src/app/api/enterprise/outcomes/` | NEW | Outcome tracking + correlation |
| `apps/web/src/app/api/enterprise/usage/` | NEW | Usage metering API |
| `apps/web/src/app/api/enterprise/webhooks/` | NEW | Webhook dispatcher API |
| `apps/web/src/app/enterprise/flywheel/page.tsx` | NEW | Flywheel dashboard page |
| `apps/web/src/app/enterprise/outcomes/page.tsx` | NEW | Outcomes page |
| `apps/web/src/lib/enterprise/usage-meter.ts` | NEW | Usage metering service |
| `apps/web/src/lib/enterprise/webhook-dispatcher.ts` | NEW | Webhook dispatch service |
| `apps/web/src/services/data-flywheel.service.ts` | NEW | Data flywheel business logic |
| `apps/web/src/services/outcome-tracker.service.ts` | NEW | Outcome tracking service |
| `apps/web/src/lib/enterprise/__tests__/phase5-flywheel.test.ts` | NEW | Flywheel tests |
| `apps/web/prisma/migrations/20260219120000_enterprise_phase5_persistence/` | NEW | Enterprise schema migration |

### 2.3 Safety Engine (Epic A)

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
| CDS evaluate API | `apps/web/src/app/api/cds/evaluate/route.ts` | Clinical decision support evaluation |
| Traffic light API | `apps/web/src/app/api/traffic-light/route.ts` | Risk traffic light visualization |

### 2.4 Console & Governance (Epic B)

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

### 2.5 Follow-up Orchestration (Epic C)

| Component | Path | What it does |
|-----------|------|-------------|
| Reminder send API | `apps/web/src/app/api/reminders/send/route.ts` | Consent-gated dispatch, retry execution, lifecycle telemetry |
| Reminder policy | `apps/web/src/lib/notifications/reminder-policy.ts` | Retry state machine, escalation callbacks, lifecycle event builder |
| Appointment reminders | `apps/web/src/lib/notifications/appointment-reminders.ts` | WhatsApp/email/push dispatch with consent gating + correlation IDs |
| Consent reminder service | `apps/web/src/lib/consent/reminder-service.ts` | Consent-expiration flow with standardized lifecycle logging |

### 2.6 Admin Modules

| Component | Path | What it does |
|-----------|------|-------------|
| Formulary admin | `apps/web/src/app/dashboard/admin/formulary/page.tsx` | Drug formulary management |
| Formulary actions | `apps/web/src/app/dashboard/admin/formulary/actions.ts` | Server actions for formulary CRUD |
| Audit log viewer | `apps/web/src/app/dashboard/admin/audit-logs/page.tsx` | Audit log viewer with filters |

### 2.7 Landing, Auth & Navigation

| Component | Path | What it does |
|-----------|------|-------------|
| Landing page | `apps/web/src/app/page.tsx` | Composes all landing sections |
| Landing components | `apps/web/src/components/landing/*.tsx` | Header, Hero, VerificationWorkflow, HowItWorks, etc. |
| Login | `apps/web/src/app/auth/login/page.tsx` | Auth login with demo credentials |
| Dashboard layout | `apps/web/src/app/dashboard/layout.tsx` | Main sidebar navigation |
| Onboarding | `apps/web/src/components/onboarding/IntroQuestionnaireModal.tsx` | Country, payer, protocol mode capture |
| Settings | `apps/web/src/app/dashboard/settings/page.tsx` | Rollout context + role-gated editing |

### 2.8 Database & Infrastructure

| Component | Path | What it does |
|-----------|------|-------------|
| Prisma schema | `apps/web/prisma/schema.prisma` | Full data model — all domains |
| Auth config | `apps/web/src/lib/auth.ts` | NextAuth with Google OAuth + Prisma adapter |
| Auth (v2) | `apps/web/src/lib/auth/auth.ts` | Auth v2 helper used by newer routes |
| Prisma client | `apps/web/src/lib/prisma.ts` | Singleton DB client |
| Logger | `apps/web/src/lib/logger.ts` | Structured logging |
| Audit utilities | `apps/web/src/lib/audit.ts` | HIPAA audit logging (auditView, auditUpdate) |
| Environment config | `apps/web/src/lib/env.ts` | Environment variable validation |
| Middleware | `apps/web/src/middleware.ts` | Auth, locale, security headers |
| Sentry client | `apps/web/sentry.client.config.ts` | Client-side error tracking |

### 2.9 Tests

| Test Suite | Path | What it validates |
|------------|------|-------------------|
| Prevention hub API | `apps/web/src/app/api/prevention/hub/__tests__/route.test.ts` | Data fetching, risk scores, domain mapping |
| Hub add-to-plan | `apps/web/src/app/api/prevention/hub/add-to-plan/__tests__/route.test.ts` | Plan creation, encounter linking, versioning |
| Hub create-order | `apps/web/src/app/api/prevention/hub/create-order/__tests__/route.test.ts` | Order creation, audit logging |
| Hub create-referral | `apps/web/src/app/api/prevention/hub/create-referral/__tests__/route.test.ts` | Referral creation |
| Hub create-task | `apps/web/src/app/api/prevention/hub/create-patient-task/__tests__/route.test.ts` | Task creation |
| Hub mark-complete | `apps/web/src/app/api/prevention/hub/mark-complete/__tests__/route.test.ts` | Completion workflow |
| Prevention history | `apps/web/src/app/api/prevention/history/__tests__/route.test.ts` | Timeline, compliance, versioning |
| Screenings | `apps/web/src/app/api/prevention/screenings/__tests__/route.test.ts` | Screening CRUD |
| Notifications | `apps/web/src/app/api/prevention/notifications/__tests__/route.test.ts` | Notification delivery |
| Governance events | `apps/web/src/lib/clinical/__tests__/governance-events.test.ts` | Event emission |
| Enterprise flywheel | `apps/web/src/lib/enterprise/__tests__/phase5-flywheel.test.ts` | Flywheel logic |
| Governance contract | `apps/web/tests/governance-event-contract.test.ts` | Schema validation |
| Reminder lifecycle | `apps/web/tests/reminders/reminder-policy.lifecycle.test.ts` | Retry state machine |

**Pre-existing test failures (not caused by recent work):**
- `src/lib/email/__tests__/email-queue.test.ts` — 5 failures (Resend mock + null vs undefined)
- `src/lib/clinical/safety/__tests__/attestation-gate.test.ts` — 3 failures (72h boundary)
- `src/lib/deid/__tests__/hard-gate-usage.test.ts` — 2 failures (missing co-pilot/page.tsx)
- `src/lib/clinical/__tests__/governance-events.test.ts` — 1 failure

### 2.10 Known TypeScript Issues (254 errors — non-blocking)

**Status:** 254 TypeScript errors documented in `docs/TYPESCRIPT_ERRORS_REMAINING.md`. These are **non-blocking** for feature development but should be addressed before production launch.

**Error breakdown by type:**

| Error Code | Count | Description |
|------------|-------|-------------|
| TS2353 | 100 | Object literal may only specify known properties |
| TS2339 | 53 | Property does not exist on type |
| TS7006 | 26 | Parameter implicitly has 'any' type |
| TS2345 | 26 | Argument of type X not assignable to parameter Y |
| TS2322 | 12 | Type X not assignable to type Y |
| TS2304 | 10 | Cannot find name |
| TS1117 | 10 | Duplicate properties |
| Others | 17 | Various |

**Major issues requiring manual fixes:**

1. **Missing Prisma models** (53 errors) — `dataQualityEvent`, `userBehaviorEvent`, `accessReasonAggregate` referenced but not in schema
2. **Patient query field mismatches** (100+ errors) — Missing `notes` on Medication, `name` on Document, field name inconsistencies
3. **Test file errors** (26 errors) — `.skip.ts` files with type issues

**Files most affected:**
- `apps/web/src/app/api/fhir/r4/Patient/route.ts`
- `apps/web/src/app/api/patients/import/route.ts`
- `apps/web/src/app/api/patients/[id]/context/route.ts`
- `apps/web/src/app/api/patients/[id]/route.ts`
- `apps/web/src/app/api/patients/route.ts`

**Recommendation:** Address these before production launch, but they do not block feature development or testing.

---

## 3) Unstaged Changes in Working Tree

These files are modified or new but NOT yet committed. The next agent should be aware:

**Modified (already tracked):**
- `.env.production.secrets.template` — new env vars
- `apps/web/.env.production.template` — new env vars
- `apps/web/Dockerfile.prod` — production Docker updates
- `apps/web/prisma/schema.prisma` — enterprise phase 5 schema additions
- `apps/web/src/app/api/cds/evaluate/route.ts` — CDS updates
- `apps/web/src/app/api/enterprise/bulk-assessment/route.ts` — enterprise auth additions
- `apps/web/src/app/api/enterprise/risk-assessment/route.ts` — enterprise auth additions
- `apps/web/src/app/api/traffic-light/route.ts` — traffic light updates
- `apps/web/src/app/dashboard/admin/formulary/actions.ts` — formulary refactor
- `apps/web/src/app/dashboard/admin/formulary/page.tsx` — formulary UI update
- `apps/web/src/app/enterprise/analytics/page.tsx` — analytics enhancements
- `apps/web/src/app/enterprise/assessments/page.tsx` — assessments redesign
- `apps/web/src/app/enterprise/dashboard/page.tsx` — dashboard KPI expansion
- `apps/web/src/app/enterprise/layout.tsx` — layout nav updates
- `apps/web/src/lib/clinical/__tests__/governance-events.test.ts` — test fix
- `apps/web/src/lib/env.ts` — new env var validation
- `data/master/tuss.json` — expanded TUSS catalog (50 codes)
- `packages/shared-kernel/index.d.ts` — new types
- `tsconfig.tsbuildinfo` — build cache

**Untracked (new files, not yet staged):**
- Enterprise flywheel, outcomes, usage, webhooks routes + pages + services (see section 2.2)
- Enterprise phase 5 migration SQL
- Sentry client config

---

## 4) Agent Handoff Protocol

### 4.1 Required information per agent lane

Every agent MUST report on completion:

```
1. Branch name: agent/<lane>-<YYYY-MM-DD>
2. Commit SHA: <full 40-char SHA>
3. Files changed: <exact list with +/- line counts>
4. Files NOT changed (but read): <list>
5. Acceptance criteria: <each criterion PASS/FAIL with evidence>
6. Commands run + output summary:
   - npx tsc --noEmit (typecheck)
   - npx jest --passWithNoTests (tests)
   - any domain-specific validation
7. Risks/blockers: <list>
8. Merge readiness: READY / BLOCKED (with reason)
```

### 4.2 CRITICAL: Git protocol

Per `CLAUDE.md`, agents are FORBIDDEN from running `git commit` or `git push`. The human owner executes all commits. Agents draft commit messages only.

### 4.3 Integrator merge protocol

1. Merge order: determined by dependency graph (schema first, then services, then UI).
2. After each merge: `npx tsc --noEmit` must pass.
3. After all merges: full test suite.
4. Tag format: `demo-cortex-YYYY-MM-DD-r<N>`
5. If any merge breaks typecheck: stop, report, do not continue.

### 4.4 File ownership rules

- Each agent owns an explicit file list.
- No agent may edit files outside their list.
- If blocked by out-of-scope bug: report it, do not fix it.
- Shared types: only one agent owns; others consume read-only.

---

## 5) Validation Commands

```bash
# Typecheck (from repo root)
npx tsc --noEmit

# Run all tests (from apps/web)
cd apps/web && npx jest --passWithNoTests

# Run specific test file
cd apps/web && npx jest src/app/api/prevention/hub/__tests__/route.test.ts

# Prisma schema validation
cd apps/web && npx prisma validate

# Prisma generate (after schema changes)
cd apps/web && npx prisma generate

# Clinical bundle build (dry run)
tsx scripts/clinical/build-content-bundle.ts --dry-run
```

---

## 6) Current Feature Coverage

### PRD Coverage (FR-A through FR-D)

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

### Prevention Hub (Phase 7)

| Feature | Status | Key file(s) |
|---------|--------|-------------|
| Template CRUD + versioning | DONE | Templates API routes, VersionHistory component |
| Template collaboration (comments) | DONE | CommentsSection, comments API |
| Template sharing (permissions) | DONE | ShareTemplateModal, share API |
| Template detail page (integration) | DONE | `templates/[id]/page.tsx` |
| Collaboration indicators on list | DONE | `templates/page.tsx` (badges + clickable) |
| Bulk operations | DONE | BulkActionToolbar, bulk API routes |
| Reminder management dashboard | DONE | `reminders/page.tsx`, reminders API |
| Notification preferences UI | DONE | `settings/page.tsx`, preferences API |
| Real-time prevention detection | DONE | `useRealtimePreventionUpdates`, PreventionHubSidebar |
| Prevention Hub AI (longitudinal) | DONE | `hub/page.tsx`, hub API routes |
| Plan status management | DONE | Status API, undo API, StatusHistoryTimeline |
| Quick navigation | DONE | Prevention main page grid |

### Enterprise / Insurer Portal

| Feature | Status | Key file(s) |
|---------|--------|-------------|
| Single-patient risk assessment API | DONE | `risk-assessment/route.ts` |
| Bulk assessment API | DONE | `bulk-assessment/route.ts` |
| API key auth (constant-time) | DONE | `lib/enterprise/auth.ts` |
| Rate limiting (sliding window) | DONE | `lib/enterprise/rate-limiter.ts` |
| Insurer dashboard | DONE | `enterprise/dashboard/page.tsx` |
| Assessments page | DONE | `enterprise/assessments/page.tsx` |
| Analytics (charts) | DONE | `enterprise/analytics/page.tsx` |
| TUSS catalog (50 codes) | DONE | `data/master/tuss.json` |
| Flywheel + outcomes + usage + webhooks | UNSTAGED | See section 3 |

### Beyond PRD

| Capability | Status | Key file(s) |
|------------|--------|-------------|
| Content provenance pipeline | DONE | `content-types.ts`, `content-registry.ts`, `content-loader.ts` |
| Clinical governance lifecycle | DONE | `governance-policy.ts`, `CLINICAL_CONTENT_GOVERNANCE_V1.md` |
| Mobile-first landing UX | DONE | Landing components |
| DB governance schema | DONE | `schema.prisma`, governance migration |
| Governance persistence hardening | DONE | `governance.service.ts`, `adversarial-auditor.service.ts` |
| Formulary admin module | DONE | `admin/formulary/` |
| WCAG AA accessibility | DONE | All component files |

---

## 7) What Remains

### 🚨 CRITICAL BLOCKER (Business/Legal — blocks launch)
**Vendor BAA Signatures (0/8 complete) — 2-4 week timeline**

Signed Business Associate Agreements (BAAs) required from:
1. **Medplum** (FHIR server) — Handles PHI
2. **Upstash** (Redis) — Caches session data
3. **Anthropic** (Claude AI) — Processes clinical data
4. **Deepgram** (Transcription) — Processes patient recordings
5. **Sentry** (Error tracking) — May capture PHI in errors
6. **DigitalOcean** (Hosting) — Stores all data
7. **Twilio** (SMS/Voice) — Patient communications
8. **Resend** (Email) — Patient notifications

**Status:** BAA templates ready (`/legal/BAA_TEMPLATE.md`, `/legal/DPA_TEMPLATE.md`), vendor outreach emails drafted. Awaiting legal/business team execution.

---

### Code work (next priorities):
1. **Address 254 TypeScript errors** — non-blocking but should be fixed before production launch
2. **Commit the unstaged enterprise Phase 5 files** (flywheel, outcomes, usage, webhooks)
3. **Fix 11 pre-existing test failures** (email-queue, attestation-gate, hard-gate-usage, governance-events)
4. **Run `npx prisma migrate`** for the enterprise phase 5 migration
5. **Add missing Prisma models** (`dataQualityEvent`, `userBehaviorEvent`, `accessReasonAggregate`) or remove references

### Operational (not code):
1. **Vendor BAA execution** — legal/business team to complete vendor outreach and follow-up
2. **Live pilot kickoff** with real patient data (Bolivia first)
3. **First real board packet export** from production traffic
4. **Clinical sign-off** on rule pack v1 (use `CLINICAL_SIGNOFF_TEMPLATE.md`)
5. **External dataset integration** when US access granted (use content pipeline)
6. **Formal PRD sign-off** from all function leads
7. **Load testing** — 100 concurrent users (optional, non-blocking)
8. **On-call rotation scheduling** (operational, non-blocking)
