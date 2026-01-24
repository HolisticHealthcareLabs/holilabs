-- Audit Log Hash Chain (HIPAA/Compliance Tamper Detection)
-- Implements immutable audit trail with hash chaining
-- Each entry includes hash of previous entry for tamper detection

ALTER TABLE "audit_logs" ADD COLUMN "previousHash" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "entryHash" TEXT;

-- Index for efficient chain verification
CREATE INDEX "audit_logs_entryHash_idx" ON "audit_logs"("entryHash");

-- Comment explaining the hash chain
COMMENT ON COLUMN "audit_logs"."previousHash" IS 'SHA-256 hash of the previous audit log entry. GENESIS for first entry.';
COMMENT ON COLUMN "audit_logs"."entryHash" IS 'SHA-256 hash of this entry including previousHash. Used for tamper detection.';
