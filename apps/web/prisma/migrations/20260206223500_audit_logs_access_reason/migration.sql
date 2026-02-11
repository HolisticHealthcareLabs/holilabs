-- Add missing AuditLog access justification fields.
-- `audit_logs` was created before these columns/enums were introduced.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccessReason') THEN
    CREATE TYPE "AccessReason" AS ENUM (
      'DIRECT_PATIENT_CARE',
      'CARE_COORDINATION',
      'EMERGENCY_ACCESS',
      'ADMINISTRATIVE',
      'QUALITY_IMPROVEMENT',
      'BILLING',
      'LEGAL_COMPLIANCE',
      'RESEARCH_IRB_APPROVED',
      'PUBLIC_HEALTH'
    );
  END IF;
END
$$;

ALTER TABLE "audit_logs"
  ADD COLUMN IF NOT EXISTS "accessReason" "AccessReason",
  ADD COLUMN IF NOT EXISTS "accessPurpose" TEXT;

CREATE INDEX IF NOT EXISTS "audit_logs_accessReason_idx" ON "audit_logs" ("accessReason");

