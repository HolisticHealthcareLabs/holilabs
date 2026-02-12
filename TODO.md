# Phase 2: Production Hardening — Engineering TODO

**Status:** Active
**Start Date:** 2026-02-12
**Milestone:** `v1.0.0-SIMULATION-COMPLETE` → `v2.0.0-PRODUCTION-READY`

---

## Priority 1: Critical Path (Week 1-2)

### Database

- [ ] Run `prisma migrate deploy` to sync local DB with schema (missing columns: `lab_results.sampleCollectedAt`, `Medication.notes`, `patients.organizationId`)
- [ ] Run `scripts/seed-master-data.ts` to populate clinical rules, billing codes, ICD-10, DOAC registry
- [ ] Validate master data seed against production DB schema (test on staging first)
- [ ] Create `_environment_marker` table for production safety check in `reset_db_for_prod.sql`

### CI/CD (Archie)

- [ ] Set up staging environment (separate DigitalOcean droplet or Docker Compose)
- [ ] Configure GitHub Actions: build → test → deploy-staging → smoke-test → deploy-prod
- [ ] Add pre-deploy hook: run `reset_db_for_prod.sql` safety check against target DB
- [ ] Set up database backup cron (pg_dump, daily, 30-day retention)
- [ ] Configure Sentry or equivalent error tracking for production

### Clinical Safety (Elena)

- [ ] Review and sign off on `data/clinical/sources/doac-rules.json` (20 rules) for production use
- [ ] Add real-world CrCl thresholds for Rivaroxaban CrCl < 30 (FDA guidance stricter than current < 15)
- [ ] Define RLHF activation criteria: minimum N overrides before training signal is used
- [ ] Create clinical escalation protocol: what happens when system is unsure (confidence < 0.7)

### Privacy & Legal (Ruth)

- [ ] Draft production LGPD privacy policy (patient-facing, Portuguese + Spanish)
- [ ] Draft HIPAA BAA template for US insurer partnerships
- [ ] Implement consent flow: WhatsApp opt-in for clinical data → separate opt-in for research data
- [ ] Activate `governance.consent.whatsapp.enabled` feature flag with proper consent tracking
- [ ] Define data retention policy: how long do governance logs persist?

---

## Priority 2: Core Features (Week 2-4)

### DOAC Safety Engine (Elena + Archie)

- [ ] Build `apps/web/src/lib/clinical/doac-evaluator.ts` — deterministic rule evaluation
- [ ] Build `apps/web/src/lib/clinical/attestation-gate.ts` — missing/stale data checks
- [ ] Build `apps/web/src/lib/clinical/override-handler.ts` — require reason + log governance event
- [ ] Build API routes: `POST /api/cds/evaluate`, `POST /api/cds/attestation`, `POST /api/cds/override`
- [ ] Tests: 85% line coverage, 95% branch coverage on all clinical logic
- [ ] Golden test fixtures: P-001 (CrCl=29 → BLOCK), P-002 (CrCl=31 → PASS), P-007 (Beers Criteria)

### Command Center KPIs (Paul + Victor)

- [ ] Build `apps/web/src/lib/kpi/kpi-queries.ts` — 4 KPIs: evaluations, blocks, overrides, attestations
- [ ] Build `apps/web/src/components/console/KPICard.tsx`, `KPIGrid.tsx`, `OverrideReasons.tsx`
- [ ] Build API route: `GET /api/kpi` with date range filter
- [ ] Dashboard shows real-time counts, not synthetic data

### Billing Integration (Victor)

- [ ] Connect TUSS billing codes to actual insurer API (Bolivia: ASSA, Nacional Vida)
- [ ] Build invoice generation from governance events (1 event = 1 bill, anti-duplicate)
- [ ] Implement BOB → USD conversion for VC reporting
- [ ] Monthly reconciliation report generator

---

## Priority 3: Scale Preparation (Week 4-6)

### RLHF Pipeline Activation (Elena + Ruth)

- [ ] Enable `rlhf.assurance.capture.enabled` after Ruth signs off on anonymizer
- [ ] Build air-gap anonymizer: Production DB → SHA-256 de-identification → Research Lake
- [ ] Implement temporal reconciliation: link override at T=0 to lab outcome at T+24/72h
- [ ] Build adjudication engine: CASE_A (AI correct), CASE_B (Doctor correct), CASE_C (Neutral)
- [ ] WhatsApp micro-survey for missing lab outcomes (pending IRB approval)

### Component Library (Paul)

- [ ] Extract reusable components from pilot UI into `packages/ui/`
- [ ] Design system: tokens, typography, color palette (medical-safe colors)
- [ ] Build patient card component, risk badge component, override modal
- [ ] Accessibility audit: WCAG 2.1 AA compliance

### Multi-Clinic Support (Archie)

- [ ] Add `organizationId` to all relevant tables (patients, governance_logs, etc.)
- [ ] Implement tenant isolation: clinic A cannot see clinic B's data
- [ ] Build clinic onboarding script: create org → seed master data → create admin user
- [ ] Test with 2 clinics: El Alto (existing) + Santa Cruz (new)

---

## Deferred (Post-MVP)

- [ ] Non-DOAC clinical rules (diabetes screening, CV risk, Beers full criteria)
- [ ] WhatsApp reminder system (manual follow-up sufficient for < 50 patients)
- [ ] Week-over-week trend charts (need historical data first)
- [ ] `packages/shared-kernel/` extraction (wait for duplication to appear naturally)
- [ ] Peru/Colombia/Brazil expansion (market validation needed first)
- [ ] Mobile app (Expo) for clinician rounds (web app works on tablets for now)

---

## Completed (Phase 1 — Archived)

- [x] 18 synthetic patients seeded (tagged `v1.0.0-SIMULATION-COMPLETE`)
- [x] Clinical FRR Phase 1 passed (Elena: 100% accuracy)
- [x] Revenue Audit Phase 1 passed (Victor: 42,750 BOB TPV, zero leakage)
- [x] Legal Trace Phase 1 passed (Ruth: HIPAA + LGPD compliant)
- [x] Weekly Business Review generated (55.6x ROI)
- [x] VC Email Draft sent to a16z/Kaszek
- [x] Pilot artifacts archived to `_archive/series_b_pilot/`
- [x] Master data seed script created (`scripts/seed-master-data.ts`)
- [x] Database reset script created (`scripts/reset_db_for_prod.sql`)

---

## Key Commands

```bash
# Seed master data (The Brain)
cd apps/web && pnpm exec tsx ../../scripts/seed-master-data.ts

# Reset database (The Broom) — LOCAL/STAGING ONLY
psql $DATABASE_URL -f scripts/reset_db_for_prod.sql

# Verify git tag
git tag -l 'v1.0.0*'

# Roll back to pilot state (if investors ask for replay)
git checkout v1.0.0-SIMULATION-COMPLETE
```
