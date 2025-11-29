-- LGPD/Law 25.326 Compliance Migration
-- Adds access reason logging to audit_logs table
--
-- Purpose: Enable mandatory access justification for PHI views
-- Compliance: LGPD Art. 6 (Purpose Limitation) + Art. 11, II (Health Data Protection)
--            : Law 25.326 Art. 5 (Purpose Specification) + Art. 14 (Purpose Limitation)
--
-- Author: Claude Code - Phase 1 Critical Compliance Fixes
-- Date: 2025-01-28

-- Step 1: Create AccessReason enum
DO $$ BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add access reason columns to audit_logs
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS "accessReason" "AccessReason",
    ADD COLUMN IF NOT EXISTS "accessPurpose" TEXT;

-- Step 3: Add index for compliance reporting queries
CREATE INDEX IF NOT EXISTS "idx_audit_logs_access_reason"
    ON audit_logs("accessReason");

-- Step 4: Add comment to table for documentation
COMMENT ON COLUMN audit_logs."accessReason" IS
    'LGPD Art. 11, II compliance - Mandatory access justification for PHI views';

COMMENT ON COLUMN audit_logs."accessPurpose" IS
    'Optional free-text justification for access (LGPD Art. 6)';

-- Step 5: Create compliance audit query view (optional, but useful)
CREATE OR REPLACE VIEW v_lgpd_access_audit AS
SELECT
    al.id,
    al."userId",
    al."userEmail",
    al."ipAddress",
    al.action,
    al.resource,
    al."resourceId",
    al."accessReason",
    al."accessPurpose",
    al.timestamp,
    al.success,
    CASE
        WHEN al."accessReason" IS NULL AND al.action = 'READ' AND al.resource = 'Patient'
        THEN 'NON_COMPLIANT'
        ELSE 'COMPLIANT'
    END as compliance_status
FROM audit_logs al
WHERE al.resource IN ('Patient', 'Prescription', 'LabResult', 'ClinicalNote')
    AND al.timestamp >= NOW() - INTERVAL '90 days'
ORDER BY al.timestamp DESC;

COMMENT ON VIEW v_lgpd_access_audit IS
    'LGPD/Law 25.326 Compliance View - PHI access audit trail with justification';

-- Step 6: Validation check (optional - uncomment to verify)
-- SELECT COUNT(*) as total_patient_reads,
--        SUM(CASE WHEN "accessReason" IS NULL THEN 1 ELSE 0 END) as missing_justification
-- FROM audit_logs
-- WHERE action = 'READ' AND resource = 'Patient'
--     AND timestamp >= NOW() - INTERVAL '30 days';

-- Migration complete
-- Next steps:
-- 1. Deploy application code with AccessReasonModal component
-- 2. Update /api/patients/[id]/log-access endpoint
-- 3. Enforce access reason requirement in middleware/API routes
-- 4. Test with end-to-end flow: modal → log access → fetch patient data
