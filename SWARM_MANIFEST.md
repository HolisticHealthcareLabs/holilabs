# SWARM MANIFEST — Dual-Track Traffic Control

> **Last Updated:** 2026-02-11
> **Owner:** CTO / Principal Architect
> **Status:** ACTIVE — All agents MUST read this before touching any file.
> **Cardinal Rule:** `apps/*` depends on `packages/*`. Never the reverse.

---

## 1. SWARM ROSTER

| Swarm ID | Codename | Track | Model Recommendation | Owns |
|----------|----------|-------|----------------------|------|
| **SWARM-C** | Clinic Bot | Track A (Bridge) | Anthropic Sonnet / GPT Codex High / Gemini Pro | `apps/clinic/` |
| **SWARM-E** | Enterprise Bot | Track B (Bet) | Anthropic Opus / GPT Codex Extra High / Gemini Ultra | `apps/enterprise/` |
| **SWARM-K** | Kernel Guardian | Shared Kernel | Anthropic Opus ONLY (senior agent) | `packages/shared-kernel/`, `data/clinical/` |
| **SWARM-I** | Infra Bot | Infrastructure | Anthropic Haiku / GPT Codex Fast / Gemini Flash | `infra/`, `scripts/`, `.github/`, `docker/` |

---

## 2. DIRECTORY OWNERSHIP MAP

### 2A. SWARM-K (Kernel Guardian) — THE NUCLEAR CODES

**Only senior agents touch these. Every PR requires manual review.**

```
packages/shared-kernel/           ← NEW (extracted from apps/web/src/lib/)
├── src/
│   ├── clinical/                 ← Protocol Engine (THE JEWEL)
│   │   ├── engines/              ← symptom-diagnosis, treatment-protocol, medication-adherence
│   │   ├── content-loader.ts     ← Bundle loading & validation
│   │   ├── content-registry.ts   ← In-memory rule registry
│   │   ├── content-types.ts      ← Provenance types
│   │   ├── governance-policy.ts  ← Content lifecycle (DRAFT→ACTIVE→DEPRECATED)
│   │   ├── lab-decision-rules.ts ← DOAC safety rules
│   │   ├── lab-reference-ranges.ts
│   │   ├── rule-engine.ts        ← Core deterministic engine
│   │   ├── process-clinical-decision.ts
│   │   ├── process-with-fallback.ts
│   │   ├── compliance-rules.ts
│   │   └── index.ts
│   ├── governance/               ← Governance service & types
│   │   ├── governance.service.ts
│   │   ├── governance.rules.ts
│   │   ├── rules-manifest.ts
│   │   ├── auto-promoter.ts
│   │   ├── shared-types.ts       ← Override reasons, event interfaces
│   │   └── rules-db-seed.ts
│   ├── auth/                     ← Auth & RBAC
│   │   ├── auth.ts
│   │   ├── auth.config.ts
│   │   ├── casbin.ts
│   │   ├── casbin-adapter.ts
│   │   ├── casbin-middleware.ts
│   │   ├── mfa.ts
│   │   ├── otp.ts
│   │   ├── session-security.ts
│   │   ├── session-store.ts
│   │   ├── token-revocation.ts
│   │   ├── password-validation.ts
│   │   └── server.ts
│   ├── consent/                  ← LGPD Consent Management
│   │   ├── consent-guard.ts
│   │   ├── recording-consent.ts
│   │   ├── expiration-checker.ts
│   │   └── version-manager.ts
│   ├── audit/                    ← Audit logging
│   │   ├── audit.ts
│   │   ├── bemi-context.ts
│   │   └── deid-audit.ts
│   ├── types/                    ← Shared type definitions
│   │   ├── PatientProfile.ts     ← Universal Patient (Clinic + Enterprise views)
│   │   ├── ProtocolOutput.ts     ← Protocol Engine output contract
│   │   ├── AuditEvent.ts
│   │   ├── GovernanceEvent.ts
│   │   └── index.ts
│   ├── fhir/                     ← FHIR interop
│   ├── brazil-interop/           ← TISS serializer, IPS exporter
│   ├── ehr/                      ← EHR abstraction layer
│   ├── cds/                      ← CDS Hooks engine
│   ├── repositories/             ← Data access layer
│   ├── encryption.ts
│   └── index.ts                  ← Public API barrel
├── prisma/
│   └── schema.prisma             ← SINGLE SOURCE OF TRUTH for DB schema
├── package.json
└── tsconfig.json

packages/deid/                    ← De-identification (existing)
packages/dp/                      ← Differential Privacy (existing)
packages/schemas/                 ← Zod validators (existing)
packages/shared-types/            ← TS interfaces (existing, will merge into kernel)
packages/utils/                   ← Logger, crypto (existing)
packages/policy/                  ← OPA/Rego rules (existing)

data/clinical/
├── sources/                      ← Raw rule JSON files
│   ├── contraindications-v1.json
│   ├── dosing-v1.json
│   └── interactions-v1.json
└── bundles/
    └── latest.json               ← Built bundle (checksummed)
```

