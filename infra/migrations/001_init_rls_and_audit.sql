-- Create audit schema
CREATE SCHEMA IF NOT EXISTS audit;

-- Enable Row Level Security on all tables
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.audit_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Deny by default, allow based on org_id match
-- Users can only access data from their own organization

CREATE POLICY org_isolation_policy ON orgs
  FOR ALL
  USING (id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY org_isolation_policy ON users
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY org_isolation_policy ON patient_tokens
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY org_isolation_policy ON subject_indices
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY org_isolation_policy ON datasets
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY org_isolation_policy ON consents
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY org_isolation_policy ON export_requests
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY org_isolation_policy ON model_runs
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY org_isolation_policy ON audit.audit_events
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Audit Events: Prevent UPDATE and DELETE
CREATE RULE no_update_audit_events AS ON UPDATE TO audit.audit_events DO INSTEAD NOTHING;
CREATE RULE no_delete_audit_events AS ON DELETE TO audit.audit_events DO INSTEAD NOTHING;

-- Audit hash chain trigger function
CREATE OR REPLACE FUNCTION audit.compute_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
  prev_hash_val BYTEA;
  canonical_payload TEXT;
BEGIN
  -- Get the previous row's hash
  SELECT row_hash INTO prev_hash_val
  FROM audit.audit_events
  WHERE org_id = NEW.org_id
  ORDER BY id DESC
  LIMIT 1;

  -- Canonicalize payload (sorted JSON)
  canonical_payload := NEW.payload::text;

  -- Compute hash: SHA256(prev_hash || canonical_payload || ts || event_type)
  NEW.prev_hash := prev_hash_val;
  NEW.row_hash := sha256(
    COALESCE(prev_hash_val, ''::bytea) ||
    canonical_payload::bytea ||
    NEW.ts::text::bytea ||
    NEW.event_type::bytea
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to audit_events
CREATE TRIGGER audit_hash_chain_trigger
BEFORE INSERT ON audit.audit_events
FOR EACH ROW
EXECUTE FUNCTION audit.compute_audit_hash();

-- Partition audit_events by month
CREATE TABLE IF NOT EXISTS audit.audit_events_2025_01 PARTITION OF audit.audit_events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS audit.audit_events_2025_02 PARTITION OF audit.audit_events
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE IF NOT EXISTS audit.audit_events_2025_03 PARTITION OF audit.audit_events
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_audit_events_org_ts ON audit.audit_events(org_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit.audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_patient_tokens_org_consent ON patient_tokens(org_id, consent_state);
CREATE INDEX IF NOT EXISTS idx_datasets_org_patient ON datasets(org_id, patient_token_id);
CREATE INDEX IF NOT EXISTS idx_export_requests_status_cooldown ON export_requests(status, cooldown_until);

-- Views for compliance reporting
CREATE OR REPLACE VIEW v_dp_usage_by_org_subject AS
SELECT
  er.org_id,
  er.subject_id,
  SUM(er.epsilon) as total_epsilon,
  COUNT(*) as export_count,
  MAX(er.created_at) as last_export
FROM export_requests er
WHERE er.status = 'COMPLETED'
GROUP BY er.org_id, er.subject_id;

CREATE OR REPLACE VIEW v_exports_by_state AS
SELECT
  org_id,
  status,
  COUNT(*) as count,
  AVG(epsilon) as avg_epsilon
FROM export_requests
GROUP BY org_id, status;

CREATE OR REPLACE VIEW v_access_activity AS
SELECT
  ae.org_id,
  ae.user_id,
  ae.event_type,
  COUNT(*) as event_count,
  MAX(ae.ts) as last_activity
FROM audit.audit_events ae
GROUP BY ae.org_id, ae.user_id, ae.event_type;

COMMENT ON VIEW v_dp_usage_by_org_subject IS 'Differential privacy usage tracking per organization and subject';
COMMENT ON VIEW v_exports_by_state IS 'Export request statistics by status';
COMMENT ON VIEW v_access_activity IS 'User access activity summary for compliance audits';
