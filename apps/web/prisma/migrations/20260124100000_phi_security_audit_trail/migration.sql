-- PHI Security: Remove promptPreview (contains PHI), add safe audit fields
-- This migration is INTENTIONALLY destructive - promptPreview data is deleted for compliance

-- 1. Remove PHI-containing column (IRREVERSIBLE - data loss intended)
ALTER TABLE "ai_usage_logs" DROP COLUMN IF EXISTS "promptPreview";

-- 2. Add safe debugging alternative (SHA-256 hash, no PHI)
ALTER TABLE "ai_usage_logs" ADD COLUMN IF NOT EXISTS "promptHash" TEXT;

-- 3. Add audit trail: link to clinical encounter (appointment)
ALTER TABLE "ai_usage_logs" ADD COLUMN IF NOT EXISTS "appointmentId" TEXT;

-- 4. Add foreign key constraint to appointments
ALTER TABLE "ai_usage_logs"
ADD CONSTRAINT "ai_usage_logs_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Add index for querying AI usage by encounter
CREATE INDEX IF NOT EXISTS "ai_usage_logs_appointmentId_idx" ON "ai_usage_logs"("appointmentId");

-- Compliance note: This migration removes potentially PHI-containing data
-- The promptPreview column stored first 500 chars of AI prompts which may include:
-- - Patient names, symptoms, chief complaints
-- - Medication lists, diagnosis information
-- Replacing with promptHash (SHA-256) allows debugging without PHI storage
