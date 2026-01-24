-- Feature Flags: DB-backed kill switches for AI and other features
-- Enables disabling AI tasks without deployment (critical for safety)

-- Create feature_flags table
CREATE TABLE IF NOT EXISTS "feature_flags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "clinicId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "reason" TEXT,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one flag per name per scope (null clinicId = global)
CREATE UNIQUE INDEX IF NOT EXISTS "feature_flags_name_clinicId_key" ON "feature_flags"("name", "clinicId");

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS "feature_flags_name_idx" ON "feature_flags"("name");
CREATE INDEX IF NOT EXISTS "feature_flags_clinicId_idx" ON "feature_flags"("clinicId");

-- Seed default AI feature flags (all enabled by default)
INSERT INTO "feature_flags" ("id", "name", "description", "enabled", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'ai.diagnosis.enabled', 'Enable AI-assisted symptom diagnosis', true, NOW()),
    (gen_random_uuid()::text, 'ai.scribe.enabled', 'Enable AI medical scribe transcription', true, NOW()),
    (gen_random_uuid()::text, 'ai.treatment.enabled', 'Enable AI treatment protocol recommendations', true, NOW()),
    (gen_random_uuid()::text, 'ai.adherence.enabled', 'Enable AI medication adherence assessment', true, NOW()),
    (gen_random_uuid()::text, 'ai.quality_grading.enabled', 'Enable LLM-as-Judge quality grading', true, NOW())
ON CONFLICT ("name", "clinicId") DO NOTHING;

-- Comment for operations team
COMMENT ON TABLE "feature_flags" IS 'Kill switches for AI features. Set enabled=false to disable. clinicId=null means global, otherwise clinic-specific override.';
