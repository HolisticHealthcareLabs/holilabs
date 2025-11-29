-- ============================================================================
-- HoliLabs Complete Database Schema
-- Consolidated migration to bypass Prisma P1010 error
--
-- This script combines:
-- - All base Prisma migrations (20251004 -> 20251013)
-- - LGPD access reason fields
-- - RBAC enhancements (8 user roles)
-- - Immutable audit log triggers
-- - Compliance views
--
-- Usage:
--   docker exec -i holi-postgres psql -U holi -d holi_protocol < prisma/consolidated_migration.sql
--
-- Author: Claude Code + HoliLabs Team
-- Date: 2025-11-26
-- ============================================================================

-- Step 1: Drop existing schema if needed (DEVELOPMENT ONLY - removes all data!)
-- Uncomment next line if you want a clean slate:
-- DROP SCHEMA public CASCADE; CREATE SCHEMA public;

-- Step 2: Create all ENUMs first (order matters for dependencies)

-- Enhanced UserRole enum with 8 roles (was 4)
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM (
    'ADMIN',           -- Clinic owner - full system access
    'PHYSICIAN',       -- Doctor - full patient care
    'NURSE',           -- Nurse - limited prescribing
    'RECEPTIONIST',    -- Front desk - scheduling, billing
    'LAB_TECH',        -- Laboratory technician
    'PHARMACIST',      -- Pharmacist - prescription fulfillment
    'CLINICIAN',       -- Legacy role (maps to PHYSICIAN)
    'STAFF'            -- Legacy role (maps to RECEPTIONIST)
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- LGPD Access Reason enum (required for PHI access)
DO $$ BEGIN
  CREATE TYPE "AccessReason" AS ENUM (
    'TREATMENT',                    -- Direct patient care
    'EMERGENCY',                    -- Emergency medical care
    'SCHEDULED_APPOINTMENT',        -- Pre-scheduled consultation
    'LAB_RESULTS_REVIEW',          -- Reviewing laboratory results
    'PRESCRIPTION_MANAGEMENT',      -- Managing prescriptions
    'MEDICAL_CONSULTATION',         -- General medical consultation
    'ADMINISTRATIVE',               -- Administrative purposes
    'AUDIT',                        -- Compliance audit
    'RESEARCH',                     -- Medical research (requires consent)
    'BILLING',                      -- Billing/insurance purposes
    'LEGAL_REQUIREMENT'             -- Court order or legal obligation
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PrescriptionStatus" AS ENUM ('PENDING', 'SIGNED', 'SENT', 'FILLED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ConsentType" AS ENUM ('GENERAL_CONSULTATION', 'TELEHEALTH', 'DATA_RESEARCH', 'SURGERY', 'PROCEDURE', 'PHOTOGRAPHY', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AppointmentType" AS ENUM ('IN_PERSON', 'TELEHEALTH', 'PHONE', 'HOME_VISIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED', 'PENDING_CONFIRMATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentType" AS ENUM ('LAB_RESULTS', 'IMAGING', 'CONSULTATION_NOTES', 'DISCHARGE_SUMMARY', 'PRESCRIPTION', 'INSURANCE', 'CONSENT_FORM', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'UPLOADING', 'PROCESSING', 'DEIDENTIFYING', 'EXTRACTING', 'SYNCHRONIZED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "NoteType" AS ENUM ('PROGRESS', 'CONSULTATION', 'ADMISSION', 'DISCHARGE', 'PROCEDURE', 'FOLLOW_UP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'PRINT', 'DEIDENTIFY', 'REIDENTIFY', 'PRESCRIBE', 'SIGN', 'REVOKE', 'ACCESS_DENIED', 'AUTH_FAILED', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REVERTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT_REMINDER', 'LAB_RESULTS_READY', 'PRESCRIPTION_READY', 'MESSAGE_RECEIVED', 'CONSENT_REQUIRED', 'DOCUMENT_UPLOADED', 'SYSTEM_ALERT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'MICROSOFT', 'APPLE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FormStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FormResponseStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ConfirmationMethod" AS ENUM ('SMS', 'EMAIL', 'WHATSAPP', 'PHONE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Step 3: Create tables with LGPD compliance fields

-- Users table with RBAC permissions field
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "supabaseId" TEXT,
    "walletAddress" TEXT,
    "publicKey" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLINICIAN',
    "permissions" TEXT[] NOT NULL DEFAULT '{}',  -- NEW: Granular permissions
    "specialty" TEXT,
    "licenseNumber" TEXT,
    "npi" TEXT,  -- National Provider Identifier
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Patients table
CREATE TABLE IF NOT EXISTS "patients" (
    "id" TEXT NOT NULL,
    "blockchainId" TEXT,
    "dataHash" TEXT,
    "lastHashUpdate" TIMESTAMP(3),
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'BR',
    "mrn" TEXT NOT NULL,
    "externalMrn" TEXT,
    "tokenId" TEXT NOT NULL,
    "ageBand" TEXT,
    "region" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedClinicianId" TEXT,
    -- Portal authentication fields
    "portalAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
    "portalEmail" TEXT,
    "portalPhone" TEXT,
    "portalLastLoginAt" TIMESTAMP(3),
    "otpSecret" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "magicLinkToken" TEXT,
    "magicLinkExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- Audit Logs table (IMMUTABLE - see triggers below)
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "userEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "action" "AuditAction" NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    -- LGPD Compliance fields (NEW)
    "accessReason" "AccessReason",      -- Why was PHI accessed?
    "accessPurpose" TEXT,                -- Additional justification
    "patientConsentId" TEXT,             -- Link to consent record
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Medications table
CREATE TABLE IF NOT EXISTS "medications" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescriptionHash" TEXT,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "dose" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "route" TEXT,
    "instructions" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "prescribedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- Lab Results table
CREATE TABLE IF NOT EXISTS "lab_results" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "testCode" TEXT,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "referenceRange" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "orderedBy" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- Appointments table
CREATE TABLE IF NOT EXISTS "appointments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "type" "AppointmentType" NOT NULL DEFAULT 'IN_PERSON',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "confirmationToken" TEXT,
    "confirmationSentAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "confirmationMethod" "ConfirmationMethod",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- Prescriptions table
CREATE TABLE IF NOT EXISTS "prescriptions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "medication" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT,
    "instructions" TEXT,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'PENDING',
    "signedAt" TIMESTAMP(3),
    "signatureHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- Clinical Notes table
CREATE TABLE IF NOT EXISTS "clinical_notes" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "type" "NoteType" NOT NULL DEFAULT 'PROGRESS',
    "content" TEXT NOT NULL,
    "contentEncrypted" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "signedAt" TIMESTAMP(3),
    "signatureHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- Consents table
CREATE TABLE IF NOT EXISTS "consents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "signatureDataUrl" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- Notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "patientId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Push Subscriptions table
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- Calendar Integrations table
CREATE TABLE IF NOT EXISTS "calendar_integrations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "calendarId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "calendar_integrations_pkey" PRIMARY KEY ("id")
);

-- Forms table
CREATE TABLE IF NOT EXISTS "forms" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "schema" JSONB NOT NULL,
    "status" "FormStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- Form Responses table
CREATE TABLE IF NOT EXISTS "form_responses" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "status" "FormResponseStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "form_responses_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create indexes for performance

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "patients_mrn_key" ON "patients"("mrn");
CREATE UNIQUE INDEX IF NOT EXISTS "patients_tokenId_key" ON "patients"("tokenId");
CREATE INDEX IF NOT EXISTS "patients_assignedClinicianId_idx" ON "patients"("assignedClinicianId");
CREATE INDEX IF NOT EXISTS "medications_patientId_idx" ON "medications"("patientId");
CREATE INDEX IF NOT EXISTS "lab_results_patientId_idx" ON "lab_results"("patientId");
CREATE INDEX IF NOT EXISTS "appointments_patientId_idx" ON "appointments"("patientId");
CREATE INDEX IF NOT EXISTS "appointments_clinicianId_idx" ON "appointments"("clinicianId");
CREATE INDEX IF NOT EXISTS "appointments_startTime_idx" ON "appointments"("startTime");
CREATE INDEX IF NOT EXISTS "prescriptions_patientId_idx" ON "prescriptions"("patientId");
CREATE INDEX IF NOT EXISTS "clinical_notes_patientId_idx" ON "clinical_notes"("patientId");
CREATE INDEX IF NOT EXISTS "consents_patientId_idx" ON "consents"("patientId");
CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs"("resource", "resourceId");

-- Compliance indexes (for audit queries)
CREATE INDEX IF NOT EXISTS "idx_audit_logs_compliance_reporting"
  ON "audit_logs" ("timestamp" DESC, "success", "action")
  WHERE "timestamp" >= NOW() - INTERVAL '5 years';

-- Step 5: Add foreign key constraints

ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "patients_assignedClinicianId_fkey";
ALTER TABLE "patients" ADD CONSTRAINT "patients_assignedClinicianId_fkey"
  FOREIGN KEY ("assignedClinicianId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "medications" DROP CONSTRAINT IF EXISTS "medications_patientId_fkey";
ALTER TABLE "medications" ADD CONSTRAINT "medications_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lab_results" DROP CONSTRAINT IF EXISTS "lab_results_patientId_fkey";
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_patientId_fkey";
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_clinicianId_fkey";
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinicianId_fkey"
  FOREIGN KEY ("clinicianId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prescriptions" DROP CONSTRAINT IF EXISTS "prescriptions_patientId_fkey";
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prescriptions" DROP CONSTRAINT IF EXISTS "prescriptions_clinicianId_fkey";
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_clinicianId_fkey"
  FOREIGN KEY ("clinicianId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clinical_notes" DROP CONSTRAINT IF EXISTS "clinical_notes_patientId_fkey";
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clinical_notes" DROP CONSTRAINT IF EXISTS "clinical_notes_clinicianId_fkey";
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_clinicianId_fkey"
  FOREIGN KEY ("clinicianId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "consents" DROP CONSTRAINT IF EXISTS "consents_patientId_fkey";
ALTER TABLE "consents" ADD CONSTRAINT "consents_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_userId_fkey";
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "push_subscriptions" DROP CONSTRAINT IF EXISTS "push_subscriptions_userId_fkey";
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "calendar_integrations" DROP CONSTRAINT IF EXISTS "calendar_integrations_userId_fkey";
ALTER TABLE "calendar_integrations" ADD CONSTRAINT "calendar_integrations_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "form_responses" DROP CONSTRAINT IF EXISTS "form_responses_formId_fkey";
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_formId_fkey"
  FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "form_responses" DROP CONSTRAINT IF EXISTS "form_responses_patientId_fkey";
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Immutable audit logs (HIPAA 164.312(b) compliance)

CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified (HIPAA 164.312(b) compliance)'
    USING HINT = 'Audit logs must remain unaltered for compliance. Create a new audit entry instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_immutable_update ON "audit_logs";
CREATE TRIGGER audit_log_immutable_update
  BEFORE UPDATE ON "audit_logs"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

DROP TRIGGER IF EXISTS audit_log_immutable_delete ON "audit_logs";
CREATE TRIGGER audit_log_immutable_delete
  BEFORE DELETE ON "audit_logs"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

COMMENT ON TABLE "audit_logs" IS
  'HIPAA 164.312(b) - Immutable audit trail. Records cannot be updated or deleted.';

-- Step 7: Compliance views for reporting

CREATE OR REPLACE VIEW v_audit_statistics AS
SELECT
  DATE_TRUNC('day', timestamp) as date,
  action,
  resource,
  success,
  COUNT(*) as event_count,
  COUNT(DISTINCT "userId") as unique_users,
  COUNT(CASE WHEN success = false THEN 1 END) as failed_events
FROM "audit_logs"
WHERE timestamp >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', timestamp), action, resource, success
ORDER BY date DESC, event_count DESC;

COMMENT ON VIEW v_audit_statistics IS
  'HIPAA audit reporting - 90-day event statistics for compliance monitoring';

CREATE OR REPLACE VIEW v_security_incidents AS
SELECT
  id,
  timestamp,
  "userId",
  "userEmail",
  "ipAddress",
  action,
  resource,
  "resourceId",
  "errorMessage",
  details
FROM "audit_logs"
WHERE success = false
  AND action IN ('ACCESS_DENIED', 'AUTH_FAILED', 'ERROR')
  AND timestamp >= NOW() - INTERVAL '30 days'
ORDER BY timestamp DESC;

COMMENT ON VIEW v_security_incidents IS
  'HIPAA security monitoring - Failed access attempts and security events (30 days)';

-- LGPD Access Audit View
CREATE OR REPLACE VIEW v_lgpd_access_audit AS
SELECT
  al.id,
  al.timestamp,
  al."userId",
  al."userEmail",
  al.resource,
  al."resourceId",
  al."accessReason",
  al."accessPurpose",
  al."ipAddress",
  CASE
    WHEN al."accessReason" IS NULL THEN 'MISSING_JUSTIFICATION'
    WHEN al."accessReason" IN ('TREATMENT', 'EMERGENCY') THEN 'LEGITIMATE'
    ELSE 'REQUIRES_REVIEW'
  END as compliance_status
FROM "audit_logs" al
WHERE al.action IN ('READ', 'EXPORT', 'PRINT')
  AND al.resource = 'Patient'
  AND al.timestamp >= NOW() - INTERVAL '90 days'
ORDER BY al.timestamp DESC;

COMMENT ON VIEW v_lgpd_access_audit IS
  'LGPD Art. 37 - Patient access audit with justification tracking (90 days)';

-- Step 8: Create Prisma migrations table for compatibility

CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

-- Mark this migration as applied
INSERT INTO "_prisma_migrations" (id, checksum, migration_name, applied_steps_count, finished_at)
VALUES (
  gen_random_uuid()::text,
  'consolidated_manual_migration',
  '20251126000000_consolidated_manual',
  1,
  NOW()
) ON CONFLICT DO NOTHING;

-- Step 9: Success message

DO $$
BEGIN
  RAISE NOTICE '✅ Database schema created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '- 8 User roles (RBAC) with granular permissions';
  RAISE NOTICE '- LGPD access reason tracking on audit logs';
  RAISE NOTICE '- Immutable audit logs (HIPAA 164.312(b))';
  RAISE NOTICE '- 3 Compliance views for reporting';
  RAISE NOTICE '- Patient portal authentication fields';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run: npx prisma generate';
  RAISE NOTICE '2. Run: pnpm dev';
  RAISE NOTICE '3. Test the application';
END $$;