**SWARM-K Rules:**
- ✅ CAN: Modify protocol engine logic, governance rules, auth flows, type definitions
- ✅ CAN: Run `prisma migrate` (ONLY swarm with this authority)
- ✅ CAN: Update clinical data bundles
- ❌ CANNOT: Touch React components, UI, or any `apps/*/src/components/` file
- ❌ CANNOT: Add app-specific business logic (e.g., appointment scheduling)
- ⚠️ GATE: Every PR must pass `pnpm -C packages/shared-kernel typecheck && pnpm test`

---

### 2B. SWARM-C (Clinic Bot) — Track A

```
apps/clinic/                      ← Renamed from apps/web (Clinic-specific code)
├── src/
│   ├── app/                      ← Next.js pages & API routes
│   │   ├── auth/                 ← Login, Register, Reset Password pages
│   │   ├── dashboard/            ← Dashboard pages (patients, appointments, console, etc.)
│   │   ├── access/               ← Access request page
│   │   ├── api/
│   │   │   ├── appointments/     ← All appointment CRUD & reminders
│   │   │   ├── notifications/    ← Push, email, in-app notifications
│   │   │   ├── forms/            ← Patient intake forms
│   │   │   ├── invoices/         ← Billing & invoicing
│   │   │   ├── calendar/         ← Google/Apple/MS calendar sync
│   │   │   ├── conversations/    ← In-app messaging
│   │   │   ├── images/           ← Image upload
│   │   │   ├── imaging/          ← DICOM viewer routes
│   │   │   ├── command-center/   ← Device management, events
│   │   │   ├── downloads/        ← Sidecar download
│   │   │   ├── onboarding/       ← Profile setup
│   │   │   ├── reminders/        ← WhatsApp/email reminders
│   │   │   ├── beta-signup/
│   │   │   ├── export/           ← Billing export
│   │   │   ├── feedback/
│   │   │   └── tasks/            ← Task management
│   │   └── (landing pages)
│   ├── components/               ← ALL React UI components
│   │   ├── landing/              ← Marketing site components
│   │   ├── onboarding/           ← Onboarding flows
│   │   ├── patients/             ← Patient list, detail, form
│   │   ├── appointments/         ← Calendar, booking
│   │   ├── chat/                 ← In-app messaging UI
│   │   ├── scribe/               ← Medical scribe UI
│   │   ├── co-pilot/             ← CoPilot dashboard tiles
│   │   ├── dashboard/            ← Dashboard widgets
│   │   ├── notifications/        ← Notification bell, center
│   │   ├── portal/               ← Patient portal
│   │   ├── invoices/             ← Invoice forms
│   │   ├── messaging/            ← Reminder management
│   │   ├── imaging/              ← DICOM viewer
│   │   ├── video/                ← Telehealth video
│   │   ├── templates/            ← Note templates
│   │   ├── email/                ← Email templates
│   │   ├── upload/               ← File upload
│   │   └── ui/                   ← Toast, Dialog primitives
│   ├── hooks/                    ← Clinic-specific hooks
│   │   ├── useNotifications.ts
│   │   ├── usePatientFilters.ts
│   │   ├── useDebounce.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useTheme.ts
│   │   ├── useLanguage.ts
│   │   └── useVoiceCommands.ts
│   ├── contexts/
│   │   └── LanguageContext.tsx
│   └── lib/                      ← Clinic-specific lib (NOT shared)
│       ├── appointments/         ← Scheduling logic
│       ├── calendar/             ← Calendar sync
│       ├── chat/                 ← Socket client
│       ├── demo/                 ← Demo data generators
│       ├── email/                ← Email service, templates
│       ├── export/               ← PDF/Excel export
│       ├── notifications/        ← Reminder policy, appointment reminders
│       ├── socket/               ← Real-time events
│       └── transcription/        ← Audio streaming
├── public/                       ← Static assets, icons, logos
├── next.config.js
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

**SWARM-C Rules:**
- ✅ CAN: Modify any file under `apps/clinic/`
- ✅ CAN: Import from `packages/shared-kernel` and other `packages/*`
- ✅ CAN: Add new components, hooks, pages, clinic API routes
- ❌ CANNOT: Modify `packages/shared-kernel/` (request changes from SWARM-K)
- ❌ CANNOT: Modify `apps/enterprise/` (zero access)
- ❌ CANNOT: Run `prisma migrate` (request from SWARM-K)
- ❌ CANNOT: Touch ML models, Python code, or data ingestion pipelines
- ⚠️ GATE: `pnpm -C apps/clinic typecheck && pnpm -C apps/clinic lint`

---

### 2C. SWARM-E (Enterprise Bot) — Track B

```
apps/enterprise/                  ← NEW APPLICATION
├── src/
│   ├── app/                      ← Next.js pages (Enterprise Dashboard)
│   │   ├── dashboard/
│   │   │   ├── overview/         ← Insurer overview, KPIs
│   │   │   ├── risk-cohorts/     ← Patient risk stratification
│   │   │   ├── sinistralidade/   ← Loss ratio analytics
│   │   │   └── benchmarking/     ← Cross-hospital comparison
│   │   └── api/
│   │       ├── telemetry/        ← Telemetry stream & ingest
│   │       ├── analytics/        ← Dashboard analytics
│   │       ├── risk-scores/      ← Risk score CRUD
│   │       ├── tiss-ingest/      ← TISS/TUSS claims ingestion
│   │       ├── hl7/              ← HL7 ADT/ORU message handling
│   │       ├── predictions/      ← Hospitalization prediction API
│   │       ├── cohorts/          ← Cohort management
│   │       ├── reports/          ← Insurer reports generation
│   │       └── webhooks/         ← Insurer event webhooks
│   ├── components/               ← Enterprise-specific UI
│   │   ├── dashboard/            ← KPI widgets, charts
│   │   ├── risk/                 ← Risk cards, cohort tables
│   │   ├── analytics/            ← Analytics visualizations
│   │   └── reports/              ← Report templates
│   ├── hooks/
│   │   ├── useAgent.ts
│   │   ├── useAnalytics.ts
│   │   └── useToolUsageTracker.ts
│   ├── contexts/
│   │   └── AgentContext.tsx
│   └── lib/                      ← Enterprise-specific lib
│       ├── ai/                   ← LLM providers, prompt builders
│       │   ├── anthropic-provider.ts
│       │   ├── gemini-provider.ts
│       │   ├── factory.ts
│       │   ├── router.ts
│       │   ├── embeddings.ts
│       │   ├── confidence-scoring.ts
│       │   ├── consensus-verifier.ts
│       │   └── usage-tracker.ts
│       ├── ml/                   ← ML models
│       │   ├── clustering.ts
│       │   ├── risk-model.ts     ← NEW: Hospitalization risk prediction
│       │   └── sinistralidade-forecast.ts  ← NEW
│       ├── analytics/            ← Server analytics
│       ├── aws/                  ← Comprehend Medical
│       ├── tiss/                 ← NEW: TISS/TUSS parsing
│       │   ├── parser.ts
│       │   ├── normalizer.ts
│       │   └── types.ts
│       └── reports/              ← NEW: Report generation
├── python/                       ← Python ML service
│   ├── api/                      ← FastAPI endpoints
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── predict.py        ← /predict/hospitalization
│   │   │   ├── ingest.py         ← /ingest/tiss
│   │   │   └── health.py
│   │   └── models/
│   │       ├── risk_model.py     ← XGBoost/LightGBM risk scoring
│   │       ├── sinistralidade.py ← Time series forecasting
│   │       └── feature_eng.py    ← Feature engineering from claims
│   ├── requirements.txt
│   └── Dockerfile
├── package.json
└── tsconfig.json
```

**SWARM-E Rules:**
- ✅ CAN: Modify any file under `apps/enterprise/`
- ✅ CAN: Import from `packages/shared-kernel` and other `packages/*`
- ✅ CAN: Create Python services, ML models, data pipelines
- ✅ CAN: Add new enterprise API routes, dashboard components
- ❌ CANNOT: Modify `packages/shared-kernel/` (request changes from SWARM-K)
- ❌ CANNOT: Modify `apps/clinic/` (zero access)
- ❌ CANNOT: Run `prisma migrate` (request from SWARM-K)
- ❌ CANNOT: Touch patient-facing UI, WhatsApp, or appointment logic
- ⚠️ GATE: `pnpm -C apps/enterprise typecheck && cd apps/enterprise/python && pytest`

---

### 2D. SWARM-I (Infra Bot)

```
.github/workflows/                ← CI/CD pipelines
Dockerfile                        ← Container builds
docker/                           ← Docker compose configs
infra/                            ← Terraform / Pulumi
nginx/                            ← Reverse proxy
monitoring/                       ← Prometheus/Grafana
k6/                               ← Load testing
scripts/                          ← Build & deployment scripts
configs/                          ← Doc automation configs
```

**SWARM-I Rules:**
- ✅ CAN: Modify infrastructure, CI/CD, Docker, monitoring
- ✅ CAN: Update build scripts and deployment configs
- ❌ CANNOT: Modify application code in `apps/` or `packages/`
- ❌ CANNOT: Change database schema or run migrations

---

## 3. THE DEPENDENCY RULE (Enforced)

```
                    ┌─────────────────────┐
                    │  apps/clinic        │──────┐
                    └─────────────────────┘      │
                                                 ▼
                    ┌─────────────────────┐  ┌──────────────────────┐
                    │  apps/enterprise    │──│  packages/shared-    │
                    └─────────────────────┘  │  kernel              │
                                             │  packages/deid       │
                    ┌─────────────────────┐  │  packages/schemas    │
                    │  apps/sidecar       │──│  packages/utils      │
                    └─────────────────────┘  │  packages/dp         │
                                             │  packages/policy     │
                    ┌─────────────────────┐  └──────────────────────┘
                    │  apps/api           │──────┘
                    └─────────────────────┘

    Direction: LEFT → RIGHT only.
    packages/* NEVER imports from apps/*.
    apps/clinic NEVER imports from apps/enterprise.
    apps/enterprise NEVER imports from apps/clinic.
```

### Enforcement Mechanism

Add to root `turbo.json`:
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    }
  }
}
```

Add to each app's `package.json`:
```json
// apps/clinic/package.json
{
  "dependencies": {
    "@holi/shared-kernel": "workspace:*",
    "@holi/schemas": "workspace:*",
    "@holi/utils": "workspace:*"
  }
}

// apps/enterprise/package.json
{
  "dependencies": {
    "@holi/shared-kernel": "workspace:*",
    "@holi/schemas": "workspace:*",
    "@holi/dp": "workspace:*",
    "@holi/utils": "workspace:*"
  }
}
```

**Cross-import linting** (add to `.eslintrc.json` at root):
```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [
        { "group": ["apps/clinic/*"], "message": "Enterprise cannot import from Clinic." },
        { "group": ["apps/enterprise/*"], "message": "Clinic cannot import from Enterprise." }
      ]
    }]
  }
}
```

---

## 4. MIGRATION AUTHORITY

| Operation | SWARM-K | SWARM-C | SWARM-E | SWARM-I |
|-----------|---------|---------|---------|---------|
| `prisma migrate dev` | ✅ | ❌ | ❌ | ❌ |
| `prisma migrate deploy` | ❌ | ❌ | ❌ | ✅ (CI only) |
| Add column to core table (users, patients) | ✅ | ❌ | ❌ | ❌ |
| Create new extension table (e.g., `enterprise_risk_scores`) | ✅ (via PR from SWARM-E) | ❌ | ❌ (request) | ❌ |
| Modify clinical rules JSON | ✅ | ❌ | ❌ | ❌ |
| Build clinical content bundle | ✅ | ❌ | ❌ | ❌ |
| Push to `main` branch | ❌ | ❌ | ❌ | ✅ (after all gates pass) |

---

## 5. COLLISION PREVENTION PROTOCOL

### 5A. File Lock Rules

If two swarms need to modify the same file (e.g., `schema.prisma`):
1. SWARM requesting the change opens a "Schema Change Request" issue
2. SWARM-K reviews and implements the migration
3. Both swarms rebase after the migration merges
4. **No swarm waits longer than 4 hours** — if SWARM-K is slow, escalate to human CTO

### 5B. Interface Change Protocol

If SWARM-C needs a new field on `PatientProfile`:
1. SWARM-C opens PR titled `[KERNEL-REQUEST] Add field X to PatientProfile`
2. SWARM-K reviews, adds the field to `packages/shared-kernel/src/types/PatientProfile.ts`
3. SWARM-K publishes new version
4. Both SWARM-C and SWARM-E update their imports
5. **Total turnaround: < 2 hours**

### 5C. Branch Strategy

```
main
├── swarm-c/feature-name      ← Clinic features
├── swarm-e/feature-name      ← Enterprise features
├── swarm-k/migration-name    ← Kernel changes (merges FIRST)
└── swarm-i/infra-change      ← Infrastructure changes
```

**Merge order:** SWARM-K → SWARM-I → SWARM-C/SWARM-E (parallel after kernel merges)

---

## 6. ACCEPTANCE GATES (Per Swarm)

| Gate | SWARM-K | SWARM-C | SWARM-E |
|------|---------|---------|---------|
| TypeScript typecheck | `pnpm -C packages/shared-kernel tsc --noEmit` | `pnpm -C apps/clinic tsc --noEmit` | `pnpm -C apps/enterprise tsc --noEmit` |
| Lint | `pnpm -C packages/shared-kernel lint` | `pnpm -C apps/clinic lint` | `pnpm -C apps/enterprise lint` |
| Unit tests | `pnpm -C packages/shared-kernel test` | `pnpm -C apps/clinic test` | `pytest apps/enterprise/python/` |
| Integration test | Clinical bundle build + validate | Demo flow smoke test | TISS ingest + risk score pipeline |
| Secret scan | `gitleaks detect` | `gitleaks detect` | `gitleaks detect` |
| Scope check | No `apps/` imports | No `packages/shared-kernel/` writes | No `apps/clinic/` imports |
