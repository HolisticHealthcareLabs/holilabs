# MASTER PROMPT — Parallel Claude Code CLI Session
# Copy everything between the === lines into your new CLI session.
# Run this in ~/prototypes/holilabsv2

=======================================================================
CONTEXT DUMP — READ BEFORE ACTING ON ANYTHING

You are a senior staff engineer on the Holi Labs platform. You operate
inside a monorepo at ~/prototypes/holilabsv2 using pnpm workspaces +
Turborepo. A parallel Claude Code session (Session 1) is currently
repairing build errors in apps/web. You must not touch any file that
Session 1 owns.

SESSION 1 OWNS — DO NOT TOUCH:
  apps/web/src/lib/api/middleware.ts
  apps/web/src/lib/ai/gateway.ts
  apps/web/src/lib/api/audit-buffer.ts
  apps/web/src/lib/escalations/escalation-service.ts
  apps/web/src/components/onboarding/**
  apps/web/src/components/patients/**
  apps/web/src/legacy_archive/**
  apps/web/src/app/layout.tsx
  apps/web/src/app/actions/onboarding.ts
  apps/web/.next/
  apps/web/.turbo/

YOUR SAFE ZONES — YOU MAY CREATE/EDIT FREELY:
  packages/data-ingestion/**        (✅ built by prior session, needs fixes)
  packages/event-bus/**             (NEW — you will create this)
  packages/prevention-engine/**     (NEW — you will create this)
  packages/fhir-canonical/**        (NEW — you will create this)
  apps/web/src/app/api/ingest/**    (✅ built by prior session, new file)
  apps/web/src/app/api/events/**    (NEW — you will create this)
  apps/web/src/app/api/prevention/**  (NEW — you will create this)
  apps/web/src/app/api/sync/**      (NEW — you will create this)
  prisma/schema.prisma              (ONLY ADDITIVE — append new models, never edit existing)
  docs/**                           (read freely, write if needed)

READ-ONLY (import from, never edit):
  packages/shared-types/
  packages/shared-kernel/
  packages/schemas/
  packages/utils/
  apps/web/src/lib/prisma.ts
  apps/web/src/lib/auth/
  prisma/schema.prisma              (read to understand models)

══════════════════════════════════════════════════════════════════════

WHAT HAS ALREADY BEEN BUILT (DO NOT REBUILD):

packages/data-ingestion/ — Source-agnostic ingestion pipeline (complete)
  • src/types/index.ts              — CanonicalHealthRecord + all payload types
  • src/connectors/fhir.connector.ts — FHIR R4 connector
  • src/connectors/csv.connector.ts  — CSV/Excel connector
  • src/connectors/rest.connector.ts — REST API connector
  • src/connectors/base.connector.ts — Abstract base class
  • src/validators/canonical.validator.ts — ELENA + CYRUS invariants
  • src/pipeline/ingestion.pipeline.ts    — Orchestrator
  • src/pipeline/__tests__/ingestion.pipeline.test.ts — Unit tests
  • src/index.ts                    — Public API surface
  NOTE: This package has a build error in tsconfig/shared-kernel — fix first.

apps/web/src/app/api/ingest/route.ts — POST /api/ingest endpoint (complete)
  • RBAC-guarded (ADMIN or DATA_STEWARD role)
  • Tenant-isolated
  • Audit logged
  • Maps valid records to existing LabResult + HealthMetric Prisma models

docs/HEALTH3_FINAL_ARCHITECTURE.md — AUTHORITATIVE system design document
docs/PARALLEL_DEV_RULES.md         — Session isolation rules
packages/data-ingestion/SCHEMA_ADDITION.prisma — Prisma models to merge

══════════════════════════════════════════════════════════════════════

YOUR MISSION — Execute in this exact order. Do not skip steps.

## STEP 0: Orient yourself (5 minutes)
Run these commands to understand current state:
  cat docs/HEALTH3_FINAL_ARCHITECTURE.md
  cat packages/data-ingestion/SCHEMA_ADDITION.prisma
  cat apps/web/src/app/api/ingest/route.ts
  ls packages/
  head -50 prisma/schema.prisma

## STEP 1: Fix packages/data-ingestion build error (30 min)

The package fails to build because of a TypeScript issue in shared-kernel.
Run: cd packages/data-ingestion && pnpm build 2>&1 | head -30

The error is likely:
  "../shared-kernel/index.d.ts(10,43): error TS1005: ';' expected"

Fix options (try in order):
  A. Add "composite": false to packages/data-ingestion/tsconfig.json
  B. Exclude shared-kernel from data-ingestion's tsconfig references
  C. Add "skipLibCheck": true to data-ingestion tsconfig.json

After fixing: run from monorepo root:
  pnpm --filter @holi/data-ingestion test
All tests should pass. Report results.

## STEP 2: Add @holi/data-ingestion to apps/web (10 min)

  1. Edit apps/web/package.json:
     Add to "dependencies":
       "@holi/data-ingestion": "workspace:*"

  2. Run: pnpm install from monorepo root

  3. Verify apps/web/src/app/api/ingest/route.ts still type-checks:
     cd apps/web && pnpm tsc --noEmit 2>&1 | grep "data-ingestion"

## STEP 3: Merge SCHEMA_ADDITION.prisma into prisma/schema.prisma (15 min)

  1. Read packages/data-ingestion/SCHEMA_ADDITION.prisma
  2. Append the three models (DataSource, IngestionJob, IngestedRecord)
     to the END of prisma/schema.prisma
     — DO NOT modify any existing model
     — DO NOT change any existing relation
  3. Run: npx prisma validate
  4. Run: npx prisma migrate dev --name add_health3_ingestion_tables
  5. Run: npx prisma generate
  6. Verify migration ran: ls prisma/migrations/ | tail -3

## STEP 4: Build packages/event-bus (2–3 hours)

Create a NEW package: packages/event-bus/

This package wraps Redis Streams for typed clinical event pub-sub.
Reference docs/HEALTH3_FINAL_ARCHITECTURE.md Section 2.5 for event schema.

Package structure:
  packages/event-bus/
  ├── package.json
  ├── tsconfig.json
  └── src/
      ├── index.ts              # Public API
      ├── types.ts              # ClinicalEvent union type (from arch doc)
      ├── publisher.ts          # EventPublisher class
      ├── subscriber.ts         # EventSubscriber class
      └── __tests__/
          └── event-bus.test.ts # Unit tests (mock ioredis)

Implementation notes:
  - Use ioredis (already in monorepo deps, check package.json)
  - Publisher: XADD to stream "clinical:{eventType}"
  - Subscriber: XREAD with blocking (0ms timeout for tests, 1000ms for prod)
  - Each event must have: { eventId, type, payload, timestamp, tenantId }
  - CYRUS invariant: NO patient PHI in event payloads — use patientId refs only
  - Use jest.mock('ioredis') in tests

Acceptance criteria:
  pnpm --filter @holi/event-bus test → all tests pass
  pnpm --filter @holi/event-bus build → no TypeScript errors

## STEP 5: Build packages/prevention-engine (2–3 hours)

Create a NEW package: packages/prevention-engine/

This package evaluates CanonicalHealthRecord objects against clinical rules
and emits prevention alerts via the event-bus.

Reference docs/HEALTH3_FINAL_ARCHITECTURE.md Section 2.6.

Package structure:
  packages/prevention-engine/
  ├── package.json
  ├── tsconfig.json
  └── src/
      ├── index.ts
      ├── types.ts              # PreventionAlert, ClinicalRule, RuleResult
      ├── rule-registry.ts      # Loads + indexes rules
      ├── evaluator.ts          # PreventionEvaluator class
      ├── rules/
      │   ├── lab-alerts.json   # HbA1c >5.7, Creatinine >1.2, K <3.0, etc.
      │   ├── vital-alerts.json # BP >140/90, SpO2 <94, Temp >38.5
      │   └── screening-gaps.json # Mammogram, colonoscopy, cervical guidelines
      └── __tests__/
          └── evaluator.test.ts

Key classes:
  PreventionEvaluator.evaluate(record: CanonicalHealthRecord, history: PatientHistory): PreventionAlert[]
  PreventionAlert: { alertId, patientId, rule, severity, message, actionRequired, citationUrl }

ELENA invariant (MANDATORY):
  Every rule in rules/*.json MUST have:
    { "ruleId": "...", "name": "...", "sourceAuthority": "...", "citationUrl": "...", ... }
  If citationUrl is missing → throw at rule load time, do not silently pass.
  LLM output MUST NOT be used as clinical recommendation without human review flag.

Acceptance criteria:
  pnpm --filter @holi/prevention-engine test → all tests pass
  All rules in rules/*.json have sourceAuthority + citationUrl populated

## STEP 6: Wire event-bus into the ingest API route (30 min)

Edit apps/web/src/app/api/ingest/route.ts:

After successful persistence (after the persistCanonicalRecords call):
  1. Import EventPublisher from @holi/event-bus
  2. For each valid record, publish "record.ingested" event
  3. For each invalid record, publish "record.invalid" event
  4. DO NOT block the HTTP response on event publishing (fire and forget)
  5. Wrap in try/catch — event bus failure should not fail the API call

## STEP 7: Create SSE endpoint for real-time clinical events (1 hour)

Create NEW file: apps/web/src/app/api/events/stream/route.ts

This provides Server-Sent Events (SSE) for the clinician dashboard
to receive real-time prevention alerts.

Implementation:
  - Auth-gated (session required)
  - Subscribes to Redis Streams for the authenticated user's tenantId
  - Emits events as: "data: {json}\n\n"
  - Heartbeat every 30s to prevent connection timeout
  - Cleanup on client disconnect

## STEP 8: Run full test suite and report (30 min)

From monorepo root:
  pnpm test 2>&1 | tail -50

Report:
  - Which test suites pass
  - Which fail and why
  - Any new TypeScript errors introduced by your changes

If ANY test that was previously passing now fails → FIX IT before reporting.
Do not introduce regressions.

## STEP 9: Final integration check (15 min)

  1. pnpm build 2>&1 | grep -E "(Type error|ERROR|successfully|Tasks:)" | tail -20
  2. Confirm: "Tasks: N successful" where N includes @holi/data-ingestion,
     @holi/event-bus, and @holi/prevention-engine
  3. Confirm: apps/web build still passes (Session 1's build fix must be preserved)
  4. Run: npx prisma validate (no schema errors)

══════════════════════════════════════════════════════════════════════

INVARIANTS — NEVER VIOLATE THESE

CYRUS (Security):
  1. Every new API route MUST use createProtectedRoute or auth() check
  2. Every patient data query MUST include tenantId filter
  3. PII fields (CPF, email) MUST NOT appear in event payloads
  4. AuditLog records MUST NOT be deleted
  5. New secrets → environment variables only, never hardcoded

ELENA (Clinical Safety):
  1. Missing lab value → INSUFFICIENT_DATA error, never impute silently
  2. Every clinical rule MUST have sourceAuthority + citationUrl
  3. LLM output MUST NOT be written as clinical recommendation without review flag
  4. Both Pathological AND Functional ranges required for biomarkers

RUTH (Legal/Compliance):
  1. Any SaMD-adjacent feature → add comment: // ANVISA SaMD: Class [I/II/III]
  2. Consent flows → granular (separate checkboxes for each data use)
  3. Cross-border data transfers → LGPD Art. 33 annotation required
  4. Deletion requests → must NOT destroy AuditLog

QUINN (Quality):
  1. Jest mocking: ALWAYS jest.mock() BEFORE require() — never ES6 import after mock
  2. Circuit breaker: 3 consecutive failures → stop, report CIRCUIT_BREAKER_TRIPPED
  3. Never commit if pnpm test exits non-zero
  4. No console.log in production code

══════════════════════════════════════════════════════════════════════

ARCHITECTURE REFERENCE

The final Health 3.0 architecture is documented in:
  docs/HEALTH3_FINAL_ARCHITECTURE.md

Key decisions that MUST be respected:
  1. FHIR R4 is the external interchange format; CanonicalHealthRecord is internal
  2. Event-driven for writes/alerts; request-response for reads
  3. Offline-first is required for apps/edge and apps/web PWA
  4. Blockchain/token roadmap is DEFERRED to 2028 — do not build
  5. Prevention engine rules require ELENA invariant compliance
  6. RNDS (Brazil national health records) connector is P1 priority

══════════════════════════════════════════════════════════════════════

REPORTING FORMAT

After completing each STEP, output a concise summary:

  ✅ STEP N COMPLETE
  Files created/modified: [list]
  Tests: [X passing, Y failing]
  Build status: [pass/fail]
  Blockers: [none OR describe]
  Next: STEP N+1

If you hit CIRCUIT_BREAKER_TRIPPED (3 failures on same issue):
  STOP. Output the error in full. Wait for human guidance.
  Do NOT attempt a 4th fix strategy autonomously.

══════════════════════════════════════════════════════════════════════

STARTING COMMAND

Begin with:
  cat docs/HEALTH3_FINAL_ARCHITECTURE.md | head -100
  ls packages/
  cd packages/data-ingestion && pnpm build 2>&1 | head -30

Then proceed with STEP 1.

=======================================================================
