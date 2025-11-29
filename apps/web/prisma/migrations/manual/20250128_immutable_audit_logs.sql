-- Immutable Audit Logs - Database Constraints
--
-- Purpose: Enforce HIPAA requirement that audit logs cannot be modified or deleted
-- Compliance: HIPAA 164.312(b) - Audit controls (immutable audit trail)
--            : LGPD Art. 37 (5-year retention requirement)
--            : Law 25.326 Art. 9 (Access log integrity)
--
-- Inspiration: Medplum AuditEvent immutability pattern
-- Reference: https://www.medplum.com/docs/api/fhir/resources/auditevent
--
-- Author: Claude Code - RBAC & Immutability Implementation
-- Date: 2025-01-28

-- Step 1: Create function to prevent modifications
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified (HIPAA 164.312(b) compliance)'
    USING HINT = 'Audit logs must remain unaltered for compliance. Create a new audit entry instead.';
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger to prevent updates
CREATE TRIGGER audit_log_immutable_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

-- Step 3: Create trigger to prevent deletes
CREATE TRIGGER audit_log_immutable_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

-- Step 4: Add comment to table for documentation
COMMENT ON TABLE audit_logs IS
  'HIPAA 164.312(b) - Immutable audit trail. Records cannot be updated or deleted.';

COMMENT ON TRIGGER audit_log_immutable_update ON audit_logs IS
  'Prevents modifications to audit logs (HIPAA compliance requirement)';

COMMENT ON TRIGGER audit_log_immutable_delete ON audit_logs IS
  'Prevents deletion of audit logs (HIPAA compliance requirement)';

-- Step 5: Verify immutability (optional test)
-- Uncomment to test after migration:
--
-- -- Test 1: Try to update (should fail)
-- -- UPDATE audit_logs SET action = 'TEST' WHERE id = (SELECT id FROM audit_logs LIMIT 1);
-- -- Expected: ERROR: Audit logs are immutable
--
-- -- Test 2: Try to delete (should fail)
-- -- DELETE FROM audit_logs WHERE id = (SELECT id FROM audit_logs LIMIT 1);
-- -- Expected: ERROR: Audit logs are immutable

-- Step 6: Create view for audit log statistics (compliance reporting)
CREATE OR REPLACE VIEW v_audit_statistics AS
SELECT
  DATE_TRUNC('day', timestamp) as date,
  action,
  resource,
  success,
  COUNT(*) as event_count,
  COUNT(DISTINCT "userId") as unique_users,
  COUNT(CASE WHEN success = false THEN 1 END) as failed_events
FROM audit_logs
WHERE timestamp >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', timestamp), action, resource, success
ORDER BY date DESC, event_count DESC;

COMMENT ON VIEW v_audit_statistics IS
  'HIPAA audit reporting - 90-day event statistics for compliance monitoring';

-- Step 7: Create view for access denied events (security monitoring)
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
FROM audit_logs
WHERE success = false
  AND action IN ('ACCESS_DENIED', 'AUTH_FAILED', 'ERROR')
  AND timestamp >= NOW() - INTERVAL '30 days'
ORDER BY timestamp DESC;

COMMENT ON VIEW v_security_incidents IS
  'HIPAA security monitoring - Failed access attempts and security events (30 days)';

-- Step 8: Create index for compliance queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_compliance_reporting
  ON audit_logs (timestamp DESC, success, action)
  WHERE timestamp >= NOW() - INTERVAL '5 years';

COMMENT ON INDEX idx_audit_logs_compliance_reporting IS
  'LGPD Art. 37 - Optimizes 5-year retention compliance queries';

-- Migration complete
-- Next steps:
-- 1. Disable UPDATE/DELETE API endpoints for audit logs
-- 2. Test immutability with sample updates
-- 3. Set up automated compliance reports using v_audit_statistics
-- 4. Monitor v_security_incidents for suspicious activity
