# Migration: 20260406000000_agent_schema_hardening

**Date:** April 6, 2026  
**Author:** Agent-Driven Schema Hardening (ARCHIE + CYRUS)  
**Status:** Generated (not yet run)

## Overview

This migration adds 11+ models for EHR/FHIR interoperability, clinical governance completeness, and enterprise security features. It also extends the TrafficLightColor enum with a GREY value.

## Tables Created (13 Core)

### EHR Integration (FHIR & OAuth)
1. **ehr_sessions** — OAuth 2.0 token storage for SMART on FHIR integration
   - Stores access tokens, refresh tokens, FHIR server context
   - Supports multiple EHR providers (Epic, Cerner, Athena, etc.)

2. **oauth_states** — Temporary OAuth state storage during auth flow
   - Idempotent, expires after 10 minutes
   - Prevents CSRF attacks with state verification

### Clinical Governance & Safety
3. **assurance_events** — Quality and safety event tracking
4. **human_feedback** — Clinician feedback for model improvement
5. **outcome_ground_truths** — Ground truth outcomes for model training
6. **rule_versions** — Versioned governance rules
7. **clinical_referrals** — Clinical referral requests with priority/status
8. **override_clusters** — Pattern analysis for clinical overrides
9. **rule_proposals** — Clinician-proposed rules (draft → review → active)

### Network & Billing
10. **clinician_networks** — Provider network affiliation mapping

### RBAC & Access Control
11. **role_assignments** — Delegated role-based access control (RBAC)

### User Behavior & Analytics
12. **user_behavior_events** — User action tracking for analytics
13. **access_reason_aggregates** — Hourly/daily access pattern aggregation
14. **data_quality_events** — Data quality issue tracking
15. **governance_rules** — Active governance rule registry

### Escalation & Communication
16. **escalation_notes** — Notes attached to escalation cases

### Search & Discovery
17. **search_histories** — User search query history
18. **saved_searches** — Saved search configurations

### Session & Sync Tracking
19. **patient_sessions** — Patient-user session tracking
20. **fhir_sync_events** — FHIR resource sync audit trail
21. **fhir_encounters** — Encounter sync state
22. **fhir_observations** — Observation sync state

## Enums Extended/Created

### New Enum Values
- **TrafficLightColor** — Added `GREY` value
  - Now supports: RED, YELLOW, GREEN, GREY
  - Used for risk stratification and traffic light status

### Existing Enums (idempotent creation)
- **OTPChannel** — SMS, EMAIL, WHATSAPP
- **UserType** — CLINICIAN, PATIENT

## Indexes (25+)

All indexes are created with `CREATE INDEX IF NOT EXISTS` for idempotency:
- Foreign key indexes (userId, patientId, etc.)
- Composite indexes (e.g., date + reason for aggregates)
- Unique indexes for constraint enforcement

## Unique Constraints (5)

- `ehr_sessions(userId, providerId)` — One OAuth session per EHR provider per user
- `clinician_networks(userId, insurerId)` — One network affiliation per insurer per clinician
- `role_assignments(granteeId, role, scope)` — No duplicate role grants
- `access_reason_aggregates(accessReason, hourOfDay, dayOfWeek, date)` — Timeseries cardinality control
- `(future) Other constraints via unique indexes`

## Idempotency

✅ **Fully idempotent migration:**
- All `CREATE TABLE IF NOT EXISTS` statements
- All `CREATE INDEX IF NOT EXISTS` statements
- Enum creation wrapped in `DO $$ ... END $$` blocks with conditional checks
- `ALTER TYPE ... ADD VALUE IF NOT EXISTS` for enum extension
- Safe to re-run without error

## Foreign Keys

Foreign keys are **NOT** created in this migration to avoid dependency issues. They will be added in a follow-up migration or via Prisma's built-in FK generation. The tables are created with appropriate column types for FK relationships (e.g., TEXT for userId references).

## Performance Considerations

- **Indexes on hot paths:** userId, patientId, eventType, createdAt, expiresAt
- **Composite indexes:** (ruleId, isActive), (resource Type, resourceId), (accessReason, hourOfDay, dayOfWeek, date)
- **Aggregate table design:** `access_reason_aggregates` pre-aggregates hourly/daily data to reduce query load

## Safety Notes

1. **FHIR Integration:** New OAuth sessions require valid EHR provider configuration
2. **Governance Rules:** Rule proposals require human review before activation
3. **Access Tracking:** User behavior events are logged but not filtered by workspace/org yet
4. **Data Quality Events:** Useful for monitoring schema drift and validation failures

## Next Steps

1. Run `pnpm exec prisma migrate dev` (or `deploy` in production)
2. Verify all tables and indexes exist: `\dt` and `\di` in psql
3. Test EHR OAuth flow with test FHIR server (e.g., medplum.com)
4. Enable access logging via feature flags if needed
5. Populate governance rules from the rule_proposals table as they are approved

## Rollback

If rollback is needed, run:
```sql
DROP TABLE IF EXISTS "fhir_observations" CASCADE;
DROP TABLE IF EXISTS "fhir_encounters" CASCADE;
DROP TABLE IF EXISTS "fhir_sync_events" CASCADE;
DROP TABLE IF EXISTS "patient_sessions" CASCADE;
DROP TABLE IF EXISTS "saved_searches" CASCADE;
DROP TABLE IF EXISTS "search_histories" CASCADE;
DROP TABLE IF EXISTS "escalation_notes" CASCADE;
DROP TABLE IF EXISTS "governance_rules" CASCADE;
DROP TABLE IF EXISTS "data_quality_events" CASCADE;
DROP TABLE IF EXISTS "access_reason_aggregates" CASCADE;
DROP TABLE IF EXISTS "user_behavior_events" CASCADE;
DROP TABLE IF EXISTS "role_assignments" CASCADE;
DROP TABLE IF EXISTS "clinician_networks" CASCADE;
DROP TABLE IF EXISTS "rule_proposals" CASCADE;
DROP TABLE IF EXISTS "override_clusters" CASCADE;
DROP TABLE IF EXISTS "clinical_referrals" CASCADE;
DROP TABLE IF EXISTS "rule_versions" CASCADE;
DROP TABLE IF EXISTS "outcome_ground_truths" CASCADE;
DROP TABLE IF EXISTS "human_feedback" CASCADE;
DROP TABLE IF EXISTS "assurance_events" CASCADE;
DROP TABLE IF EXISTS "oauth_states" CASCADE;
DROP TABLE IF EXISTS "ehr_sessions" CASCADE;
DROP TYPE IF EXISTS "TrafficLightColor" CASCADE;
DROP TYPE IF EXISTS "OTPChannel" CASCADE;
DROP TYPE IF EXISTS "UserType" CASCADE;
```

---

**Generated by:** Agent Schema Hardening (ARCHIE CTO + CYRUS CISO)  
**Schema Version:** Current (as of 2026-04-06)  
**Migration Time:** Estimated 1-2 seconds on production database
